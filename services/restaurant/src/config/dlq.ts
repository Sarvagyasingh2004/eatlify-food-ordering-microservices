import type { Channel, ConsumeMessage } from "amqplib";

const envInt = (name: string, fallback: number) => {
    const value = Number(process.env[name]);
    return Number.isFinite(value) && value > 0 ? value : fallback;
};

export const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Exponential backoff capped at CONSUMER_RETRY_MAX_MS, with +/-20% jitter so
// every consumer does not retry on the same tick after a broker or database blip.
const backoffDelay = (attempt: number) => {
    const base = envInt("CONSUMER_RETRY_BASE_MS", 500);
    const max = envInt("CONSUMER_RETRY_MAX_MS", 10000);
    const delay = Math.min(base * 2 ** (attempt - 1), max);
    return Math.round(delay * (0.8 + Math.random() * 0.4));
};

// Failures land here instead of being discarded. Declared with no arguments so
// it can never collide with an existing declaration - changing the arguments of
// a live durable queue raises PRECONDITION_FAILED and closes the channel.
export const dlqName = (queue: string) => `${queue}.dlq`;

// Thrown for a message that can never succeed: malformed payload, unknown event
// type, missing ids. Retrying those only burns backoff on a guaranteed failure,
// so they skip straight to the DLQ.
export class PermanentFailure extends Error {
    constructor(message: string) {
        super(message);
        this.name = "PermanentFailure";
    }
}

// Published explicitly rather than via a dead-letter exchange: a DLX would mean
// adding x-dead-letter-exchange to queues that already exist without it, and it
// cannot record *why* a message failed the way this envelope does.
const publishToDlq = (
    channel: Channel,
    msg: ConsumeMessage,
    queue: string,
    reason: string,
    attempts: number,
): boolean =>
    channel.sendToQueue(
        dlqName(queue),
        Buffer.from(
            JSON.stringify({
                failedAt: new Date().toISOString(),
                queue,
                reason,
                attempts,
                redelivered: msg.fields.redelivered,
                // kept as the raw string so an unparseable payload survives verbatim
                // for inspection and replay
                payload: msg.content.toString(),
            }),
        ),
        { persistent: true, contentType: "application/json" },
    );

// Ack only once the DLQ has taken the message. If the broker refused it, requeue
// the original - dropping it here would lose the very message the DLQ exists to
// retain.
const routeToDlq = (
    channel: Channel,
    msg: ConsumeMessage,
    queue: string,
    reason: string,
    attempts: number,
) => {
    try {
        if (publishToDlq(channel, msg, queue, reason, attempts)) {
            channel.ack(msg);
            return;
        }
        console.error(`[${queue}] DLQ back-pressured, requeueing instead of dropping`);
    } catch (error) {
        console.error(`[${queue}] could not publish to DLQ, requeueing:`, error);
    }
    channel.nack(msg, false, true);
};

/**
 * Runs `handler` against a parsed message with bounded retries, then
 * dead-letters. The message is always settled exactly once - acked on success,
 * acked after the DLQ accepts it, or nacked for requeue if the DLQ refused.
 */
export const processWithDlq = async <T>(
    channel: Channel,
    queue: string,
    msg: ConsumeMessage,
    handler: (event: T) => Promise<void>,
) => {
    let event: T;

    // A payload that will not parse can never succeed, so it skips the retries.
    try {
        event = JSON.parse(msg.content.toString()) as T;
    } catch (error) {
        console.error(`[${queue}] unparseable payload, dead-lettering:`, error);
        routeToDlq(channel, msg, queue, `unparseable payload: ${String(error)}`, 0);
        return;
    }

    const maxAttempts = envInt("CONSUMER_MAX_ATTEMPTS", 3);
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            await handler(event);
            channel.ack(msg);
            return;
        } catch (error) {
            if (error instanceof PermanentFailure) {
                console.error(`[${queue}] permanent failure, dead-lettering:`, error.message);
                routeToDlq(channel, msg, queue, error.message, attempt);
                return;
            }

            lastError = error;

            if (attempt < maxAttempts) {
                const delay = backoffDelay(attempt);
                console.error(
                    `[${queue}] attempt ${attempt}/${maxAttempts} failed, retrying in ${delay}ms:`,
                    error,
                );
                await wait(delay);
            }
        }
    }

    console.error(`[${queue}] giving up after ${maxAttempts} attempts, dead-lettering`);
    routeToDlq(channel, msg, queue, String(lastError), maxAttempts);
};
