import User from "../models/User.js";
import jwt from "jsonwebtoken";
import TryCatch from "../middlewares/trycatch.js";
import { oauth2Client } from "../config/googleConfig.js";
import axios from "axios";

export const loginUser = TryCatch(async (req, res) => {
    const { code } = req.body;

    if (!code) {
        return res.status(400).json({
            success: false,
            message: "Authorization code is required."
        })
    }

    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const userResponse = await axios.get(`https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=${tokens.access_token}`);

    const { email, name, picture } = userResponse.data;

    let user = await User.findOne({ email });

    if (!user) {
        user = await User.create({
            name,
            email,
            image: picture,
        });
    }

    const token = jwt.sign({ user }, process.env.JWT_SECRET as string, {
        expiresIn: "15d",
    });

    res.status(200).json({
        success: true,
        message: "User logged in successfully.",
        user,
        token
    })
});