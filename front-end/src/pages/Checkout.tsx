import { useEffect, useState } from "react";
import { useAppData } from "../context/AppContext"
import axios from "axios";
import { restaurantService, utilsService } from "../main";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import type { ICart, IMenuItem, IRestaurant } from "../types";
import { BiCreditCard, BiLoader } from "react-icons/bi";

interface Address {
    _id: string,
    formattedAddress: string,
    mobile: number,
}

const Checkout = () => {
    const { cart, subTotal, quantity } = useAppData();
    const [addresses, setAddresses] = useState<Address[]>([]);
    const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
    const [loadingAddress, setLoadingAddress] = useState(true);
    const [loadingRazorpay, setLoadingRazorpay] = useState(false);
    const [loadingStripe, setLoadingStripe] = useState(false);
    const [creatingOrder, setCreatingOrder] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchAddresses = async () => {

            if (!cart || cart.length === 0) {
                setLoadingAddress(false);
                return;
            }

            try {
                const { data } = await axios.get(`${restaurantService}/api/address/all`, {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem("token")}`,
                    },
                });

                setAddresses(data.addresses || []);
            } catch (error) {
                console.error(error);
                toast.error("Failed to fetch addresses");
            } finally {
                setLoadingAddress(false);
            }
        }
        fetchAddresses();
    }, [cart]);

    if (!cart || cart.length === 0) {
        return <div className="flex min-h-[60vh] items-center justify-center">
            <p className="text-gray-500 text-lg"></p>
        </div>
    }



    const restaurant = cart[0].restaurantId as IRestaurant;

    const deliveryFee = subTotal < 250 ? 49 : 0;

    const platformFee = 7;

    const grandTotal = subTotal + deliveryFee + platformFee;

    const createOrder = async (paymentMethod: "razorpay" | "stripe") => {
        if (!selectedAddressId) return null;

        setCreatingOrder(true);

        try {
            const { data } = await axios.post(`${restaurantService}/api/order/add`, {
                paymentMethod,
                addressId: selectedAddressId
            }, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                }
            });

            return data;
        } catch (error) {
            console.error(error);
            toast.error("Failed to create order");
        } finally {
            setCreatingOrder(false);
        }
    };

    const payWithRazorpay = async () => {
        try {
            setLoadingRazorpay(true);
            const order = await createOrder("razorpay");

            if (!order) return;

            const { orderId, amount } = order;

            const { data } = await axios.post(`${utilsService}/api/payment/create`, {
                orderId,
            }, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
            });

            const { razorpayOrderId, key } = data;

            const options = {
                key,
                amount: amount * 100,
                currency: "INR",
                name: "Eatlify",
                description: "Not your regular food delivery app",
                order_id: razorpayOrderId,
                handler: async (res: any) => {
                    try {
                        await axios.post(`${utilsService}/api/payment/verify`, {
                            razorpay_order_id: res.razorpay_order_id,
                            razorpay_payment_id: res.razorpay_payment_id,
                            razorpay_signature: res.razorpay_signature,
                            orderId,
                        }, {
                            headers: {
                                Authorization: `Bearer ${localStorage.getItem("token")}`,
                            },
                        });
                        toast.success("Payment successfull");
                        navigate(`/paymentsuccesspage/${res.razorpay_payment_id}`);
                    } catch (error) {
                        console.error(error);
                        toast.error("Payment verification failed");
                    }
                },
                theme: {
                    "color": "#E23744",
                },
            }

            const razorpay = new (window as any).Razorpay(options);
            razorpay.open();
        } catch (error) {
            console.error(error);
            toast.error("Payment failed, please refresh page");
        } finally {
            setLoadingRazorpay(false);
        }
    };

    const payWithStripe = async () => {
        setLoadingStripe(true);

        try {
            const { orderId } = await createOrder("stripe");

            // Stripe Checkout is a hosted redirect, so stripe.js is not needed
            const { data } = await axios.post(`${utilsService}/api/payment/stripe/create`, {
                orderId,
            }, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
            });

            if (data.url) {
                window.location.href = data.url;
            } else {
                toast.error("Failed to create payment session");
            }
        } catch (error) {
            console.error(error);
            toast.error("Stripe payment failed");
        } finally {
            setLoadingStripe(false);
        }
    };

    return (
        <div className="mx-auto max-w-4xl px-4 py-6 space-y-6">
            <h1 className="text-2xl font-bold">Checkout</h1>
            <div className="rounded-xl bg-white p-4 shadow-sm">
                <h2 className="text-lf font-semibold">{restaurant.name}</h2>
                <p className="text-sm text-gray-500">{restaurant.autoLocation.formattedAddress}</p>
            </div>
            <div className="rounded-xl shadow-sm bg-white p-4 space-y-3">
                <h3 className="font-semibold">Delivery Address</h3>
                {
                    loadingAddress ?
                        <p className="text-sm text-gray-50">Loading address...</p> : addresses.length === 0 ? <p className="text-sm text-gray-500">No address found please add one</p> : addresses.map((address) =>
                            <label htmlFor="" key={address._id} className={`flex gap-3 rounded-lg border p-3 cursor-pointer transition ${selectedAddressId === address._id ? "border-[#E23744] bg-red-50" : "bg-gray-50"}`}>
                                <input type="radio" checked={selectedAddressId === address._id} onChange={() => setSelectedAddressId(address._id)} />
                                <div>
                                    <p className="text-sm font-medium">{address.formattedAddress}</p>
                                    <p className="text-xs text-gray-500">{address.mobile}</p>
                                </div>
                            </label>
                        )
                }
            </div>
            <div className="rounded-xl bg-white p-4 shadow-sm space-y-4">
                <h3 className="font-semibold">Order Summary</h3>
                {
                    cart.map((cartItem: ICart) => {
                        const item = cartItem.itemId as IMenuItem;

                        return <div className="flex justify-center text-sm" key={cartItem._id}>
                            <span>
                                {item.name} x {cartItem.quantity}
                            </span>
                            <span>₹{item.price * cartItem.quantity}</span>
                        </div>
                    })
                }
                <hr />
                <div className="flex justify-between text-sm">
                    <span>Items ({quantity})</span>
                    <span>₹{subTotal}</span>
                </div>
                <div className="flex justify-between text-sm">
                    <span>Delivery Fee</span>
                    <span>{deliveryFee === 0 ? "Free" : `₹${deliveryFee}`}</span>
                </div>
                <div className="flex justify-between text-sm">
                    <span>Platform Fee</span>
                    <span>₹7</span>
                </div>
                {
                    subTotal < 250 && <p className="text-xs text-gray-500">
                        Add item worth ₹{250 - subTotal} more to get free delivery
                    </p>
                }
                <div className="flex justify-between text-base font-semibold border-t p-2">
                    <span>Grand total</span>
                    <span>grandTotal{grandTotal}</span>
                </div>
            </div>
            <div className="rounded-xl bg-white p-4 shadow-sm space-y-3">
                <h3 className="font-semibold">Payment Method</h3>
                <button disabled={!selectedAddressId || loadingRazorpay || creatingOrder} onClick={payWithRazorpay} className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#2D7FF9] py-3 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50 cursor-pointer">
                    {loadingRazorpay
                        ? <BiLoader className="animate-spin" /> :
                        <BiCreditCard size={18} />}
                    Pay With Razorpay
                </button>

                <button disabled={!selectedAddressId || loadingStripe || creatingOrder} onClick={payWithStripe} className="flex w-full items-center justify-center gap-2 rounded-lg bg-black py-3 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50 cursor-pointer">
                    {loadingStripe
                        ? <BiLoader className="animate-spin" /> :
                        <BiCreditCard size={18} />}
                    Pay With Stripe
                </button>
            </div>
        </div>
    )
}

export default Checkout;
