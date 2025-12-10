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
        <div className="flex h-screen overflow-hidden bg-background">
            <StageSidebar projectId={projectId || ""} />
            <main className="flex-1 flex flex-col overflow-hidden">{children}</main>
        </div>
    );
}
