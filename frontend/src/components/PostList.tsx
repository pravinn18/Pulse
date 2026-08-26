"use client";

import { useEffect, useState } from "react";
import PostCard from "./PostCard";

export default function PostList({ refreshKey }: { refreshKey: number }) {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setLoading(true);
        const response = await fetch("http://localhost:5000/posts");
        if (!response.ok) {
          throw new Error("Failed to fetch posts");
        }
        const data = await response.json();
        setPosts(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, [refreshKey]);

  if (loading) {
    return (
      <p className="p-8 text-center text-xs text-neutral-400">
        Loading posts...
      </p>
    );
  }

  if (posts.length === 0) {
    return (
      <p className="p-8 text-center text-xs text-neutral-500">
        No posts yet. Create the first one! 🚀
      </p>
    );
  }

  return (
    <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
    </div>
  );
}
