import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { riderService } from "../main";
import type { IPaginatedOrders } from "../types";
import { dateTime, rupees } from "../utils/format";

const RiderCompletedOrders = () => {
    const [page, setPage] = useState<number>(1);
    const [data, setData] = useState<IPaginatedOrders | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    const fetchOrders = useCallback(async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${riderService}/api/rider/orders/completed?page=${page}&limit=10`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
            });
            setData(res.data);
        } catch (error) {
            toast.error("Failed to load completed orders");
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [page]);

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    if (loading && !data) {
        return <p className="py-8 text-center text-sm text-gray-500">Loading deliveries...</p>;
    }

    if (!data || data.orders.length === 0) {
        return (
            <p className="rounded-lg bg-gray-50 py-8 text-center text-sm text-gray-500">
                No completed deliveries yet.
            </p>
        );
    }

    return (
        <div className="space-y-4">
            <p className="text-xs text-gray-500">
                {data.total} completed deliver{data.total === 1 ? "y" : "ies"}
            </p>

            <div className="space-y-3">
                {data.orders.map((order) => (
                    <div key={order._id} className="rounded-lg border border-gray-100 bg-white p-4">
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <p className="truncate text-sm font-medium">{order.restaurantName}</p>
                                <p className="mt-1 truncate text-xs text-gray-500">
                                    {order.deliveryAddress.formattedAddress}
                                </p>
                            </div>
                            <div className="shrink-0 text-right">
                                <p className="text-sm font-semibold text-green-600">{rupees(order.riderAmount)}</p>
                                <p className="mt-1 text-xs text-gray-400">{order.distance} km</p>
                            </div>
                        </div>
                        <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-2">
                            <span className="text-xs text-gray-400">{dateTime(order.updatedAt)}</span>
                            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">
                                Delivered
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            {data.totalPages > 1 && (
                <div className="flex items-center justify-between">
                    <button
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1 || loading}
                        className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium disabled:opacity-40"
                    >
                        Previous
                    </button>
                    <span className="text-xs text-gray-500">
                        Page {data.page} of {data.totalPages}
                    </span>
                    <button
                        onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                        disabled={page >= data.totalPages || loading}
                        className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium disabled:opacity-40"
                    >
                        Next
                    </button>
                </div>
            )}
        </div>
    );
};

export default RiderCompletedOrders;
