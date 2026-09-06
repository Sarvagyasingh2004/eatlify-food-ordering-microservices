import { useState } from "react"
import { useAppData } from "../context/AppContext";
import toast from "react-hot-toast";
import axios from "axios";
import { restaurantService } from "../main";
import { BiMapPin, BiUpload } from "react-icons/bi";

interface props {
    fetchMyRestaurant: () => Promise<void>;
}

const AddRestaurant = ({ fetchMyRestaurant }: props) => {
    const [name, setName] = useState<string>("");
    const [description, setDescription] = useState<string>("");
    const [phone, setPhone] = useState<string>("");
    const [image, setImage] = useState<File | null>(null);
    const [submitting, setSubmitting] = useState<boolean>(false);

    const { location, locationLoading } = useAppData();
    const handleSubmit = async () => {
        if (!name || !image || !location?.formattedAddress) {
            alert("Please wait for your location to be detected");
            return;
        }

        const formData = new FormData();
        formData.append("name", name);
        formData.append("description", description);
        formData.append("latitude", String(location.latitude));
        formData.append("longitude", String(location.longitude));
        formData.append("formattedAddress", location.formattedAddress);
        formData.append("file", image);
        formData.append("phone", phone);

        try {
            setSubmitting(true);
            await axios.post(`${restaurantService}/api/restaurant/add`, formData, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                }
            });
            toast.success("Restaurant added successfully");
            fetchMyRestaurant();
        } catch (error: any) {
            toast.error(error.response.data.message);
        } finally {
            setSubmitting(false);
        }
    }
    return (
        <div className="min-h-screen bg-gray-50 px-4 py-6">
            <div className="mx-auto max-w-lg rounded-xl bg-white p-6 shadow-sm space-y-5">
                <h1 className="text-xl font-semibold">Add your restaurant</h1>
                <input
                    type="text"
                    placeholder="Restaurant name"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full border rounded-lg px-4 py-2 text-sm outline-none"
                />
                <input
                    type="number"
                    placeholder="Contact number"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="w-full border rounded-lg px-4 py-2 text-sm outline-none"
                />
                <textarea
                    placeholder="Restaurant description"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    className="w-full border rounded-lg px-4 py-2 text-sm outline-none"
                />
                <label className="flex cursor-pointer items-center gap-3 rounded-lg border p-4 text-sm text-gray-600 hover:bg-gray-50">
                    <BiUpload className="h-5 w05 text-red-500" />
                    {image ? image.name : "Upload restaurant image"}
                    <input
                        type="file"
                        accept="image/*" hidden
                        onChange={e => setImage(e.target.files?.[0] || null)}
                    />
                </label>
                <div className="flex items-start gap-3 rounded-lg border p-4">
                    <BiMapPin className="mt-0.5 h-5 w-5 text-red-500" />
                    <div className="text-sm">
                        {
                            locationLoading ? "Fetching your location" : location?.formattedAddress || "Location not available"
                        }
                    </div>
                </div>
                <button
                    className="w-full rounded-lg py-3 text-sm font-semibold text-white bg-[#E23744] cursor-pointer"
                    disabled={submitting}
                    onClick={handleSubmit}
                >
                    {
                        submitting ? "Submitting" : "Add Restaurant"
                    }
                </button>
            </div>
        </div>
    )
}

export default AddRestaurant
