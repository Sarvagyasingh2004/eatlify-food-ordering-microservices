import axios from "axios";
import toast from "react-hot-toast";
import { adminService } from "../main";

const AdminRestaurantCard = ({ restaurant, onVerify }: { restaurant: any, onVerify: () => void }) => {
    const verify = async () => {
        try {
            await axios.patch(`${adminService}/api/v1/admin/verify/restaurant/${restaurant._id}`, {}, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
            });
            toast.success("Restaurant verified");
            // refresh the pending list so the verified card disappears
            onVerify();
        } catch (error) {
            toast.error("Failed to verify restaurant");
            console.error(error);
        }
    }
    return (
        <div className="rounded-xl bg-white p-4 shadow space-y-2">
            <img src={restaurant.image} alt="RestaurantImage" className="h-40 w-full object-cover rounded" />
            <h3>{restaurant.name}</h3>
            <p className="text-sm text-gray-500">{restaurant.phone}</p>
            <p>{restaurant.autoLocation?.formattedAddress}</p>
            <button className="w-full bg-green-500 py-2 text-white hover:bg-green-600" onClick={verify}>Verify Restaurant</button>
        </div>
    )
}

export default AdminRestaurantCard
