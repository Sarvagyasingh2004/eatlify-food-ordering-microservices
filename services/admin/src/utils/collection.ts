import { connectToDB } from "../config/db.js";

export const getRestaurantCollection = async () => {
    const db = await connectToDB();

    return db.collection("restaurants");
};

export const getRiderCollection = async () => {
    const db = await connectToDB();

    return db.collection("riders");
};