import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const { doc_text, target_field } = await req.json();

        // Mock AI Extraction Logic
        // In real app, this would call an LLM to extract the specific field value from the text
        // For prototype, we'll just return the whole text or a substring as the "extracted" value

        let extractedValue = doc_text;

        // Simple heuristic for demo: if text contains "Philosophy:", extract what's after
        if (doc_text.includes("Philosophy:")) {
            extractedValue = doc_text.split("Philosophy:")[1].trim();
        }

        return NextResponse.json({
            success: true,
            extracted_value: extractedValue,
            field: target_field,
            message: "Successfully extracted data from document",
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
