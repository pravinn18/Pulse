"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "../../context/AuthContext";
import PollCard from "../../components/PollCard";
import Comments from "../../components/Comments";
import FeedVideoPlayer from "../../components/FeedVideoPlayer";
import { formatPostTime, formatFullDateTime } from "../../lib/dateUtils";

interface PostItem {
  id: string;
  content: string;
  imageUrl?: string | null;
  isReel?: boolean;
  createdAt: string;
  author: {
    id: string;
    name: string;
    username: string;
    avatarUrl?: string | null;
  };
  likes?: { userId: string }[];
  bookmarks?: { userId: string }[];
  poll?: any;
  _count?: {
    likes: number;
    comments: number;
  };
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const isVideoMedia = (url?: string | null, isReel?: boolean) => {
  if (!url) return false;
  if (isReel) return true;
  return (
    url.endsWith(".mp4") ||
    url.endsWith(".webm") ||
    url.endsWith(".mov") ||
    url.endsWith(".mkv") ||
    url.includes("/video/upload/") ||
    url.includes(".mp4?")
  );
};

export default function HistoryAndSavedPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<"saved" | "liked" | "history">("saved");
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);

  const fetchTabPosts = async (activeTab: "saved" | "liked" | "history") => {
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("token") || localStorage.getItem("accessToken")
        : null;

    if (!token) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      if (activeTab === "history") {
        const rawHistory = localStorage.getItem("pulse_view_history");
        if (rawHistory) {
          try {
            const parsed: PostItem[] = JSON.parse(rawHistory);
            setPosts(parsed);
            setLoading(false);
            return;
          } catch {}
        }
      }

      const endpoint =
        activeTab === "saved"
          ? `${API_URL}/posts/saved`
          : `${API_URL}/posts/liked`;

      const res = await fetch(endpoint, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (res.ok) {
        const data = await res.json();
        setPosts(Array.isArray(data) ? data : []);
      } else {
        setPosts([]);
      }
    } catch (err) {
      console.error("Failed to load posts:", err);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTabPosts(tab);
  }, [tab]);

  const handleToggleBookmark = async (postId: string) => {
    const token =
      localStorage.getItem("token") || localStorage.getItem("accessToken");
    if (!token) return;

    try {
      await fetch(`${API_URL}/posts/${postId}/bookmark`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (tab === "saved") {
        setPosts((prev) => prev.filter((p) => p.id !== postId));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleLike = async (postId: string, isLiked: boolean) => {
    const token =
      localStorage.getItem("token") || localStorage.getItem("accessToken");
    if (!token || !user) return;

    setPosts((prevPosts) =>
      prevPosts.map((post) => {
        if (post.id === postId) {
          const currentCount = post._count?.likes ?? 0;
          const currentList = post.likes ?? [];
          return {
            ...post,
            likes: isLiked
              ? currentList.filter((l) => l.userId !== user.id)
              : [...currentList, { userId: user.id }],
            _count: {
              ...post._count,
              likes: isLiked ? Math.max(0, currentCount - 1) : currentCount + 1,
              comments: post._count?.comments ?? 0,
            },
          };
        }
        return post;
      }),
    );

    try {
      await fetch(`${API_URL}/posts/${postId}/like`, {
        method: isLiked ? "DELETE" : "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (tab === "liked" && isLiked) {
        setPosts((prev) => prev.filter((p) => p.id !== postId));
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen w-full bg-white dark:bg-black">
      <div className="sticky top-0 z-10 border-b border-neutral-200 bg-white/80 p-4 backdrop-blur-md dark:border-neutral-800 dark:bg-black/80">
        <div>
          <h1 className="text-xl font-black tracking-tight text-neutral-900 dark:text-white">
            History & Saved
          </h1>
          <p className="text-xs text-neutral-500">
            @{user?.username || "user"}
          </p>
        </div>

        <div className="mt-4 flex border-b border-neutral-200 text-sm font-bold dark:border-neutral-800">
          <button
            onClick={() => setTab("saved")}
            className={`flex-1 pb-3 text-center transition ${
              tab === "saved"
                ? "border-b-2 border-black text-black dark:border-white dark:text-white"
                : "text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
            }`}
          >
            Saved Posts
          </button>
          <button
            onClick={() => setTab("liked")}
            className={`flex-1 pb-3 text-center transition ${
              tab === "liked"
                ? "border-b-2 border-black text-black dark:border-white dark:text-white"
                : "text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
            }`}
          >
            Liked Posts
          </button>
          <button
            onClick={() => setTab("history")}
            className={`flex-1 pb-3 text-center transition ${
              tab === "history"
                ? "border-b-2 border-black text-black dark:border-white dark:text-white"
                : "text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
            }`}
          >
            Recent Activity
          </button>
        </div>
      </div>

      <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
        {loading ? (
          <p className="p-8 text-center text-xs text-neutral-400">
            Loading posts...
          </p>
        ) : posts.length === 0 ? (
          <div className="p-12 text-center text-neutral-500">
            <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
              {tab === "saved"
                ? "No saved posts yet"
                : tab === "liked"
                  ? "No liked posts yet"
                  : "No recent activity yet"}
            </h3>
            <p className="mt-1 text-xs text-neutral-400">
              {tab === "saved"
                ? "Bookmark posts to keep them in your private collection."
                : tab === "liked"
                  ? "Posts you like across the platform will appear here."
                  : "Posts you interact with will show up in your activity stream."}
            </p>
          </div>
        ) : (
          posts.map((post) => {
            const isLiked = Boolean(
              user && post.likes?.some((l) => l.userId === user.id),
            );
            const isVideo = isVideoMedia(post.imageUrl, post.isReel);

            return (
              <article
                key={post.id}
                className="p-4 transition hover:bg-neutral-50/60 dark:hover:bg-neutral-950"
              >
                <div className="flex gap-3">
                  <Link
                    href={`/profile/${post.author?.username}`}
                    className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-neutral-200 font-bold text-xs dark:bg-neutral-800"
                  >
                    {post.author?.avatarUrl ? (
                      <img
                        src={post.author.avatarUrl}
                        alt={post.author.name}
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = "none";
                        }}
                      />
                    ) : (
                      (post.author?.name?.charAt(0) || "U").toUpperCase()
                    )}
                  </Link>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 truncate">
                        <Link
                          href={`/profile/${post.author?.username}`}
                          className="text-sm font-bold text-neutral-900 hover:underline dark:text-white truncate"
                        >
                          {post.author?.name}
                        </Link>
                        <span className="text-xs text-neutral-500 truncate">
                          @{post.author?.username}
                        </span>
                        <span className="text-xs text-neutral-400">·</span>
                        <time
                          dateTime={post.createdAt}
                          title={formatFullDateTime(post.createdAt)}
                          className="text-xs text-neutral-500 hover:underline"
                        >
                          {formatPostTime(post.createdAt)}
                        </time>
                      </div>

                      <button
                        onClick={() => handleToggleBookmark(post.id)}
                        title="Remove bookmark"
                        className="text-xs text-neutral-400 hover:text-black dark:hover:text-white"
                      >
                        <svg
                          className="h-4 w-4 fill-current"
                          viewBox="0 0 24 24"
                        >
                          <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                        </svg>
                      </button>
                    </div>

                    {post.content && (
                      <p className="mt-1 text-sm text-neutral-800 leading-relaxed dark:text-neutral-200 whitespace-pre-wrap">
                        {post.content}
                      </p>
                    )}

                    {post.imageUrl && (
                      <div className="mt-3">
                        {isVideo ? (
                          <FeedVideoPlayer src={post.imageUrl} />
                        ) : (
                          <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-black dark:border-neutral-800">
                            <img
                              src={post.imageUrl}
                              alt="Attached media"
                              className="max-h-96 w-full object-cover"
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {post.poll && (
                      <div className="mt-3">
                        <PollCard
                          poll={post.poll}
                          postId={post.id}
                          onVoted={(updated) => {
                            setPosts((prev) =>
                              prev.map((p) =>
                                p.id === updated.id ? updated : p,
                              ),
                            );
                          }}
                        />
                      </div>
                    )}

                    <div className="mt-3.5 flex items-center justify-between max-w-md text-xs text-neutral-500">
                      <button
                        onClick={() =>
                          setExpandedPostId(
                            expandedPostId === post.id ? null : post.id,
                          )
                        }
                        className="flex items-center gap-1.5 transition hover:text-blue-500"
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
                            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                          />
                        </svg>
                        <span>{post._count?.comments ?? 0}</span>
                      </button>

                      <button
                        onClick={() =>
                          handleToggleLike(post.id, Boolean(isLiked))
                        }
                        className={`flex items-center gap-1.5 transition ${
                          isLiked ? "text-red-500" : "hover:text-red-500"
                        }`}
                      >
                        <svg
                          className={`h-4 w-4 ${isLiked ? "fill-current" : ""}`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                          />
                        </svg>
                        <span>{post._count?.likes ?? 0}</span>
                      </button>

                      <button
                        onClick={() => handleToggleBookmark(post.id)}
                        className="flex items-center gap-1.5 transition hover:text-black dark:hover:text-white"
                      >
                        <svg
                          className="h-4 w-4 fill-current"
                          viewBox="0 0 24 24"
                        >
                          <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                        </svg>
                      </button>
                    </div>

                    {expandedPostId === post.id && (
                      <div className="mt-3">
                        <Comments
                          postId={post.id}
                          onCommentCreated={() => {
                            setPosts((prev) =>
                              prev.map((p) =>
                                p.id === post.id
                                  ? {
                                      ...p,
                                      _count: {
                                        likes: p._count?.likes ?? 0,
                                        comments: (p._count?.comments ?? 0) + 1,
                                      },
                                    }
                                  : p,
                              ),
                            );
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}
