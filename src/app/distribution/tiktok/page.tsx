"use client";

import { useState } from "react";
import { Music } from "lucide-react";
import PlatformPage from "@/components/distribution/PlatformPage";
import PostComposer from "@/components/distribution/PostComposer";
import type { ContentPost } from "@/components/distribution/types";

export default function TikTokPage() {
  const [composerOpen, setComposerOpen] = useState(false);
  const [editPost, setEditPost] = useState<ContentPost | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <>
      <PlatformPage
        key={refreshKey}
        platform={{
          key: "tiktok",
          label: "TikTok",
          color: "text-cyan-400",
          bgColor: "bg-cyan-500/10",
          icon: Music,
        }}
        onCreatePost={() => { setEditPost(null); setComposerOpen(true); }}
        onEditPost={(post) => { setEditPost(post); setComposerOpen(true); }}
      />
      {composerOpen && (
        <PostComposer
          post={editPost}
          onClose={() => { setComposerOpen(false); setEditPost(null); }}
          onSave={() => setRefreshKey((k) => k + 1)}
        />
      )}
    </>
  );
}
