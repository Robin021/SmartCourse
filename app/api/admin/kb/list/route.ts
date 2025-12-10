import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import DocumentModel from "@/models/Document";

export async function GET() {
    try {
        await connectDB();
        const documents = await DocumentModel.find().sort({ createdAt: -1 });

        return NextResponse.json({ success: true, documents });
    } catch (error: any) {
        console.error("List documents error:", error);
        return NextResponse.json(
            { error: "Failed to fetch documents" },
            { status: 500 }
        );
    }
}
