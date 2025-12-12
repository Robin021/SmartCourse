/**
 * 模板校验 API
 * POST /api/templates/validate - 校验项目数据是否满足模板要求
 */

import { NextResponse } from "next/server";
import { getTemplateById, validateTemplateData } from "@/lib/export/templates";
import Project from "@/models/Project";
import connectDB from "@/lib/db";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { projectId, templateId } = body;

    if (!projectId) {
      return NextResponse.json(
        { error: "缺少 projectId 参数" },
        { status: 400 }
      );
    }

    if (!templateId) {
      return NextResponse.json(
        { error: "缺少 templateId 参数" },
        { status: 400 }
      );
    }

    const template = getTemplateById(templateId);
    if (!template) {
      return NextResponse.json(
        { error: `模板不存在: ${templateId}` },
        { status: 404 }
      );
    }

    await connectDB();
    const project = await Project.findById(projectId).lean();
    if (!project) {
      return NextResponse.json(
        { error: "项目不存在" },
        { status: 404 }
      );
    }

    const validation = validateTemplateData(template, project);

    return NextResponse.json({
      valid: validation.valid,
      missingFields: validation.missingFields,
      warnings: validation.warnings,
      template: {
        id: template.id,
        name: template.name,
        type: template.type,
      },
    });
  } catch (error: any) {
    console.error("[Template Validate API] error:", error);
    return NextResponse.json(
      { error: error.message || "校验失败" },
      { status: 500 }
    );
  }
}


