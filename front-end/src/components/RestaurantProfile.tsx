import { useState } from "react";
import type { IRestaurant } from "../types"
import axios from "axios";
import { restaurantService } from "../main";
import toast from "react-hot-toast";
import { BiEdit, BiMapPin, BiSave } from "react-icons/bi";

interface props {
    restaurant: IRestaurant;
    isSeller: boolean;
    onUpdate: (restaurant: IRestaurant) => void;
}

const RestaurantProfile = ({ restaurant, isSeller, onUpdate }: props) => {
    const [editMode, setEditMode] = useState<boolean>(false);
    const [name, setName] = useState<string>(restaurant.name);
    const [description, setDescription] = useState<string | undefined>(restaurant.description);
    const [isOpen, setIsOpen] = useState<boolean>(restaurant.isOpen);
    const [loading, setLoading] = useState<boolean>(false);

    const toggleOpenStatus = async () => {
        try {
            const { data } = await axios.put(`${restaurantService}/api/restaurant/status`, {
                status: !isOpen
            },
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem("token")}`
                    },
                });
            toast.success(data.message);
            setIsOpen(data.restaurant.isOpen);
        } catch (error: any) {
            console.log(error);
            toast.error(error.response.data.message);
        }
    };

    const saveChanges = async () => {
        try {
            setLoading(true);
            const { data } = await axios.put(`${restaurantService}/api/restaurant/edit`, {
                name, description
            },
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem("token")}`
                    }
                });
            onUpdate(data.restaurant);
            toast.success(data.message);
            setEditMode(false);
        } catch (error: any) {
            console.log(error);
            toast.error("Failed to update");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="mx-auto max-w-xl rounded-lg bg-white shadow-sm overflow-hidden">
            {restaurant.image && (
                <img
                    src={restaurant.image}
                    alt="Image"
                    className="h-48 w-full object-cover"
                />
            )}
            <div className="p-5 space-y-4">

                <div className="flex items-start justify-between">
                    <div>
                        {
                            editMode ? (
                                <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full rounded border px-2 py-1 text-lg font-semibold" />
                            ) : (
                                <h2 className="text-xl font-semibold">{restaurant.name}</h2>
                            )
                        }
                        <div className="mt-1 flex items-center gap-2 text-sm text-gray-500">
                            <BiMapPin className="h-4 w-4 text-red-500" />
                            {restaurant.autoLocation.formattedAddress || "Location unavailable"}
                        </div>
                    </div>
                    {
                        isSeller && <button onClick={() => setEditMode(!editMode)} className="text-gray-500 hover:text-black">
                            <BiEdit size={18} />
                        </button>
                    }
                </div>


                {
                    editMode ? <textarea value={description} onChange={e => setDescription(e.target.value)}
                        className="w-full rounded border px-3 py-2 text-sm"
                    /> :
                        <p className="text-sm text-gray-600">
                            {restaurant.description || "No description added"}
                        </p>
                }

                <div className="flex items-center justify-between pt-3 border-t">
                    <span className={`text-sm font-medium ${isOpen ? "text-green-600" : "text-red-600"}`} >
                        {isOpen ? "OPEN" : "CLOSED"}
                    </span>
                    <div className="flex gap-3">
                        {
                            editMode && <button onClick={saveChanges} disabled={loading} className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-white hover:bg-blue-700 disabled:opacity-50">
                                <BiSave size={16} />
                                Save
                            </button>
                        }
                        {
                            isSeller && <button onClick={toggleOpenStatus} className={`rounded-lg px-4 py-1.5 text-sm font-medium text-white ${isOpen ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"}`}>
                                {isOpen ? "Close restaurant" : "Open Restaurant"}
                            </button>
                        }
                    </div>
                </div>
                <p className="text-xs text-gray-400">Created on {new Date(restaurant.createdAt).toLocaleDateString()}</p>
            </div>
        </div >
    )
}

export default RestaurantProfile
