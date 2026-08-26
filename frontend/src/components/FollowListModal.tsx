"use client";

import Link from "next/link";

interface UserItem {
  id: string;
  name: string;
  username: string;
  avatarUrl?: string | null;
}

interface FollowListModalProps {
  isOpen: boolean;
  title: "Followers" | "Following";
  users: UserItem[];
  loading: boolean;
  onClose: () => void;
}

export default function FollowListModal({
  isOpen,
  title,
  users,
  loading,
  onClose,
}: FollowListModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white shadow-2xl dark:border-neutral-800 dark:bg-black">
     
        <div className="flex items-center justify-between border-b border-neutral-100 p-4 dark:border-neutral-800">
          <h3 className="text-base font-bold text-neutral-900 dark:text-white">
            {title}
          </h3>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            ✕
          </button>
        </div>

        <div className="max-h-96 overflow-y-auto divide-y divide-neutral-100 p-2 dark:divide-neutral-900">
          {loading ? (
            <p className="p-4 text-center text-xs text-neutral-400">
              Loading...
            </p>
          ) : users.length === 0 ? (
            <p className="p-8 text-center text-xs text-neutral-400">
              No {title.toLowerCase()} yet.
            </p>
          ) : (
            users.map((user) => (
              <Link
                key={user.id}
                href={`/profile/${user.username}`}
                onClick={onClose}
                className="flex items-center gap-3 p-3 transition hover:bg-neutral-50 dark:hover:bg-neutral-900/60"
              >
                <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-neutral-200 font-bold text-xs dark:bg-neutral-800">
                  {user.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={user.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    user.name.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-neutral-900 dark:text-white">
                    {user.name}
                  </p>
                  <p className="truncate text-xs text-neutral-400">
                    @{user.username}
                  </p>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
