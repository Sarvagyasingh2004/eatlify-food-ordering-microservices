import { useEffect, useRef, useState } from "react";
import { useAppData } from "../context/AppContext";
import { useSocket } from "../context/SocketContext";
import { type IOrder, type IRider } from "../types";
import axios from "axios";
import { riderService } from "../main";
import toast from "react-hot-toast";
import { BiUpload } from "react-icons/bi";
import audio from "../assets/rider.mp3";
import RiderOrderRequest from "../components/RiderOrderRequest";
import RiderCurrentOrder from "../components/RiderCurrentOrder";
import RiderOrderMap from "../components/RiderOrderMap";
import RiderCompletedOrders from "../components/RiderCompletedOrders";
import RiderEarnings from "../components/RiderEarnings";
import RoleHeader from "../components/RoleHeader";

type RiderTab = "live" | "completed" | "earnings";

const RiderDashboard = () => {

    const { user } = useAppData();
    const [audioUnlocked, setAudioUnlocked] = useState<boolean>(false);

    const { socket } = useSocket();

    const audioRef = useRef<HTMLAudioElement | null>(null);

    const [profile, setProfile] = useState<IRider | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [toggle, setToggle] = useState<boolean>(false);
    const [incomingOrders, setIncomingOrders] = useState<string[]>([]);
    const [currentOrder, setCurrentOrder] = useState<IOrder | null>(null);
    const [tab, setTab] = useState<RiderTab>("live");

    const [phoneNumber, setPhoneNumber] = useState<string>("");
    const [aadharNumber, setAadharNumber] = useState<string>("");
    const [drivingLicenseNumber, setDrivingLicenseNumber] = useState<string>("");
    const [image, setImage] = useState<File | null>(null);
    const [submitting, setSubmitting] = useState<boolean>(false);


    useEffect(() => {
        audioRef.current = new Audio(audio);
        audioRef.current.preload = "auto";
    }, []);

    const unLockAudio = async () => {
        try {
            if (!audioRef.current) return;
            await audioRef.current.play();
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            setAudioUnlocked(true);
            toast.success("Notification sound enabled");
            console.log("Audio unlocked");
        } catch (error) {
            toast.error("Tap again to enable sound");
            console.log("Failed to unlock audio", error)
        }
    };

    useEffect(() => {
        if (!socket) return;

        const onOrderAvailable = ({ orderId }: { orderId: string }) => {
            setIncomingOrders((prev) => prev.includes(orderId) ? prev : [...prev, orderId]);

            if (audioUnlocked && audioRef.current) {
                audioRef.current.currentTime = 0;
                audioRef.current.play().catch(() => { });
            }

            setTimeout(() => {
                setIncomingOrders((prev) => prev.filter((id) => id !== orderId));
            }, 10000);
        };

        socket.on("order:available", onOrderAvailable);

        return () => {
            socket.off("order:available", onOrderAvailable);
        }
    }, [socket, audioUnlocked]);

    useEffect(() => {
        if (!socket) return;

        const onRiderStatus = ({ isAvailable }: { isAvailable: boolean }) => {
            setProfile((prev) => (prev ? { ...prev, isAvailable } : prev));
        };

        socket.on("rider:status", onRiderStatus);

        return () => {
            socket.off("rider:status", onRiderStatus);
        }
    }, [socket]);

    const fetchProfile = async () => {
        try {
            const { data } = await axios.get(`${riderService}/api/rider/my`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
            });
            setProfile(data);
        } catch (error) {
            toast.error("Failed to fetch rider profile");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user?.role === "rider") fetchProfile();
        else setLoading(false);
    }, [user]);

    const fetchCurrentOrder = async () => {
        try {
            const { data } = await axios.get(`${riderService}/api/rider/order/current`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
            });
            setCurrentOrder(data.order);
        } catch (error) {
            console.log(error);
            setCurrentOrder(null);
        }
    };

    useEffect(() => {
        fetchCurrentOrder();
    }, []);

    const toggleAvailability = async () => {
        if (!navigator.geolocation) {
            toast.error("Location access required");
            return
        }

        setToggle(true);

        navigator.geolocation.getCurrentPosition(async (pos) => {
            try {
                await axios.patch(`${riderService}/api/rider/toggle`, {
                    isAvailable: !(profile?.isAvailable),
                    latitude: pos.coords.latitude,
                    longitude: pos.coords.longitude,
                }, {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem("token")}`,
                    },
                });

                toast.success(profile?.isAvailable ? "You are offline" : "You are online ");
                fetchProfile();
            } catch (error: any) {
                toast.error("Failed to update rider availability");
                console.error(error.response.data.message);
            } finally {
                setToggle(false);
            }
        });
    };

    const handleSubmit = async () => {
        if (!navigator.geolocation) {
            toast.error("Location access required");
            return
        }

        setSubmitting(true);

        navigator.geolocation.getCurrentPosition(async (pos) => {
            const formData = new FormData();
            formData.append("phoneNumber", phoneNumber);
            formData.append("aadharNumber", aadharNumber);
            formData.append("drivingLicenseNumber", drivingLicenseNumber);
            formData.append("latitude", pos.coords.latitude.toString());
            formData.append("longitude", pos.coords.longitude.toString());
            if (image) {
                formData.append("file", image);
            }
            try {
                const { data } = await axios.post(`${riderService}/api/rider/add`, formData, {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem("token")}`,
                    },
                });

                toast.success(data.message);
                fetchProfile();
            } catch (error: any) {
                toast.error("Failed to add rider profile");
                console.error(error.response.data.message);
            } finally {
                setSubmitting(false);
            }
        });
    };

    if (loading) {
        return <div className="flex min-h-screen items-center justify-center">
            <p className="text-gray-500">Loading your dashboard...</p>
        </div>
    }

    if (user?.role !== "rider") {
        return <div className="flex min-h-[60vh] items-center justify-center text-gray-500">You are not registered as rider</div>
    }

    if (!profile) {
        return (
            <div className="min-h-screen bg-gray-50">
                <RoleHeader title="Rider onboarding" />
                <div className="mx-auto mt-6 max-w-lg rounded-xl bg-white p-6 shadow-sm space-y-5">
                    <h1 className="text-xl font-semibold">Add your profile</h1>
                    <input
                        type="number"
                        placeholder="Aadhar number"
                        value={aadharNumber}
                        onChange={e => setAadharNumber(e.target.value)}
                        className="w-full border rounded-lg px-4 py-2 text-sm outline-none"
                    />
                    <input
                        type="number"
                        placeholder="Phone number"
                        value={phoneNumber}
                        onChange={e => setPhoneNumber(e.target.value)}
                        className="w-full border rounded-lg px-4 py-2 text-sm outline-none"
                    />
                    <input
                        type="text"
                        placeholder="Driving License"
                        value={drivingLicenseNumber}
                        onChange={e => setDrivingLicenseNumber(e.target.value)}
                        className="w-full border rounded-lg px-4 py-2 text-sm outline-none"
                    />

                    <label className="flex cursor-pointer items-center gap-3 rounded-lg border p-4 text-sm text-gray-600 hover:bg-gray-50">
                        <BiUpload className="h-5 w05 text-red-500" />
                        {image ? image.name : "Upload your image"}
                        <input
                            type="file"
                            accept="image/*" hidden
                            onChange={e => setImage(e.target.files?.[0] || null)}
                        />
                    </label>
                    <button
                        className="w-full rounded-lg py-3 text-sm font-semibold text-white bg-[#E23744] cursor-pointer"
                        disabled={submitting}
                        onClick={handleSubmit}
                    >
                        {
                            submitting ? "Submitting" : "Add Profile"
                        }
                    </button>
                </div>
            </div>
        )
    }


    return (
        <div className="min-h-screen bg-gray-50">
            <RoleHeader title="Rider dashboard" />
            <div className="mx-auto max-w-md px-4 py-6">
                <div className="rounded-xl bg-white p-4 shadow space-y-3">
                    <img src={profile.picture} className="mx-auto h-24 w-24 rounded-full object-cover" alt="RiderImage" />
                    <p className="text-center font-semibold">{user?.name}</p>
                    <p className="text-center text-sm text-gray-500">{profile.phoneNumber}</p>
                    <div className="flex justify-center gap-2">
                        <span className={`px-2 py-1 text-xs rounded-full ${profile.isVerified ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"} `}>
                            {
                                profile.isVerified ? "Verified" : "Pending"
                            }
                        </span>

                        <span className={`px-2 py-1 text-xs rounded-full ${profile.isAvailable ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"} `}>
                            {
                                profile.isAvailable ? "Online" : "Offline"
                            }
                        </span>
                    </div>
                    <div className="">
                        <p className="text-blue-400">
                            Please be within 500m radius of any restaurant (which we call a hotspot) before going online as a rider to recieve orders.
                        </p>
                    </div>
                    {
                        profile.isVerified && !currentOrder && <button onClick={toggleAvailability} disabled={toggle} className={`w-full py-2 rounded-lg text-white font-semibold ${toggle ? "bg-gray-400" : profile.isAvailable ? "bg-gray-600" : "bg-[#E23744]"}`}>
                            {
                                toggle ? "Updating..." : profile.isAvailable ? "Go offline" : "Go Online"
                            }
                        </button>
                    }
                </div>
            </div>
            <div className="mx-auto max-w-md px-4">
                <div className="rounded-xl bg-white shadow-sm">
                    <div className="flex border-b">
                        {[
                            { key: "live", label: "Live" },
                            { key: "completed", label: "Completed" },
                            { key: "earnings", label: "Earnings" },
                        ].map((t) => (
                            <button
                                key={t.key}
                                onClick={() => setTab(t.key as RiderTab)}
                                className={`flex-1 px-4 py-3 text-sm font-medium transition ${tab === t.key ? "border-b-2 border-red-500 text-red-500" : "text-gray-500 hover:text-gray-700"}`}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>

                    <div className="p-4">
                        {tab === "live" && (
                            <div className="space-y-4">
                                {!audioUnlocked && <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <span className="text-2xl">🔔</span>
                                        <div>
                                            <p className="font-medium text-blue-900">Enable Sound</p>
                                            <p className="text-sm text-blue-700">Get notified when new orders arrive</p>
                                        </div>
                                    </div>
                                    <button onClick={unLockAudio} className="shrink-0 bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded-lg text-sm font-medium transition text-white">Enable</button>
                                </div>}

                                {profile.isAvailable && incomingOrders.length > 0 && <div className="space-y-3">
                                    <h3 className="font-semibold text-gray-700">Incoming orders</h3>
                                    {incomingOrders.map((id) => (
                                        <RiderOrderRequest orderId={id} key={id} onAccepted={() => {
                                            fetchProfile();
                                            fetchCurrentOrder();
                                        }} />
                                    ))}
                                </div>}

                                {currentOrder && <div className="space-y-4">
                                    <RiderCurrentOrder order={currentOrder} onStatusUpdate={fetchCurrentOrder} />
                                    <RiderOrderMap order={currentOrder} />
                                </div>}

                                {!currentOrder && incomingOrders.length === 0 && (
                                    <p className="py-8 text-center text-sm text-gray-500">
                                        {profile.isAvailable
                                            ? "Waiting for orders nearby..."
                                            : "Go online to start receiving orders."}
                                    </p>
                                )}
                            </div>
                        )}

                        {tab === "completed" && <RiderCompletedOrders />}
                        {tab === "earnings" && <RiderEarnings />}
                    </div>
                </div>
            </div>
            <div className="h-6" />
        </div>
    )
}

export default RiderDashboard;
