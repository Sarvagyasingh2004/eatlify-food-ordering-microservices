import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { riderService } from "../main";
import type { EarningsRange, IRiderEarnings } from "../types";
import { rupees, shortDate } from "../utils/format";
import RangeTabs from "./RangeTabs";

const RiderEarnings = () => {
    const [range, setRange] = useState<EarningsRange>("7d");
    const [data, setData] = useState<IRiderEarnings | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    const fetchEarnings = useCallback(async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${riderService}/api/rider/earnings?range=${range}`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
            });
            setData(res.data);
        } catch (error) {
            toast.error("Failed to load earnings");
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [range]);

    useEffect(() => {
        fetchEarnings();
    }, [fetchEarnings]);

    if (loading && !data) {
        return <p className="py-8 text-center text-sm text-gray-500">Loading earnings...</p>;
    }

    if (!data) {
        return <p className="py-8 text-center text-sm text-gray-500">No earnings data yet.</p>;
    }

    const peak = Math.max(...data.daily.map((d) => d.earnings), 1);

    return (
        <div className="space-y-5">
            <RangeTabs value={range} onChange={setRange} />

            {data.deliveries === 0 ? (
                <p className="rounded-lg bg-gray-50 py-8 text-center text-sm text-gray-500">
                    No deliveries in this period yet.
                </p>
            ) : (
                <>
                    <div className="rounded-xl bg-[#E23744] p-5 text-white">
                        <p className="text-xs opacity-80">Total earned</p>
                        <p className="mt-1 text-3xl font-semibold">{rupees(data.earnings)}</p>
                        <p className="mt-1 text-xs opacity-80">
                            {data.deliveries} deliver{data.deliveries === 1 ? "y" : "ies"} · {data.distance} km
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-lg border border-gray-100 bg-white p-4">
                            <p className="text-xs text-gray-500">Avg per delivery</p>
                            <p className="mt-1 text-lg font-semibold">{rupees(data.averagePerDelivery)}</p>
                        </div>
                        <div className="rounded-lg border border-gray-100 bg-white p-4">
                            <p className="text-xs text-gray-500">Distance covered</p>
                            <p className="mt-1 text-lg font-semibold">{data.distance} km</p>
                        </div>
                    </div>

                    {data.daily.length > 0 && (
                        <div className="rounded-lg border border-gray-100 bg-white p-4">
                            <p className="mb-4 text-sm font-medium text-gray-700">Daily earnings</p>
                            <div className="space-y-2">
                                {data.daily.map((day) => (
                                    <div key={day.date} className="flex items-center gap-3">
                                        <span className="w-14 shrink-0 text-xs text-gray-500">
                                            {shortDate(day.date)}
                                        </span>
                                        <div className="h-5 flex-1 overflow-hidden rounded bg-gray-100">
                                            <div
                                                className="h-full rounded bg-[#E23744]/80"
                                                style={{ width: `${Math.max((day.earnings / peak) * 100, 2)}%` }}
                                            />
                                        </div>
                                        <span className="w-16 shrink-0 text-right text-xs font-medium">
                                            {rupees(day.earnings)}
                                        </span>
                                        <span className="w-10 shrink-0 text-right text-xs text-gray-400">
                                            {day.deliveries}x
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

export default RiderEarnings;
