import type React from "react";

export interface User {
    _id: string;
    name: string;
    email: string;
    image: string;
    role: string;
}

export interface LocationData {
    latitude: number;
    longitude: number;
    formattedAddress: string;
}

export interface AppContextType {
    user: User | null;
    loading: boolean;
    isAuth: boolean;
    setUser: React.Dispatch<React.SetStateAction<User | null>>;
    setIsAuth: React.Dispatch<React.SetStateAction<boolean>>;
    setLoading: React.Dispatch<React.SetStateAction<boolean>>;
    location: LocationData | null;
    locationLoading: boolean;
    city: string;
    cart: ICart[] | null;
    fetchCart: () => Promise<void>;
    subTotal: number;
    quantity: number;
}

export interface IRestaurant {
    _id: string;
    name: string;
    description?: string;
    image: string;
    ownerId: string;
    phone: number;
    isVerified: boolean;
    autoLocation: {
        type: "Point",
        coordinates: [number, number],
        formattedAddress: string;
    };
    isOpen: boolean;
    createdAt: Date;
}

export interface IMenuItem {
    _id: string;
    restaurantId: string;
    name: string;
    description: string;
    image?: string;
    price: number;
    isAvailable: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface ICart {
    _id: string,
    userId: string,
    restaurantId: string | IRestaurant,
    itemId: string | IMenuItem,
    quantity: number;
    createdAt: Date;
    updatedAt: Date;
}


export interface IOrder {
    _id: string;
    userId: string;
    restaurantId: string;
    restaurantName: string;
    riderId?: string | null;
    riderPhone?: number | null;
    riderName?: string | null;
    distance: number;
    riderAmount: number;

    items: {
        itemId: string;
        name: string;
        price: number;
        quantity: number;
    }[];

    subTotal: number;
    deliveryFee: number;
    platformFee: number;
    totalAmount: number;

    addressId: string;

    deliveryAddress: {
        formattedAddress: string;
        mobile: number;
        latitude: number;
        longitude: number;
    };

    status: | "placed" | "accepted" | "preparing" | "ready_for_rider" | "rider_assigned" | "picked_up" | "delivered" | "cancelled";

    paymentMethod: "razorpay" | "stripe";
    paymentStatus: "pending" | "paid" | "failed";
    expiresAt: Date;

    createdAt: Date;
    updatedAt: Date;
}

export interface IRider {
    _id: string;
    picture: string;
    phoneNumber: number;
    aadharNumber: string;
    drivingLicenseNumber: number;
    isVerified: boolean;
    isAvailable: boolean;
}

export type EarningsRange = "today" | "7d" | "30d" | "all";

// Gross is the food total (subTotal). The platform takes a commission on top of
// the flat platformFee the customer already paid, leaving net as the payout.
export interface IEarningsBucket {
    orders: number;
    gross: number;
    commission: number;
    net: number;
}

export interface IRestaurantStats {
    success: boolean;
    range: string;
    commissionRate: number;
    earned: IEarningsBucket;
    pending: IEarningsBucket;
    averageOrderValue: number;
    topItems: {
        name: string;
        quantity: number;
        revenue: number;
    }[];
    daily: {
        date: string;
        orders: number;
        gross: number;
        net: number;
    }[];
}

export interface IRiderEarnings {
    success: boolean;
    range: string;
    deliveries: number;
    earnings: number;
    distance: number;
    averagePerDelivery: number;
    daily: {
        date: string;
        deliveries: number;
        earnings: number;
        distance: number;
    }[];
}

export interface IPaginatedOrders {
    success: boolean;
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    orders: IOrder[];
}
