import { useEffect, useState } from "react"
import type { IOrder } from "../types"
import { useNavigate } from "react-router-dom"
import { useSocket } from "../context/SocketContext"
import axios from "axios"
import toast from "react-hot-toast"
import { restaurantService } from "../main"
import OrderRow from "../components/OrderRow"


const ACTIVE_STATUSES = [
    "placed",
    "accepted",
    "preparing",
    "ready_for_rider",
    "rider_assigned",
    "picked_up",
]

const Orders = () => {
    const [orders, setOrders] = useState<IOrder[]>([])
    const [loading, setLoading] = useState<boolean>(true);

    const navigate = useNavigate();;
    const { socket } = useSocket();

    const fetchOrders = async () => {
        try {
            const { data } = await axios.get(`${restaurantService}/api/order/myorder`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                }
            });
            setOrders(data || []);
        } catch (error) {
            toast.error("Error while fetching orders");
            console.log(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, []);

    useEffect(() => {
        if (!socket) return;

        const onOrderUpdate = () => {
            fetchOrders();
        };

        socket.on("order:update", onOrderUpdate);
        socket.on("order:rider_assigned", onOrderUpdate);

        return () => {
            socket.off("order:update", onOrderUpdate);
            socket.off("order:rider_assigned", onOrderUpdate);
        }
    }, [socket]);


    if (loading) {
        return <p className="text-center text-gray-500">Loading orders...</p>
    }

    if (orders.length === 0) {
        return <div className="flex min-h-[60vh] items-center justify-center">
            <p className="text-gray-500">No orders yet</p>
        </div>
    }

    const activeOrders = orders.filter((order) => ACTIVE_STATUSES.includes(order.status));

    const completedOrders = orders.filter((order) => !ACTIVE_STATUSES.includes(order.status));

    return (
        <div className="mx-auto max-w-4xl px-4 py-6 space-y-6">
            <h1 className="text-2xl font-bold">My Orders</h1>
            <section className="space-y-3">
                <h2 className="text-lg font-semibold">Active Orders</h2>

                {
                    activeOrders.length === 0 ? <p>No active orders</p> : activeOrders.map((order) => (
                        <OrderRow key={order._id} order={order} onClick={() => navigate(`/order/${order._id}`)} />
                    ))
                }
            </section>

            <section className="space-y-3">
                <h2 className="text-lg font-semibold">Completed Orders</h2>

                {
                    completedOrders.length === 0 ? <p>No Completed orders</p> : completedOrders.map((order) => (
                        <OrderRow key={order._id} order={order} onClick={() => navigate(`/order/${order._id.toString()}`)} />
                    ))
                }
            </section>

        </div>
    )
}

export default Orders
