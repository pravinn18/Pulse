"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import ComposePostModal from "./ComposePostModal";
import NotificationBell from "./NotificationBell";

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [imgError, setImgError] = useState(false);

  const accountMenuRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setImgError(false);
  }, [user?.avatarUrl]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        accountMenuRef.current &&
        !accountMenuRef.current.contains(e.target as Node)
      ) {
        setShowAccountMenu(false);
      }
      if (
        moreMenuRef.current &&
        !moreMenuRef.current.contains(e.target as Node)
      ) {
        setShowMoreMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setIsMobileDrawerOpen(false);
  }, [pathname]);

  if (pathname === "/login" || pathname === "/register") {
    return null;
  }

  const handleProtectedClick = (e: React.MouseEvent, href: string) => {
    if (!user) {
      e.preventDefault();
      router.push("/login");
      return;
    }
    router.push(href);
  };

  const navItems = [
    {
      name: "Home",
      href: "/",
      isProtected: false,
      icon: (
        <svg className="h-7 w-7" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 1.696L.622 8.807l1.06 1.696L3 9.679V20a2 2 0 0 0 2 2h5v-6a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v6h5a2 2 0 0 0 2-2V9.679l1.318.824 1.06-1.696L12 1.696z" />
        </svg>
      ),
    },
    {
      name: "Explore",
      href: "/search",
      isProtected: false,
      icon: (
        <svg
          className="h-7 w-7"
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
      ),
    },
    {
      name: "Notifications",
      href: "/notifications",
      isProtected: true,
      custom: user ? (
        <NotificationBell />
      ) : (
        <svg
          className="h-7 w-7"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
      ),
    },
    {
      name: "Chat",
      href: "/chat",
      isProtected: true,
      icon: (
        <svg
          className="h-7 w-7"
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
      ),
    },
    {
      name: "History & Saved",
      href: "/saved",
      isProtected: true,
      icon: (
        <svg
          className="h-7 w-7"
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
      ),
    },
    {
      name: "Profile",
      href: user ? `/profile/${user.username}` : "/login",
      isProtected: true,
      icon: (
        <svg
          className="h-7 w-7"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          />
        </svg>
      ),
    },
  ];

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-40 flex h-14 w-full items-center justify-between border-b border-neutral-200 bg-white/95 px-4 backdrop-blur-md sm:hidden dark:border-neutral-800 dark:bg-black/95">
        {user ? (
          <button
            onClick={() => setIsMobileDrawerOpen(true)}
            className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-neutral-200 bg-neutral-200 text-xs font-bold text-neutral-900 transition active:scale-95 dark:border-neutral-800 dark:bg-neutral-800 dark:text-neutral-100"
          >
            {user.avatarUrl && !imgError ? (
              <img
                src={user.avatarUrl}
                alt={user.name}
                onError={() => setImgError(true)}
                className="h-full w-full object-cover"
              />
            ) : (
              (user.name?.charAt(0) || "U").toUpperCase()
            )}
          </button>
        ) : (
          <Link
            href="/login"
            className="rounded-full bg-black px-3.5 py-1.5 text-xs font-bold text-white transition active:scale-95 dark:bg-white dark:text-black"
          >
            Log in
          </Link>
        )}

        <Link
          href="/"
          className="flex items-center justify-center transition active:scale-95"
        >
          <img
            src="/PULSE.png"
            alt="Pulse Logo"
            className="h-7 w-auto object-contain dark:invert"
            onError={(e) => {
              (e.target as HTMLElement).style.display = "none";
              const parent = (e.target as HTMLElement).parentElement;
              if (parent && !parent.querySelector(".fallback-text")) {
                const span = document.createElement("span");
                span.className =
                  "fallback-text text-xl font-black tracking-tighter text-black dark:text-white";
                span.innerText = "P";
                parent.appendChild(span);
              }
            }}
          />
        </Link>

        <button
          onClick={toggleTheme}
          aria-label="Toggle theme"
          className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-700 transition hover:bg-neutral-100 active:scale-90 dark:text-neutral-300 dark:hover:bg-neutral-900"
        >
          {isDark ? (
            <svg
              className="h-5 w-5 text-neutral-300"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
          ) : (
            <svg
              className="h-5 w-5 text-neutral-700"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
              />
            </svg>
          )}
        </button>
      </header>

      {user && isMobileDrawerOpen && (
        <div className="fixed inset-0 z-50 flex sm:hidden">
          <div
            onClick={() => setIsMobileDrawerOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />

          <div className="relative z-10 flex h-full w-[290px] flex-col justify-between bg-white p-5 shadow-2xl dark:bg-neutral-950">
            <div>
              <div className="flex items-center justify-between">
                <Link
                  href={`/profile/${user.username}`}
                  onClick={() => setIsMobileDrawerOpen(false)}
                  className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-neutral-200 text-base font-bold text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100"
                >
                  {user.avatarUrl && !imgError ? (
                    <img
                      src={user.avatarUrl}
                      alt={user.name}
                      onError={() => setImgError(true)}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    (user.name?.charAt(0) || "U").toUpperCase()
                  )}
                </Link>

                <button
                  onClick={() => setIsMobileDrawerOpen(false)}
                  className="rounded-full p-1 text-neutral-400 hover:text-black dark:hover:text-white"
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
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <div className="mt-3">
                <Link
                  href={`/profile/${user.username}`}
                  onClick={() => setIsMobileDrawerOpen(false)}
                  className="text-base font-extrabold text-neutral-900 hover:underline dark:text-white"
                >
                  {user.name}
                </Link>
                <p className="text-xs text-neutral-500">@{user.username}</p>
              </div>

              <div className="my-4 border-t border-neutral-100 dark:border-neutral-800" />

              <nav className="space-y-4 font-semibold text-neutral-900 dark:text-neutral-100">
                <Link
                  href={`/profile/${user.username}`}
                  onClick={() => setIsMobileDrawerOpen(false)}
                  className="flex items-center gap-4 text-base"
                >
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                  <span>Profile</span>
                </Link>

                <Link
                  href="/saved"
                  onClick={() => setIsMobileDrawerOpen(false)}
                  className="flex items-center gap-4 text-base"
                >
                  <svg
                    className="h-6 w-6"
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
                  <span>History & Saved</span>
                </Link>
              </nav>
            </div>

            <div className="border-t border-neutral-100 pt-3 dark:border-neutral-800">
              <Link
                href="/settings"
                onClick={() => setIsMobileDrawerOpen(false)}
                className="flex items-center gap-3 py-2 text-sm font-medium text-neutral-700 hover:text-black dark:text-neutral-300 dark:hover:text-white"
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
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <span>Settings and privacy</span>
              </Link>

              <button
                onClick={logout}
                className="mt-2 flex w-full items-center gap-3 py-2 text-sm font-bold text-red-600 dark:text-red-400"
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
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
                <span>Log out @{user.username}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <aside className="sticky top-0 z-30 hidden h-screen flex-col justify-between border-r border-neutral-200 bg-white px-2 py-4 transition-colors duration-150 sm:flex sm:w-20 xl:w-64 2xl:w-72 dark:border-neutral-800 dark:bg-black">
        <div className="flex flex-col items-center xl:items-start">
          <Link
            href="/"
            className="flex h-12 items-center justify-center rounded-full p-2 text-black transition hover:bg-neutral-100 xl:px-3 dark:text-white dark:hover:bg-neutral-900"
          >
            <img
              src="/PULSE.png"
              alt="Pulse Logo"
              className="h-8 w-auto max-w-[140px] object-contain dark:invert"
            />
          </Link>

          <nav className="mt-3 w-full space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;

              return (
                <button
                  key={item.name}
                  onClick={(e) => {
                    if (item.isProtected && !user) {
                      handleProtectedClick(e, item.href);
                    } else {
                      router.push(item.href);
                    }
                  }}
                  className={`flex w-full items-center justify-center rounded-full p-3 transition xl:justify-start xl:px-4 ${
                    isActive
                      ? "font-extrabold text-neutral-950 dark:text-white"
                      : "text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-900"
                  }`}
                >
                  <div className="shrink-0">{item.custom || item.icon}</div>
                  <span
                    className={`ml-4 hidden text-lg tracking-wide xl:inline ${
                      isActive
                        ? "font-bold text-black dark:text-white"
                        : "font-medium text-neutral-800 dark:text-neutral-200"
                    }`}
                  >
                    {item.name}
                  </span>
                </button>
              );
            })}

            <div className="relative w-full" ref={moreMenuRef}>
              <button
                onClick={() => setShowMoreMenu(!showMoreMenu)}
                className="flex w-full items-center justify-center rounded-full p-3 text-neutral-700 transition hover:bg-neutral-100 xl:justify-start xl:px-4 dark:text-neutral-200 dark:hover:bg-neutral-900"
              >
                <svg
                  className="h-7 w-7"
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
                <span className="ml-4 hidden text-lg font-medium text-neutral-800 xl:inline dark:text-neutral-200">
                  More
                </span>
              </button>

              {showMoreMenu && (
                <div className="absolute bottom-full left-0 mb-2 w-64 rounded-2xl border border-neutral-200 bg-white p-2 shadow-2xl dark:border-neutral-800 dark:bg-neutral-900">
                  {user && (
                    <Link
                      href="/settings"
                      onClick={() => setShowMoreMenu(false)}
                      className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800"
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
                          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                      <span>Settings & Privacy</span>
                    </Link>
                  )}

                  {user && (
                    <div className="my-1 border-t border-neutral-100 dark:border-neutral-800" />
                  )}

                  <button
                    onClick={() => {
                      toggleTheme();
                      setShowMoreMenu(false);
                    }}
                    className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800"
                  >
                    {isDark ? (
                      <svg
                        className="h-5 w-5 text-amber-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="h-5 w-5 text-neutral-700"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                        />
                      </svg>
                    )}
                    <span>
                      {isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
                    </span>
                  </button>
                </div>
              )}
            </div>
          </nav>
          <button
            onClick={() => {
              if (!user) {
                router.push("/login");
              } else {
                setIsComposeOpen(true);
              }
            }}
            className="mt-6 flex h-12 w-12 items-center justify-center rounded-full bg-black font-bold text-white shadow-md transition hover:bg-neutral-800 active:scale-95 xl:h-12 xl:w-full dark:bg-white dark:text-black dark:hover:bg-neutral-200"
          >
            <span className="hidden text-base font-extrabold tracking-wide xl:inline">
              Post
            </span>
            <svg
              className="h-6 w-6 xl:hidden"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4v16m8-8H4"
              />
            </svg>
          </button>
        </div>

        {user ? (
          <div className="relative w-full" ref={accountMenuRef}>
            {showAccountMenu && (
              <div className="absolute bottom-full left-0 mb-3 w-72 rounded-2xl border border-neutral-200 bg-white p-2 shadow-2xl dark:border-neutral-800 dark:bg-neutral-900">
                <div className="flex items-center gap-3 border-b border-neutral-100 p-3 dark:border-neutral-800">
                  <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-neutral-200 bg-neutral-200 font-bold dark:border-neutral-700 dark:bg-neutral-800">
                    {user.avatarUrl && !imgError ? (
                      <img
                        src={user.avatarUrl}
                        alt={user.name}
                        onError={() => setImgError(true)}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      (user.name?.charAt(0) || "U").toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-neutral-900 dark:text-white">
                      {user.name}
                    </p>
                    <p className="truncate text-[11px] text-neutral-400">
                      @{user.username}
                    </p>
                  </div>
                  <span className="text-black font-bold text-xs dark:text-white">
                    ✓
                  </span>
                </div>

                <button
                  onClick={() => {
                    setShowAccountMenu(false);
                    logout();
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-xs font-bold text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
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
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                    />
                  </svg>
                  <span>Log out @{user.username}</span>
                </button>
              </div>
            )}

            <button
              onClick={() => setShowAccountMenu(!showAccountMenu)}
              className="flex w-full items-center justify-center rounded-full p-2 text-left transition hover:bg-neutral-100 xl:justify-between xl:p-3 dark:hover:bg-neutral-900"
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-neutral-200 bg-neutral-200 font-bold text-neutral-800 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100">
                  {user.avatarUrl && !imgError ? (
                    <img
                      src={user.avatarUrl}
                      alt={user.name}
                      onError={() => setImgError(true)}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    (user.name?.charAt(0) || "U").toUpperCase()
                  )}
                </div>
                <div className="hidden min-w-0 xl:block">
                  <p className="truncate text-sm font-bold text-neutral-900 dark:text-white">
                    {user.name}
                  </p>
                  <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">
                    @{user.username}
                  </p>
                </div>
              </div>
              <span className="hidden text-neutral-400 xl:inline">•••</span>
            </button>
          </div>
        ) : (
          <div className="w-full">
            <Link
              href="/login"
              className="flex w-full items-center justify-center rounded-full bg-black py-3 text-sm font-bold text-white transition hover:bg-neutral-800 active:scale-95 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
            >
              <span className="hidden xl:inline">Log in</span>
              <svg
                className="h-5 w-5 xl:hidden"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                />
              </svg>
            </Link>
          </div>
        )}
      </aside>

      <div className="sm:hidden">
        <nav className="fixed bottom-0 left-0 right-0 z-40 flex h-14 items-center justify-around border-t border-neutral-200 bg-white/95 backdrop-blur-md dark:border-neutral-800 dark:bg-black/95">
          <Link
            href="/"
            className={`p-2 transition ${
              pathname === "/"
                ? "text-black dark:text-white"
                : "text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
            }`}
          >
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 1.696L.622 8.807l1.06 1.696L3 9.679V20a2 2 0 0 0 2 2h5v-6a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v6h5a2 2 0 0 0 2-2V9.679l1.318.824 1.06-1.696L12 1.696z" />
            </svg>
          </Link>

          <Link
            href="/search"
            className={`p-2 transition ${
              pathname === "/search"
                ? "text-black dark:text-white"
                : "text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
            }`}
          >
            <svg
              className="h-6 w-6"
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
          </Link>

          <button
            onClick={() => {
              if (!user) {
                router.push("/login");
              } else {
                setIsComposeOpen(true);
              }
            }}
            aria-label="New Post"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-black text-white shadow-md active:scale-90 dark:bg-white dark:text-black"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4v16m8-8H4"
              />
            </svg>
          </button>

          <button
            onClick={(e) => handleProtectedClick(e, "/notifications")}
            className={`p-2 transition ${
              pathname === "/notifications"
                ? "text-black dark:text-white"
                : "text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
            }`}
          >
            {user ? (
              <NotificationBell />
            ) : (
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
            )}
          </button>

          <button
            onClick={(e) => handleProtectedClick(e, "/chat")}
            className={`p-2 transition ${
              pathname === "/chat"
                ? "text-black dark:text-white"
                : "text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
            }`}
          >
            <svg
              className="h-6 w-6"
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
          </button>
        </nav>
      </div>

      {user && (
        <ComposePostModal
          isOpen={isComposeOpen}
          onClose={() => setIsComposeOpen(false)}
        />
      )}
    </>
  );
}
