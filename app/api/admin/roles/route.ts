import { NextRequest, NextResponse } from "next/server";
import { USER_ROLES } from "@/models/User";

export async function GET(req: NextRequest) {
    return NextResponse.json({ roles: USER_ROLES });
}
