// Indian grouping, since every amount in this app is INR.
export const rupees = (amount: number): string =>
    `₹${amount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

// "2026-09-18" -> "18 Sep"
export const shortDate = (isoDate: string): string => {
    const parsed = new Date(`${isoDate}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return isoDate;
    return parsed.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};

// Full timestamp for an order row.
export const dateTime = (value: string | Date): string => {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return String(value);
    return parsed.toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        hour: "numeric",
        minute: "2-digit",
    });
};
