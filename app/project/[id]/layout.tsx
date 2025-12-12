"use client";

import { StageSidebar } from "@/components/StageSidebar";
import { useParams } from "next/navigation";

export default function ProjectLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const params = useParams<{ id: string }>();
    const projectId = Array.isArray(params?.id) ? params.id[0] : params?.id;

    return (
        <div className="flex min-h-screen bg-background">
            <div className="sticky top-0 h-screen shrink-0">
                <StageSidebar projectId={projectId || ""} />
            </div>
            <main className="flex-1 min-h-screen">{children}</main>
        </div>
    );
}
