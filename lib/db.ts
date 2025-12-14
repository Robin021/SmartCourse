import mongoose from "mongoose";

interface MongooseCache {
    conn: typeof mongoose | null;
    promise: Promise<typeof mongoose> | null;
}

declare global {
    var mongoose: MongooseCache;
}

let cached = global.mongoose;

if (!cached) {
    cached = global.mongoose = { conn: null, promise: null };
}

const requireMongoUri = () => {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        throw new Error("Please define the MONGODB_URI environment variable inside .env.local");
    }
    return uri;
};

async function connectDB() {
    if (cached.conn) {
        return cached.conn;
    }

    if (!cached.promise) {
        const MONGODB_URI = requireMongoUri();

        console.log("Attempting to connect to MongoDB...");
        console.log("URI:", MONGODB_URI.replace(/\/\/.*@/, "//***@")); // Log URI masking credentials

        const opts = {
            bufferCommands: false,
            // Fail fast if MongoDB isn't reachable to avoid hanging API requests
            serverSelectionTimeoutMS: 5000,
        };

        cached.promise = mongoose.connect(MONGODB_URI!, opts).then((mongoose) => {
            return mongoose;
        });
    }

    try {
        cached.conn = await cached.promise;
    } catch (e) {
        cached.promise = null;
        throw e;
    }

    return cached.conn;
}

export default connectDB;
