"use client";

import { Youtube } from "lucide-react";
import ResearchPlatformPage from "@/components/research/ResearchPlatformPage";

export default function ResearchYouTubePage() {
  return (
    <ResearchPlatformPage
      platform="youtube"
      icon={Youtube}
      iconColor="text-red-400"
      label="YouTube"
      categories={[
        { key: "default", label: "Trending" },
        { key: "subscriptions", label: "Subscriptions" },
        { key: "podcasts", label: "Podcasts" },
      ]}
    />
  );
}
