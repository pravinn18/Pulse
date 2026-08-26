"use client";

import { useState, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import CreatePost from "./CreatePost";

interface ComposePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPostCreated?: (newPost?: any) => void;
}

export default function ComposePostModal({
  isOpen,
  onClose,
  onPostCreated,
}: ComposePostModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 pt-16 backdrop-blur-sm sm:pt-20">
      <div className="w-full max-w-xl rounded-2xl border border-neutral-200 bg-white shadow-2xl dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex items-center justify-between border-b border-neutral-100 p-3 dark:border-neutral-800">
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
          >
            ✕
          </button>
          <span className="text-xs font-bold text-neutral-400">Drafts</span>
        </div>

        <div className="p-3">
          <CreatePost
            onPostCreated={(post) => {
              onPostCreated?.(post);
              onClose();
            }}
          />
        </div>
      </div>
    </div>
  );
}
