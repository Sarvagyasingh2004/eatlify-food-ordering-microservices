import { useEffect, useState } from "react"
import type { IMenuItem, IRestaurant } from "../types";
import { restaurantService } from "../main";
import axios from "axios";
import AddRestaurant from "../components/AddRestaurant";
import RestaurantProfile from "../components/RestaurantProfile";
import MenuItems from "../components/MenuItems";
import AddMenuItem from "../components/AddMenuItem";
import RestaurantOrders from "../components/RestaurantOrders";
import SellerSales from "../components/SellerSales";
import RoleHeader from "../components/RoleHeader";
import { useSocket } from "../context/SocketContext";

type SellerTab = "menu" | "add-item" | "sales";

const Restaurant = () => {
    const [restaurant, setRestaurant] = useState<IRestaurant | null>(null);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<SellerTab>("menu");
    const [menuItems, setMenuItems] = useState<IMenuItem[]>([]);

    const { reconnect } = useSocket();

    const fetchMenuItems = async (restaurantId: string) => {
        try {
            const { data } = await axios.get(`${restaurantService}/api/item/all/${restaurantId}`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`
                }
            });
            setMenuItems(data);
        } catch (error) {
            console.log(error);
        }
    }

    const fetchMyRestaurant = async () => {
        try {
            const { data } = await axios.get(`${restaurantService}/api/restaurant/my`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`
                }
            });

            setRestaurant(data.restaurant || null);

            if (data.token) {
                // the new token carries restaurantId, so reconnect to join the restaurant room
                localStorage.setItem("token", data.token);
                reconnect();
            }
        } catch (error) {
            console.log(error);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchMyRestaurant();
    }, []);

    useEffect(() => {
        if (restaurant?._id) {
            fetchMenuItems(restaurant._id);
        }
    }, [restaurant]);

    if (loading) {
        return <div className="flex min-h-screen items-center justify-center">
            <p className="text-gray-500">Loading your restaurant...</p>
        </div>
    }

    if (!restaurant) {
        return <AddRestaurant fetchMyRestaurant={fetchMyRestaurant} />;
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <RoleHeader title="Restaurant dashboard" />
            <div className="px-4 py-6 space-y-6">
            <RestaurantProfile
                restaurant={restaurant}
                onUpdate={setRestaurant}
                isSeller={true}
            />
            <RestaurantOrders restaurantId={restaurant._id} />
            <div className="rounded-xl bg-white shadow-sm">
                <div className="flex border-b">
                    {[
                        { key: "menu", label: "Menu Items" },
                        { key: "add-item", label: "Add Item" },
                        { key: "sales", label: "Sales" }
                    ].map((t) => (
                        <button
                            key={t.key}
                            onClick={() => setTab(t.key as SellerTab)}
                            className={`flex-1 px-4 py-3 text-sm font-medium transition ${tab === t.key ? "border-b-2 border-red-500 text-red-500" : "text-gray-500 hover:text-gray-700"}`}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>
                <div className="p-5">
                    {
                        tab === "menu" && <MenuItems items={menuItems} onItemDeleted={() => fetchMenuItems(restaurant._id)} isSeller={true} />
                    }
                    {
                        tab === "add-item" && <AddMenuItem onItemAdded={() => fetchMenuItems(restaurant._id)} />
                    }
                    {
                        tab === "sales" && <SellerSales restaurantId={restaurant._id} />
                    }
                </div>
            </div>
            </div>
        </div>
    )
}

export default Restaurant
