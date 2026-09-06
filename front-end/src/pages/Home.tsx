import { useSearchParams } from "react-router-dom";
import { useAppData } from "../context/AppContext"
import { useEffect, useState } from "react";
import { type IRestaurant } from "../types";
import axios from "axios";
import { restaurantService } from "../main";
import toast from "react-hot-toast";
import RestaurantCard from "../components/RestaurantCard";

const Home = () => {
    const { location } = useAppData();
    const [searchParams] = useSearchParams();
    const search = searchParams.get("search");
    const [restaurants, setRestaurants] = useState<IRestaurant[]>([]);
    const [loading, setLoading] = useState(true);

    //haversine formula
    const getDistanceInKilometers = (lat1: number, long1: number, lat2: number, long2: number): number => {
        const R = 6371;
        const dLat = ((lat2 - lat1) * Math.PI) / 180;
        const dLong = ((long2 - long1) * Math.PI) / 180;

        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLong / 2) * Math.sin(dLong / 2);

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return +(R * c).toFixed(2);
    }

    const fetchRestaurants = async () => {
        if (!location?.latitude || !location?.longitude) {
            return;
        }
        try {
            setLoading(true);
            const { data } = await axios.get(`${restaurantService}/api/restaurant/all`, {
                params: {
                    latitude: location.latitude,
                    longitude: location.longitude,
                    search
                },
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`
                }
            })

            setRestaurants(data.restaurants ?? []);
        } catch (error) {
            console.error(error);
            toast.error("Failed to get restaurants in your area");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRestaurants();
    }, [location, search])

    if (loading || !location) {
        return <div className="flex h-[60vh] items-center justify-center ">
            <p className="text-gray-500">Finding restaurants near you...</p>
        </div>
    }


    return (
        <div className="mx-auto max-w-7xl px-4 py-6">
            {
                restaurants.length > 0 ? <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                    {
                        restaurants.map((restaurant) => {
                            const [restaurantLongitude, restaurantLatitude] = restaurant.autoLocation.coordinates;
                            const distance = getDistanceInKilometers(location.latitude, location.longitude, restaurantLatitude, restaurantLongitude);

                            return <RestaurantCard key={restaurant._id} id={restaurant._id} name={restaurant.name} image={restaurant.image ?? ""} distance={`${distance}`} isOpen={restaurant.isOpen} />
                        })
                    }
                </div> :
                    <p className="text-center text-gray-500">No restaurant found</p>
            }
        </div>
    )
}

export default Home
