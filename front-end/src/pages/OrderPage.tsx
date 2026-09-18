import { useParams } from "react-router-dom"
import { useSocket } from "../context/SocketContext";
import type { IOrder } from "../types";
import axios from "axios";
import { restaurantService } from "../main";
import toast from "react-hot-toast";
import { useEffect, useState } from "react";
import UserOrderMap from "../components/UserOrderMap";

const OrderPage = () => {
    const { orderId } = useParams();
    const { socket } = useSocket();

    const [order, setOrder] = useState<IOrder | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [riderLocation, setRiderLocation] = useState<[number, number] | null>(null);

    const fetchOrder = async () => {
        try {
            const { data } = await axios.get(`${restaurantService}/api/order/${orderId}`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
            });
            setOrder(data);
        } catch (error) {
            toast.error("error while fetching order");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrder();
    }, [orderId]);

    useEffect(() => {
        if (!socket) return;
        const onOrderUpdate = () => {
            fetchOrder();
        };

        socket.on("order:update", onOrderUpdate);
        socket.on("order:rider_assigned", onOrderUpdate);

        return () => {
            socket.off("order:update", onOrderUpdate);
            socket.off("order:rider_assigned", onOrderUpdate);
        }
    }, [socket]);

    useEffect(() => {
        if (!socket || !orderId) return;

        socket.emit("join", `user:${orderId}`);

        return () => {
            socket.emit("leave", `user:${orderId}`);
        }
    }, [socket, orderId]);

    useEffect(() => {
        if (!socket) return;

        const onRiderLocation = ({ latitude, longitude }: any) => {
            console.log("Rider Location : ", latitude, longitude);
            setRiderLocation([latitude, longitude]);
        };

        socket.on("rider:location", onRiderLocation);

        return () => {
            socket.off("rider:location", onRiderLocation);
        }
    }, [socket]);

    if (loading) {
        return <p className="text-center text-gray-500">Loading order...</p>
    }

    if (!order) {
        return <div className="flex min-h-[60vh] items-center justify-center">
            <p className="text-gray-500">No order found</p>
        </div>
    }

    return (
        <div className="mx-auto max-w-3xl px-4 py-6 space-y-6">
            <h1 className="text-xl font-bold">Order #{order._id.slice(-6)}</h1>
            <div className="rounded-lg bg-blue-50 p-3 text-sm font-medium">
                Status: <span className="capitalize">{order.status.replace("_", " ")}</span>
            </div>
            <div className="rounded-xl bg-white p-4 shadow-sm space-y-2">
                <h2 className="font-semibold">Items</h2>
                {
                    order.items.map((item, i) => (
                        <div className="flex justify-between text-sm" key={i}>
                            <span>{item.name} x {item.quantity}</span>
                            <span>₹{item.price * item.quantity}</span>
                        </div>
                    ))
                }
            </div>
            <div className="rounded-xl bg-white p-4 shadow-sm space-y-1">
                <h2 className="font-semibold">Delivery address</h2>
                <p className="text-sm text-gray-500">
                    {order.deliveryAddress.formattedAddress}
                </p>
                <p className="text-sm text-gray-600">Mobile: {order.deliveryAddress.mobile}</p>
            </div>
            <div className="rounded-xl bg-white p-4 shadow-sm space-y-2">
                <div className="flex justify-between text-sm">
                    <span className="">SubTotal</span>
                    <span>₹{order.subTotal}</span>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="">Delivery Fee</span>
                    <span>₹{order.deliveryFee}</span>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="">Platform Fee</span>
                    <span>₹{order.platformFee}</span>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="">Total</span>
                    <span>₹{order.totalAmount}</span>
                </div>
                <p className="text-xs text-gray-500">Payment Method: {order.paymentMethod}</p>
                <p className="text-xs text-gray-500">Payment Status: {order.status}</p>
            </div>
            {
                (order.status === "rider_assigned" || order.status === "picked_up") && (riderLocation ?
                    <UserOrderMap riderLocation={riderLocation} deliveryLocation={[order.deliveryAddress.latitude!, order.deliveryAddress.longitude!]} />
                    :
                    <p className="">Waiting for rider location</p>
                )
            }
        </div>
    )
}

export default OrderPage
