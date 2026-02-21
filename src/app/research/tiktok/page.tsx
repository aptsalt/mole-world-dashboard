"use client";

import { Music } from "lucide-react";
import ResearchPlatformPage from "@/components/research/ResearchPlatformPage";

export default function ResearchTikTokPage() {
  return (
    <ResearchPlatformPage
      platform="tiktok"
      icon={Music}
      iconColor="text-cyan-400"
      label="TikTok"
    />
  );
}
