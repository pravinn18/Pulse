"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "../context/AuthContext";
import { socket } from "../lib/socket";
import Comments from "../components/Comments";
import CreatePost from "../components/CreatePost";
import PollCard, { PollItem } from "../components/PollCard";
import StoriesTray from "../components/StoriesTray";
import FeedVideoPlayer from "../components/FeedVideoPlayer";
import { formatPostTime, formatFullDateTime } from "../lib/dateUtils";

interface PostLike {
  userId: string;
}

interface PostBookmark {
  userId: string;
}

interface Post {
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
  likes?: PostLike[];
  bookmarks?: PostBookmark[];
  poll?: PollItem | null;
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

export default function FeedPage() {
  const { user, loading: authLoading } = useAuth();

  const [activeTab, setActiveTab] = useState<"for-you" | "following">(
    "for-you",
  );
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);
  const [openMenuPostId, setOpenMenuPostId] = useState<string | null>(null);

  const fetchFeed = useCallback(async (tabType: "for-you" | "following") => {
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("token") || localStorage.getItem("accessToken")
        : null;

    const endpoint = `${API_URL}/posts?type=${tabType}`;

    try {
      setLoading(true);
      const res = await fetch(endpoint, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (res.ok) {
        const data = await res.json();
        setPosts(Array.isArray(data) ? data : data.posts || []);
      }
    } catch (err) {
      console.error("Failed to load feed:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading) {
      fetchFeed(activeTab);
    }
  }, [authLoading, activeTab, fetchFeed]);

  useEffect(() => {
    const handleNewFeedPost = (newPost: Post) => {
      const sanitized = {
        ...newPost,
        createdAt: newPost.createdAt || new Date().toISOString(),
      };
      setPosts((prev) =>
        prev.some((p) => p.id === sanitized.id) ? prev : [sanitized, ...prev],
      );
    };

    socket.on("new-feed-post", handleNewFeedPost);
    return () => {
      socket.off("new-feed-post", handleNewFeedPost);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest(".post-menu-container")) {
        setOpenMenuPostId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleDeletePost = async (postId: string) => {
    if (!window.confirm("Are you sure you want to delete this post?")) return;

    const token =
      localStorage.getItem("token") || localStorage.getItem("accessToken");
    if (!token) return;

    try {
      const res = await fetch(`${API_URL}/posts/${postId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        setPosts((prev) => prev.filter((p) => p.id !== postId));
      }
    } catch (err) {
      console.error("Delete error:", err);
    } finally {
      setOpenMenuPostId(null);
    }
  };

  const handleToggleLike = async (postId: string, isLiked: boolean) => {
    const token =
      localStorage.getItem("token") || localStorage.getItem("accessToken");
    if (!token || !user) {
      alert("Please login first");
      return;
    }

    setPosts((prev) =>
      prev.map((post) => {
        if (post.id === postId) {
          const count = post._count?.likes ?? 0;
          const currentLikes = post.likes ?? [];
          return {
            ...post,
            likes: isLiked
              ? currentLikes.filter((l) => String(l.userId) !== String(user.id))
              : [...currentLikes, { userId: user.id }],
            _count: {
              likes: isLiked ? Math.max(0, count - 1) : count + 1,
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
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleBookmark = async (postId: string) => {
    const token =
      localStorage.getItem("token") || localStorage.getItem("accessToken");
    if (!token || !user) {
      alert("Please login first");
      return;
    }

    setPosts((prevPosts) =>
      prevPosts.map((p) => {
        if (p.id === postId) {
          const currentBookmarks = p.bookmarks || [];
          const isSaved = currentBookmarks.some(
            (b) => String(b.userId) === String(user.id),
          );
          return {
            ...p,
            bookmarks: isSaved
              ? currentBookmarks.filter(
                  (b) => String(b.userId) !== String(user.id),
                )
              : [...currentBookmarks, { userId: user.id }],
          };
        }
        return p;
      }),
    );

    try {
      await fetch(`${API_URL}/posts/${postId}/bookmark`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="w-full min-h-screen bg-white text-neutral-900 transition-colors duration-200 dark:bg-black dark:text-neutral-100">
      <div className="sticky top-14 z-10 border-b border-neutral-200 bg-white/90 backdrop-blur-md sm:top-0 dark:border-neutral-800 dark:bg-black/90">
        <StoriesTray />
        <div className="flex text-sm font-bold">
          <button
            onClick={() => setActiveTab("for-you")}
            className={`flex-1 py-3 text-center transition ${
              activeTab === "for-you"
                ? "border-b-2 border-black font-extrabold text-black dark:border-white dark:text-white"
                : "text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
            }`}
          >
            For you
          </button>
          <button
            onClick={() => setActiveTab("following")}
            className={`flex-1 py-3 text-center transition ${
              activeTab === "following"
                ? "border-b-2 border-black font-extrabold text-black dark:border-white dark:text-white"
                : "text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
            }`}
          >
            Following
          </button>
        </div>
      </div>

      {user && (
        <div className="hidden border-b border-neutral-200 sm:block dark:border-neutral-800">
          <CreatePost
            onPostCreated={(newPost) => {
              if (newPost) {
                const completePost: Post = {
                  ...newPost,
                  createdAt: newPost.createdAt || new Date().toISOString(),
                  author: newPost.author || {
                    id: user.id,
                    name: user.name,
                    username: user.username,
                    avatarUrl: user.avatarUrl,
                  },
                };
                setPosts((prev) => [completePost, ...prev]);
              }
            }}
          />
        </div>
      )}

      <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
        {loading ? (
          <p className="p-8 text-center text-xs text-neutral-400">
            Loading feed...
          </p>
        ) : posts.length === 0 ? (
          <div className="p-12 text-center text-neutral-500">
            <p className="text-base font-bold text-neutral-900 dark:text-white">
              {activeTab === "following"
                ? "No posts from accounts you follow"
                : "No posts in your feed yet"}
            </p>
            <p className="mt-1 text-xs text-neutral-400">
              {activeTab === "following"
                ? "Follow more creators to see their updates here."
                : "Share an update or follow people to populate your feed."}
            </p>
          </div>
        ) : (
          posts.map((post) => {
            const isLiked = Boolean(
              user &&
              post.likes?.some((l) => String(l.userId) === String(user.id)),
            );
            const isBookmarked = Boolean(
              user &&
              post.bookmarks?.some((b) => String(b.userId) === String(user.id)),
            );
            const isVideo = isVideoMedia(post.imageUrl, post.isReel);
            const isOwner = Boolean(
              user &&
              post.author &&
              (String(user.id) === String(post.author.id) ||
                user.username?.toLowerCase() ===
                  post.author.username?.toLowerCase()),
            );

            return (
              <article
                key={post.id}
                className="p-4 transition hover:bg-neutral-50/60 dark:hover:bg-neutral-950/60"
              >
                <div className="flex gap-3">
                  <Link
                    href={`/profile/${post.author?.username}`}
                    className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-neutral-200 bg-neutral-200 text-sm font-bold dark:border-neutral-800 dark:bg-neutral-800 dark:text-neutral-100"
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
                          className="truncate text-sm font-extrabold text-neutral-900 hover:underline dark:text-white"
                        >
                          {post.author?.name}
                        </Link>
                        <span className="truncate text-xs text-neutral-500">
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

                      {isOwner && (
                        <div className="relative post-menu-container">
                          <button
                            onClick={() =>
                              setOpenMenuPostId(
                                openMenuPostId === post.id ? null : post.id,
                              )
                            }
                            className="rounded-full p-1 text-neutral-400 hover:bg-neutral-100 hover:text-black dark:hover:bg-neutral-900 dark:hover:text-white"
                          >
                            <svg
                              className="h-4 w-4"
                              fill="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <circle cx="5" cy="12" r="2" />
                              <circle cx="12" cy="12" r="2" />
                              <circle cx="19" cy="12" r="2" />
                            </svg>
                          </button>

                          {openMenuPostId === post.id && (
                            <div className="absolute right-0 top-full z-20 mt-1 w-32 rounded-2xl border border-neutral-200 bg-white p-1 shadow-2xl backdrop-blur-xl dark:border-neutral-800 dark:bg-neutral-950">
                              <button
                                onClick={() => handleDeletePost(post.id)}
                                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
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
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                  />
                                </svg>
                                <span>Delete</span>
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {post.content && (
                      <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-neutral-800 dark:text-neutral-200">
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
                              alt="Post media"
                              className="max-h-[500px] w-full object-cover"
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

                    <div className="mt-3.5 flex max-w-md items-center justify-between text-xs text-neutral-500">
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
                        title={isBookmarked ? "Saved" : "Save post"}
                        className={`flex items-center gap-1.5 transition-all duration-200 ${
                          isBookmarked
                            ? "scale-110 text-blue-500 drop-shadow-[0_0_8px_rgba(59,130,246,0.6)] dark:text-white dark:drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]"
                            : "text-neutral-500 hover:text-black dark:hover:text-white"
                        }`}
                      >
                        <svg
                          className={`h-4 w-4 ${isBookmarked ? "fill-current" : ""}`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                          />
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
