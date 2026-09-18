import { MongoClient, Db } from "mongodb";

let client: MongoClient;
let db: Db;

export const connectToDB = async (): Promise<Db> => {
    if (db) return db;
    client = new MongoClient(process.env.MONGO_URI!);
    await client.connect();

    // The mongoose services hardcode this database name. Falling back to the
    // same value stops an unset DB_NAME silently pointing admin at `test`,
    // where every query returns empty with no error.
    const dbName = process.env.DB_NAME || "Food_Ordering_db";
    db = client.db(dbName);
    console.log(`Connected to MongoDB successfully (database: ${dbName}).`);

    return db;
}


