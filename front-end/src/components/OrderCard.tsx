import { useEffect, useState } from 'react'
import type { IOrder } from '../types'
import { ORDER_ACTIONS } from '../utils/orderflow';
import { restaurantService } from '../main';
import axios from 'axios';
import toast from 'react-hot-toast';


interface props {
    order: IOrder;
    onStatusUpdate?: () => void;
}

const statusColor = (status: string) => {
    switch (status) {
        case "placed":
            return "bg-yellow-100 text-yellow-700";
        case "accepted":
            return "bg-orange-100 text-orange-700";
        case "preparing":
            return "bg-blue-100 text-blue-700";
        case "ready_for_rider":
            return "bg-indigo-100 text-indigo-700";
        case "picked_up":
            return "bg-purple-100 text-purple-700";
        case "rider_assigned":
            return "bg-pink-100 text-pink-700";
        case "delivered":
            return "bg-green-100 text-green-700";
        case "cancelled":
            return "bg-red-100 text-red-700";
        default:
            return "bg-gray-100 text-gray-700";
    }
}

const OrderCard = ({ order, onStatusUpdate }: props) => {
    const [loading, setLoading] = useState(false);
    const [retryVisible, setRetryVisible] = useState(false);

    const actions = ORDER_ACTIONS[order.status] || [];

    useEffect(() => {
        if (order.status !== "ready_for_rider") {
            setRetryVisible(false);
            return;
        }

        const timer = setTimeout(() => {
            setRetryVisible(true);
        }, 10000);

        return () => {
            clearTimeout(timer);
        }
    }, [order.status]);

    const updateStatus = async (status: string) => {
        try {
            setLoading(true);
            setRetryVisible(false);
            await axios.put(`${restaurantService}/api/order/${order._id}`, {
                status,
            }, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
            });

            toast.success("Order updated successfully");
            onStatusUpdate?.();
        } catch (error: any) {
            toast.error(error.response.data.message);
        } finally {
            setLoading(false);
        }
    }
    return (
        <div className='rounded-xl bg-white p-4 scroll-smooth space-y-3'>
            <div className="flex justify-between items-center">
                <p className="text-sm font-medium">Order #{order._id.slice(-6)}</p>
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusColor(order.status)}`}>
                    {order.status.replaceAll("_", " ")}
                </span>
            </div>
            <div className="text-sm text-gray-600 space-y-1">
                {
                    order.items.map((item, i) => (
                        <p key={i}>{item.name} x {item.quantity}</p>
                    ))
                }
            </div>
            <div className="flex justify-between text-sm font-medium">
                <span>Total</span>
                <span>₹{order.totalAmount}</span>
            </div>
            <p className="text-xs text-gray-400">Payment: {order.paymentStatus}</p>
            {
                order.paymentStatus === "paid" && actions.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-2">
                        {actions.map((status) => (
                            <button
                                key={status}
                                disabled={loading}
                                onClick={() => updateStatus(status)}
                                className="rounded-lg bg-[#E23744] px-3 py-1 text-xs py-1 text-white hover:bg-[#D32f3A] disabled:opacity-50"
                            >
                                Mark as {status.replaceAll("_", " ")}

                            </button>
                        ))}
                    </div>
                )
            }
            {order.status === "ready_for_rider" && retryVisible && <div className='pt-2'>
                <button className='w-full rounded-lg border border-[#E23744] py-2 text-xs font-semibold text-[#E23744] hover:bg-red-50 disabled:opacity-50' onClick={() => updateStatus("ready_for_rider")}>Retry Ready for Rider</button></div>}
        </div>
    )
}

export default OrderCard
