"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "../context/AuthContext";
import { formatPostTime, formatFullDateTime } from "../lib/dateUtils";

interface Post {
  id: string;
  content: string;
  imageUrl?: string | null;
  createdAt?: string;
  author: {
    id: string;
    name: string;
    username: string;
    avatarUrl?: string | null;
  };
  likes?: { userId: string }[];
  bookmarks?: { userId: string }[];
  _count?: {
    likes: number;
    comments: number;
  };
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

interface PostCardProps {
  post: Post;
  onDelete?: (postId: string) => void;
}

export default function PostCard({ post, onDelete }: PostCardProps) {
  const { user } = useAuth();

  const isOwner = Boolean(
    user &&
    post?.author &&
    (String(user.id) === String(post.author.id) ||
      user.username?.toLowerCase() === post.author.username?.toLowerCase()),
  );

  const initialLiked = Boolean(
    user && post.likes?.some((l) => String(l.userId) === String(user.id)),
  );
  const [liked, setLiked] = useState(initialLiked);
  const [likesCount, setLikesCount] = useState(post._count?.likes ?? 0);
  const [loadingLike, setLoadingLike] = useState(false);

  const initialBookmarked = Boolean(
    user && post.bookmarks?.some((b) => String(b.userId) === String(user.id)),
  );
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [loadingBookmark, setLoadingBookmark] = useState(false);

  const [showMenu, setShowMenu] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Sync state if post prop updates
  useEffect(() => {
    if (user && post.likes) {
      setLiked(post.likes.some((l) => String(l.userId) === String(user.id)));
    }
    if (user && post.bookmarks) {
      setBookmarked(
        post.bookmarks.some((b) => String(b.userId) === String(user.id)),
      );
    }
  }, [user, post]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLike = async () => {
    const token =
      localStorage.getItem("token") || localStorage.getItem("accessToken");

    if (!token || !user) {
      alert("Please login first");
      return;
    }

    try {
      setLoadingLike(true);
      const res = await fetch(`${API_URL}/posts/${post.id}/like`, {
        method: liked ? "DELETE" : "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Failed to update like");

      setLiked((prev) => !prev);
      setLikesCount((prev) => (liked ? Math.max(0, prev - 1) : prev + 1));
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingLike(false);
    }
  };
  const handleToggleBookmark = async () => {
    const token =
      localStorage.getItem("token") || localStorage.getItem("accessToken");

    if (!token || !user) {
      alert("Please login first");
      return;
    }

    try {
      setLoadingBookmark(true);
      const res = await fetch(`${API_URL}/posts/${post.id}/bookmark`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Failed to toggle bookmark");

      const data = await res.json();
      setBookmarked(data.bookmarked);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingBookmark(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this post?")) {
      return;
    }

    const token =
      localStorage.getItem("token") || localStorage.getItem("accessToken");
    if (!token) return;

    try {
      setIsDeleting(true);
      const res = await fetch(`${API_URL}/posts/${post.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Failed to delete post");

      if (onDelete) {
        onDelete(post.id);
      }
    } catch (error) {
      console.error("Delete error:", error);
      alert("Could not delete post");
    } finally {
      setIsDeleting(false);
      setShowMenu(false);
    }
  };

  return (
    <article className="border-b border-neutral-200 bg-white p-4 transition-colors dark:border-neutral-800 dark:bg-black">
      <div className="flex items-start justify-between gap-3">

        <div className="flex items-center gap-3">
          <Link
            href={`/profile/${post.author?.username}`}
            className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-neutral-200 bg-neutral-200 text-xs font-bold text-neutral-800 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
          >
            {post.author?.avatarUrl && !avatarError ? (
              <img
                src={post.author.avatarUrl}
                alt={post.author.name}
                onError={() => setAvatarError(true)}
                className="h-full w-full object-cover"
              />
            ) : (
              (post.author?.name?.charAt(0) || "U").toUpperCase()
            )}
          </Link>

          <div className="flex flex-wrap items-center gap-x-1.5 leading-snug">
            <Link
              href={`/profile/${post.author?.username}`}
              className="font-bold text-neutral-900 hover:underline dark:text-white"
            >
              {post.author?.name}
            </Link>
            <span className="text-sm text-neutral-500">
              @{post.author?.username}
            </span>
            {post.createdAt && (
              <>
                <span className="text-neutral-500">·</span>
                <time
                  dateTime={post.createdAt}
                  title={formatFullDateTime(post.createdAt)}
                  className="text-sm text-neutral-500 hover:underline"
                >
                  {formatPostTime(post.createdAt)}
                </time>
              </>
            )}
          </div>
        </div>

        {isOwner && (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowMenu((prev) => !prev)}
              aria-label="Post actions"
              className="rounded-full p-1.5 text-neutral-400 transition hover:bg-neutral-100 hover:text-black dark:hover:bg-neutral-900 dark:hover:text-white"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="5" cy="12" r="2" />
                <circle cx="12" cy="12" r="2" />
                <circle cx="19" cy="12" r="2" />
              </svg>
            </button>

            {showMenu && (
              <div className="absolute right-0 top-full z-20 mt-1 w-36 rounded-2xl border border-neutral-200 bg-white p-1 shadow-2xl backdrop-blur-xl dark:border-neutral-800 dark:bg-neutral-950">
                <button
                  disabled={isDeleting}
                  onClick={handleDelete}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-red-600 transition hover:bg-red-50 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-950/30"
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
                  <span>{isDeleting ? "Deleting..." : "Delete Post"}</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-neutral-900 dark:text-neutral-100">
        {post.content}
      </p>

      {post.imageUrl && (
        <img
          src={post.imageUrl}
          alt="Post media"
          className="mt-3 max-h-96 w-full rounded-2xl object-cover ring-1 ring-neutral-200 dark:ring-neutral-800"
        />
      )}

     
      <div className="mt-4 flex items-center justify-between border-t border-neutral-100 pt-3 text-neutral-500 dark:border-neutral-900">
        <div className="flex items-center gap-6">
     
          <button
            onClick={handleLike}
            disabled={loadingLike}
            className={`flex items-center gap-1.5 text-xs font-bold transition active:scale-95 ${
              liked
                ? "text-red-600"
                : "text-neutral-500 hover:text-red-600 dark:hover:text-red-400"
            }`}
          >
            <svg
              className={`h-4 w-4 ${liked ? "fill-current" : ""}`}
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
            <span>{likesCount}</span>
          </button>

         
          <span className="flex items-center gap-1.5 text-xs font-medium text-neutral-500">
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
          </span>
        </div>

       
        <button
          onClick={handleToggleBookmark}
          disabled={loadingBookmark}
          title={bookmarked ? "Saved" : "Save post"}
          className={`group relative flex items-center justify-center rounded-full p-1.5 transition active:scale-90 ${
            bookmarked
              ? "text-blue-500 drop-shadow-[0_0_8px_rgba(59,130,246,0.6)]"
              : "text-neutral-500 hover:bg-neutral-100 hover:text-blue-500 dark:hover:bg-neutral-900"
          }`}
        >
          {bookmarked && (
            <span className="absolute inset-0 rounded-full bg-blue-500/20 blur-sm animate-pulse" />
          )}
          <svg
            className={`relative h-4 w-4 ${bookmarked ? "fill-current" : ""}`}
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
    </article>
  );
}
