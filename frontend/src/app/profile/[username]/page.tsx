"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "../../../context/AuthContext";
import Comments from "../../../components/Comments";
import EditProfileModal from "../../../components/EditProfileModal";
import CreatePost from "../../../components/CreatePost";
import PollCard, { PollItem } from "../../../components/PollCard";
import FollowListModal from "../../../components/FollowListModal";
import FeedVideoPlayer from "../../../components/FeedVideoPlayer";
import { formatPostTime, formatFullDateTime } from "../../../lib/dateUtils";

interface UserProfile {
  id: string;
  name: string;
  username: string;
  bio?: string | null;
  avatarUrl?: string | null;
  createdAt: string;
}

interface PostLike {
  userId: string;
}

interface PostBookmark {
  userId: string;
}

interface Post {
  id: string;
  content: string;
  imageUrl?: string | null;
  isReel?: boolean;
  createdAt: string;
  author: {
    id: string;
    name: string;
    username: string;
    avatarUrl?: string | null;
  };
  likes?: PostLike[];
  bookmarks?: PostBookmark[];
  poll?: PollItem | null;
  _count?: {
    likes: number;
    comments: number;
  };
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const isVideoMedia = (url?: string | null, isReel?: boolean) => {
  if (!url) return false;
  if (isReel) return true;
  return (
    url.endsWith(".mp4") ||
    url.endsWith(".webm") ||
    url.endsWith(".mov") ||
    url.endsWith(".mkv") ||
    url.includes("/video/upload/") ||
    url.includes(".mp4?")
  );
};

export default function ProfilePage() {
  const params = useParams();
  const router = useRouter();
  const username = params.username as string;

  const { user: currentUser } = useAuth();

  const [user, setUser] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [followersList, setFollowersList] = useState<any[]>([]);
  const [followingList, setFollowingList] = useState<any[]>([]);
  const [followModalTitle, setFollowModalTitle] = useState<
    "Followers" | "Following" | null
  >(null);
  const [loadingModalList, setLoadingModalList] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);
  const [openMenuPostId, setOpenMenuPostId] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const handleFollow = async () => {
    if (!user) return;
    const token =
      localStorage.getItem("token") || localStorage.getItem("accessToken");
    if (!token) return alert("Please login first");

    setFollowLoading(true);
    try {
      const res = await fetch(`${API_URL}/users/${user.id}/follow`, {
        method: isFollowing ? "DELETE" : "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Follow action failed");

      setIsFollowing((prev) => !prev);
      setFollowersCount((prev) => (isFollowing ? prev - 1 : prev + 1));
    } catch (err) {
      console.error(err);
    } finally {
      setFollowLoading(false);
    }
  };

  const openFollowModal = async (type: "Followers" | "Following") => {
    if (!user) return;
    setFollowModalTitle(type);
    setLoadingModalList(true);

    try {
      const endpoint =
        type === "Followers"
          ? `${API_URL}/users/${user.id}/followers`
          : `${API_URL}/users/${user.id}/following`;

      const res = await fetch(endpoint);
      if (res.ok) {
        const data = await res.json();
        if (type === "Followers") setFollowersList(data);
        else setFollowingList(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingModalList(false);
    }
  };

  const handleStartChat = () => {
    if (!currentUser) return alert("Please login first");
    if (!user) return;
    router.push(`/chat?userId=${user.id}`);
  };

  const handleDeletePost = async (postId: string) => {
    if (!window.confirm("Are you sure you want to delete this post?")) return;
    const token =
      localStorage.getItem("token") || localStorage.getItem("accessToken");
    if (!token) return;

    try {
      const res = await fetch(`${API_URL}/posts/${postId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        setPosts((prev) => prev.filter((p) => p.id !== postId));
      }
    } catch (err) {
      console.error("Delete error:", err);
    } finally {
      setOpenMenuPostId(null);
    }
  };

  const handleToggleLike = async (postId: string, isLiked: boolean) => {
    const token =
      localStorage.getItem("token") || localStorage.getItem("accessToken");
    if (!token || !currentUser) return alert("Please login first");

    setPosts((prevPosts) =>
      prevPosts.map((post) => {
        if (post.id === postId) {
          const currentCount = post._count?.likes ?? 0;
          const currentList = post.likes ?? [];
          return {
            ...post,
            likes: isLiked
              ? currentList.filter((l) => l.userId !== currentUser.id)
              : [...currentList, { userId: currentUser.id }],
            _count: {
              ...post._count,
              likes: isLiked ? Math.max(0, currentCount - 1) : currentCount + 1,
              comments: post._count?.comments ?? 0,
            },
          };
        }
        return post;
      }),
    );

    try {
      await fetch(`${API_URL}/posts/${postId}/like`, {
        method: isLiked ? "DELETE" : "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const userRes = await fetch(`${API_URL}/users/${username}`);
        if (!userRes.ok) throw new Error("User not found");
        const userData: UserProfile = await userRes.json();
        setUser(userData);

        const postsRes = await fetch(`${API_URL}/posts/user/${userData.id}`);
        if (postsRes.ok) {
          const postsData: Post[] = await postsRes.json();
          setPosts(postsData);
        }

        const followersRes = await fetch(
          `${API_URL}/users/${userData.id}/followers`,
        );
        if (followersRes.ok) {
          const followersListData: { id: string }[] = await followersRes.json();
          setFollowersCount(followersListData.length);
          if (currentUser?.id) {
            setIsFollowing(
              followersListData.some((f) => f.id === currentUser.id),
            );
          }
        }

        const followingRes = await fetch(
          `${API_URL}/users/${userData.id}/following`,
        );
        if (followingRes.ok) {
          const followingData = await followingRes.json();
          setFollowingCount(followingData.length);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (username) fetchProfile();
  }, [username, currentUser?.id]);

  if (loading) {
    return (
      <main className="p-4 sm:p-6 text-neutral-400">Loading profile...</main>
    );
  }

  if (!user) {
    return <main className="p-4 sm:p-6 text-neutral-400">User not found</main>;
  }

  const isOwnProfile = currentUser && currentUser.id === user.id;

  return (
    <main className="w-full min-h-screen bg-white text-neutral-900 dark:bg-black dark:text-white">
   
      <div className="border-b border-neutral-200 bg-white p-4 sm:p-6 dark:border-neutral-800 dark:bg-black">
        <div className="flex items-start gap-4">
          <div className="flex h-16 w-16 sm:h-20 sm:w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-neutral-200 text-xl font-bold dark:bg-neutral-800">
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="h-full w-full object-cover"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = "none";
                }}
              />
            ) : (
              user.name.charAt(0).toUpperCase()
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h1 className="text-xl font-extrabold leading-tight">
                  {user.name}
                </h1>
                <p className="text-xs text-neutral-500">@{user.username}</p>
              </div>

              {isOwnProfile && (
                <button
                  onClick={() => setIsEditModalOpen(true)}
                  className="rounded-full border border-neutral-300 px-4 py-1.5 text-xs font-bold text-neutral-800 transition hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
                >
                  Edit Profile
                </button>
              )}

              {currentUser && !isOwnProfile && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleStartChat}
                    title="Send Message"
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-neutral-300 text-neutral-800 transition hover:bg-neutral-100 dark:border-neutral-700 dark:text-white dark:hover:bg-neutral-800"
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
                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                      />
                    </svg>
                  </button>

                  <button
                    onClick={handleFollow}
                    disabled={followLoading}
                    className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${
                      isFollowing
                        ? "border border-neutral-300 text-neutral-900 hover:border-red-500 hover:text-red-500 dark:border-neutral-700 dark:text-white"
                        : "bg-black text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
                    }`}
                  >
                    {followLoading
                      ? "..."
                      : isFollowing
                        ? "Following"
                        : "Follow"}
                  </button>
                </div>
              )}
            </div>

            {user.bio && (
              <p className="mt-3 text-xs sm:text-sm text-neutral-800 dark:text-neutral-200">
                {user.bio}
              </p>
            )}

            <div className="mt-4 flex gap-5 text-xs text-neutral-500 dark:text-neutral-400">
              <button
                onClick={() => openFollowModal("Following")}
                className="hover:underline transition"
              >
                <strong className="text-neutral-900 dark:text-white">
                  {followingCount}
                </strong>{" "}
                Following
              </button>

              <button
                onClick={() => openFollowModal("Followers")}
                className="hover:underline transition"
              >
                <strong className="text-neutral-900 dark:text-white">
                  {followersCount}
                </strong>{" "}
                Followers
              </button>
            </div>
          </div>
        </div>
      </div>

      {isOwnProfile && (
        <CreatePost
          onPostCreated={(newPost) => {
            if (newPost) {
              const completePost: Post = {
                ...newPost,
                createdAt: newPost.createdAt || new Date().toISOString(),
                author: newPost.author || {
                  id: currentUser.id,
                  name: currentUser.name,
                  username: currentUser.username,
                  avatarUrl: currentUser.avatarUrl,
                },
              };
              setPosts((prev) => [completePost, ...prev]);
            }
          }}
        />
      )}

   
      <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
        {posts.length === 0 ? (
          <p className="p-8 text-center text-xs text-neutral-400">
            No posts yet.
          </p>
        ) : (
          posts.map((post) => {
            const isLiked = Boolean(
              currentUser &&
              post.likes?.some((l) => l.userId === currentUser.id),
            );
            const isVideo = isVideoMedia(post.imageUrl, post.isReel);
            const isOwner = isOwnProfile;

            return (
              <article
                key={post.id}
                className="p-4 transition hover:bg-neutral-50/50 dark:hover:bg-neutral-950"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="text-xs font-bold">
                      {post.author?.name || user.name}
                    </span>
                    <span className="text-xs text-neutral-500">
                      @{post.author?.username || user.username}
                    </span>
                    <span className="text-xs text-neutral-400">·</span>
                    <time
                      dateTime={post.createdAt}
                      title={formatFullDateTime(post.createdAt)}
                      className="text-xs text-neutral-500 hover:underline"
                    >
                      {formatPostTime(post.createdAt)}
                    </time>
                  </div>

                  {isOwner && (
                    <div className="relative">
                      <button
                        onClick={() =>
                          setOpenMenuPostId(
                            openMenuPostId === post.id ? null : post.id,
                          )
                        }
                        className="rounded-full p-1 text-neutral-400 hover:bg-neutral-100 hover:text-black dark:hover:bg-neutral-900 dark:hover:text-white"
                      >
                        <svg
                          className="h-4 w-4"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <circle cx="5" cy="12" r="2" />
                          <circle cx="12" cy="12" r="2" />
                          <circle cx="19" cy="12" r="2" />
                        </svg>
                      </button>

                      {openMenuPostId === post.id && (
                        <div className="absolute right-0 top-full z-20 mt-1 w-32 rounded-2xl border border-neutral-200 bg-white p-1 shadow-2xl backdrop-blur-xl dark:border-neutral-800 dark:bg-neutral-950">
                          <button
                            onClick={() => handleDeletePost(post.id)}
                            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
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
                            <span>Delete</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {post.content && (
                  <p className="mt-2 text-xs sm:text-sm text-neutral-800 dark:text-neutral-200 leading-relaxed whitespace-pre-wrap">
                    {post.content}
                  </p>
                )}

               
                {post.imageUrl && (
                  <div className="mt-3">
                    {isVideo ? (
                      <FeedVideoPlayer src={post.imageUrl} />
                    ) : (
                      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-black dark:border-neutral-800">
                        <img
                          src={post.imageUrl}
                          alt="Attached media"
                          className="max-h-96 w-full object-cover"
                        />
                      </div>
                    )}
                  </div>
                )}

                {post.poll && (
                  <div className="mt-3">
                    <PollCard
                      poll={post.poll}
                      postId={post.id}
                      onVoted={(updated) => {
                        setPosts((prev) =>
                          prev.map((p) => (p.id === updated.id ? updated : p)),
                        );
                      }}
                    />
                  </div>
                )}

                <div className="mt-4 flex items-center gap-6 text-xs text-neutral-500">
                  <button
                    onClick={() => handleToggleLike(post.id, Boolean(isLiked))}
                    className={`flex items-center gap-1.5 font-medium transition ${
                      isLiked
                        ? "text-red-500 font-semibold"
                        : "hover:text-red-500"
                    }`}
                  >
                    <svg
                      className={`h-4 w-4 ${isLiked ? "fill-current" : ""}`}
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
                    <span>{post._count?.likes ?? 0}</span>
                  </button>

                  <button
                    onClick={() =>
                      setExpandedPostId((prev) =>
                        prev === post.id ? null : post.id,
                      )
                    }
                    className="flex items-center gap-1.5 hover:text-blue-500 transition"
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
                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                      />
                    </svg>
                    <span>{post._count?.comments ?? 0}</span>
                  </button>
                </div>

                {expandedPostId === post.id && (
                  <div className="mt-3">
                    <Comments
                      postId={post.id}
                      onCommentCreated={() => {
                        setPosts((prev) =>
                          prev.map((p) =>
                            p.id === post.id
                              ? {
                                  ...p,
                                  _count: {
                                    likes: p._count?.likes ?? 0,
                                    comments: (p._count?.comments ?? 0) + 1,
                                  },
                                }
                              : p,
                          ),
                        );
                      }}
                    />
                  </div>
                )}
              </article>
            );
          })
        )}
      </div>

      {isOwnProfile && (
        <EditProfileModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          initialData={{
            name: user.name,
            bio: user.bio,
            avatarUrl: user.avatarUrl,
          }}
          onProfileUpdated={(updated) =>
            setUser((prev) => (prev ? { ...prev, ...updated } : null))
          }
        />
      )}

      {followModalTitle && (
        <FollowListModal
          isOpen={Boolean(followModalTitle)}
          title={followModalTitle}
          users={
            followModalTitle === "Followers" ? followersList : followingList
          }
          loading={loadingModalList}
          onClose={() => setFollowModalTitle(null)}
        />
      )}
    </main>
  );
}
