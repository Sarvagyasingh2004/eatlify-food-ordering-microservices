import axios from "axios";
import type { IOrder } from "../types";
import { riderService } from "../main";
import toast from "react-hot-toast";

interface Props {
  order: IOrder;
  onStatusUpdate: () => void;
}
const RiderCurrentOrder = ({
  order,
  onStatusUpdate
}: Props) => {
  const updateStatus = async () => {
    try {
      await axios.patch(`${riderService}/api/rider/order/update/${order._id}`, {}, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      toast.success("Order status updated");
      onStatusUpdate();
    } catch (error: any) {
      toast.error(error.response.data.message);
      console.log(error);
    }
  }
  return (
    <div className="rounded-xl shadow-sm bg-white space-y-4 p-4">
      <h1 className="font-semibold text-gray-800">Current Order</h1>
      <div className="text-sm text-gray-600 space-y-1">
        <p>
          <b>Pickup: </b>
          {order.restaurantName}
        </p>
        <p>
          <b>Drop: </b>
          {order.deliveryAddress.formattedAddress}
        </p>
        <p>
          <b>Total: </b>
          ₹{order.totalAmount}
        </p>
        <p>
          <b>Your earnings on this order: </b>
          ₹{order.riderAmount}
        </p>
        <p>
          <b>Status: </b>
          <span className="capitalize text-blue-600">{order.status.replace("_", " ")}</span>
        </p>
      </div>
      {
        order.deliveryAddress.mobile && <div className="flex items-center justify-between rounded-lg border p-3">
          <div className="text-sm">
            <p className="text-gray-500">Customer Phone</p>
            <p className="font-semibold text-gray-800">{order.deliveryAddress.mobile}</p>
          </div>
          <a href={`tel:${order.deliveryAddress.mobile}`} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-semibold">Call</a>
        </div>
      }
      <div className="space-y-2">
        {order.status === "rider_assigned" && (
          <button onClick={() => updateStatus()} className="w-full bg-yellow-500 hover:bg-yellow-600 rounded-lg font-semibold text-white py-2">Reached Restaurant</button>
        )}

        {order.status === "picked_up" && (
          <button onClick={() => updateStatus()} className="w-full bg-green-500 hover:bg-green-600 rounded-lg font-semibold text-white py-2">Mark as delivered</button>
        )}
      </div>
    </div>
  )
}

export default RiderCurrentOrder
