import { redirect } from "next/navigation";

export default function AdminDashboard() {
    // For now, redirect to LLM settings as it's the main feature
    redirect("/admin/settings/llm");
}
