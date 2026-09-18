import { useEffect, useRef, useState } from "react";
import type { IOrder } from "../types";
import { useSocket } from "../context/SocketContext";
import audio from "../assets/restaurant.mp3";
import axios from "axios";
import { restaurantService } from "../main";
import toast from "react-hot-toast";
import OrderCard from "./OrderCard";

const ACTIVE_STATUSES = ["placed", "accepted", "preparing", "ready_for_rider", "rider_assigned", "picked_up"];

const RestaurantOrders = ({ restaurantId }: { restaurantId: string }) => {
    const [orders, setOrders] = useState<IOrder[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [audioUnlocked, setAudioUnlocked] = useState<boolean>(false);

    const { socket } = useSocket();

    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        audioRef.current = new Audio(audio);
        audioRef.current.load();
    }, []);

    const unLockAudio = () => {
        if (audioRef.current) {
            audioRef.current.play().then(() => {
                audioRef.current!.pause();
                audioRef.current!.currentTime = 0;
                setAudioUnlocked(true);
                toast.success("Notification sound enabled");
                console.log("Audio unlocked");
            }).catch((err) => console.log("Failed to unlock audio", err));
        }
    };

    const fetchOrders = async () => {
        try {
            const { data } = await axios.get(`${restaurantService}/api/order/restaurant/${restaurantId}`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                }
            });
            setOrders(data.orders);
        } catch (error) {
            toast.error("Failed to fetch orders");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, [restaurantId]);

    useEffect(() => {
        if (!socket) return;
        const onNewOrder = () => {
            console.log("New order recieved");

            if (audioUnlocked && audioRef.current) {
                audioRef.current.currentTime = 0;
                audioRef.current.play().catch((err) => console.error("Audio play failed", err));
            }
            fetchOrders();
        };

        socket.on("order:new", onNewOrder);

        return () => {
            socket.off("order:new", onNewOrder);
        }
    }, [socket, audioUnlocked]);

    useEffect(() => {
        if (!socket)
            return;

        const onOrderUpdate = () => {
            fetchOrders();
        }

        // rider assignment and every later status change (picked_up, delivered)
        socket.on("order:rider_assigned", onOrderUpdate);
        socket.on("order:update", onOrderUpdate);

        return () => {
            socket.off("order:rider_assigned", onOrderUpdate);
            socket.off("order:update", onOrderUpdate);
        }
    }, [socket]);

    if (loading) {
        return <p className="text-gray-500">Loading orders....</p>
    }

    const activeOrders = orders.filter((order) => ACTIVE_STATUSES.includes(order.status));

    const completedOrders = orders.filter((order) => !ACTIVE_STATUSES.includes(order.status));


    return (
        <div className="space-y-6">
            {!audioUnlocked && <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <span className="text-2xl">🔔</span>
                    <div>
                        <p className="font-medium text-blue-900">Enable Sound Notification
                        </p>
                        <p className="text-sm text-blue-700">Get Notified when new orders arrive
                        </p>
                    </div>
                </div>
                <button onClick={unLockAudio} className="bg-blue-600 hve:bg-blue-700 px-4 py-2 rounded-lg font-medium transition text-white">Enable Sound</button>
            </div>}
            {/* Active Orders */}
            <div className="space-y-3">
                <h3 className="text-lg font-semibold">Active orders</h3>
                {
                    activeOrders.length === 0 ? <p className="text-sm text-gray-500">No active orders</p> :
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {
                                activeOrders.map((order) => (
                                    <OrderCard key={order._id} order={order} onStatusUpdate={fetchOrders} />
                                ))
                            }
                        </div>
                }
            </div>
            <div className="space-y-3">
                <h3 className="text-lg font-semibold">Completed orders</h3>
                {
                    completedOrders.length === 0 ? <p className="text-sm text-gray-500">No completed orders</p> :
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {
                                completedOrders.map((order) => (
                                    <OrderCard key={order._id} order={order} onStatusUpdate={fetchOrders} />
                                ))
                            }
                        </div>
                }
            </div>
        </div>
    )
}

export default RestaurantOrders
