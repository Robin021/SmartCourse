/**
 * 模板列表 API
 * GET /api/templates - 获取所有可用模板
 * GET /api/templates?type=record - 按类型筛选
 * GET /api/templates?format=docx - 按支持格式筛选
 */

import { NextResponse } from "next/server";
import {
  getAllTemplates,
  getTemplatesByType,
  getTemplatesByFormat,
  getTemplateById,
} from "@/lib/export/templates";
import type { TemplateType, ExportFormat } from "@/lib/export/templates/types";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") as TemplateType | null;
    const format = searchParams.get("format") as ExportFormat | null;
    const id = searchParams.get("id");

    // 获取单个模板详情
    if (id) {
      const template = getTemplateById(id);
      if (!template) {
        return NextResponse.json(
          { error: `模板不存在: ${id}` },
          { status: 404 }
        );
      }
      return NextResponse.json({ template });
    }

    // 获取模板列表
    let templates = getAllTemplates();

    // 按类型筛选
    if (type) {
      templates = getTemplatesByType(type);
    }

    // 按格式筛选
    if (format) {
      templates = templates.filter((t) => t.supportedFormats.includes(format));
    }

    // 返回精简的列表信息
    const list = templates.map((t) => ({
      id: t.id,
      name: t.name,
      type: t.type,
      description: t.description,
      usageScenario: t.usageScenario,
      supportedFormats: t.supportedFormats,
      previewUrl: t.previewUrl,
      version: t.version,
    }));

    return NextResponse.json({
      templates: list,
      total: list.length,
    });
  } catch (error: any) {
    console.error("[Templates API] error:", error);
    return NextResponse.json(
      { error: error.message || "获取模板列表失败" },
      { status: 500 }
    );
  }
}



