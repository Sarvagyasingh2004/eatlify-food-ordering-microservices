import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { restaurantService } from "../main";
import type { EarningsRange, IRestaurantStats } from "../types";
import { rupees, shortDate } from "../utils/format";
import RangeTabs from "./RangeTabs";

interface Props {
    restaurantId: string;
}

const SellerSales = ({ restaurantId }: Props) => {
    const [range, setRange] = useState<EarningsRange>("30d");
    const [stats, setStats] = useState<IRestaurantStats | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    const fetchStats = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await axios.get(
                `${restaurantService}/api/order/restaurant/${restaurantId}/stats?range=${range}`,
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem("token")}`,
                    },
                },
            );
            setStats(data);
        } catch (error) {
            toast.error("Failed to load sales");
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [restaurantId, range]);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    if (loading && !stats) {
        return <p className="py-8 text-center text-sm text-gray-500">Loading sales...</p>;
    }

    if (!stats) {
        return <p className="py-8 text-center text-sm text-gray-500">No sales data yet.</p>;
    }

    const { earned, pending, topItems, daily, commissionRate, averageOrderValue } = stats;
    const peakGross = Math.max(...daily.map((d) => d.gross), 1);

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-semibold">Sales</h2>
                <RangeTabs value={range} onChange={setRange} />
            </div>

            {earned.orders === 0 && pending.orders === 0 ? (
                <p className="rounded-lg bg-gray-50 py-8 text-center text-sm text-gray-500">
                    No orders in this period yet.
                </p>
            ) : (
                <>
                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                        <div className="rounded-lg border border-gray-100 bg-white p-4">
                            <p className="text-xs text-gray-500">Net payout</p>
                            <p className="mt-1 text-xl font-semibold text-green-600">{rupees(earned.net)}</p>
                            <p className="mt-1 text-xs text-gray-400">after commission</p>
                        </div>
                        <div className="rounded-lg border border-gray-100 bg-white p-4">
                            <p className="text-xs text-gray-500">Gross food sales</p>
                            <p className="mt-1 text-xl font-semibold">{rupees(earned.gross)}</p>
                            <p className="mt-1 text-xs text-gray-400">{earned.orders} delivered</p>
                        </div>
                        <div className="rounded-lg border border-gray-100 bg-white p-4">
                            <p className="text-xs text-gray-500">
                                Commission ({Math.round(commissionRate * 100)}%)
                            </p>
                            <p className="mt-1 text-xl font-semibold text-gray-700">-{rupees(earned.commission)}</p>
                            <p className="mt-1 text-xs text-gray-400">platform fee</p>
                        </div>
                        <div className="rounded-lg border border-gray-100 bg-white p-4">
                            <p className="text-xs text-gray-500">Avg order value</p>
                            <p className="mt-1 text-xl font-semibold">{rupees(averageOrderValue)}</p>
                            <p className="mt-1 text-xs text-gray-400">gross per order</p>
                        </div>
                    </div>

                    {pending.orders > 0 && (
                        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                            <p className="text-sm font-medium text-amber-900">
                                {pending.orders} order{pending.orders === 1 ? "" : "s"} in progress
                            </p>
                            <p className="mt-1 text-xs text-amber-700">
                                {rupees(pending.net)} will be added once delivered
                                <span className="text-amber-600"> ({rupees(pending.gross)} gross)</span>
                            </p>
                        </div>
                    )}

                    {daily.length > 0 && (
                        <div className="rounded-lg border border-gray-100 p-4">
                            <p className="mb-4 text-sm font-medium text-gray-700">Daily gross sales</p>
                            <div className="space-y-2">
                                {daily.map((day) => (
                                    <div key={day.date} className="flex items-center gap-3">
                                        <span className="w-14 shrink-0 text-xs text-gray-500">
                                            {shortDate(day.date)}
                                        </span>
                                        <div className="h-5 flex-1 overflow-hidden rounded bg-gray-100">
                                            <div
                                                className="h-full rounded bg-[#E23744]/80"
                                                style={{ width: `${Math.max((day.gross / peakGross) * 100, 2)}%` }}
                                            />
                                        </div>
                                        <span className="w-20 shrink-0 text-right text-xs font-medium">
                                            {rupees(day.gross)}
                                        </span>
                                        <span className="w-12 shrink-0 text-right text-xs text-gray-400">
                                            {day.orders}x
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {topItems.length > 0 && (
                        <div className="rounded-lg border border-gray-100 p-4">
                            <p className="mb-3 text-sm font-medium text-gray-700">Best sellers</p>
                            <div className="divide-y divide-gray-100">
                                {topItems.map((item, index) => (
                                    <div key={item.name} className="flex items-center justify-between py-2">
                                        <span className="flex items-center gap-3 text-sm">
                                            <span className="w-4 text-xs text-gray-400">{index + 1}</span>
                                            {item.name}
                                        </span>
                                        <span className="flex items-center gap-4 text-xs">
                                            <span className="text-gray-500">{item.quantity} sold</span>
                                            <span className="w-20 text-right font-medium">{rupees(item.revenue)}</span>
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default SellerSales;
