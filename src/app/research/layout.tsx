"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, AtSign, Camera, Youtube, Music, Newspaper } from "lucide-react";
import { clsx } from "clsx";

const TABS = [
  { href: "/research", label: "Dashboard", icon: LayoutGrid, exact: true, color: "text-cyan" },
  { href: "/research/x", label: "X", icon: AtSign, color: "text-white" },
  { href: "/research/instagram", label: "Instagram", icon: Camera, color: "text-pink-400" },
  { href: "/research/youtube", label: "YouTube", icon: Youtube, color: "text-red-400" },
  { href: "/research/tiktok", label: "TikTok", icon: Music, color: "text-cyan-400" },
  { href: "/research/news", label: "News", icon: Newspaper, color: "text-lime" },
];

export default function ResearchLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="space-y-6">
      {/* Sub-navigation */}
      <nav className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-white/[0.08]">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = tab.exact
            ? pathname === tab.href
            : pathname.startsWith(tab.href);

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={clsx(
                "flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-all whitespace-nowrap",
                active
                  ? "bg-white/[0.06] text-white border-b-2 border-cyan"
                  : "text-muted hover:text-white hover:bg-white/[0.03]"
              )}
            >
              <Icon size={15} className={active ? (tab.color ?? "text-cyan") : ""} />
              {tab.label}
            </Link>
          );
        })}
      </nav>

      {children}
    </div>
  );
}
