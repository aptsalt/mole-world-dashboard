import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { AppShell } from "@/components/layout/app-shell";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { SSEProvider } from "@/components/layout/sse-provider";
import { ToastContainer } from "@/components/ui/toast";
import { CommandPalette } from "@/components/ui/command-palette";
import { FloatingActionButton } from "@/components/ui/fab";
import { ShortcutsModal } from "@/components/ui/shortcuts-modal";
import { Onboarding } from "@/components/ui/onboarding";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "The Mole World | Production Dashboard",
  description: "AI-powered film production dashboard for The Mole World",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} antialiased bg-bg text-text`}
      >
        <ThemeProvider />
        <SSEProvider />
        <AppShell>{children}</AppShell>
        <ToastContainer />
        <CommandPalette />
        <FloatingActionButton />
        <ShortcutsModal />
        <Onboarding />
      </body>
    </html>
  );
}
