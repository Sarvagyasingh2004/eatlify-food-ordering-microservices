import axios from "axios";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { riderService } from "../main";

interface Props {
    orderId: string;
    onAccepted: () => void;

}
const RiderOrderRequest = ({ orderId, onAccepted }: Props) => {

    const [accepting, setAccepting] = useState<boolean>(false);
    const [secondsLeft, setSecondsLeft] = useState<number>(10);

    useEffect(() => {
        const interval = setInterval(() => {
            setSecondsLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(interval);
                    onAccepted();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [onAccepted]);

    const acceptOrder = async () => {
        try {
            await axios.post(`${riderService}/api/rider/accept/${orderId}`, {}, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
            });
            toast.success("Order accepted");
            onAccepted();
        } catch (error: any) {
            toast.error("Failed to accept order");
            console.error(error.response.data.message);
            onAccepted();
        } finally {
            setAccepting(false);
        }
    }
    return (
        <div className="rounded-xl p-4 bg-white shadow-sm border border-green-300 space-y-3">
            <p className="text-center text-xs font-semibold text-red-600">Accept within {secondsLeft}</p>
            <p className="text-center text-xs font-semibold tex-green-600">New delivery request</p>
            <p className="text-xs text-gray-600">
                Order ID:<b>{orderId.slice(-6)}</b>
            </p>
            <button className="w-full rounded-lg bg-green-600 font-semibold py-2 text-sm text-white hover:bg-green-700 disabled:opacity-50" onClick={acceptOrder}>{accepting ? "Accepting..." : "Accept order"}</button>
        </div>
    )
}

export default RiderOrderRequest
