import axios from "axios";
import toast from "react-hot-toast";
import { adminService } from "../main";

const AdminRiderCard = ({ rider, onVerify }: { rider: any, onVerify: () => void }) => {
    const verify = async () => {
        try {
            await axios.patch(`${adminService}/api/v1/admin/verify/rider/${rider._id}`, {}, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
            });
            toast.success("Rider verified");
            // refresh the pending list so the verified card disappears
            onVerify();
        } catch (error) {
            toast.error("Failed to verify rider");
            console.error(error);
        }
    }
    return (
        <div className="rounded-xl bg-white p-4 shadow space-y-2">
            <img src={rider.picture} alt="RiderImage" className="h-40 w-full object-cover rounded" />
            <h3>Phone : {rider.phoneNumber}</h3>
            <p className="text-sm text-gray-500">Aadhar Number : {rider.aadharNumber}</p>
            <p className="text-sm text-gray-500">DL Number : {rider.drivingLicenseNumber}</p>
            <button className="w-full bg-green-500 py-2 text-white hover:bg-green-600" onClick={verify}>Verify Rider</button>
        </div>
    )
}

export default AdminRiderCard;
