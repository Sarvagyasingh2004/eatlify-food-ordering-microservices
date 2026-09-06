import { useEffect, useState } from "react";
import { useParams } from "react-router-dom"
import { type IRestaurant, type IMenuItem } from "../types";
import axios from "axios";
import { restaurantService } from "../main";
import toast from "react-hot-toast";
import RestaurantProfile from "../components/RestaurantProfile";
import MenuItems from "../components/MenuItems";

const RestaurantPage = () => {
    const { id } = useParams();
    const [restaurant, setRestaurant] = useState<IRestaurant | null>(null);
    const [menuItems, setMenuItems] = useState<IMenuItem[]>([]);
    const [loading, setLoading] = useState<boolean>(true);

    const fetchRestaurant = async () => {
        try {
            const { data } = await axios.get(`${restaurantService}/api/restaurant/${id}`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`
                }
            });
            setRestaurant(data.restaurant);
        } catch (error) {
            console.error(error);
            toast.error("Failed to fetch restaurant details");
        } finally {
            setLoading(false);
        }
    };

    const fetchMenuItems = async () => {
        try {
            const { data } = await axios.get(`${restaurantService}/api/item/all/${id}`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`
                }
            });
            setMenuItems(data);
        } catch (error) {
            console.log(error);
        }
    }

    useEffect(() => {
        if (id) {
            fetchRestaurant();
            fetchMenuItems();
        }
    }, [id]);

    if (loading) {
        return <div className="flex h-[60vh] items-center justify-center ">
            <p className="text-gray-500">Loading restaurant...</p>
        </div>
    }

    if (!restaurant) {
        return <div className="flex h-[60vh] items-center justify-center ">
            <p className="text-gray-500">No restaurant with this id</p>
        </div>
    }
    return (
        <div className="min-h-screen bg-gray-50 px-4 py-6 space-y-6">
            <RestaurantProfile restaurant={restaurant} onUpdate={setRestaurant} isSeller={false} />
            <div className="rounded-xl bg-white shadow-sm p-4">
                <MenuItems isSeller={false} items={menuItems} onItemDeleted={() => { }} />
            </div>
        </div>
    )
}

export default RestaurantPage
