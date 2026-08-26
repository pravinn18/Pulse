"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useAuth } from "../context/AuthContext";
import { socket } from "../lib/socket";

interface ViewerProfile {
  id: string;
  name: string;
  username: string;
  avatarUrl?: string | null;
  viewedAt?: string;
}

interface StoryItem {
  id: string;
  mediaUrl: string;
  caption?: string | null;
  createdAt: string;
  viewCount: number;
  likeCount: number;
  isViewed: boolean;
  isLiked: boolean;
  viewers?: ViewerProfile[];
  likers?: ViewerProfile[];
}

interface UserStories {
  user: {
    id: string;
    name: string;
    username: string;
    avatarUrl?: string | null;
  };
  stories: StoryItem[];
  hasUnviewed: boolean;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const isVideoUrl = (url: string) => {
  if (!url) return false;
  return (
    url.endsWith(".mp4") ||
    url.endsWith(".webm") ||
    url.endsWith(".mov") ||
    url.includes("/video/upload/") ||
    url.includes(".mp4?")
  );
};

function formatStoryTime(dateStr: string) {
  const diffSec = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diffSec < 60) return `${Math.max(1, diffSec)}s`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m`;
  const diffHours = Math.floor(diffMin / 60);
  return `${diffHours}h`;
}

export default function StoriesTray() {
  const { user, token } = useAuth();
  const [feedStories, setFeedStories] = useState<UserStories[]>([]);
  const [activeUserIndex, setActiveUserIndex] = useState<number | null>(null);
  const [activeStoryIndex, setActiveStoryIndex] = useState<number>(0);
  const [uploading, setUploading] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [storyDuration, setStoryDuration] = useState<number>(5000);
  const [progress, setProgress] = useState<number>(0);
  const [showMyStoryMenu, setShowMyStoryMenu] = useState(false);
  const [showInsights, setShowInsights] = useState(false);
  const [insightsTab, setInsightsTab] = useState<"views" | "likes">("views");
  const [isPaused, setIsPaused] = useState(false);
  const [mounted, setMounted] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const pauseTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchStories = useCallback(async () => {
    const activeToken =
      token ||
      (typeof window !== "undefined"
        ? localStorage.getItem("token") || localStorage.getItem("accessToken")
        : null);
    if (!activeToken) return;

    try {
      const res = await fetch(`${API_URL}/stories/feed`, {
        headers: { Authorization: `Bearer ${activeToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setFeedStories(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Failed to load stories:", err);
    }
  }, [token]);

  useEffect(() => {
    fetchStories();
  }, [fetchStories, user]);

  useEffect(() => {
    const handleLiveView = (payload: {
      storyId: string;
      viewer: ViewerProfile;
    }) => {
      setFeedStories((prev) =>
        prev.map((group) => ({
          ...group,
          stories: group.stories.map((s) => {
            if (s.id === payload.storyId) {
              const alreadyViewed = s.viewers?.some(
                (v) => v.id === payload.viewer.id,
              );
              if (alreadyViewed) return s;
              return {
                ...s,
                viewCount: s.viewCount + 1,
                viewers: [payload.viewer, ...(s.viewers || [])],
              };
            }
            return s;
          }),
        })),
      );
    };

    const handleLiveLike = (payload: {
      storyId: string;
      liked: boolean;
      liker: ViewerProfile;
    }) => {
      setFeedStories((prev) =>
        prev.map((group) => ({
          ...group,
          stories: group.stories.map((s) => {
            if (s.id === payload.storyId) {
              const currentLikers = s.likers || [];
              const updatedLikers = payload.liked
                ? [
                    payload.liker,
                    ...currentLikers.filter((l) => l.id !== payload.liker.id),
                  ]
                : currentLikers.filter((l) => l.id !== payload.liker.id);

              return {
                ...s,
                likeCount: updatedLikers.length,
                likers: updatedLikers,
              };
            }
            return s;
          }),
        })),
      );
    };

    socket.on("story-viewed-live", handleLiveView);
    socket.on("story-liked-live", handleLiveLike);

    return () => {
      socket.off("story-viewed-live", handleLiveView);
      socket.off("story-liked-live", handleLiveLike);
    };
  }, []);

  useEffect(() => {
    if (activeUserIndex !== null) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [activeUserIndex]);

  const markStoryViewed = useCallback(
    async (storyId: string) => {
      const activeToken =
        token ||
        localStorage.getItem("token") ||
        localStorage.getItem("accessToken");
      if (!activeToken) return;

      setFeedStories((prev) =>
        prev.map((group) => {
          const updatedStories = group.stories.map((s) =>
            s.id === storyId ? { ...s, isViewed: true } : s,
          );
          const stillHasUnviewed = updatedStories.some(
            (s) => !s.isViewed && group.user.id !== user?.id,
          );
          return {
            ...group,
            stories: updatedStories,
            hasUnviewed: stillHasUnviewed,
          };
        }),
      );

      try {
        await fetch(`${API_URL}/stories/${storyId}/view`, {
          method: "POST",
          headers: { Authorization: `Bearer ${activeToken}` },
        });
      } catch (err) {
        console.error(err);
      }
    },
    [token, user?.id],
  );

  const openStoryViewer = (userIndex: number) => {
    const targetGroup = feedStories[userIndex];
    if (!targetGroup || targetGroup.stories.length === 0) return;

    let startIdx = targetGroup.stories.findIndex((s) => !s.isViewed);
    if (startIdx === -1) startIdx = 0;

    setActiveUserIndex(userIndex);
    setActiveStoryIndex(startIdx);
    setProgress(0);
    setStoryDuration(5000);
    setShowInsights(false);
    setIsPaused(false);

    markStoryViewed(targetGroup.stories[startIdx].id);
  };

  const nextStory = useCallback(() => {
    if (activeUserIndex === null) return;
    const currentGroup = feedStories[activeUserIndex];
    setShowInsights(false);
    setProgress(0);

    if (activeStoryIndex < currentGroup.stories.length - 1) {
      const nextIdx = activeStoryIndex + 1;
      setActiveStoryIndex(nextIdx);
      setStoryDuration(5000);
      markStoryViewed(currentGroup.stories[nextIdx].id);
    } else if (activeUserIndex < feedStories.length - 1) {
      const nextUserIdx = activeUserIndex + 1;
      const nextGroup = feedStories[nextUserIdx];
      let startIdx = nextGroup.stories.findIndex((s) => !s.isViewed);
      if (startIdx === -1) startIdx = 0;

      setActiveUserIndex(nextUserIdx);
      setActiveStoryIndex(startIdx);
      setStoryDuration(5000);
      markStoryViewed(nextGroup.stories[startIdx].id);
    } else {
      setActiveUserIndex(null);
    }
  }, [activeUserIndex, activeStoryIndex, feedStories, markStoryViewed]);

  const prevStory = useCallback(() => {
    if (activeUserIndex === null) return;
    setShowInsights(false);
    setProgress(0);

    if (activeStoryIndex > 0) {
      const prevIdx = activeStoryIndex - 1;
      setActiveStoryIndex(prevIdx);
      setStoryDuration(5000);
    } else if (activeUserIndex > 0) {
      const prevUserIdx = activeUserIndex - 1;
      const prevStories = feedStories[prevUserIdx].stories;
      setActiveUserIndex(prevUserIdx);
      setActiveStoryIndex(prevStories.length - 1);
      setStoryDuration(5000);
    }
  }, [activeUserIndex, activeStoryIndex, feedStories]);

  useEffect(() => {
    if (activeUserIndex === null || isPaused || showInsights) return;

    const intervalTime = 50;
    const step = (intervalTime / storyDuration) * 100;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          nextStory();
          return 0;
        }
        return prev + step;
      });
    }, intervalTime);

    return () => clearInterval(interval);
  }, [activeUserIndex, isPaused, showInsights, storyDuration, nextStory]);

  const handleDeleteStory = async (storyId: string) => {
    if (!window.confirm("Are you sure you want to delete this story?")) return;

    const activeToken =
      token ||
      localStorage.getItem("token") ||
      localStorage.getItem("accessToken");
    if (!activeToken) return;

    try {
      const res = await fetch(`${API_URL}/stories/${storyId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${activeToken}` },
      });

      if (res.ok) {
        setFeedStories((prev) =>
          prev
            .map((group) => ({
              ...group,
              stories: group.stories.filter((s) => s.id !== storyId),
            }))
            .filter((group) => group.stories.length > 0),
        );

        setActiveUserIndex(null);
        setShowInsights(false);
      }
    } catch (err) {
      console.error("Failed to delete story:", err);
    }
  };

  const handleToggleLike = async (storyId: string) => {
    const activeToken =
      token ||
      localStorage.getItem("token") ||
      localStorage.getItem("accessToken");
    if (!activeToken || activeUserIndex === null) return;

    setFeedStories((prev) =>
      prev.map((group, gIdx) => {
        if (gIdx === activeUserIndex) {
          return {
            ...group,
            stories: group.stories.map((s) => {
              if (s.id === storyId) {
                const nextLiked = !s.isLiked;
                return {
                  ...s,
                  isLiked: nextLiked,
                  likeCount: nextLiked
                    ? s.likeCount + 1
                    : Math.max(0, s.likeCount - 1),
                };
              }
              return s;
            }),
          };
        }
        return group;
      }),
    );

    try {
      await fetch(`${API_URL}/stories/${storyId}/like`, {
        method: "POST",
        headers: { Authorization: `Bearer ${activeToken}` },
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handlePressStart = () => {
    pauseTimeoutRef.current = setTimeout(() => {
      setIsPaused(true);
      if (videoRef.current) videoRef.current.pause();
    }, 120);
  };

  const handlePressEnd = () => {
    if (pauseTimeoutRef.current) clearTimeout(pauseTimeoutRef.current);
    setIsPaused(false);
    if (videoRef.current) videoRef.current.play().catch(() => {});
  };

  const handleUploadStory = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const activeToken =
      token ||
      localStorage.getItem("token") ||
      localStorage.getItem("accessToken");
    if (!activeToken) return;

    const formData = new FormData();
    formData.append("media", file);

    try {
      setUploading(true);
      setShowMyStoryMenu(false);
      const res = await fetch(`${API_URL}/stories`, {
        method: "POST",
        headers: { Authorization: `Bearer ${activeToken}` },
        body: formData,
      });
      if (res.ok) {
        await fetchStories();
      }
    } catch (err) {
      console.error("Story upload failed:", err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const currentUserStories = feedStories.find((g) => g.user.id === user?.id);
  const otherStories = feedStories.filter((g) => g.user.id !== user?.id);
  const activeStoryGroup =
    activeUserIndex !== null ? feedStories[activeUserIndex] : null;
  const activeStory = activeStoryGroup
    ? activeStoryGroup.stories[activeStoryIndex]
    : null;
  const isOwnerOfActiveStory = activeStoryGroup?.user.id === user?.id;

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        onChange={handleUploadStory}
        className="hidden"
      />

      <div className="relative flex w-full items-center gap-3.5 overflow-x-auto border-b border-neutral-200 bg-white p-3.5 no-scrollbar dark:border-neutral-800 dark:bg-black">
     
        <div className="relative flex shrink-0 flex-col items-center gap-1">
          <div
            onClick={() => {
              if (currentUserStories && currentUserStories.stories.length > 0) {
                setShowMyStoryMenu(true);
              } else {
                fileInputRef.current?.click();
              }
            }}
            className="relative cursor-pointer transition active:scale-95"
          >
            <div
              className={`flex h-14 w-14 items-center justify-center rounded-full p-[2px] transition-all duration-300 ${
                currentUserStories && currentUserStories.stories.length > 0
                  ? "bg-gradient-to-tr from-yellow-500 via-pink-500 to-purple-600"
                  : "border-2 border-dashed border-neutral-300 dark:border-neutral-700"
              }`}
            >
              <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full border-2 border-white bg-neutral-200 dark:border-black dark:bg-neutral-800">
                {user?.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt="My Story"
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = "none";
                    }}
                  />
                ) : (
                  <span className="font-bold text-sm text-neutral-800 dark:text-neutral-200">
                    {(user?.name?.charAt(0) || "U").toUpperCase()}
                  </span>
                )}
              </div>
            </div>

            <span className="absolute bottom-0 right-0 flex h-4 w-4 items-center justify-center rounded-full border-2 border-white bg-[#1d9bf0] text-[10px] font-bold text-white dark:border-black">
              {uploading ? "⏳" : "+"}
            </span>
          </div>

          <span className="w-14 truncate text-center text-[10px] font-medium text-neutral-600 dark:text-neutral-400">
            {uploading ? "Uploading..." : "Your story"}
          </span>
        </div>

        {otherStories.map((group) => {
          const groupIndex = feedStories.findIndex(
            (g) => g.user.id === group.user.id,
          );

          return (
            <div
              key={group.user.id}
              onClick={() => openStoryViewer(groupIndex)}
              className="flex shrink-0 cursor-pointer flex-col items-center gap-1 transition hover:opacity-90 active:scale-95"
            >
              <div
                className={`flex h-14 w-14 items-center justify-center rounded-full p-[2px] transition-all duration-300 ${
                  group.hasUnviewed
                    ? "bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600"
                    : "border-2 border-neutral-300 dark:border-neutral-700"
                }`}
              >
                <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full border-2 border-white bg-neutral-200 dark:border-black dark:bg-neutral-800">
                  {group.user.avatarUrl ? (
                    <img
                      src={group.user.avatarUrl}
                      alt={group.user.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="font-bold text-xs text-neutral-800 dark:text-neutral-200">
                      {(group.user.name?.charAt(0) || "U").toUpperCase()}
                    </span>
                  )}
                </div>
              </div>
              <span className="w-14 truncate text-center text-[10px] font-medium text-neutral-800 dark:text-neutral-200">
                {group.user.username}
              </span>
            </div>
          );
        })}
      </div>

      {showMyStoryMenu && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-xs overflow-hidden rounded-2xl border border-neutral-200 bg-white p-2 shadow-2xl dark:border-neutral-800 dark:bg-neutral-900">
            <button
              onClick={() => {
                setShowMyStoryMenu(false);
                const myIndex = feedStories.findIndex(
                  (g) => g.user.id === user?.id,
                );
                if (myIndex !== -1) openStoryViewer(myIndex);
              }}
              className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800"
            >
              <span>👁️</span>
              <span>View my story</span>
            </button>

            <button
              onClick={() => {
                setShowMyStoryMenu(false);
                fileInputRef.current?.click();
              }}
              className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800"
            >
              <span>➕</span>
              <span>Add another story</span>
            </button>

            <div className="my-1 border-t border-neutral-100 dark:border-neutral-800" />

            <button
              onClick={() => setShowMyStoryMenu(false)}
              className="flex w-full justify-center rounded-xl py-2 text-xs font-bold text-neutral-500 hover:text-black dark:hover:text-white"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {mounted &&
        activeUserIndex !== null &&
        activeStory &&
        activeStoryGroup &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex h-screen w-screen items-center justify-center bg-black/95 backdrop-blur-2xl">
       
            <button
              onClick={() => {
                setActiveUserIndex(null);
                setShowInsights(false);
              }}
              className="absolute right-6 top-5 z-50 hidden rounded-full bg-white/10 p-2.5 text-white transition hover:bg-white/20 active:scale-95 sm:flex"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>

            <button
              onClick={prevStory}
              className="absolute left-6 top-1/2 z-50 hidden -translate-y-1/2 rounded-full bg-white/10 p-3 text-white transition hover:bg-white/20 active:scale-95 md:flex"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>

            <button
              onClick={nextStory}
              className="absolute right-6 top-1/2 z-50 hidden -translate-y-1/2 rounded-full bg-white/10 p-3 text-white transition hover:bg-white/20 active:scale-95 md:flex"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>

            <div className="relative flex h-[100dvh] w-full max-w-full flex-col overflow-hidden bg-black shadow-2xl sm:h-[94vh] sm:max-h-[860px] sm:max-w-[430px] sm:rounded-3xl sm:border sm:border-neutral-800 select-none">
          
              <div className="absolute left-3 right-3 top-3 z-30 flex gap-1.5">
                {activeStoryGroup.stories.map((st, idx) => (
                  <div
                    key={st.id}
                    className="h-1 flex-1 overflow-hidden rounded-full bg-white/30"
                  >
                    <div
                      className="h-full bg-white"
                      style={{
                        width:
                          idx < activeStoryIndex
                            ? "100%"
                            : idx === activeStoryIndex
                              ? `${progress}%`
                              : "0%",
                      }}
                    />
                  </div>
                ))}
              </div>

              <div className="absolute left-3 right-3 top-6 z-30 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Link
                    href={`/profile/${activeStoryGroup.user.username}`}
                    onClick={() => setActiveUserIndex(null)}
                    className="h-9 w-9 overflow-hidden rounded-full border border-white/50"
                  >
                    <img
                      src={activeStoryGroup.user.avatarUrl || "/avatar.png"}
                      alt="avatar"
                      className="h-full w-full object-cover"
                    />
                  </Link>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/profile/${activeStoryGroup.user.username}`}
                      onClick={() => setActiveUserIndex(null)}
                      className="text-xs font-bold leading-tight text-white hover:underline"
                    >
                      {activeStoryGroup.user.name}
                    </Link>
                    <span className="text-[11px] text-white/70">
                      {formatStoryTime(activeStory.createdAt)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isOwnerOfActiveStory && (
                    <button
                      onClick={() => handleDeleteStory(activeStory.id)}
                      title="Delete Story"
                      className="rounded-full bg-red-600/80 p-2 text-xs text-white backdrop-blur-md transition hover:bg-red-600 active:scale-95"
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
                    </button>
                  )}

                  {isVideoUrl(activeStory.mediaUrl) && (
                    <button
                      onClick={() => setIsMuted(!isMuted)}
                      className="rounded-full bg-black/60 p-2 text-xs font-bold text-white backdrop-blur-md"
                    >
                      {isMuted ? "🔇" : "🔊"}
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setActiveUserIndex(null);
                      setShowInsights(false);
                    }}
                    className="rounded-full bg-black/60 p-2 text-xs font-bold text-white backdrop-blur-md hover:bg-black/90 sm:hidden"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div
                onMouseDown={handlePressStart}
                onMouseUp={handlePressEnd}
                onTouchStart={handlePressStart}
                onTouchEnd={handlePressEnd}
                className="relative flex h-full w-full items-center justify-center bg-black cursor-pointer"
              >
                {isVideoUrl(activeStory.mediaUrl) ? (
                  <video
                    ref={videoRef}
                    src={activeStory.mediaUrl}
                    autoPlay
                    playsInline
                    muted={isMuted}
                    preload="auto"
                    crossOrigin="anonymous"
                    onLoadedMetadata={(e) => {
                      const dur = (e.currentTarget.duration || 5) * 1000;
                      setStoryDuration(dur);
                    }}
                    onEnded={nextStory}
                    className="h-full w-full object-contain pointer-events-none"
                  />
                ) : (
                  <img
                    src={activeStory.mediaUrl}
                    alt="Story media"
                    className="h-full w-full object-contain pointer-events-none"
                  />
                )}

                {activeStory.caption && (
                  <div className="absolute bottom-20 left-4 right-4 z-30 rounded-2xl bg-black/60 p-3.5 text-center text-sm font-medium text-white backdrop-blur-md">
                    {activeStory.caption}
                  </div>
                )}

                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    prevStory();
                  }}
                  className="absolute bottom-20 left-0 top-16 z-20 w-1/3"
                />
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    nextStory();
                  }}
                  className="absolute bottom-20 right-0 top-16 z-20 w-2/3"
                />
              </div>

              <div className="absolute bottom-0 left-0 right-0 z-30 flex items-center justify-between border-t border-white/10 bg-gradient-to-t from-black via-black/80 to-transparent px-4 py-3 backdrop-blur-sm">
                {isOwnerOfActiveStory ? (
                  <button
                    onClick={() => {
                      setShowInsights(true);
                      setIsPaused(true);
                    }}
                    className="flex items-center gap-2 rounded-full bg-white/20 px-3.5 py-1.5 text-xs font-bold text-white backdrop-blur-md transition hover:bg-white/30"
                  >
                    <span>{activeStory.viewCount} views</span>
                    <span>·</span>
                    <span>❤️ {activeStory.likeCount}</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handleToggleLike(activeStory.id)}
                    className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition active:scale-90 ${
                      activeStory.isLiked
                        ? "bg-red-600 text-white"
                        : "bg-white/20 text-white hover:bg-white/30"
                    }`}
                  >
                    <span>{activeStory.isLiked ? "❤️ Liked" : "🤍 Like"}</span>
                  </button>
                )}
              </div>

              {showInsights && isOwnerOfActiveStory && (
                <div className="absolute inset-x-0 bottom-0 z-40 flex max-h-[70%] flex-col rounded-t-3xl border-t border-neutral-800 bg-neutral-950 p-4 shadow-2xl animate-in slide-in-from-bottom duration-200">
                  <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                    <div className="flex gap-4">
                      <button
                        onClick={() => setInsightsTab("views")}
                        className={`text-xs font-bold transition ${
                          insightsTab === "views"
                            ? "border-b-2 border-white pb-1 text-white"
                            : "text-neutral-400"
                        }`}
                      >
                        Viewers ({activeStory.viewers?.length || 0})
                      </button>
                      <button
                        onClick={() => setInsightsTab("likes")}
                        className={`text-xs font-bold transition ${
                          insightsTab === "likes"
                            ? "border-b-2 border-white pb-1 text-white"
                            : "text-neutral-400"
                        }`}
                      >
                        Likes ({activeStory.likers?.length || 0})
                      </button>
                    </div>

                    <button
                      onClick={() => {
                        setShowInsights(false);
                        setIsPaused(false);
                      }}
                      className="text-neutral-400 hover:text-white"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="mt-3 flex-1 space-y-3 overflow-y-auto pr-1">
                    {insightsTab === "views" ? (
                      activeStory.viewers && activeStory.viewers.length > 0 ? (
                        activeStory.viewers.map((viewer) => (
                          <div
                            key={viewer.id}
                            className="flex items-center justify-between"
                          >
                            <Link
                              href={`/profile/${viewer.username}`}
                              onClick={() => {
                                setActiveUserIndex(null);
                                setShowInsights(false);
                              }}
                              className="flex items-center gap-2.5 hover:opacity-80"
                            >
                              <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-neutral-800 text-xs font-bold text-white">
                                {viewer.avatarUrl ? (
                                  <img
                                    src={viewer.avatarUrl}
                                    alt={viewer.name}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  viewer.name.charAt(0)
                                )}
                              </div>
                              <div>
                                <p className="text-xs font-bold text-white">
                                  {viewer.name}
                                </p>
                                <p className="text-[10px] text-neutral-400">
                                  @{viewer.username}
                                </p>
                              </div>
                            </Link>
                          </div>
                        ))
                      ) : (
                        <p className="py-6 text-center text-xs text-neutral-500">
                          No views yet.
                        </p>
                      )
                    ) : activeStory.likers && activeStory.likers.length > 0 ? (
                      activeStory.likers.map((liker) => (
                        <div
                          key={liker.id}
                          className="flex items-center justify-between"
                        >
                          <Link
                            href={`/profile/${liker.username}`}
                            onClick={() => {
                              setActiveUserIndex(null);
                              setShowInsights(false);
                            }}
                            className="flex items-center gap-2.5 hover:opacity-80"
                          >
                            <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-neutral-800 text-xs font-bold text-white">
                              {liker.avatarUrl ? (
                                <img
                                  src={liker.avatarUrl}
                                  alt={liker.name}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                liker.name.charAt(0)
                              )}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-white">
                                {liker.name}
                              </p>
                              <p className="text-[10px] text-neutral-400">
                                @{liker.username}
                              </p>
                            </div>
                          </Link>
                          <span className="text-xs text-red-500">❤️</span>
                        </div>
                      ))
                    ) : (
                      <p className="py-6 text-center text-xs text-neutral-500">
                        No likes yet.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
