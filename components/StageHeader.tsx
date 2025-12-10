"use client";

"use client";

import { Save, Share2, FileDown } from "lucide-react";

// Basic Button component since I don't have shadcn installed yet
function BasicButton({
    children,
    className,
    variant = "primary",
    ...props
}: any) {
    const baseClass =
        "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-9 px-4 py-2";
    const variants = {
        primary: "bg-primary text-primary-foreground hover:bg-primary/90",
        outline:
            "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        ghost: "hover:bg-accent hover:text-accent-foreground",
    };
    return (
        <button
            className={`${baseClass} ${variants[variant as keyof typeof variants]} ${className}`}
            {...props}
        >
            {children}
        </button>
    );
}

export function StageHeader({
    title,
    description,
}: {
    title: string;
    description: string;
}) {
    return (
        <header className="h-14 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex items-center justify-between px-6 sticky top-0 z-10">
            <div>
                <h1 className="text-sm font-semibold">{title}</h1>
                <p className="text-xs text-muted-foreground">{description}</p>
            </div>
            <div className="flex items-center gap-2">
                <div className="flex -space-x-2 mr-4">
                    <div className="h-8 w-8 rounded-full border-2 border-background bg-blue-500 flex items-center justify-center text-white text-xs">
                        A
                    </div>
                    <div className="h-8 w-8 rounded-full border-2 border-background bg-green-500 flex items-center justify-center text-white text-xs">
                        B
                    </div>
                </div>
                <BasicButton variant="ghost" size="sm">
                    <Share2 className="h-4 w-4 mr-2" />
                    Share
                </BasicButton>
                <BasicButton variant="outline" size="sm">
                    <FileDown className="h-4 w-4 mr-2" />
                    Export
                </BasicButton>
                <BasicButton size="sm">
                    <Save className="h-4 w-4 mr-2" />
                    Save
                </BasicButton>
            </div>
        </header>
    );
}
