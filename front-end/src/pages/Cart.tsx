import { useNavigate } from "react-router-dom";
import { useAppData } from "../context/AppContext"
import { useState } from "react";
import type { ICart, IMenuItem, IRestaurant } from "../types";
import axios from "axios";
import { restaurantService } from "../main";
import toast from "react-hot-toast";
import { VscLoading } from "react-icons/vsc";
import { BiMinus, BiPlus } from "react-icons/bi";
import { TbTrash } from "react-icons/tb";

const Cart = () => {
    const { cart, subTotal, quantity, fetchCart } = useAppData();
    const navigate = useNavigate();
    const [loadingItemId, setLoadingItemId] = useState<string | null>(null);
    const [clearingCart, setClearingCart] = useState<boolean>(false);
    if (!cart || cart.length === 0) {
        return <div className="flex min-h-[60vh] items-center justify-center">
            <p className="text-gray-500 text-lg">Your cart is empty</p>
        </div>
    }

    const restaurant = cart[0].restaurantId as IRestaurant;

    const deliveryFee = subTotal < 250 ? 49 : 0;

    const platformFee = 7;

    const grandTotal = subTotal + deliveryFee + platformFee;

    const decreaseQty = async (itemId: string) => {
        try {
            setLoadingItemId(itemId);
            await axios.put(`${restaurantService}/api/cart/dec`, { itemId }, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`
                }
            });
            await fetchCart();
        } catch (error) {
            console.error(error);
            toast.error("Error while adding items to cart");
        } finally {
            setLoadingItemId(null);
        }
    }

    const increaseQty = async (itemId: string) => {
        try {
            setLoadingItemId(itemId);
            await axios.put(`${restaurantService}/api/cart/inc`, { itemId }, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`
                }
            });
            await fetchCart();
        } catch (error) {
            console.error(error);
            toast.error("Error while removing items from cart");
        } finally {
            setLoadingItemId(null);
        }
    }

    const clearCart = async () => {
        confirm("Are you sure? You want to clear your cart?");
        if (!confirm) {
            return;
        }
        try {
            setClearingCart(true);
            await axios.delete(`${restaurantService}/api/cart/clear`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`
                }
            });
            await fetchCart();
        } catch (error) {
            console.error(error);
            toast.error("Error while clearing cart");
        } finally {
            setClearingCart(false);
        }
    }

    const checkout = () => {
        navigate("/checkout");
    }

    return (
        <div className="mx-auto max-w-5xl px-4 space-y-6 py-6">
            <div className="rounded-xl bg-white p-4 shadow-sm">
                <h2 className="text-xl font-semibold">{restaurant.name}</h2>
                <p className="t-sm text-gray-500">
                    {restaurant.autoLocation.formattedAddress}
                </p>
            </div>
            <div className="space-y-4">
                {cart.map((cartItem: ICart) => {
                    const item = cartItem.itemId as IMenuItem;
                    const isLoading = loadingItemId === item._id;
                    return <div key={item._id} className="flex items-center gap-4 rounded-xl bg-white p-4 shadow-sm">
                        <img src={item.image} alt="ItemImage" className="h-20 w-20 rounded object-cover" />
                        <div className="flex-1">
                            <h3 className="font-semibold">{item.name}</h3>
                            <p className="text-sm text-gray-500">₹{item.price}</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button className="rounded-full border p-2 hover:bg-gray-100 disabled:opacity-50" disabled={isLoading} onClick={() => decreaseQty(item._id)}>
                                {isLoading ?
                                    <VscLoading size={16} className="animate-spin" /> :
                                    <BiMinus size={16} />}
                            </button>
                            <span className="font-medium">{cartItem.quantity}</span>
                            <button className="rounded-full border p-2 hover:bg-gray-100 disabled:opacity-50" disabled={isLoading} onClick={() => increaseQty(item._id)}>
                                {isLoading ?
                                    (<VscLoading size={16} className="animate-spin" />) :
                                    (<BiPlus size={16} />)
                                }
                            </button>
                        </div>
                        <p className="w-20 text-right font-medium">₹{item.price * cartItem.quantity}</p>
                    </div>
                })}
            </div>
            <div className="rounded-xl bg-white p-4 shadow-sm space-y-3">
                <div className="flex justify-between text-sm">
                    <span className="">Total Items</span>
                    <span>{quantity}</span>
                </div>
                <div className="flex justify-between text-sm">
                    <span>Subtotal</span>
                    <span>₹{subTotal}</span>
                </div>
                <div className="flex justify-between text-sm">
                    <span>Delivery fee</span>
                    <span>{deliveryFee === 0 ? "Free" : `₹${deliveryFee}`}</span>
                </div>
                <div className="flex justify-between text-sm">
                    <span>Platform fee</span>
                    <span>₹{platformFee}</span>
                </div>
                {
                    subTotal < 250 && <p className="text-xs text-gray-500">
                        Add item worth ₹{250 - subTotal} more to get free delivery
                    </p>
                }
                <div className="flex justify-between text-base font-semibold border-t p-2">
                    <span>Grand total</span>
                    <span>{grandTotal}</span>
                </div>
                <button
                    className={`mt-3 rounded-lg w-full bg-[#E23744] py-3 text-sm font-semibold text-white hover:bg-red-700 ${restaurant.isOpen ? "" : "opacity-50 cursor-not-allowed"}`}
                    onClick={checkout}
                    disabled={!restaurant.isOpen} >
                    {
                        restaurant.isOpen ?
                            "Proceed to checkout" : "Restaurant is closed"
                    }
                </button>
                <button className="mt-3 rounded-lg w-full bg-[#7B7979] py-3 text-sm font-semibold text-white hover:bg-gray-500 flex justify-center items-center gap-3" onClick={clearCart} disabled={clearingCart}>
                    Clear cart
                    <TbTrash size={16} />
                </button>
            </div>
        </div>
    )
}

export default Cart
