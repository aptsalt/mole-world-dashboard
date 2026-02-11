"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import { clsx } from "clsx";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar - hidden on mobile, toggleable */}
      <div
        className={clsx(
          "fixed inset-y-0 left-0 z-50 lg:relative lg:z-auto",
          "transition-transform duration-200 ease-in-out",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <Sidebar />
      </div>

      {/* Main content area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile hamburger + Topbar */}
        <div className="flex items-center">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-4 text-muted hover:text-white lg:hidden"
            aria-label="Open sidebar"
          >
            <Menu size={20} />
          </button>
          <div className="flex-1">
            <Topbar />
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>

      {/* Mobile close button - visible when sidebar open */}
      {mobileOpen && (
        <button
          onClick={() => setMobileOpen(false)}
          className="fixed right-4 top-4 z-50 rounded-lg bg-white/10 p-2 text-white lg:hidden"
          aria-label="Close sidebar"
        >
          <X size={20} />
        </button>
      )}
    </div>
  );
}
