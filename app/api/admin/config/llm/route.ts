import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import SystemConfig from "@/models/SystemConfig";

const coerceMaxTokens = (val: any): number | undefined => {
    const num = Number(val);
    if (Number.isFinite(num) && num > 0) return num;
    return undefined;
};

export async function GET() {
    try {
        await connectDB();
        const config = await SystemConfig.findOne().sort({ createdAt: -1 });

        const llmProviders = (config?.llm_providers || []).map((p: any) => {
            const plain = typeof p.toObject === "function" ? p.toObject() : p;
            const id = plain._id?.toString ? plain._id.toString() : plain._id;
            const maxTokens = coerceMaxTokens(plain.max_output_tokens) ?? 2000;
            return {
                ...plain,
                _id: id,
                max_output_tokens: maxTokens,
            };
        });

        return NextResponse.json({
            success: true,
            config: config
                ? { ...config.toObject(), llm_providers: llmProviders }
                : { llm_providers: llmProviders },
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
        const { provider: incomingProvider } = await req.json();

        const parsedMax = coerceMaxTokens(incomingProvider?.max_output_tokens);
        const normalizedProvider = {
            ...incomingProvider,
            max_output_tokens: parsedMax,
        };

        let config = await SystemConfig.findOne().sort({ createdAt: -1 });
        if (!config) {
            config = new SystemConfig({ llm_providers: [] });
        }

        const normalizedId =
            normalizedProvider._id?.toString && typeof normalizedProvider._id !== "string"
                ? normalizedProvider._id.toString()
                : normalizedProvider._id;

        const resolvedMax =
            coerceMaxTokens(normalizedProvider.max_output_tokens) ?? 2000;

        if (normalizedId) {
            // Update existing provider using positional operator to avoid Mongoose array quirks
            const updateResult = await SystemConfig.updateOne(
                { _id: config._id, "llm_providers._id": normalizedId },
                {
                    $set: {
                        "llm_providers.$.name": normalizedProvider.name,
                        "llm_providers.$.provider": normalizedProvider.provider,
                        "llm_providers.$.type": normalizedProvider.type,
                        "llm_providers.$.base_url": normalizedProvider.base_url,
                        "llm_providers.$.api_key": normalizedProvider.api_key,
                        "llm_providers.$.model": normalizedProvider.model,
                        "llm_providers.$.is_active": normalizedProvider.is_active,
                        "llm_providers.$.max_output_tokens": resolvedMax,
                    },
                }
            );
            // Fallback if not matched (e.g., _id mismatch)
            if (!updateResult.matchedCount) {
                const idx = (config.llm_providers || []).findIndex(
                    (p: any) => (p._id?.toString ? p._id.toString() : p._id) === normalizedId
                );
                if (idx >= 0) {
                    const updated = {
                        ...(typeof (config.llm_providers as any)[idx].toObject === "function"
                            ? (config.llm_providers as any)[idx].toObject()
                            : (config.llm_providers as any)[idx]),
                        ...normalizedProvider,
                        max_output_tokens: resolvedMax,
                        _id: normalizedId,
                    };
                    (config.llm_providers as any)[idx] = updated;
                    config.markModified("llm_providers");
                    await config.save();
                }
            }
        } else {
            // Insert new provider
            config.llm_providers.push({
                ...normalizedProvider,
                max_output_tokens: resolvedMax,
            } as any);
            await config.save();
        }

        // Reload latest config
        const refreshed = await SystemConfig.findById(config._id);
        if (!refreshed) {
            throw new Error("Failed to reload config after update");
        }

        // Handle "Active" logic: ensure single active per type
        if (normalizedProvider.is_active) {
            refreshed.llm_providers = (refreshed.llm_providers || []).map((p: any) => {
                const pid = p._id?.toString ? p._id.toString() : p._id;
                const isSameType = p.type === normalizedProvider.type;
                const isSameProvider = (normalizedId && pid === normalizedId) ||
                    (!normalizedId && p.name === normalizedProvider.name && p.model === normalizedProvider.model);
                return {
                    ...(typeof p.toObject === "function" ? p.toObject() : p),
                    is_active: isSameType ? isSameProvider : p.is_active,
                };
            }) as any;
            refreshed.markModified("llm_providers");
            await refreshed.save();
        }

        // Normalize output
        const llmProviders = (refreshed.llm_providers || []).map((p: any) => {
            const plain = typeof p.toObject === "function" ? p.toObject() : p;
            const id = plain._id?.toString ? plain._id.toString() : plain._id;
            return {
                ...plain,
                _id: id,
                max_output_tokens: coerceMaxTokens(plain.max_output_tokens) ?? 2000,
            };
        });

        return NextResponse.json({
            success: true,
            config: { ...refreshed.toObject(), llm_providers: llmProviders },
        });
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
