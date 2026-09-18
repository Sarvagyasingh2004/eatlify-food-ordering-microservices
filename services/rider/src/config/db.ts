import mongoose from "mongoose";

const connectToDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI as string, {
            dbName: "Food_Ordering_db",
        });
        console.log(`Connected to MongoDB successfully.`)
    } catch (error) {
        console.log(`MongoDB connection error :  ${error}`)
    }
}

export default connectToDB;