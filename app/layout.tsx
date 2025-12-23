import type { Metadata } from "next";
import { Noto_Sans_SC } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const notoSans = Noto_Sans_SC({
    subsets: ["latin"],
    variable: "--font-sans",
});

export const metadata: Metadata = {
    title: "SmartCourse",
    description: "AI-Powered Education Planning Platform",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body
                className={cn(
                    "min-h-screen bg-background font-sans antialiased",
                    notoSans.variable
                )}
            >
                {children}
            </body>
        </html>
    );
}
