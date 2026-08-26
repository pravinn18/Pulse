"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";

type SettingsSection =
  | "account"
  | "privacy"
  | "notifications"
  | "appearance"
  | "security";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function SettingsPage() {
  const router = useRouter();
  const { user, logout, setUser } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  const [activeSection, setActiveSection] =
    useState<SettingsSection>("account");
  const [mobileViewingSection, setMobileViewingSection] = useState(false);

  const [name, setName] = useState(user?.name || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [accountMsg, setAccountMsg] = useState("");

  const [currentPass, setCurrentPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [passMsg, setPassMsg] = useState("");

  const [isPrivate, setIsPrivate] = useState(user?.isPrivate ?? false);
  const [allowDMs, setAllowDMs] = useState(user?.allowDMsFromAnyone ?? true);

  const [notifyLikes, setNotifyLikes] = useState(user?.notifyLikes ?? true);
  const [notifyComments, setNotifyComments] = useState(
    user?.notifyComments ?? true,
  );
  const [notifyFollows, setNotifyFollows] = useState(
    user?.notifyFollows ?? true,
  );

  const [saving, setSaving] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const token =
      localStorage.getItem("token") || localStorage.getItem("accessToken");
    if (!token) return;

    try {
      setSaving(true);
      const res = await fetch(`${API_URL}/users/profile`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, bio }),
      });

      if (res.ok) {
        const updated = await res.json();
        setUser((prev: any) => ({
          ...prev,
          name: updated.name,
          bio: updated.bio,
        }));
        setAccountMsg("Profile updated successfully!");
        setTimeout(() => setAccountMsg(""), 3000);
      }
    } catch {
      setAccountMsg("Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const token =
      localStorage.getItem("token") || localStorage.getItem("accessToken");
    if (!token) return;

    try {
      setSaving(true);
      const res = await fetch(`${API_URL}/users/settings/password`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ currentPass, newPass }),
      });

      const data = await res.json();
      if (res.ok) {
        setPassMsg("Password changed successfully!");
        setCurrentPass("");
        setNewPass("");
      } else {
        setPassMsg(data.message || "Failed to update password");
      }
      setTimeout(() => setPassMsg(""), 3000);
    } catch {
      setPassMsg("Error updating password.");
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePrivacy = async (key: string, value: boolean) => {
    const token =
      localStorage.getItem("token") || localStorage.getItem("accessToken");
    if (!token) return;

    try {
      await fetch(`${API_URL}/users/settings/privacy`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ [key]: value }),
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteAccount = async () => {
    const token =
      localStorage.getItem("token") || localStorage.getItem("accessToken");
    if (!token) return;

    try {
      const res = await fetch(`${API_URL}/users/settings/account`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        logout();
        router.push("/login");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const navItems = [
    {
      id: "account",
      label: "Your Account",
      icon: "👤",
      desc: "Update your profile info, username, and bio",
    },
    {
      id: "security",
      label: "Security & Password",
      icon: "🔒",
      desc: "Change password and manage account security",
    },
    {
      id: "privacy",
      label: "Privacy & Safety",
      icon: "🛡️",
      desc: "Control who sees your posts and sends DMs",
    },
    {
      id: "notifications",
      label: "Notifications",
      icon: "🔔",
      desc: "Select which notification alerts you receive",
    },
    {
      id: "appearance",
      label: "Display & Appearance",
      icon: "🎨",
      desc: "Customize dark/light theme styling",
    },
  ];

  return (
    <div className="min-h-screen w-full bg-white text-neutral-900 transition-colors duration-150 dark:bg-black dark:text-neutral-100">
     
      <div className="sticky top-14 z-20 flex h-14 items-center border-b border-neutral-200 bg-white/90 px-4 backdrop-blur-md sm:top-0 dark:border-neutral-800 dark:bg-black/90">
        {mobileViewingSection && (
          <button
            onClick={() => setMobileViewingSection(false)}
            className="mr-3 rounded-full p-1 text-neutral-600 hover:bg-neutral-100 md:hidden dark:text-neutral-400 dark:hover:bg-neutral-800"
          >
            ←
          </button>
        )}
        <div>
          <h1 className="text-lg font-black tracking-tight">
            Settings & Privacy
          </h1>
          <p className="text-xs text-neutral-500">@{user?.username}</p>
        </div>
      </div>

     
      <div className="flex w-full">
      
        <div
          className={`w-full border-r border-neutral-200 md:block md:w-80 dark:border-neutral-800 ${
            mobileViewingSection ? "hidden md:block" : "block"
          }`}
        >
          <div className="divide-y divide-neutral-100 dark:divide-neutral-900">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveSection(item.id as SettingsSection);
                  setMobileViewingSection(true);
                }}
                className={`flex w-full items-center justify-between p-4 text-left transition hover:bg-neutral-50 dark:hover:bg-neutral-900/50 ${
                  activeSection === item.id
                    ? "bg-neutral-100 font-bold dark:bg-neutral-900"
                    : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">{item.icon}</span>
                  <div>
                    <p className="text-sm font-semibold">{item.label}</p>
                    <p className="line-clamp-1 text-xs text-neutral-500">
                      {item.desc}
                    </p>
                  </div>
                </div>
                <span className="text-xs text-neutral-400">›</span>
              </button>
            ))}

            <button
              onClick={logout}
              className="flex w-full items-center gap-3 p-4 font-bold text-sm text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/20"
            >
              <span>🚪</span>
              <span>Log out @{user?.username}</span>
            </button>
          </div>
        </div>

        <div
          className={`min-h-[calc(100vh-3.5rem)] flex-1 p-4 sm:p-6 md:block ${
            mobileViewingSection ? "block" : "hidden md:block"
          }`}
        >
          {activeSection === "account" && (
            <div className="max-w-xl space-y-6">
              <div>
                <h2 className="text-lg font-extrabold">Account Information</h2>
                <p className="text-xs text-neutral-500">
                  Update your public profile details and personal credentials.
                </p>
              </div>

              {accountMsg && (
                <div className="rounded-xl bg-blue-500/10 p-3 text-xs font-semibold text-blue-500">
                  {accountMsg}
                </div>
              )}

              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-600 dark:text-neutral-400">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-neutral-300 bg-transparent p-2.5 text-sm focus:border-black focus:outline-none dark:border-neutral-700 dark:focus:border-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-600 dark:text-neutral-400">
                    Username
                  </label>
                  <input
                    type="text"
                    disabled
                    value={`@${user?.username}`}
                    className="mt-1 w-full cursor-not-allowed rounded-xl border border-neutral-200 bg-neutral-100 p-2.5 text-sm text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900"
                  />
                  <p className="mt-1 text-[11px] text-neutral-400">
                    Usernames are unique across Pulse and cannot be changed
                    here.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-600 dark:text-neutral-400">
                    Bio / Headline
                  </label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={3}
                    className="mt-1 w-full rounded-xl border border-neutral-300 bg-transparent p-2.5 text-sm focus:border-black focus:outline-none dark:border-neutral-700 dark:focus:border-white"
                  />
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-full bg-black px-6 py-2 text-xs font-bold text-white transition hover:bg-neutral-800 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </form>
            </div>
          )}

          {activeSection === "security" && (
            <div className="max-w-xl space-y-6">
              <div>
                <h2 className="text-lg font-extrabold">
                  Security & Credentials
                </h2>
                <p className="text-xs text-neutral-500">
                  Manage your authorization credentials and account protection.
                </p>
              </div>

              {passMsg && (
                <div className="rounded-xl bg-blue-500/10 p-3 text-xs font-semibold text-blue-500">
                  {passMsg}
                </div>
              )}

              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-600 dark:text-neutral-400">
                    Current Password
                  </label>
                  <input
                    type="password"
                    required
                    value={currentPass}
                    onChange={(e) => setCurrentPass(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-neutral-300 bg-transparent p-2.5 text-sm focus:border-black focus:outline-none dark:border-neutral-700 dark:focus:border-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-600 dark:text-neutral-400">
                    New Password
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={newPass}
                    onChange={(e) => setNewPass(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-neutral-300 bg-transparent p-2.5 text-sm focus:border-black focus:outline-none dark:border-neutral-700 dark:focus:border-white"
                  />
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-full bg-black px-6 py-2 text-xs font-bold text-white transition hover:bg-neutral-800 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
                >
                  {saving ? "Updating..." : "Update Password"}
                </button>
              </form>

              <div className="mt-10 rounded-2xl border border-red-200 p-4 dark:border-red-950/60 dark:bg-red-950/10">
                <h3 className="font-bold text-sm text-red-600 dark:text-red-400">
                  Danger Zone
                </h3>
                <p className="mt-1 text-xs text-neutral-500">
                  Permanently delete your account, stories, posts, and personal
                  messages.
                </p>
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(true)}
                  className="mt-3 rounded-full bg-red-600 px-4 py-2 font-bold text-xs text-white transition hover:bg-red-700 active:scale-95"
                >
                  Delete Account
                </button>
              </div>
            </div>
          )}

          {activeSection === "privacy" && (
            <div className="max-w-xl space-y-6">
              <div>
                <h2 className="text-lg font-extrabold">Privacy & Audience</h2>
                <p className="text-xs text-neutral-500">
                  Control who interacts with your timeline and direct messages.
                </p>
              </div>

              <div className="space-y-4 divide-y divide-neutral-100 dark:divide-neutral-900">
                <div className="flex items-center justify-between pt-3">
                  <div>
                    <p className="font-bold text-sm">Private Account</p>
                    <p className="text-xs text-neutral-500">
                      When enabled, only people you approve can see your posts
                      and stories.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={isPrivate}
                    onChange={(e) => {
                      setIsPrivate(e.target.checked);
                      handleTogglePrivacy("isPrivate", e.target.checked);
                    }}
                    className="h-5 w-5 rounded accent-blue-500"
                  />
                </div>

                <div className="flex items-center justify-between pt-4">
                  <div>
                    <p className="font-bold text-sm">
                      Allow Direct Messages from Anyone
                    </p>
                    <p className="text-xs text-neutral-500">
                      Receive message requests from users you don&apos;t follow.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={allowDMs}
                    onChange={(e) => {
                      setAllowDMs(e.target.checked);
                      handleTogglePrivacy(
                        "allowDMsFromAnyone",
                        e.target.checked,
                      );
                    }}
                    className="h-5 w-5 rounded accent-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {activeSection === "notifications" && (
            <div className="max-w-xl space-y-6">
              <div>
                <h2 className="text-lg font-extrabold">
                  Notification Preferences
                </h2>
                <p className="text-xs text-neutral-500">
                  Choose the real-time push and toast alerts you want to
                  receive.
                </p>
              </div>

              <div className="space-y-4 divide-y divide-neutral-100 dark:divide-neutral-900">
                <div className="flex items-center justify-between pt-3">
                  <div>
                    <p className="font-bold text-sm">Likes & Reactions</p>
                    <p className="text-xs text-neutral-500">
                      Alerts when someone likes your post, reel, or story.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifyLikes}
                    onChange={(e) => {
                      setNotifyLikes(e.target.checked);
                      handleTogglePrivacy("notifyLikes", e.target.checked);
                    }}
                    className="h-5 w-5 rounded accent-blue-500"
                  />
                </div>

                <div className="flex items-center justify-between pt-4">
                  <div>
                    <p className="font-bold text-sm">Comments & Replies</p>
                    <p className="text-xs text-neutral-500">
                      Alerts when someone replies to your posts.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifyComments}
                    onChange={(e) => {
                      setNotifyComments(e.target.checked);
                      handleTogglePrivacy("notifyComments", e.target.checked);
                    }}
                    className="h-5 w-5 rounded accent-blue-500"
                  />
                </div>

                <div className="flex items-center justify-between pt-4">
                  <div>
                    <p className="font-bold text-sm">New Followers</p>
                    <p className="text-xs text-neutral-500">
                      Alerts when someone starts following your profile.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifyFollows}
                    onChange={(e) => {
                      setNotifyFollows(e.target.checked);
                      handleTogglePrivacy("notifyFollows", e.target.checked);
                    }}
                    className="h-5 w-5 rounded accent-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {activeSection === "appearance" && (
            <div className="max-w-xl space-y-6">
              <div>
                <h2 className="text-lg font-extrabold">Theme & Colors</h2>
                <p className="text-xs text-neutral-500">
                  Manage your visual experience across Pulse on all devices.
                </p>
              </div>

              <div className="flex items-center justify-between rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{isDark ? "🌙" : "☀️"}</span>
                  <div>
                    <p className="font-bold text-sm">
                      {isDark ? "Dark Theme Active" : "Light Theme Active"}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {isDark
                        ? "High-contrast true black background."
                        : "Crisp white background."}
                    </p>
                  </div>
                </div>

                <button
                  onClick={toggleTheme}
                  className="rounded-full bg-black px-4 py-2 font-bold text-xs text-white transition hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
                >
                  Toggle Mode
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl border border-neutral-200 bg-white p-6 shadow-2xl dark:border-neutral-800 dark:bg-black">
            <h3 className="font-black text-lg text-red-600">Delete Account?</h3>
            <p className="mt-2 text-xs text-neutral-500 leading-relaxed">
              This action is permanent and cannot be undone. All your posts,
              followers, stories, and chats will be immediately erased.
            </p>
            <div className="mt-6 flex gap-2">
              <button
                onClick={handleDeleteAccount}
                className="flex-1 rounded-full bg-red-600 py-2.5 font-bold text-xs text-white hover:bg-red-700"
              >
                Yes, Delete
              </button>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 rounded-full border border-neutral-300 py-2.5 font-bold text-xs text-neutral-700 dark:border-neutral-700 dark:text-neutral-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
