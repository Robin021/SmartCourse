import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";

export async function GET(request: Request) {
    try {
        const token = request.headers.get("cookie")?.match(/(?:^|; )token=([^;]+)/)?.[1];
        if (!token) {
            return NextResponse.json({ user: null }, { status: 200 });
        }

        try {
            const decoded: any = jwt.decode(token);
            return NextResponse.json({
                user: {
                    full_name: decoded?.full_name || "Teacher",
                    role: decoded?.role || "TEACHER",
                },
            });
        } catch {
            return NextResponse.json({ user: null }, { status: 200 });
        }
    } catch (error: any) {
        return NextResponse.json({ user: null }, { status: 200 });
    }
}
