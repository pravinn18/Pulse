"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "../../context/AuthContext";
import PollCard from "../../components/PollCard";

interface UserResult {
  id: string;
  name: string;
  username: string;
  avatarUrl?: string | null;
  bio?: string | null;
  _count?: { followers: number; following: number };
}

interface PostResult {
  id: string;
  content: string;
  imageUrl?: string | null;
  createdAt: string;
  author: {
    id: string;
    name: string;
    username: string;
    avatarUrl?: string | null;
  };
  likes?: { userId: string }[];
  poll?: any;
  _count?: { likes: number; comments: number };
}

interface NewsItem {
  id: string;
  category: string;
  title: string;
  description: string;
  source: string;
  timeAgo: string;
  postVolume: string;
  imageUrl?: string;
  url?: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const LIVE_NEWS_DATABASE: Record<string, NewsItem[]> = {
  "for-you": [
    {
      id: "news-1",
      category: "Technology · Trending",
      title:
        "React 19 & Next.js Server Actions redefine modern web architecture",
      description:
        "Developers across the globe adopt zero-bundle-size React Server Components and compile-time memoization for high-throughput social applications.",
      source: "TechPulse",
      timeAgo: "1h ago",
      postVolume: "148.5K posts",
      imageUrl:
        "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800&q=80",
    },
    {
      id: "news-2",
      category: "Anime · Trending",
      title:
        "One Piece: Massive reveal shakes the Grand Line in latest release",
      description:
        "Eiichiro Oda delivers unprecedented narrative payoffs with worldwide fan celebrations and trending discussions on Pulse.",
      source: "AnimeWire",
      timeAgo: "2h ago",
      postVolume: "389.2K posts",
      imageUrl:
        "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&q=80",
    },
    {
      id: "news-3",
      category: "Gaming · Trending",
      title: "Next-gen game engine debuts real-time global illumination",
      description:
        "Unreal Engine demonstration shows hyper-realistic character models rendering smoothly on modern hardware and consumer devices.",
      source: "GameSpotlight",
      timeAgo: "4h ago",
      postVolume: "72.4K posts",
      imageUrl:
        "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&q=80",
    },
  ],
  trending: [
    {
      id: "news-4",
      category: "Global · Trending",
      title: "Global high-speed mesh networks expand cross-continental links",
      description:
        "Satellite internet throughput exceeds multi-gigabit speeds, connecting remote developers and creators worldwide.",
      source: "GlobalNet",
      timeAgo: "30m ago",
      postVolume: "512.9K posts",
    },
    {
      id: "news-5",
      category: "Design · Trending",
      title: "High-contrast monochrome UI gains widespread adoption",
      description:
        "Modern applications drop colorful clutter in favor of clean black-and-white layouts focused on speed and scannability.",
      source: "UI Digest",
      timeAgo: "3h ago",
      postVolume: "94.1K posts",
    },
  ],
  tech: [
    {
      id: "news-6",
      category: "Web Engineering · Trending",
      title: "PostgreSQL & Prisma 7 introduce ultra-fast streaming adapters",
      description:
        "Edge-ready database connections reduce latency down to sub-10ms for web and mobile clients worldwide.",
      source: "Database Weekly",
      timeAgo: "5h ago",
      postVolume: "63.2K posts",
    },
    {
      id: "news-7",
      category: "AI & Tools · Trending",
      title: "AI code assistants integrate deeply with local editor workspaces",
      description:
        "Developers report doubling feature shipment velocity through seamless multi-file codebase reasoning.",
      source: "DevInsider",
      timeAgo: "6h ago",
      postVolume: "210.8K posts",
    },
  ],
  sports: [
    {
      id: "news-8",
      category: "Football · Trending",
      title:
        "Champions League knockout stages deliver thrilling stoppage-time decider",
      description:
        "Stunning 94th-minute goal seals the victory in front of an electrified crowd of 80,000 fans.",
      source: "SportsZone",
      timeAgo: "1h ago",
      postVolume: "420.3K posts",
    },
  ],
  entertainment: [
    {
      id: "news-9",
      category: "Cinema · Trending",
      title:
        "Anticipated sci-fi blockbuster breaks opening weekend box office records",
      description:
        "Critics praise the stunning practical effects, score, and non-stop pacing in what many call a modern classic.",
      source: "CinePulse",
      timeAgo: "7h ago",
      postVolume: "185.0K posts",
    },
  ],
};

const CATEGORIES = [
  { id: "for-you", label: "For you" },
  { id: "trending", label: "Trending" },
  { id: "tech", label: "Technology" },
  { id: "sports", label: "Sports" },
  { id: "entertainment", label: "Entertainment" },
];

export default function ExplorePage() {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState("for-you");
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<UserResult[]>([]);
  const [posts, setPosts] = useState<PostResult[]>([]);
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);

  // Debounced search query
  useEffect(() => {
    if (!query.trim()) {
      setUsers([]);
      setPosts([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `${API_URL}/users/search/query?q=${encodeURIComponent(query.trim())}`,
        );
        if (res.ok) {
          const data = await res.json();
          setUsers(data.users || []);
          setPosts(data.posts || []);
        }
      } catch (err) {
        console.error("Search query failed:", err);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  const activeNewsList =
    LIVE_NEWS_DATABASE[activeTab] || LIVE_NEWS_DATABASE["for-you"];

  return (
    <div className="min-h-screen w-full bg-white dark:bg-black">
      
      <div className="sticky top-0 z-20 border-b border-neutral-200 bg-white/85 p-3 backdrop-blur-md dark:border-neutral-800 dark:bg-black/85">
        <div className="relative flex items-center">
          <div className="pointer-events-none absolute left-4 text-neutral-400">
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
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search username, people, or post content"
            className="w-full rounded-full border border-neutral-200 bg-neutral-100 py-2.5 pl-11 pr-10 text-sm text-neutral-900 placeholder-neutral-500 focus:border-black focus:bg-white focus:outline-none dark:border-neutral-800 dark:bg-neutral-900 dark:text-white dark:focus:border-white dark:focus:bg-black"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-3.5 rounded-full p-1 text-xs text-neutral-400 hover:text-black dark:hover:text-white"
            >
              ✕
            </button>
          )}
        </div>

        {!query && (
          <div className="mt-3 flex overflow-x-auto border-b border-neutral-200 no-scrollbar dark:border-neutral-800">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveTab(cat.id)}
                className={`shrink-0 px-4 pb-2.5 text-xs sm:text-sm font-bold transition ${
                  activeTab === cat.id
                    ? "border-b-2 border-black text-black dark:border-white dark:text-white"
                    : "text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {query ? (
        <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
          {loading ? (
            <p className="p-8 text-center text-xs text-neutral-400">
              Searching Pulse...
            </p>
          ) : users.length === 0 && posts.length === 0 ? (
            <div className="p-12 text-center text-neutral-500">
              <p className="text-base font-bold text-neutral-900 dark:text-white">
                No results for &ldquo;{query}&rdquo;
              </p>
              <p className="mt-1 text-xs text-neutral-400">
                Try searching for another user handle, name, or description
                keyword.
              </p>
            </div>
          ) : (
            <>
              {users.length > 0 && (
                <div className="p-4">
                  <h3 className="mb-3 text-sm font-extrabold text-neutral-900 dark:text-white">
                    People
                  </h3>
                  <div className="space-y-3">
                    {users.map((u) => (
                      <Link
                        key={u.id}
                        href={`/profile/${u.username}`}
                        className="flex items-center justify-between rounded-2xl border border-neutral-100 p-3 transition hover:bg-neutral-50 dark:border-neutral-900 dark:hover:bg-neutral-900/60"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-neutral-200 font-bold text-xs dark:bg-neutral-800">
                            {u.avatarUrl ? (
                              <img
                                src={u.avatarUrl}
                                alt={u.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              u.name.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-extrabold text-neutral-900 dark:text-white leading-tight">
                              {u.name}
                            </p>
                            <p className="truncate text-xs text-neutral-500 leading-tight">
                              @{u.username}
                            </p>
                            {u.bio && (
                              <p className="mt-1 line-clamp-1 text-xs text-neutral-600 dark:text-neutral-400">
                                {u.bio}
                              </p>
                            )}
                          </div>
                        </div>

                        <span className="shrink-0 rounded-full bg-black px-4 py-1.5 text-xs font-bold text-white transition hover:bg-neutral-800 dark:bg-white dark:text-black">
                          View
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {posts.length > 0 && (
                <div>
                  <h3 className="p-4 pb-2 text-sm font-extrabold text-neutral-900 dark:text-white">
                    Matching Posts & Descriptions
                  </h3>
                  {posts.map((post) => (
                    <article
                      key={post.id}
                      className="p-4 transition hover:bg-neutral-50/50 dark:hover:bg-neutral-950"
                    >
                      <div className="flex gap-3">
                        <Link
                          href={`/profile/${post.author.username}`}
                          className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-neutral-200 font-bold text-xs dark:bg-neutral-800"
                        >
                          {post.author.avatarUrl ? (
                            <img
                              src={post.author.avatarUrl}
                              alt={post.author.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            post.author.name.charAt(0).toUpperCase()
                          )}
                        </Link>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <Link
                              href={`/profile/${post.author.username}`}
                              className="font-bold text-sm text-neutral-900 hover:underline dark:text-white"
                            >
                              {post.author.name}
                            </Link>
                            <span className="text-xs text-neutral-500">
                              @{post.author.username}
                            </span>
                          </div>

                          <p className="mt-1 text-sm text-neutral-800 dark:text-neutral-200 leading-relaxed">
                            {post.content}
                          </p>

                          {post.imageUrl && (
                            <img
                              src={post.imageUrl}
                              alt="Post media"
                              className="mt-3 max-h-80 w-full rounded-2xl object-cover"
                            />
                          )}

                          {post.poll && (
                            <PollCard poll={post.poll} postId={post.id} />
                          )}

                          <div className="mt-3 flex items-center gap-6 text-xs text-neutral-500">
                            <span>❤️ {post._count?.likes ?? 0}</span>
                            <span>💬 {post._count?.comments ?? 0}</span>
                          </div>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
  
          {activeNewsList[0]?.imageUrl && (
            <div
              onClick={() => setSelectedNews(activeNewsList[0])}
              className="group relative cursor-pointer overflow-hidden"
            >
              <div className="relative h-64 w-full sm:h-72">
                <img
                  src={activeNewsList[0].imageUrl}
                  alt={activeNewsList[0].title}
                  className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 text-white">
                  <span className="rounded-md bg-white/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider backdrop-blur-md">
                    {activeNewsList[0].category}
                  </span>
                  <h2 className="mt-2 text-lg sm:text-xl font-black leading-snug drop-shadow-md">
                    {activeNewsList[0].title}
                  </h2>
                  <p className="mt-1 text-xs text-neutral-300">
                    {activeNewsList[0].source} · {activeNewsList[0].timeAgo} ·{" "}
                    {activeNewsList[0].postVolume}
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeNewsList.map((item) => (
            <div
              key={item.id}
              onClick={() => setSelectedNews(item)}
              className="flex cursor-pointer items-start justify-between p-4 transition hover:bg-neutral-50/75 dark:hover:bg-neutral-950"
            >
              <div className="flex-1 pr-4">
                <p className="text-[11px] font-medium text-neutral-500">
                  {item.category} · {item.timeAgo}
                </p>
                <h3 className="mt-1 text-sm sm:text-base font-extrabold text-neutral-900 dark:text-white leading-snug">
                  {item.title}
                </h3>
                <p className="mt-1 line-clamp-2 text-xs text-neutral-600 dark:text-neutral-400">
                  {item.description}
                </p>
                <p className="mt-2 text-[11px] text-neutral-400">
                  {item.postVolume} · {item.source}
                </p>
              </div>

              {item.imageUrl && (
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  className="h-20 w-20 shrink-0 rounded-2xl object-cover"
                />
              )}
            </div>
          ))}
        </div>
      )}

      {selectedNews && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-neutral-200 bg-white p-6 shadow-2xl dark:border-neutral-800 dark:bg-black">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3 dark:border-neutral-800">
              <span className="text-xs font-bold text-neutral-500">
                {selectedNews.category}
              </span>
              <button
                onClick={() => setSelectedNews(null)}
                className="rounded-full p-1 text-neutral-400 hover:text-black dark:hover:text-white"
              >
                ✕
              </button>
            </div>

            {selectedNews.imageUrl && (
              <img
                src={selectedNews.imageUrl}
                alt={selectedNews.title}
                className="mt-4 max-h-60 w-full rounded-2xl object-cover"
              />
            )}

            <h2 className="mt-4 text-lg font-black text-neutral-900 dark:text-white leading-snug">
              {selectedNews.title}
            </h2>

            <p className="mt-3 text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">
              {selectedNews.description}
            </p>

            <div className="mt-4 flex items-center justify-between border-t border-neutral-100 pt-3 text-xs text-neutral-400 dark:border-neutral-800">
              <span>
                Source: {selectedNews.source} ({selectedNews.timeAgo})
              </span>
              <span className="font-bold text-neutral-900 dark:text-white">
                {selectedNews.postVolume}
              </span>
            </div>

            <div className="mt-5 flex gap-2">
              <button
                onClick={() => {
                  setQuery(selectedNews.title.split(" ")[0]);
                  setSelectedNews(null);
                }}
                className="flex-1 rounded-full bg-black py-2.5 text-xs font-bold text-white transition hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
              >
                Search related posts
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
