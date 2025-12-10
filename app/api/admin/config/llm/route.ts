import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import SystemConfig from "@/models/SystemConfig";

export async function GET() {
    try {
        await connectDB();
        const config = await SystemConfig.findOne().sort({ createdAt: -1 });

        return NextResponse.json({
            success: true,
            config: config || { llm_providers: [] },
        });
    } catch (error: any) {
        console.error("Get config error:", error);
        return NextResponse.json(
            { error: "Failed to fetch configuration" },
            { status: 500 }
        );
    }
}

export async function POST(req: Request) {
    try {
        await connectDB();
        const { provider } = await req.json();

        let config = await SystemConfig.findOne().sort({ createdAt: -1 });

        if (!config) {
            config = new SystemConfig({ llm_providers: [] });
        }

        // If provider has _id, update existing
        if (provider._id) {
            const existingIndex = config.llm_providers.findIndex(
                (p: any) => p._id.toString() === provider._id
            );

            if (existingIndex >= 0) {
                config.llm_providers[existingIndex] = {
                    ...config.llm_providers[existingIndex],
                    ...provider,
                };
            }
        } else {
            // Add new
            config.llm_providers.push(provider);
        }

        // Handle "Active" logic:
        // If this provider is active, deactivate others OF THE SAME TYPE
        if (provider.is_active) {
            config.llm_providers.forEach((p: any) => {
                // If it's the same type (chat/embedding) but NOT the one we just touched (by ID or name if new)
                // Note: provider._id might be undefined for new ones, so we check reference or name/model combo?
                // Mongoose subdocs get _ids on save.
                // Simplest logic: If we are saving a provider that is active, iterate all others of same type and set active=false.
                // We need to identify "this" provider in the array.

                // If we just pushed it, it's the last one.
                // If we updated it, we know the index.

                // Let's do a pass:
                // The provider object coming in might not have the _id if it's new.
                // But we updated the array.

                // Let's rely on the fact that we want ONE active provider per type.
                // We can just loop through all providers.
                // If p.type === provider.type AND (p._id !== provider._id OR (new and name matches?))
                // Actually, simpler:
                // If provider.is_active is true, set all others of same type to false.

                const isSameType = p.type === provider.type;
                const isSameProvider = (provider._id && p._id.toString() === provider._id) ||
                    (!provider._id && p.name === provider.name && p.model === provider.model); // Fallback for new

                if (isSameType && !isSameProvider) {
                    p.is_active = false;
                }
            });
        }

        await config.save();

        return NextResponse.json({ success: true, config });
    } catch (error: any) {
        console.error("Save config error:", error);
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
        const providerId = searchParams.get("id");

        if (!providerId) {
            return NextResponse.json(
                { error: "Provider ID is required" },
                { status: 400 }
            );
        }

        let config = await SystemConfig.findOne().sort({ createdAt: -1 });

        if (config) {
            config.llm_providers = config.llm_providers.filter(
                (p: any) => p._id.toString() !== providerId
            );
            await config.save();
        }

        return NextResponse.json({ success: true, config });
    } catch (error: any) {
        console.error("Delete config error:", error);
        return NextResponse.json(
            { error: "Failed to delete provider" },
            { status: 500 }
        );
    }
}
