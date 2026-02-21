"use client";

import { AtSign } from "lucide-react";
import ResearchPlatformPage from "@/components/research/ResearchPlatformPage";

export default function ResearchXPage() {
  return (
    <ResearchPlatformPage
      platform="x"
      icon={AtSign}
      iconColor="text-white"
      label="X / Twitter"
    />
  );
}
