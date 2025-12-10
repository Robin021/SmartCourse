import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import User from "@/models/User";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-key";

export async function POST(req: Request) {
    try {
        await connectDB();
        const { email, password } = await req.json();

        // 1. Find User
        const user = await User.findOne({ email });
        if (!user) {
            console.log("Login failed: User not found for email:", email);
            return NextResponse.json(
                { error: "Invalid credentials" },
                { status: 401 }
            );
        }

        // 2. Verify Password
        console.log("User found. Verifying password...");
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            console.log("Login failed: Password mismatch");
            return NextResponse.json(
                { error: "Invalid credentials" },
                { status: 401 }
            );
        }

        // 3. Generate Token
        const token = jwt.sign(
            {
                userId: user._id,
                role: user.role,
                tenant_id: user.tenant_id,
                school_id: user.school_id,
            },
            JWT_SECRET,
            { expiresIn: "1d" }
        );

        // 4. Set Cookie
        const response = NextResponse.json({
            success: true,
            user: {
                id: user._id,
                email: user.email,
                full_name: user.full_name,
                role: user.role,
            },
        });

        response.cookies.set("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 86400, // 1 day
            path: "/",
        });

        return response;
    } catch (error) {
        console.error("Login error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
