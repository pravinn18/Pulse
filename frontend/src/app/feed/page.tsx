"use client";

import { useState } from "react";
import CreatePost from "../../components/CreatePost";
import PostList from "../../components/PostList";

export default function FeedPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeTab, setActiveTab] = useState<"for-you" | "following">(
    "for-you",
  );

  const handlePostCreated = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen w-full bg-white transition-colors duration-200 dark:bg-black">
    
      <div className="sticky top-14 z-10 border-b border-neutral-200 bg-white/90 backdrop-blur-md sm:top-0 dark:border-neutral-800 dark:bg-black/90">
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

      <div className="hidden border-b border-neutral-200 p-4 sm:block dark:border-neutral-800">
        <CreatePost onPostCreated={handlePostCreated} />
      </div>

      <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
        <PostList refreshKey={refreshKey} />
      </div>
    </div>
  );
}
