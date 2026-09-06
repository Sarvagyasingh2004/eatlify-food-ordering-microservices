import axios from 'axios';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { authService, restaurantService } from '../main';
import type { AppContextType, ICart, LocationData, User } from '../types';
import toast, { Toaster } from 'react-hot-toast';

const AppContext = createContext<AppContextType | undefined>(undefined);

interface AppProviderProps {
    children: ReactNode;
}

export const AppProvider = ({ children }: AppProviderProps) => {
    const [user, setUser] = useState<User | null>(null);
    const [isAuth, setIsAuth] = useState<boolean>(false);
    const [loading, setLoading] = useState<boolean>(true);
    const [location, setLocation] = useState<LocationData | null>(null);
    const [locationLoading, setLocationLoading] = useState<boolean>(false);
    const [city, setCity] = useState("Fetching Location...");
    const [cart, setCart] = useState<ICart[]>([]);
    const [subTotal, setSubtotal] = useState<number>(0);
    const [quantity, setQuantity] = useState<number>(0);

    async function fetchUser() {
        try {
            const token = localStorage.getItem("token");
            const { data } = await axios.get(`${authService}/api/auth/me`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            })
            setUser(data);
            setIsAuth(true);
        } catch (error) {
            console.log(error);
        } finally {
            setLoading(false);
        }
    }

    async function fetchCart() {
        if (!user || user.role !== "customer") {
            return;
        }
        try {
            const { data } = await axios.get(`${restaurantService}/api/cart/all`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`
                },
            });

            setCart(data.cart || []);
            setSubtotal(data.subTotal || 0);
            setQuantity(data.cartLength);
        } catch (error) {
            console.log(error);
            toast.error("Failed to fetch cart")
        }
    }

    useEffect(() => { fetchUser() }, []);

    useEffect(() => {
        if (user && user.role === "customer") {
            fetchCart();
        }
    }, [user]);

    useEffect(() => {
        if (!navigator.geolocation) {
            setCity("Location unavailable");
            setLocationLoading(false);
            return;
        }
        setLocationLoading(true);
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                console.log("Coordinates:", latitude, longitude);
                try {
                    const res = await fetch(
                        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
                        {
                            headers: {
                                Accept: "application/json",
                            },
                        }
                    );
                    if (!res.ok) {
                        throw new Error(`Nominatim error: ${res.status}`);
                    }
                    const data = await res.json();
                    console.log("Nominatim response:", data);
                    if (!data.display_name) {
                        throw new Error("No address returned from Nominatim");
                    }
                    setLocation({
                        latitude,
                        longitude,
                        formattedAddress:
                            data.display_name,
                    });
                    setCity(
                        data.address?.city ||
                        data.address?.town ||
                        data.address?.village ||
                        data.address?.municipality ||
                        "Your location"
                    );
                } catch (error) {
                    console.error("Reverse geocoding error:", error);
                    setLocation({
                        latitude,
                        longitude,
                        formattedAddress: "",
                    });
                    setCity("Location unavailable");
                } finally {
                    setLocationLoading(false);
                }
            },
            (error) => {
                console.error("Geolocation error:", error);
                setLocationLoading(false);
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        setCity("Location permission denied");
                        break;
                    case error.POSITION_UNAVAILABLE:
                        setCity("Location unavailable");
                        break;
                    case error.TIMEOUT:
                        setCity("Location request timed out");
                        break;
                    default:
                        setCity("Unable to get location");
                }
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 300000,
            }
        );
    }, []);

    return <AppContext.Provider value={{ isAuth, loading, setIsAuth, setLoading, setUser, user, location, locationLoading, city, cart, fetchCart, subTotal, quantity }}>
        {children}
        <Toaster />
    </AppContext.Provider>

}


export const useAppData = (): AppContextType => {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error("useAppData must be used within AppProvider")
    }
    return context;
}