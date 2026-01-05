import mongoose, { Schema, Document, Model } from "mongoose";

export const USER_ROLES = [
    "SYSTEM_ADMIN",
    "BUREAU_ADMIN",
    "SCHOOL_ADMIN",
    "TEACHER",
    "STUDENT",
];

export interface IUser extends Document {
    email: string;
    password_hash: string;
    full_name: string;
    avatar_url?: string;
    role: "SYSTEM_ADMIN" | "BUREAU_ADMIN" | "SCHOOL_ADMIN" | "TEACHER" | "STUDENT";
    tenant_id?: string;
    school_id?: string;
    settings: {
        theme: "light" | "dark";
        notifications: boolean;
    };
    last_login: Date;
    status: "ACTIVE" | "SUSPENDED";
}

const UserSchema: Schema = new Schema(
    {
        email: { type: String, required: true, unique: true },
        password_hash: { type: String, required: true },
        full_name: { type: String, required: true },
        avatar_url: { type: String },
        role: {
            type: String,
            enum: USER_ROLES,
            required: true,
        },
        tenant_id: { type: String },
        school_id: { type: String },
        settings: {
            theme: { type: String, enum: ["light", "dark"], default: "light" },
            notifications: { type: Boolean, default: true },
        },
        last_login: { type: Date },
        status: { type: String, enum: ["ACTIVE", "SUSPENDED"], default: "ACTIVE" },
    },
    { timestamps: true }
);

const User: Model<IUser> =
    mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

export default User;
