"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { socket } from "../../lib/socket";

interface NotificationPayload {
  id: string;
  type: "FOLLOW" | "LIKE" | "COMMENT" | "MENTION";
  message: string;
  actor: {
    id: string;
    name: string;
    username: string;
    avatarUrl?: string | null;
  };
  post?: {
    id: string;
    content: string;
  } | null;
}

export function NotificationToaster() {
  const [toast, setToast] = useState<NotificationPayload | null>(null);

  useEffect(() => {
    function handleNewNotification(notification: NotificationPayload) {
      setToast(notification);

      const timer = setTimeout(() => {
        setToast(null);
      }, 4500);

      return () => clearTimeout(timer);
    }

    socket.on("new-notification", handleNewNotification);
    return () => {
      socket.off("new-notification", handleNewNotification);
    };
  }, []);

  if (!toast) return null;

  return (
    <div className="fixed bottom-16 right-4 z-50 flex w-[calc(100vw-32px)] max-w-sm items-start gap-3.5 rounded-2xl border border-neutral-200 bg-white/95 p-4 shadow-2xl backdrop-blur-md sm:bottom-6 sm:right-6 dark:border-neutral-800 dark:bg-neutral-950/95">
   
      <Link
        href={`/profile/${toast.actor.username}`}
        className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-neutral-200 text-xs font-bold text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100"
      >
        {toast.actor.avatarUrl ? (
          <img
            src={toast.actor.avatarUrl}
            alt={toast.actor.name}
            className="h-full w-full object-cover"
          />
        ) : (
          toast.actor.name.charAt(0).toUpperCase()
        )}
      </Link>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between">
          <Link
            href={`/profile/${toast.actor.username}`}
            className="truncate text-xs font-extrabold text-neutral-900 hover:underline dark:text-white"
          >
            {toast.actor.name}
          </Link>
          <span className="text-[10px] text-neutral-400">now</span>
        </div>

        <p className="mt-0.5 text-xs text-neutral-600 dark:text-neutral-300">
          {toast.message}
        </p>

        {toast.post && (
          <p className="mt-1.5 truncate rounded-lg bg-neutral-100 px-2.5 py-1 text-[11px] text-neutral-500 dark:bg-neutral-900 dark:text-neutral-400">
            {toast.post.content}
          </p>
        )}
      </div>

      <button
        onClick={() => setToast(null)}
        className="rounded-full p-1 text-neutral-400 transition hover:text-black dark:hover:text-white"
      >
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>
  );
}
