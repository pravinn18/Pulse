"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "../context/AuthContext";

interface TrendStory {
  id: string;
  category: string;
  tag: string;
  posts: string;
  headline: string;
  summary: string;
  source: string;
  timeAgo: string;
  imageUrl?: string;
}

interface SuggestedUser {
  id: string;
  name: string;
  username: string;
  avatarUrl?: string | null;
  bio?: string | null;
  isFollowing?: boolean;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const LIVE_NEWS_STORIES: TrendStory[] = [
  {
    id: "news-1",
    category: "Technology · Trending",
    tag: "#React19",
    posts: "184.2K",
    headline: "React 19 & Next.js Server Components Adopted Worldwide",
    summary:
      "Global software teams migrate production architectures to zero-bundle-size React Server Actions and compile-time memoization for edge workloads.",
    source: "TechPulse",
    timeAgo: "1h ago",
    imageUrl:
      "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800&q=80",
  },
  {
    id: "news-2",
    category: "AI & Chips · Trending",
    tag: "#AIInfrastructure",
    posts: "312.8K",
    headline: "Global Chip Market Adjusts as AI Datacenter Demand Surges",
    summary:
      "Semiconductor manufacturers reallocate capacity toward high-bandwidth memory, influencing consumer smartphone and laptop production cycles.",
    source: "Bloomberg Tech",
    timeAgo: "2h ago",
    imageUrl:
      "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=80",
  },
  {
    id: "news-3",
    category: "World · Incident",
    tag: "#GlobalNet",
    posts: "94.5K",
    headline: "Trans-Continental Subsea Mesh Cables Break Throughput Records",
    summary:
      "New low-latency optical routing connects remote engineering centers with resilient, sub-10ms multi-gigabit backbone pipelines.",
    source: "Reuters",
    timeAgo: "3h ago",
    imageUrl:
      "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&q=80",
  },
  {
    id: "news-4",
    category: "Anime · Trending",
    tag: "One Piece",
    posts: "450.1K",
    headline: "Eiichiro Oda Unveils Pivotal Plot Climax in Latest Release",
    summary:
      "Global fan communities trend worldwide on Pulse following the explosive reveals in the latest weekly chapter broadcast.",
    source: "AnimeWire",
    timeAgo: "4h ago",
    imageUrl:
      "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&q=80",
  },
  {
    id: "news-5",
    category: "Gaming · Trending",
    tag: "#UnrealEngine6",
    posts: "78.4K",
    headline: "Next-Gen Physics Engine Shows Real-Time Photorealism",
    summary:
      "Interactive engine demonstrations reveal real-time volumetric lighting and neural mesh rendering on consumer hardware.",
    source: "IGN",
    timeAgo: "6h ago",
    imageUrl:
      "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&q=80",
  },
];

export default function RightSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();

  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<SuggestedUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const [selectedStory, setSelectedStory] = useState<TrendStory | null>(null);
  const [users, setUsers] = useState<SuggestedUser[]>([]);
  const [showAllUsers, setShowAllUsers] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [followingMap, setFollowingMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        setShowSearchDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (pathname === "/login" || pathname === "/register") return;

    const loadSuggested = async () => {
      try {
        setLoadingUsers(true);
        const token =
          typeof window !== "undefined"
            ? localStorage.getItem("token") ||
              localStorage.getItem("accessToken")
            : null;

        const res = await fetch(`${API_URL}/users/suggested/explore`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        if (res.ok) {
          const data = await res.json();
          const mapped: SuggestedUser[] = data.map((u: any) => ({
            id: u.id,
            name: u.name,
            username: u.username,
            avatarUrl: u.avatarUrl,
            bio: u.bio,
            isFollowing: u.followers ? u.followers.length > 0 : false,
          }));
          setUsers(mapped);
        }
      } catch (err) {
        console.error("Failed to load suggested accounts:", err);
      } finally {
        setLoadingUsers(false);
      }
    };

    loadSuggested();
  }, [user, pathname]);

  useEffect(() => {
    if (!search.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsSearching(true);
        const res = await fetch(
          `${API_URL}/users/search/query?q=${encodeURIComponent(search.trim())}`,
        );
        if (res.ok) {
          const data = await res.json();
          setSearchResults(Array.isArray(data) ? data.slice(0, 5) : []);
        }
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [search]);
  if (pathname === "/login" || pathname === "/register") {
    return null;
  }

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && search.trim()) {
      setShowSearchDropdown(false);
      router.push(`/search?q=${encodeURIComponent(search.trim())}`);
    }
  };

  const handleToggleFollow = async (targetId: string, isFollowing: boolean) => {
    const token =
      localStorage.getItem("token") || localStorage.getItem("accessToken");
    if (!token || !user) {
      router.push("/login");
      return;
    }

    setFollowingMap((prev) => ({ ...prev, [targetId]: true }));
    setUsers((prev) =>
      prev.map((u) =>
        u.id === targetId ? { ...u, isFollowing: !isFollowing } : u,
      ),
    );

    try {
      await fetch(`${API_URL}/users/${targetId}/follow`, {
        method: isFollowing ? "DELETE" : "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (err) {
      setUsers((prev) =>
        prev.map((u) => (u.id === targetId ? { ...u, isFollowing } : u)),
      );
      console.error("Follow error:", err);
    } finally {
      setFollowingMap((prev) => ({ ...prev, [targetId]: false }));
    }
  };

  const visibleUsers = showAllUsers ? users : users.slice(0, 3);

  return (
    <>
      <aside className="sticky top-0 hidden h-screen w-80 flex-col gap-4 overflow-y-auto border-l border-neutral-200 bg-white px-4 py-3 transition-colors duration-150 lg:flex xl:w-96 dark:border-neutral-800 dark:bg-black">
    
        <div
          ref={searchContainerRef}
          className="sticky top-0 z-20 bg-white/95 pb-2 pt-1 backdrop-blur-md dark:bg-black/95"
        >
          <div className="relative flex items-center gap-3 rounded-full border border-neutral-200 bg-neutral-100 px-4 py-2.5 transition focus-within:border-black focus-within:bg-white dark:border-neutral-800 dark:bg-neutral-900 dark:focus-within:border-white dark:focus-within:bg-black">
            <svg
              className="h-5 w-5 shrink-0 text-neutral-500"
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
            <input
              type="text"
              value={search}
              onFocus={() => setShowSearchDropdown(true)}
              onChange={(e) => {
                setSearch(e.target.value);
                setShowSearchDropdown(true);
              }}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search Pulse, users, or topics"
              className="w-full bg-transparent text-sm text-neutral-900 placeholder-neutral-500 focus:outline-none dark:text-white"
            />
            {search && (
              <button
                onClick={() => {
                  setSearch("");
                  setSearchResults([]);
                  setShowSearchDropdown(false);
                }}
                className="text-xs text-neutral-400 transition hover:text-black dark:hover:text-white"
              >
                ✕
              </button>
            )}
          </div>

          {showSearchDropdown && search.trim().length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-2 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-2xl backdrop-blur-xl dark:border-neutral-800 dark:bg-neutral-950">
              {isSearching ? (
                <div className="p-4 text-center text-xs text-neutral-500">
                  Searching accounts...
                </div>
              ) : searchResults.length > 0 ? (
                <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {searchResults.map((result) => (
                    <Link
                      key={result.id}
                      href={`/profile/${result.username}`}
                      onClick={() => setShowSearchDropdown(false)}
                      className="flex items-center gap-3 p-3 transition hover:bg-neutral-50 dark:hover:bg-neutral-900"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-neutral-200 text-xs font-bold text-neutral-800 dark:bg-neutral-800 dark:text-neutral-100">
                        {result.avatarUrl ? (
                          <img
                            src={result.avatarUrl}
                            alt={result.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          result.name?.charAt(0).toUpperCase() || "U"
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-bold text-neutral-900 dark:text-white">
                          {result.name}
                        </p>
                        <p className="truncate text-[11px] text-neutral-500">
                          @{result.username}
                        </p>
                      </div>
                    </Link>
                  ))}
                  <button
                    onClick={() => {
                      setShowSearchDropdown(false);
                      router.push(
                        `/search?q=${encodeURIComponent(search.trim())}`,
                      );
                    }}
                    className="block w-full p-3 text-center text-xs font-bold text-blue-500 transition hover:bg-neutral-50 dark:hover:bg-neutral-900"
                  >
                    Search for "{search}"
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => {
                    setShowSearchDropdown(false);
                    router.push(
                      `/search?q=${encodeURIComponent(search.trim())}`,
                    );
                  }}
                  className="cursor-pointer p-4 text-center text-xs text-neutral-500 transition hover:bg-neutral-50 dark:hover:bg-neutral-900"
                >
                  Press Enter to search for{" "}
                  <span className="font-bold text-neutral-900 dark:text-white">
                    "{search}"
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col rounded-3xl border border-neutral-200 bg-neutral-50/70 p-4 backdrop-blur-sm dark:border-neutral-800 dark:bg-neutral-950/70">
          <h3 className="text-base font-black tracking-tight text-neutral-900 dark:text-white">
            What’s happening
          </h3>

          <div className="mt-3 max-h-72 overflow-y-auto divide-y divide-neutral-200/60 pr-1 no-scrollbar dark:divide-neutral-800/60">
            {LIVE_NEWS_STORIES.map((item) => (
              <div
                key={item.id}
                onClick={() => setSelectedStory(item)}
                className="group flex cursor-pointer items-start justify-between py-3 transition"
              >
                <div className="flex-1 pr-2">
                  <p className="text-[11px] font-medium text-neutral-500">
                    {item.category}
                  </p>
                  <p className="text-sm font-bold text-neutral-900 leading-snug transition group-hover:underline dark:text-white">
                    {item.tag}
                  </p>
                  <p className="mt-0.5 text-xs text-neutral-600 line-clamp-1 dark:text-neutral-400">
                    {item.headline}
                  </p>
                  <p className="mt-1 text-[11px] text-neutral-400">
                    {item.posts} posts
                  </p>
                </div>

                {item.imageUrl && (
                  <img
                    src={item.imageUrl}
                    alt={item.tag}
                    className="h-14 w-14 shrink-0 rounded-2xl object-cover ring-1 ring-neutral-200 dark:ring-neutral-800"
                  />
                )}
              </div>
            ))}
          </div>

          <Link
            href="/search"
            className="mt-2 block pt-2 text-xs font-bold text-blue-500 transition hover:underline"
          >
            Show more trends
          </Link>
        </div>

        <div className="rounded-3xl border border-neutral-200 bg-neutral-50/70 p-4 backdrop-blur-sm dark:border-neutral-800 dark:bg-neutral-950/70">
          <h3 className="text-base font-black tracking-tight text-neutral-900 dark:text-white">
            Who to follow
          </h3>

          <div className="mt-3 space-y-3.5">
            {loadingUsers ? (
              <div className="space-y-3 py-2">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between gap-3 animate-pulse"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="h-10 w-10 rounded-full bg-neutral-200 dark:bg-neutral-800" />
                      <div className="space-y-1.5">
                        <div className="h-3 w-20 rounded bg-neutral-200 dark:bg-neutral-800" />
                        <div className="h-2.5 w-14 rounded bg-neutral-200 dark:bg-neutral-800" />
                      </div>
                    </div>
                    <div className="h-7 w-16 rounded-full bg-neutral-200 dark:bg-neutral-800" />
                  </div>
                ))}
              </div>
            ) : visibleUsers.length === 0 ? (
              <p className="py-2 text-xs text-neutral-400">
                No new recommendations right now.
              </p>
            ) : (
              visibleUsers.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center justify-between gap-2"
                >
                  <Link
                    href={`/profile/${u.username}`}
                    className="group flex min-w-0 items-center gap-2.5 transition"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-neutral-200 bg-neutral-200 text-xs font-bold dark:border-neutral-800 dark:bg-neutral-800">
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
                      <p className="truncate text-xs font-bold text-neutral-900 group-hover:underline dark:text-white">
                        {u.name}
                      </p>
                      <p className="truncate text-[11px] text-neutral-500">
                        @{u.username}
                      </p>
                    </div>
                  </Link>

                  <button
                    disabled={followingMap[u.id]}
                    onClick={() =>
                      handleToggleFollow(u.id, Boolean(u.isFollowing))
                    }
                    className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-bold transition active:scale-95 disabled:opacity-50 ${
                      u.isFollowing
                        ? "border border-neutral-300 bg-transparent text-neutral-900 hover:border-red-500 hover:text-red-500 dark:border-neutral-700 dark:text-white"
                        : "bg-black text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
                    }`}
                  >
                    {u.isFollowing ? "Following" : "Follow"}
                  </button>
                </div>
              ))
            )}
          </div>

          {users.length > 3 && (
            <button
              onClick={() => setShowAllUsers(!showAllUsers)}
              className="mt-3 block text-xs font-bold text-blue-500 transition hover:underline"
            >
              {showAllUsers ? "Show less" : "Show more"}
            </button>
          )}
        </div>

        <div className="px-2 text-[11px] text-neutral-400 space-x-2 leading-normal">
          <Link href="/terms" className="hover:underline">
            Terms
          </Link>
          <span>·</span>
          <Link href="/privacy" className="hover:underline">
            Privacy
          </Link>
          <span>·</span>
          <span>© 2026 Pulse Corp.</span>
        </div>
      </aside>

      {selectedStory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-3xl border border-neutral-200 bg-white p-6 shadow-2xl dark:border-neutral-800 dark:bg-neutral-950">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3 dark:border-neutral-800">
              <span className="text-xs font-bold text-neutral-500">
                {selectedStory.category}
              </span>
              <button
                onClick={() => setSelectedStory(null)}
                className="rounded-full p-1 text-neutral-400 transition hover:text-black dark:hover:text-white"
              >
                ✕
              </button>
            </div>

            {selectedStory.imageUrl && (
              <img
                src={selectedStory.imageUrl}
                alt={selectedStory.headline}
                className="mt-4 max-h-60 w-full rounded-2xl object-cover"
              />
            )}

            <h2 className="mt-4 text-xl font-black text-neutral-900 leading-snug dark:text-white">
              {selectedStory.headline}
            </h2>

            <p className="mt-3 text-sm text-neutral-700 leading-relaxed dark:text-neutral-300">
              {selectedStory.summary}
            </p>

            <div className="mt-4 flex items-center justify-between border-t border-neutral-100 pt-3 text-xs text-neutral-400 dark:border-neutral-800">
              <span>
                Source: {selectedStory.source} ({selectedStory.timeAgo})
              </span>
              <span className="font-bold text-neutral-900 dark:text-white">
                {selectedStory.posts} posts
              </span>
            </div>

            <div className="mt-5 flex gap-2">
              <button
                onClick={() => {
                  router.push(
                    `/search?q=${encodeURIComponent(selectedStory.tag)}`,
                  );
                  setSelectedStory(null);
                }}
                className="flex-1 rounded-full bg-black py-3 text-xs font-bold text-white transition hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
              >
                Search related posts on {selectedStory.tag}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
