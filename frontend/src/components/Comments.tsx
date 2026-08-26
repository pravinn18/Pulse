"use client";

import { useEffect, useState } from "react";
import { socket } from "../lib/socket";

interface CommentUser {
  id: string;
  name: string;
  username: string;
  avatarUrl?: string | null;
}

interface CommentItem {
  id: string;
  content: string;
  createdAt: string;
  user: CommentUser;
}

interface CommentsProps {
  postId: string;
  onCommentCreated?: () => void;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function Comments({ postId, onCommentCreated }: CommentsProps) {
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

 
  useEffect(() => {
    const fetchComments = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_URL}/posts/${postId}/comments`);

        if (!res.ok) {
          throw new Error("Failed to load comments");
        }

        const data: CommentItem[] = await res.json();
        setComments(data);
      } catch (err) {
        console.error("Comments load error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchComments();

   
    socket.emit("join-post", postId);

    const handleNewComment = (incomingComment: CommentItem) => {
      setComments((prev) => {
       
        if (prev.some((c) => c.id === incomingComment.id)) return prev;
        return [...prev, incomingComment];
      });
      onCommentCreated?.();
    };

    socket.on("new-comment", handleNewComment);

    return () => {
      socket.emit("leave-post", postId);
      socket.off("new-comment", handleNewComment);
    };
  }, [postId, onCommentCreated]);

 
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!content.trim()) return;

    const token =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;

    if (!token) {
      alert("Please login to comment");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch(`${API_URL}/posts/${postId}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to create comment");
      }

      const createdComment: CommentItem = await res.json();

      setComments((prev) => {
        if (prev.some((c) => c.id === createdComment.id)) return prev;
        return [...prev, createdComment];
      });

      setContent("");
      onCommentCreated?.();
    } catch (err: any) {
      alert(err.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-4 border-t border-neutral-100 pt-4 dark:border-neutral-800">
     
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write a comment..."
          className="flex-1 rounded-lg border border-neutral-300 bg-transparent px-3 py-1.5 text-sm text-neutral-900 placeholder-neutral-400 focus:border-blue-500 focus:outline-none dark:border-neutral-700 dark:text-neutral-100"
        />
        <button
          type="submit"
          disabled={submitting || !content.trim()}
          className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-500 disabled:opacity-50"
        >
          {submitting ? "..." : "Reply"}
        </button>
      </form>

     
      <div className="mt-3 space-y-2.5">
        {loading && (
          <p className="text-xs text-neutral-400">Loading comments...</p>
        )}

        {!loading && comments.length === 0 && (
          <p className="text-xs text-neutral-400">No comments yet.</p>
        )}

        {comments.map((comment) => (
          <div
            key={comment.id}
            className="rounded-lg bg-neutral-50 p-2.5 dark:bg-neutral-800/60"
          >
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                {comment.user.name}
              </span>
              <span className="text-[11px] text-neutral-400">
                @{comment.user.username}
              </span>
            </div>
            <p className="mt-1 text-xs text-neutral-800 dark:text-neutral-200">
              {comment.content}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
