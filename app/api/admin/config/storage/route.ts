import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import SystemConfig from "@/models/SystemConfig";

export async function GET() {
    try {
        await connectDB();
        const config = await SystemConfig.findOne().sort({ createdAt: -1 });

        // Transform/Mask keys
        const providers = config?.storage_providers || [];
        const safeProviders = providers.map((p: any) => {
            const obj = p.toObject ? p.toObject() : p;
            if (obj.secret_key && obj.secret_key.length > 0) {
                obj.secret_key = "********";
            }
            return obj;
        });

        return NextResponse.json({
            success: true,
            storage_providers: safeProviders,
        });
    } catch (error: any) {
        console.error("Get storage config error:", error);
        return NextResponse.json(
            { error: "Failed to fetch configuration" },
            { status: 500 }
        );
    }
}

export async function POST(req: Request) {
    try {
        await connectDB();
        const { provider } = await req.json(); // Expecting a single provider object

        let config = await SystemConfig.findOne().sort({ createdAt: -1 });

        if (!config) {
            config = new SystemConfig({ llm_providers: [], storage_providers: [] });
        }

        // Initialize if missing (migration)
        if (!config.storage_providers) {
            config.storage_providers = [];
        }

        const list = config.storage_providers;
        let targetIndex = -1;

        if (provider._id) {
            targetIndex = list.findIndex((p: any) => p._id.toString() === provider._id);
        }

        // Handle Secret Key Logic
        if (provider.secret_key === "********") {
            if (targetIndex >= 0) {
                provider.secret_key = list[targetIndex].secret_key;
            } else {
                provider.secret_key = ""; // Should verify validation prevents this for new ones
            }
        }

        // Update active status logic
        if (provider.is_active) {
            list.forEach((p: any) => {
                // Deactivate all others.
                // If updating existing, skip self (handled by merge later).
                // If adding new, keys wont match.
                if (provider._id && p._id.toString() === provider._id) return;
                p.is_active = false;
            });
        }

        if (targetIndex >= 0) {
            // Update
            list[targetIndex] = { ...list[targetIndex], ...provider };
        } else {
            // Add
            list.push(provider);
        }

        await config.save();

        return NextResponse.json({ success: true, message: "Storage provider saved" });
    } catch (error: any) {
        console.error("Save storage config error:", error);
        return NextResponse.json(
            { error: "Failed to save configuration" },
            { status: 500 }
        );
    }
}

export async function DELETE(req: Request) {
    try {
        await connectDB();
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

        let config = await SystemConfig.findOne().sort({ createdAt: -1 });
        if (config && config.storage_providers) {
            config.storage_providers = config.storage_providers.filter(
                (p: any) => p._id.toString() !== id
            );
            await config.save();
        }

        return NextResponse.json({ success: true, message: "Deleted successfully" });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
