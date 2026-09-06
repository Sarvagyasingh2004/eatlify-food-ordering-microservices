import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectToDB from "./config/db.js";
import restaurantRoutes from "./routes/restaurant.js";
import menuItemsRoutes from "./routes/menuItems.js";
import cartRoutes from "./routes/cart.js";
import addressRoutes from "./routes/address.js";
dotenv.config();

const app = express();
app.use(
    cors({
        origin: "http://localhost:5173",
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
    })
);
app.use(express.json());

const PORT = process.env.PORT || 5002;

app.use("/api/restaurant", restaurantRoutes);
app.use("/api/item", menuItemsRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/address", addressRoutes);

app.listen(PORT, () => {
    console.log(`Restaurant service is running at port ${PORT}`);
    connectToDB();
})