"use client";

import { useState } from "react";
import { Youtube } from "lucide-react";
import PlatformPage from "@/components/distribution/PlatformPage";
import PostComposer from "@/components/distribution/PostComposer";
import type { ContentPost } from "@/components/distribution/types";

export default function YouTubePage() {
  const [composerOpen, setComposerOpen] = useState(false);
  const [editPost, setEditPost] = useState<ContentPost | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <>
      <PlatformPage
        key={refreshKey}
        platform={{
          key: "youtube",
          label: "YouTube",
          color: "text-red-400",
          bgColor: "bg-red-500/10",
          icon: Youtube,
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
