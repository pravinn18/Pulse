"use client";

import { useState, useRef } from "react";
import { User } from "../context/AuthContext";

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProfileUpdated: (updatedUser: Partial<User>) => void;
  initialData: {
    name: string;
    bio?: string | null;
    avatarUrl?: string | null;
  };
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function EditProfileModal({
  isOpen,
  onClose,
  onProfileUpdated,
  initialData,
}: EditProfileModalProps) {
  const [name, setName] = useState(initialData.name || "");
  const [bio, setBio] = useState(initialData.bio || "");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    initialData.avatarUrl || null,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("Avatar image must be under 5MB");
        return;
      }
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("token") || localStorage.getItem("accessToken")
        : null;

    if (!token) {
      alert("Please login first");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("name", name.trim());
      formData.append("bio", bio.trim());
      if (avatarFile) {
        formData.append("avatar", avatarFile);
      }

      const res = await fetch(`${API_URL}/users/profile`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Failed to update profile");
      }

      const updatedUser = await res.json();

      const cached = localStorage.getItem("user");
      if (cached) {
        const parsed = JSON.parse(cached);
        localStorage.setItem(
          "user",
          JSON.stringify({ ...parsed, ...updatedUser }),
        );
      }

      onProfileUpdated(updatedUser);
      onClose();
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-neutral-200 bg-white shadow-2xl dark:border-neutral-800 dark:bg-black">
       
        <div className="flex items-center justify-between border-b border-neutral-100 p-4 dark:border-neutral-800">
          <div className="flex items-center gap-4">
            <button
              onClick={onClose}
              className="rounded-full p-1.5 text-neutral-500 transition hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-900"
            >
              ✕
            </button>
            <h3 className="text-base font-bold text-neutral-900 dark:text-white">
              Edit profile
            </h3>
          </div>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving || !name.trim()}
            className="rounded-full bg-black px-4 py-1.5 text-xs font-bold text-white transition hover:bg-neutral-800 disabled:opacity-40 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>

        {error && (
          <div className="m-4 rounded-xl bg-red-50 p-3 text-xs text-red-600 dark:bg-red-950/40 dark:text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
         
          <div className="flex flex-col items-center">
            <div className="relative group flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-2 border-neutral-300 bg-neutral-200 dark:border-neutral-700 dark:bg-neutral-800">
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt="Avatar preview"
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-2xl font-bold text-neutral-700 dark:text-neutral-300">
                  {name.charAt(0).toUpperCase()}
                </span>
              )}

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition group-hover:opacity-100"
              >
                <svg
                  className="h-7 w-7 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
            />
            <p className="mt-2 text-xs font-semibold text-neutral-500">
              Click photo to change avatar
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-500">
              Name
            </label>
            <input
              type="text"
              required
              maxLength={50}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-xl border border-neutral-300 bg-transparent px-3.5 py-2.5 text-sm text-neutral-900 focus:border-black focus:outline-none dark:border-neutral-700 dark:text-white dark:focus:border-white"
              placeholder="Your display name"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-500">
              Bio
            </label>
            <textarea
              rows={3}
              maxLength={160}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="mt-1 w-full resize-none rounded-xl border border-neutral-300 bg-transparent px-3.5 py-2.5 text-sm text-neutral-900 focus:border-black focus:outline-none dark:border-neutral-700 dark:text-white dark:focus:border-white"
              placeholder="Tell others about yourself"
            />
            <p className="mt-1 text-right text-[10px] text-neutral-400">
              {bio.length}/160
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
