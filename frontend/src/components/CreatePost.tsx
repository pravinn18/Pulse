"use client";

import { useState, useRef } from "react";
import { useAuth } from "../context/AuthContext";

interface CreatePostProps {
  onPostCreated: (newPost?: any) => void;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const EMOJI_CATEGORIES = {
  Popular: ["🔥", "❤️", "🚀", "😂", "✨", "🎉", "👀", "🙌", "💯", "💡"],
  Faces: ["😀", "😎", "🤩", "🤯", "🥳", "🥺", "💀", "😍", "🫡", "🤝"],
  Tech: ["💻", "⚡", "🤖", "🌐", "📱", "📦", "🛡️", "⚙️", "📈", "🕹️"],
};

export default function CreatePost({ onPostCreated }: CreatePostProps) {
  const { user } = useAuth();

  const [content, setContent] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isVideo, setIsVideo] = useState(false);
  const [isReel, setIsReel] = useState(false);
  const [loading, setLoading] = useState(false);

 
  const [showPoll, setShowPoll] = useState(false);
  const [pollOptions, setPollOptions] = useState<string[]>(["", ""]);
  const [pollDuration, setPollDuration] = useState<number>(24);


  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduledDate, setScheduledDate] = useState("");

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);

      const isVid = file.type.startsWith("video/");
      setIsVideo(isVid);
      if (isVid) setIsReel(true);
      setShowPoll(false);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setIsVideo(false);
    setIsReel(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleAddPollOption = () => {
    if (pollOptions.length < 4) {
      setPollOptions([...pollOptions, ""]);
    }
  };

  const handlePollOptionChange = (index: number, value: string) => {
    const next = [...pollOptions];
    next[index] = value;
    setPollOptions(next);
  };

  const removePoll = () => {
    setShowPoll(false);
    setPollOptions(["", ""]);
  };

  const handleAddEmoji = (emoji: string) => {
    setContent((prev) => prev + emoji);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && !selectedFile && !showPoll) return;

    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("token") || localStorage.getItem("accessToken")
        : null;
    if (!token) {
      alert("Please login to post");
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("content", content);

      if (selectedFile) {
        formData.append("file", selectedFile);
      }
      if (isReel) {
        formData.append("isReel", "true");
      }

      if (showPoll) {
        const validOptions = pollOptions.filter((opt) => opt.trim().length > 0);
        if (validOptions.length < 2) {
          alert("Poll must have at least 2 choices");
          setLoading(false);
          return;
        }
        formData.append(
          "poll",
          JSON.stringify({
            options: validOptions,
            durationHours: Number(pollDuration),
          }),
        );
      }

      if (showSchedule && scheduledDate) {
        formData.append("scheduledFor", new Date(scheduledDate).toISOString());
      }

      const res = await fetch(`${API_URL}/posts`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to create post");
      }

      const newPost = await res.json();

      setContent("");
      removeFile();
      removePoll();
      setShowSchedule(false);
      setScheduledDate("");
      setShowEmojiPicker(false);

      if (!scheduledDate) {
        onPostCreated(newPost);
      } else {
        alert(`Post scheduled for ${new Date(scheduledDate).toLocaleString()}`);
      }
    } catch (error: any) {
      alert(error.message || "Failed to create post");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="border-b border-neutral-200 bg-white p-4 transition-all sm:p-5 dark:border-neutral-800 dark:bg-black"
    >
      <div className="flex gap-3">
       
        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-neutral-200 bg-neutral-200 font-bold dark:border-neutral-800 dark:bg-neutral-800 dark:text-neutral-100">
          {user?.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.name}
              className="h-full w-full object-cover"
            />
          ) : (
            user?.name?.charAt(0).toUpperCase() || "U"
          )}
        </div>

        <div className="min-w-0 flex-1">
       
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What is happening?! (No word limit, write freely...)"
            rows={3}
            className="w-full resize-none bg-transparent text-base text-neutral-900 placeholder-neutral-500 focus:outline-none dark:text-neutral-100"
          />

          {previewUrl && (
            <div className="relative mb-3 mt-2 overflow-hidden rounded-2xl border border-neutral-200 bg-black dark:border-neutral-800">
              {isVideo ? (
                <div className="relative flex max-h-96 items-center justify-center">
                  <video
                    src={previewUrl}
                    controls
                    className="max-h-96 w-full object-contain"
                  />
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-black/70 px-3 py-1 font-bold text-xs text-white backdrop-blur-md">
                    <span>🎬</span>
                    <span>HD Reel</span>
                  </div>
                </div>
              ) : (
                <img
                  src={previewUrl}
                  alt="Upload preview"
                  className="max-h-96 w-full object-cover"
                />
              )}
              <button
                type="button"
                onClick={removeFile}
                className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/75 text-xs text-white backdrop-blur-sm transition hover:bg-black"
              >
                ✕
              </button>
            </div>
          )}

          {showPoll && (
            <div className="mb-4 rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800 dark:bg-neutral-900/40">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                  Poll Choices
                </span>
                <button
                  type="button"
                  onClick={removePoll}
                  className="text-xs text-red-500 hover:underline"
                >
                  Remove poll
                </button>
              </div>

              <div className="space-y-2">
                {pollOptions.map((option, idx) => (
                  <input
                    key={idx}
                    type="text"
                    required
                    value={option}
                    onChange={(e) =>
                      handlePollOptionChange(idx, e.target.value)
                    }
                    placeholder={`Choice ${idx + 1}`}
                    className="w-full rounded-xl border border-neutral-300 bg-transparent px-3.5 py-2 text-xs text-neutral-900 focus:border-black focus:outline-none dark:border-neutral-700 dark:text-neutral-100 dark:focus:border-white"
                  />
                ))}
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-neutral-100 pt-3 dark:border-neutral-800">
                {pollOptions.length < 4 && (
                  <button
                    type="button"
                    onClick={handleAddPollOption}
                    className="text-xs font-bold text-black hover:underline dark:text-white"
                  >
                    + Add option
                  </button>
                )}

                <div className="flex items-center gap-2 text-xs text-neutral-500">
                  <span>Duration:</span>
                  <select
                    value={pollDuration}
                    onChange={(e) => setPollDuration(Number(e.target.value))}
                    className="rounded-lg border border-neutral-300 bg-transparent px-2 py-1 text-xs dark:border-neutral-700 dark:text-neutral-200"
                  >
                    <option value={1} className="dark:bg-neutral-900">
                      1 hour
                    </option>
                    <option value={6} className="dark:bg-neutral-900">
                      6 hours
                    </option>
                    <option value={24} className="dark:bg-neutral-900">
                      1 day
                    </option>
                    <option value={72} className="dark:bg-neutral-900">
                      3 days
                    </option>
                    <option value={168} className="dark:bg-neutral-900">
                      7 days
                    </option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {showSchedule && scheduledDate && (
            <div className="mb-3 flex items-center justify-between rounded-xl border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-xs text-blue-500">
              <span>
                ⏰ Scheduled: {new Date(scheduledDate).toLocaleString()}
              </span>
              <button
                type="button"
                onClick={() => {
                  setShowSchedule(false);
                  setScheduledDate("");
                }}
                className="font-bold hover:underline"
              >
                Cancel
              </button>
            </div>
          )}

          {showEmojiPicker && (
            <div className="mb-3 rounded-2xl border border-neutral-200 bg-neutral-50 p-3 shadow-lg dark:border-neutral-800 dark:bg-neutral-950">
              <div className="space-y-2">
                {Object.entries(EMOJI_CATEGORIES).map(([cat, emojis]) => (
                  <div key={cat} className="flex items-center gap-2">
                    <span className="w-14 text-[11px] font-semibold text-neutral-400">
                      {cat}:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {emojis.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => handleAddEmoji(emoji)}
                          className="rounded-md p-1.5 text-lg transition hover:bg-neutral-200 active:scale-125 dark:hover:bg-neutral-800"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between border-t border-neutral-100 pt-3 dark:border-neutral-800">
            <div className="flex items-center gap-1 sm:gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                onChange={handleFileChange}
                className="hidden"
                id="create-post-media-file"
              />
              <label
                htmlFor="create-post-media-file"
                title="Attach Media / HD Reel"
                className="flex cursor-pointer items-center justify-center rounded-full p-2 text-neutral-700 transition hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </label>

              <button
                type="button"
                onClick={() => {
                  setShowPoll(!showPoll);
                  if (!showPoll) removeFile();
                }}
                title="Poll"
                className="rounded-full p-2 text-neutral-700 transition hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </button>

              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                title="Emoji"
                className="rounded-full p-2 text-neutral-700 transition hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </button>

              <button
                type="button"
                onClick={() => setShowSchedule(!showSchedule)}
                title="Schedule"
                className="rounded-full p-2 text-neutral-700 transition hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </button>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={
                  loading || (!content.trim() && !selectedFile && !showPoll)
                }
                className="rounded-full bg-black px-5 py-2 font-bold text-xs text-white transition hover:bg-neutral-800 active:scale-95 disabled:opacity-40 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
              >
                {loading
                  ? "Publishing..."
                  : showSchedule && scheduledDate
                    ? "Schedule"
                    : "Post"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {showSchedule && !scheduledDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl border border-neutral-200 bg-white p-5 shadow-2xl dark:border-neutral-800 dark:bg-neutral-900">
            <h3 className="font-extrabold text-base text-neutral-900 dark:text-white">
              Schedule Post
            </h3>
            <p className="mt-1 text-xs text-neutral-500">
              Select date & time for automatic publication.
            </p>

            <input
              type="datetime-local"
              min={new Date().toISOString().slice(0, 16)}
              onChange={(e) => setScheduledDate(e.target.value)}
              className="mt-4 w-full rounded-xl border border-neutral-200 bg-neutral-100 p-2.5 text-xs text-neutral-900 dark:border-neutral-700 dark:bg-black dark:text-white"
            />

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setShowSchedule(false)}
                className="flex-1 rounded-full bg-black py-2 font-bold text-xs text-white dark:bg-white dark:text-black"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
