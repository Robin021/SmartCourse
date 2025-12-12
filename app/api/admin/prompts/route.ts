import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import PromptTemplate from "@/models/PromptTemplate";
import PromptVersion from "@/models/PromptVersion";

export async function GET(req: Request) {
    try {
        await connectDB();
        const { searchParams } = new URL(req.url);
        const promptId = searchParams.get("prompt_id");
        const action = searchParams.get("action");

        // Get versions for a specific prompt
        if (action === "versions" && promptId) {
            const versions = await PromptVersion.find({ prompt_id: promptId })
                .sort({ version: -1 });
            return NextResponse.json({ success: true, versions });
        }

        // Default: List all prompts
        const prompts = await PromptTemplate.find().sort({ createdAt: -1 });
        return NextResponse.json({ success: true, prompts });
    } catch (error: any) {
        console.error("Get prompts error:", error);
        return NextResponse.json(
            { error: "Failed to fetch prompts" },
            { status: 500 }
        );
    }
}

export async function POST(req: Request) {
    try {
        await connectDB();
        const data = await req.json();

        // Handle A/B test configuration
        if (data.action === "ab_test") {
            await PromptTemplate.findByIdAndUpdate(data.prompt_id, {
                ab_testing: data.ab_testing,
            });
            return NextResponse.json({ success: true, message: "A/B test updated" });
        }

        // Handle rollback
        if (data.action === "rollback") {
            const version = await PromptVersion.findOne({
                prompt_id: data.prompt_id,
                version: data.version,
            });

            if (!version) {
                return NextResponse.json({ error: "Version not found" }, { status: 404 });
            }

            const prompt = await PromptTemplate.findById(data.prompt_id);
            if (!prompt) {
                return NextResponse.json({ error: "Prompt not found" }, { status: 404 });
            }

            // Create new version with rollback content
            const newVersion = (prompt.current_version || 0) + 1;

            await PromptVersion.create({
                prompt_id: data.prompt_id,
                version: newVersion,
                template: version.template,
                variables: version.variables,
                created_by: data.user || "system",
                change_note: `Rollback to v${data.version}`,
            });

            await PromptTemplate.findByIdAndUpdate(data.prompt_id, {
                template: version.template,
                variables: version.variables,
                current_version: newVersion,
            });

            return NextResponse.json({ success: true, message: `Rolled back to v${data.version}` });
        }

        // Handle delete version
        if (data.action === "deleteVersion") {
            const result = await PromptVersion.deleteOne({
                prompt_id: data.prompt_id,
                version: data.version,
            });
            
            if (result.deletedCount === 0) {
                return NextResponse.json({ error: "Version not found" }, { status: 404 });
            }
            
            return NextResponse.json({ success: true, message: `Version ${data.version} deleted` });
        }

        // Handle cleanup versions
        if (data.action === "cleanupVersions") {
            const keepCount = data.keepCount || 10;
            
            // Get all versions sorted by version number (descending)
            const allVersions = await PromptVersion.find({ prompt_id: data.prompt_id })
                .sort({ version: -1 });
            
            if (allVersions.length <= keepCount) {
                return NextResponse.json({ success: true, deletedCount: 0, message: "No cleanup needed" });
            }

            // Keep the latest N versions
            const toKeep = allVersions.slice(0, keepCount);
            const toDelete = allVersions.slice(keepCount);
            
            if (toDelete.length === 0) {
                return NextResponse.json({ success: true, deletedCount: 0, message: "No cleanup needed" });
            }

            const versionsToDelete = toDelete.map(v => v.version);
            const result = await PromptVersion.deleteMany({
                prompt_id: data.prompt_id,
                version: { $in: versionsToDelete },
            });
            
            return NextResponse.json({ 
                success: true, 
                deletedCount: result.deletedCount || 0,
                message: `Cleaned up ${result.deletedCount || 0} old version(s), kept latest ${keepCount}` 
            });
        }

        // Extract variables from template
        const variableMatches = data.template?.match(/\{\{(\w+)\}\}/g) || [];
        const variables = variableMatches.map((v: string) => v.replace(/\{\{|\}\}/g, ""));

        if (data._id) {
            // Update existing - create new version
            const existing = await PromptTemplate.findById(data._id);

            if (!existing) {
                return NextResponse.json({ error: "Prompt not found" }, { status: 404 });
            }

            if (existing.is_system && data.key !== existing.key) {
                return NextResponse.json(
                    { error: "Cannot change key of system prompt" },
                    { status: 400 }
                );
            }

            // Check if template actually changed
            if (existing.template !== data.template) {
                const newVersion = (existing.current_version || 0) + 1;

                // Save version snapshot
                await PromptVersion.create({
                    prompt_id: data._id,
                    version: newVersion,
                    template: data.template,
                    variables,
                    created_by: data.user || "system",
                    change_note: data.change_note || "",
                });

                await PromptTemplate.findByIdAndUpdate(data._id, {
                    name: data.name,
                    key: data.key,
                    template: data.template,
                    variables,
                    description: data.description,
                    current_version: newVersion,
                });
            } else {
                // Only metadata changed, no new version
                await PromptTemplate.findByIdAndUpdate(data._id, {
                    name: data.name,
                    key: data.key,
                    description: data.description,
                });
            }
        } else {
            // Create new prompt
            const prompt = await PromptTemplate.create({
                name: data.name,
                key: data.key,
                template: data.template,
                variables,
                description: data.description,
                is_system: false,
                current_version: 1,
                ab_testing: { enabled: false, versions: [] },
            });

            // Create initial version snapshot
            await PromptVersion.create({
                prompt_id: prompt._id,
                version: 1,
                template: data.template,
                variables,
                created_by: data.user || "system",
                change_note: "Initial version",
            });
        }

        return NextResponse.json({ success: true, message: "Prompt saved" });
    } catch (error: any) {
        console.error("Save prompt error:", error);

        if (error.code === 11000) {
            return NextResponse.json(
                { error: "A prompt with this key already exists" },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { error: "Failed to save prompt" },
            { status: 500 }
        );
    }
}

export async function DELETE(req: Request) {
    try {
        await connectDB();
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json({ error: "ID required" }, { status: 400 });
        }

        const prompt = await PromptTemplate.findById(id);
        if (prompt?.is_system) {
            return NextResponse.json(
                { error: "Cannot delete system prompts" },
                { status: 400 }
            );
        }

        // Delete all versions
        await PromptVersion.deleteMany({ prompt_id: id });
        await PromptTemplate.findByIdAndDelete(id);

        return NextResponse.json({ success: true, message: "Prompt deleted" });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
