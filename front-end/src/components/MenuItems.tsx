import { useState } from "react";
import type { IMenuItem } from "../types"
import { FiEyeOff } from "react-icons/fi";
import { BsCartPlus, BsEye } from "react-icons/bs";
import { BiTrash } from "react-icons/bi";
import toast from "react-hot-toast";
import { VscLoading } from "react-icons/vsc";
import axios from "axios";
import { restaurantService } from "../main";
import { useAppData } from "../context/AppContext";

interface MenuItemsProps {
  items: IMenuItem[];
  onItemDeleted: () => void;
  isSeller: boolean;
}

const MenuItems = ({ items, onItemDeleted, isSeller }: MenuItemsProps) => {
  const { fetchCart } = useAppData();
  const [loadingItemId, setLoadingItemId] = useState<string | null>(null);


  const handleDelete = async (itemId: string) => {
    const confirm = window.confirm("Are you sure you want to delete this menu item");
    if (!confirm) {
      return;
    }
    try {
      await axios.delete(`${restaurantService}/api/item/${itemId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        }
      })
      toast.success("Item deleted");
      onItemDeleted();
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete item.");
    }
  };

  const toggleAvailability = async (itemId: string) => {
    try {
      const { data } = await axios.put(`${restaurantService}/api/item/status/${itemId}`, {}, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        }
      })
      toast.success(data.message);
      onItemDeleted();
    } catch (error) {
      console.error(error);
      toast.error("Failed to update item status.");
    }
  };

  const addToCart = async (restaurantId: string, itemId: string) => {
    try {
      setLoadingItemId(itemId);
      const { data } = await axios.post(`${restaurantService}/api/cart/add`, {
        restaurantId, itemId
      }, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        }
      });
      toast.success(data.message);
      fetchCart();
    } catch (error: any) {
      console.error(error.response.data.message);
      toast.error("Failed to add item to cart")
    } finally {
      setLoadingItemId(null);
    }
  }
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {
        items && (items.map((item) => {
          const isLoading = loadingItemId === item._id
          return <div className={`relative flex gap-4 rounded-lg bg-white p-4 shadow-sm transform ${!item.isAvailable ? "opacity-70" : ""}`} key={item._id}>
            <div className="relative shrink-0">
              <img src={item.image} alt={item.name} className={`h-20 w-20 rounded object-cover ${!item.isAvailable ? "grayscale brightness-75" : ""}`} />
              {
                !item.isAvailable && (<span className="absolute inset-0 flex justify-center items-center roudned bg-black-60 text-xs font-semibold text-white">Not available</span>)
              }
            </div>
            <div className="flex flex-1 flex-col justify-between">
              <div>
                <h3 className="font-semibold">
                  {item.name}
                </h3>
                {
                  item.description && (
                    <p className="text-sm text-gray-50 line-clamp-2"></p>
                  )
                }
              </div>
              <div className="flex items-center justify-between">
                <p className="font-medium">₹{item.price}</p>
                {
                  isSeller && (
                    <div className="flex gap-2">
                      <button onClick={() => toggleAvailability(item._id)} className="rounded-lg p-2 text-gray-600 hover:bg-gray-100">{item.isAvailable ? <BsEye size={18} /> : <FiEyeOff size={18} />}</button>
                      < button onClick={() => handleDelete(item._id)} className="rounded-lg p-2 text-red-500 hover:bg-red-50">
                        <BiTrash size={18} />
                      </button>
                    </div> 
                  )
                }
                {
                  !isSeller && <button disabled={!item.isAvailable || isLoading} onClick={() => addToCart(item.restaurantId, item._id)} className={`flex items-center justify-center rounded-lg p-2 ${!item.isAvailable || isLoading ? "cursor-not-allowed text-gray-400" : "text-red-500 hover:bg-red-50"}`}>
                    {
                      isLoading ? <VscLoading size={18} className="animate-spin" /> :
                        <BsCartPlus size={18} />

                    }

                  </button>
                }
              </div>
            </div>
          </div>
        }))
      }
    </div >
  )
}

export default MenuItems
