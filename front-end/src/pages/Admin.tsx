import axios from "axios";
import { useEffect, useState } from "react"
import { adminService } from "../main";
import toast from "react-hot-toast";
import AdminRestaurantCard from "../components/AdminRestaurantCard";
import AdminRiderCard from "../components/AdminRiderCard";
import RoleHeader from "../components/RoleHeader";

const Admin = () => {
    const [restaurant, setRestaurant] = useState<any[]>([]);
    const [rider, setRider] = useState<any[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [tab, setTab] = useState<"restaurant" | "rider">("restaurant");

    const fetchData = async () => {
        try {
            const restaurantRes = await axios.get(`${adminService}/api/v1/admin/restaurant/pending`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
            });
            const riderRes = await axios.get(`${adminService}/api/v1/admin/rider/pending`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
            });

            setRestaurant(restaurantRes.data.restaurants);
            setRider(riderRes.data.riders);
        } catch (error) {
            toast.error("Failed to fetch pending requests");
            console.error(error);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchData();
    }, []);

    if (loading) {
        return <div className="flex h-[60vh] items-center justify-center">
            <p className="text-gray-500">Loading admin panel...</p>
        </div>
    }
    return (
        <div className="min-h-screen bg-gray-50">
            <RoleHeader title="Admin dashboard" />
            <div className="mx-auto max-w-6xl px-6 py-6 space-y-6">
            <div className="flex gap-4">
                <button onClick={() => setTab("restaurant")} className={`px-4 py-2 rounded ${tab === "restaurant" ? "bg-red-500 text-white" : "bg-gray-200"}`}>Restaurant</button>

                <button onClick={() => setTab("rider")} className={`px-4 py-2 rounded ${tab === "rider" ? "bg-red-500 text-white" : "bg-gray-200"}`}>Rider</button>
            </div>
            {
                tab === "restaurant" && <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {
                        restaurant.length === 0 ? <p className="">No pending restaurants</p> :
                            restaurant.map((r) => (
                                <AdminRestaurantCard key={r._id} restaurant={r} onVerify={fetchData} />
                            ))
                    }
                </div>
            }

            {
                tab === "rider" && <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {
                        rider.length === 0 ? <p className="">No pending riders</p> :
                            rider.map((r) => (
                                <AdminRiderCard key={r._id} rider={r} onVerify={fetchData} />
                            ))
                    }
                </div>
            }
            </div>
        </div>
    )
}

export default Admin
