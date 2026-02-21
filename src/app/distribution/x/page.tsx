"use client";

import { useState } from "react";
import { AtSign } from "lucide-react";
import PlatformPage from "@/components/distribution/PlatformPage";
import PostComposer from "@/components/distribution/PostComposer";
import type { ContentPost } from "@/components/distribution/types";

export default function XPage() {
  const [composerOpen, setComposerOpen] = useState(false);
  const [editPost, setEditPost] = useState<ContentPost | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <>
      <PlatformPage
        key={refreshKey}
        platform={{
          key: "x",
          label: "X",
          color: "text-white",
          bgColor: "bg-white/10",
          icon: AtSign,
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
