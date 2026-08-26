"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { socket } from "../../lib/socket";

interface Actor {
  id: string;
  name: string;
  username: string;
  avatarUrl?: string | null;
}

interface NotificationItem {
  id: string;
  type: "FOLLOW" | "LIKE" | "COMMENT" | "MENTION";
  message: string;
  isRead: boolean;
  createdAt: string;
  actor: Actor;
  post?: { id: string; content: string } | null;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"all" | "verified" | "mentions">("all");

  useEffect(() => {
    const fetchNotifications = async () => {
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("token") || localStorage.getItem("accessToken")
          : null;
      if (!token) return;

      try {
        setLoading(true);
        const res = await fetch(`${API_URL}/notifications`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const data: NotificationItem[] = await res.json();
          setNotifications(data);

          fetch(`${API_URL}/notifications/read-all`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${token}` },
          });
        }
      } catch (err) {
        console.error("Failed to load notifications:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();

    const handleNewNotification = (item: NotificationItem) => {
      setNotifications((prev) => [item, ...prev]);
    };

    socket.on("new-notification", handleNewNotification);
    return () => {
      socket.off("new-notification", handleNewNotification);
    };
  }, []);

  const getIcon = (type: string) => {
    switch (type) {
      case "LIKE":
        return (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500/10 text-red-500">
            <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          </div>
        );
      case "COMMENT":
        return (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/10 text-blue-500">
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
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
          </div>
        );
      case "FOLLOW":
        return (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-500/10 text-neutral-900 dark:text-neutral-100">
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
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </div>
        );
      default:
        return (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-500/10 text-neutral-900 dark:text-neutral-100">
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
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
          </div>
        );
    }
  };

  const filtered = notifications.filter((n) => {
    if (tab === "mentions") return n.type === "MENTION" || n.type === "COMMENT";
    return true;
  });

  return (
    <div className="min-h-screen w-full bg-white dark:bg-black">
      
      <div className="sticky top-0 z-10 border-b border-neutral-200 bg-white/80 p-4 backdrop-blur-md dark:border-neutral-800 dark:bg-black/80">
        <h1 className="text-xl font-black tracking-tight text-neutral-900 dark:text-white">
          Notifications
        </h1>

        <div className="mt-4 flex border-b border-neutral-200 text-sm font-bold dark:border-neutral-800">
          <button
            onClick={() => setTab("all")}
            className={`flex-1 pb-3 text-center transition ${
              tab === "all"
                ? "border-b-2 border-black text-black dark:border-white dark:text-white"
                : "text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setTab("verified")}
            className={`flex-1 pb-3 text-center transition ${
              tab === "verified"
                ? "border-b-2 border-black text-black dark:border-white dark:text-white"
                : "text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
            }`}
          >
            Verified
          </button>
          <button
            onClick={() => setTab("mentions")}
            className={`flex-1 pb-3 text-center transition ${
              tab === "mentions"
                ? "border-b-2 border-black text-black dark:border-white dark:text-white"
                : "text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
            }`}
          >
            Mentions
          </button>
        </div>
      </div>

    
      <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
        {loading ? (
          <p className="p-8 text-center text-xs text-neutral-400">
            Loading notifications...
          </p>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-neutral-500">
            <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
              No notifications yet
            </h3>
            <p className="mt-1 text-xs text-neutral-400">
              When people like your posts, comment, or follow you, you will see
              them here.
            </p>
          </div>
        ) : (
          filtered.map((item) => (
            <div
              key={item.id}
              className={`flex items-start gap-3.5 p-4 transition hover:bg-neutral-50/75 dark:hover:bg-neutral-950 ${
                !item.isRead ? "bg-blue-500/5" : ""
              }`}
            >
              <div className="pt-0.5">{getIcon(item.type)}</div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/profile/${item.actor.username}`}
                    className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-neutral-200 font-bold text-xs dark:bg-neutral-800"
                  >
                    {item.actor.avatarUrl ? (
                      <img
                        src={item.actor.avatarUrl}
                        alt={item.actor.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      item.actor.name.charAt(0).toUpperCase()
                    )}
                  </Link>

                  <p className="text-sm text-neutral-900 dark:text-white">
                    <Link
                      href={`/profile/${item.actor.username}`}
                      className="font-bold hover:underline"
                    >
                      {item.actor.name}
                    </Link>{" "}
                    <span className="text-neutral-500 dark:text-neutral-400">
                      {item.message}
                    </span>
                  </p>
                </div>

                {item.post && (
                  <p className="mt-2 ml-10 border-l-2 border-neutral-200 py-0.5 pl-3 text-xs text-neutral-500 line-clamp-2 dark:border-neutral-800 dark:text-neutral-400">
                    {item.post.content}
                  </p>
                )}

                <p className="mt-1.5 ml-10 text-[10px] text-neutral-400">
                  {new Date(item.createdAt).toLocaleDateString([], {
                    month: "short",
                    day: "numeric",
                  })}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
