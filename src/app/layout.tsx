import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "NEXUS — Your Engineering Control Plane",
    template: "%s · NEXUS",
  },
  description:
    "AI-native engineering control plane: service catalog, deployments, observability, performance, incidents, feature flags, architecture and an AI engineering assistant. Build. Ship. Observe. Improve.",
  keywords: ["developer platform", "internal developer platform", "service catalog", "observability", "CI/CD", "feature flags", "engineering analytics", "AI engineering"],
  authors: [{ name: "NEXUS" }],
  openGraph: {
    title: "NEXUS — AI-Native Engineering Control Plane",
    description: "Build. Ship. Observe. Improve. AI-native infrastructure for modern engineering teams.",
    siteName: "NEXUS",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "NEXUS — AI-Native Engineering Control Plane",
    description: "Build. Ship. Observe. Improve.",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0b0d10" },
    { media: "(prefers-color-scheme: light)", color: "#f4f6f8" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster position="bottom-right" />
      </body>
    </html>
  );
}
