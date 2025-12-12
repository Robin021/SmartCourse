import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { stageService } from "@/lib/stage";
import { versionManager } from "@/lib/version";

export async function POST(
    req: Request,
    context: { params: Promise<{ id: string; stageId: string }> }
) {
    try {
        const { input, output, createVersion: shouldCreateVersion } = await req.json();
        await connectDB();
        const params = await context.params;
        
        // Save input data
        await stageService.saveStageInput(params.id, params.stageId as any, input || {});
        
        // If output (edited document content) is provided, save it too
        // Note: output can be an empty string, so we check !== undefined && !== null
        if (output !== undefined && output !== null) {
            // Get existing output to preserve other fields (keywords, scores, etc.)
            const stage = await stageService.getStageData(params.id, params.stageId as any);
            const existingOutput = stage?.output || {};
            
            // Extract content - handle both string and object formats
            const newContent = typeof output === 'string' ? output : (output.report || output.content || '');
            const oldContent = existingOutput.report || existingOutput.content || '';
            
            // Normalize content for comparison (trim whitespace)
            const normalizedNew = newContent.trim();
            const normalizedOld = oldContent.trim();
            const contentChanged = normalizedNew !== normalizedOld;
            
            console.log(`[Stage Input POST] Content check:`, {
                stage: params.stageId,
                newLength: normalizedNew.length,
                oldLength: normalizedOld.length,
                changed: contentChanged,
                newPreview: normalizedNew.substring(0, 50),
                oldPreview: normalizedOld.substring(0, 50),
            });
            
            // Update with new content while preserving other fields
            const updatedOutput = {
                ...existingOutput,
                // Update the main content field (most stages use 'report', some use 'content')
                report: newContent,
                content: newContent,
            };
            
            await stageService.saveStageOutput(params.id, params.stageId as any, updatedOutput);
            
            // Create a new version if content changed and user requested it (or auto-create for manual edits)
            let versionCreated = false;
            if (contentChanged && normalizedNew.length > 0 && (shouldCreateVersion !== false)) {
                try {
                    // Build version content structure similar to AI-generated versions
                    const versionContent: any = {
                        text: newContent,
                        report: newContent,
                        content: newContent,
                    };
                    
                    // Preserve other output fields
                    Object.keys(existingOutput).forEach(key => {
                        if (key !== 'report' && key !== 'content' && key !== 'text') {
                            versionContent[key] = existingOutput[key];
                        }
                    });
                    
                    const createdVersion = await versionManager.create({
                        project_id: params.id,
                        stage: params.stageId as any,
                        content: versionContent,
                        author: {
                            user_id: "system",
                            name: "Manual Edit",
                        },
                        is_ai_generated: false,
                        change_note: "手动编辑保存",
                    });
                    
                    console.log(`[Stage Input POST] Version created:`, {
                        version: createdVersion.version,
                        stage: params.stageId,
                    });
                    
                    versionCreated = true;
                } catch (versionError: any) {
                    // Log but don't fail the save operation
                    console.error("[Stage Input POST] Failed to create version:", versionError);
                    console.error("[Stage Input POST] Version error details:", {
                        message: versionError.message,
                        stack: versionError.stack,
                        projectId: params.id,
                        stage: params.stageId,
                    });
                }
            } else {
                console.log(`[Stage Input POST] Version not created:`, {
                    contentChanged,
                    hasContent: normalizedNew.length > 0,
                    shouldCreateVersion,
                });
            }
            
            return NextResponse.json({ success: true, versionCreated });
        }
        
        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("[Stage Input POST] error:", error);
        const message = error?.message || "Failed to save stage input";
        const status = message.includes("Invalid stage") ? 400 : 500;
        return NextResponse.json({ error: message }, { status });
    }
}
