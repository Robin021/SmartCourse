import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Project from "@/models/Project";
import StageConfig from "@/models/StageConfig";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

export async function GET() {
    try {
        await connectDB();
        const projects = await Project.find().lean();

        // Group config versions to reduce queries
        const versions = Array.from(new Set(projects.map((p: any) => p.config_version)));
        const configs = await StageConfig.find({ version: { $in: versions } }).lean();
        const configMap = new Map(configs.map((c: any) => [c.version, c]));

        const normalizeStatus = (status?: string) => {
            if (!status) return "NOT_STARTED";
            const upper = status.toUpperCase();
            if (upper === "COMPLETED") return "COMPLETED";
            if (upper === "IN_PROGRESS") return "IN_PROGRESS";
            return "NOT_STARTED";
        };

        const result = projects.map((project: any) => {
            const config = configMap.get(project.config_version);
            const stages = (config?.stages || []).map((stage: any) => {
                const pStage = project.stages?.[stage.stage_id] || {};
                return {
                    stage_id: stage.stage_id,
                    name: stage.name,
                    description: stage.description,
                    status: normalizeStatus(pStage.status),
                };
            });

            return {
                ...project,
                _id: project._id.toString(),
                stages,
                overall_progress: project.overall_progress ?? 0,
            };
        });

        return NextResponse.json({ success: true, projects: result });
    } catch (error: any) {
        console.error("List projects error:", error);
        return NextResponse.json({ error: "Failed to fetch projects" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        await connectDB();
        const { name } = await req.json();

        if (!name) {
            return NextResponse.json(
                { error: "Project name is required" },
                { status: 400 }
            );
        }

        // Get user info from token
        const cookieStore = await cookies();
        const token = cookieStore.get("token");
        let tenant_id = "bureau_01"; // Default for prototype
        let school_id = "school_01"; // Default for prototype

        if (token) {
            try {
                const decoded: any = jwt.decode(token.value);
                if (decoded) {
                    tenant_id = decoded.tenant_id || tenant_id;
                    school_id = decoded.school_id || school_id;
                }
            } catch (e) {
                console.error("Token decode error:", e);
            }
        }

        // Get latest config version
        const latestConfig = await StageConfig.findOne({ status: "ACTIVE" }).sort({
            createdAt: -1,
        });
        const config_version = latestConfig?.version || "1.0.0";

        // Create Project
        const project = await Project.create({
            name,
            tenant_id,
            school_id,
            config_version,
            current_stage: "Q1",
            stages: {
                Q1: {
                    status: "NOT_STARTED",
                    form_data: {},
                    summary: {},
                },
            },
        });

        return NextResponse.json({ success: true, project });
    } catch (error: any) {
        console.error("Create project error:", error);
        return NextResponse.json(
            { error: "Failed to create project" },
            { status: 500 }
        );
    }
}
