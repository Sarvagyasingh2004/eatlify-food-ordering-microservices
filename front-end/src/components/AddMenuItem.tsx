import axios from "axios";
import { useState } from "react"
import { restaurantService } from "../main";
import toast from "react-hot-toast";
import { BiUpload } from "react-icons/bi";

const AddMenuItem = ({ onItemAdded }: { onItemAdded: () => void }) => {
    const [name, setName] = useState<string>("");
    const [description, setDescription] = useState<string>("");
    const [price, setPrice] = useState<string>("");
    const [image, setImage] = useState<File | null>(null);
    const [loading, setLoading] = useState<boolean>(false);

    const resetForm = () => {
        setName("");
        setDescription("");
        setPrice("");
        setImage(null);
    };

    const handleSubmit = async () => {
        if (!name || !price || !image) {
            alert("Name, price and image is required");
            return;
        }
        const formData = new FormData();
        formData.append("name", name);
        formData.append("description", description);
        formData.append("price", price);
        formData.append("file", image);
        try {
            setLoading(true);
            await axios.post(`${restaurantService}/api/item/add`, formData, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`
                }
            });
            toast.success("Item added successfully");
            resetForm();
            onItemAdded();
        } catch (error) {
            console.log(error);
            toast.error("Failed to add item");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-md space-y-4 mx-auto">
            <h2 className="text-lg font-semibold">Add Menu Item</h2>
            <input
                type="text"
                placeholder="Item name"
                value={name}
                onChange={e => setName(e.target.value)} className="w-full rounded-lg border px-4 py-2 text-sm outline-none"
            />
            <textarea
                placeholder="Item description"
                value={description}
                onChange={e => setDescription(e.target.value)} className="w-full rounded-lg border px-4 py-2 text-sm outline-none"
            />
            <input
                type="number"
                placeholder="Item price"
                value={price}
                onChange={e => setPrice(e.target.value)} className="w-full rounded-lg border px-4 py-2 text-sm outline-none"
            />
            <label className="flex cursor-pointer items-center gap-3 rounded-lg border p-4 text-sm text-gray-600 hover:bg-gray-50">
                <BiUpload className="h-5 w05 text-red-500" />
                {image ? image.name : "Upload Menu item image"}
                <input
                    type="file"
                    accept="image/*" hidden
                    onChange={e => setImage(e.target.files?.[0] || null)}
                />
            </label>
            <button
                className="w-full rounded-lg py-3 text-sm font-semibold text-white bg-[#E23744] cursor-pointer"
                disabled={loading}
                onClick={handleSubmit}
            >
                {
                    loading ? "Adding..." : "Add Item"
                }
            </button>
        </div>
    )
}

export default AddMenuItem
