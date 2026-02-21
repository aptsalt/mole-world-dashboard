"use client";

import { Camera } from "lucide-react";
import ResearchPlatformPage from "@/components/research/ResearchPlatformPage";

export default function ResearchInstagramPage() {
  return (
    <ResearchPlatformPage
      platform="instagram"
      icon={Camera}
      iconColor="text-pink-400"
      label="Instagram"
    />
  );
}
