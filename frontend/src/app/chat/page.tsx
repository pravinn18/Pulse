"use client";

import { Suspense, useState, useEffect, useRef, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../context/AuthContext";
import { socket } from "../../lib/socket";
import {
  formatMessageDateHeader,
  formatPresenceStatus,
} from "../../lib/dateUtils";

interface ParticipantUser {
  id: string;
  name: string;
  username: string;
  avatarUrl?: string | null;
  bio?: string | null;
  isOnline?: boolean;
  lastSeen?: string;
  createdAt?: string;
  _count?: { followers: number; following: number };
}

interface Reaction {
  id: string;
  emoji: string;
  userId: string;
}

interface Message {
  id: string;
  content: string;
  mediaUrl?: string | null;
  mediaType?: "IMAGE" | "VIDEO" | null;
  status: "SENT" | "DELIVERED" | "READ";
  isEdited?: boolean;
  replyTo?: { id: string; content: string; sender: { name: string } } | null;
  reactions?: Reaction[];
  createdAt: string;
  senderId: string;
  conversationId?: string;
  sender?: {
    id: string;
    name: string;
    username: string;
    avatarUrl?: string | null;
  };
}

interface Conversation {
  id: string;
  isGroup?: boolean;
  name?: string | null;
  groupAvatarUrl?: string | null;
  adminId?: string | null;
  updatedAt: string;
  participants: { id: string; user: ParticipantUser }[];
  messages: { content: string; createdAt: string }[];
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
const EMOJI_LIST = ["❤️", "👍", "🔥", "😂", "😮", "😢"];

const isVideoUrl = (url?: string | null, type?: string | null) => {
  if (!url) return false;
  if (type === "VIDEO") return true;
  return (
    url.startsWith("blob:") ||
    url.endsWith(".mp4") ||
    url.endsWith(".webm") ||
    url.endsWith(".mov") ||
    url.includes("/video/upload/") ||
    url.includes(".mp4?")
  );
};

function ChatContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const targetUserId = searchParams.get("userId");

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [loadingConv, setLoadingConv] = useState(true);
  const [sending, setSending] = useState(false);

  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [fileType, setFileType] = useState<"IMAGE" | "VIDEO" | null>(null);
  const [activeMessageMenu, setActiveMessageMenu] = useState<string | null>(
    null,
  );

  const [typingUser, setTypingUser] = useState<string | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [showGroupMembersModal, setShowGroupMembersModal] = useState(false);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [availableFollowings, setAvailableFollowings] = useState<
    ParticipantUser[]
  >([]);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [groupAvatarFile, setGroupAvatarFile] = useState<File | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, typingUser]);

  useEffect(() => {
    let isMounted = true;

    const loadChatData = async () => {
      const token =
        localStorage.getItem("token") || localStorage.getItem("accessToken");
      if (!token) return;

      try {
        setLoadingConv(true);
        let directTargetConv: Conversation | null = null;

        if (targetUserId) {
          const directRes = await fetch(
            `${API_URL}/chat/conversations/user/${targetUserId}`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
            },
          );

          if (directRes.ok) {
            directTargetConv = await directRes.json();
            if (isMounted) setActiveConv(directTargetConv);
          }
        }

        const res = await fetch(`${API_URL}/chat/conversations`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const convList: Conversation[] = await res.json();
          const combined = directTargetConv
            ? [
                directTargetConv,
                ...convList.filter((c) => c.id !== directTargetConv?.id),
              ]
            : convList;

          const uniqueMap = new Map<string, Conversation>();
          combined.forEach((c) => {
            if (!uniqueMap.has(c.id)) uniqueMap.set(c.id, c);
          });
          const clean = Array.from(uniqueMap.values());

          if (isMounted) {
            setConversations(clean);
            if (
              !targetUserId &&
              clean.length > 0 &&
              !activeConv &&
              window.innerWidth >= 640
            ) {
              setActiveConv(clean[0]);
            }
          }
        }
      } catch (err) {
        console.error("Failed to load conversations:", err);
      } finally {
        if (isMounted) setLoadingConv(false);
      }
    };

    loadChatData();
    return () => {
      isMounted = false;
    };
  }, [targetUserId]);

  useEffect(() => {
    if (!activeConv?.id) return;

    const fetchMessages = async () => {
      const token =
        localStorage.getItem("token") || localStorage.getItem("accessToken");
      if (!token) return;

      try {
        const res = await fetch(
          `${API_URL}/chat/conversations/${activeConv.id}/messages`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (res.ok) {
          const data: Message[] = await res.json();
          setMessages(data);
        }
      } catch (err) {
        console.error(err);
      }
    };

    fetchMessages();
    socket.emit("chat:join-room", activeConv.id);
    socket.emit("chat:mark-seen", { conversationId: activeConv.id });

    return () => {
      socket.emit("chat:leave-room", activeConv.id);
    };
  }, [activeConv?.id]);

  useEffect(() => {
    const handleNewMessage = (newMsg: Message) => {
      if (activeConv && newMsg.conversationId === activeConv.id) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id)) return prev;

          const tempIdx = prev.findIndex(
            (m) =>
              m.id.startsWith("temp-") &&
              m.senderId === newMsg.senderId &&
              (m.content === newMsg.content || (!m.content && !newMsg.content)),
          );

          if (tempIdx !== -1) {
            const next = [...prev];
            next[tempIdx] = newMsg;
            return next;
          }

          return [...prev, newMsg];
        });

        if (newMsg.senderId !== user?.id) {
          socket.emit("chat:mark-seen", { conversationId: activeConv.id });
        }
      }

      setConversations((prev) => {
        const exists = prev.find((c) => c.id === newMsg.conversationId);
        if (!exists) return prev;
        const updated = prev.map((c) =>
          c.id === newMsg.conversationId
            ? {
                ...c,
                updatedAt: new Date().toISOString(),
                messages: [
                  {
                    content: newMsg.content || "Media attachment",
                    createdAt: newMsg.createdAt,
                  },
                ],
              }
            : c,
        );
        return updated.sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        );
      });
    };

    const handleSeenReceipt = (payload: {
      conversationId: string;
      seenByUserId: string;
    }) => {
      if (activeConv?.id === payload.conversationId) {
        setMessages((prev) =>
          prev.map((m) =>
            m.senderId === user?.id ? { ...m, status: "READ" } : m,
          ),
        );
      }
    };

    const handleUserTyping = (payload: {
      conversationId: string;
      userId: string;
      username: string;
      isTyping: boolean;
    }) => {
      if (
        activeConv?.id === payload.conversationId &&
        payload.userId !== user?.id
      ) {
        setTypingUser(payload.isTyping ? payload.username : null);
      }
    };

    const handlePresenceChange = (payload: {
      userId: string;
      isOnline: boolean;
      lastSeen: string;
    }) => {
      setConversations((prev) =>
        prev.map((conv) => ({
          ...conv,
          participants: conv.participants.map((p) =>
            p.user.id === payload.userId
              ? {
                  ...p,
                  user: {
                    ...p.user,
                    isOnline: payload.isOnline,
                    lastSeen: payload.lastSeen,
                  },
                }
              : p,
          ),
        })),
      );

      if (activeConv) {
        setActiveConv((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            participants: prev.participants.map((p) =>
              p.user.id === payload.userId
                ? {
                    ...p,
                    user: {
                      ...p.user,
                      isOnline: payload.isOnline,
                      lastSeen: payload.lastSeen,
                    },
                  }
                : p,
            ),
          };
        });
      }
    };

    socket.on("new-direct-message", handleNewMessage);
    socket.on("chat:seen-receipt", handleSeenReceipt);
    socket.on("chat:user-typing", handleUserTyping);
    socket.on("user:presence-change", handlePresenceChange);

    return () => {
      socket.off("new-direct-message", handleNewMessage);
      socket.off("chat:seen-receipt", handleSeenReceipt);
      socket.off("chat:user-typing", handleUserTyping);
      socket.off("user:presence-change", handlePresenceChange);
    };
  }, [activeConv, user?.id]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputMessage(e.target.value);
    if (!activeConv) return;

    socket.emit("chat:typing-start", {
      conversationId: activeConv.id,
      username: user?.name || "Someone",
    });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("chat:typing-stop", { conversationId: activeConv.id });
    }, 1500);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const previewUrl = URL.createObjectURL(file);
      setFilePreview(previewUrl);
      setFileType(file.type.startsWith("video/") ? "VIDEO" : "IMAGE");
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
    setFileType(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!inputMessage.trim() && !selectedFile) || !activeConv || sending)
      return;

    const token =
      localStorage.getItem("token") || localStorage.getItem("accessToken");
    if (!token || !user) return;

    const content = inputMessage.trim();
    const fileToUpload = selectedFile;
    const currentPreview = filePreview;
    const currentFileType = fileType;

    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const optimisticMessage: Message = {
      id: tempId,
      content,
      mediaUrl: currentPreview,
      mediaType: currentFileType,
      status: "SENT",
      createdAt: new Date().toISOString(),
      senderId: user.id,
      conversationId: activeConv.id,
      sender: {
        id: user.id,
        name: user.name,
        username: user.username,
        avatarUrl: user.avatarUrl,
      },
      replyTo: replyingTo
        ? {
            id: replyingTo.id,
            content: replyingTo.content,
            sender: { name: replyingTo.sender?.name || "User" },
          }
        : null,
    };

    if (!editingMessage) {
      setMessages((prev) => [...prev, optimisticMessage]);
    }

    setInputMessage("");
    setSelectedFile(null);
    setFilePreview(null);
    setFileType(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setReplyingTo(null);

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    socket.emit("chat:typing-stop", { conversationId: activeConv.id });

    try {
      setSending(true);

      if (editingMessage) {
        const res = await fetch(
          `${API_URL}/chat/messages/${editingMessage.id}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ content }),
          },
        );

        if (res.ok) {
          const updated = await res.json();
          setMessages((prev) =>
            prev.map((m) =>
              m.id === updated.id ? { ...m, content, isEdited: true } : m,
            ),
          );
          setEditingMessage(null);
        }
        return;
      }

      const formData = new FormData();
      formData.append("conversationId", activeConv.id);
      formData.append("content", content);
      if (replyingTo) formData.append("replyToId", replyingTo.id);
      if (fileToUpload) formData.append("file", fileToUpload);

      const res = await fetch(`${API_URL}/chat/messages`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (res.ok) {
        const realMessage: Message = await res.json();
        setMessages((prev) => {
          if (prev.some((m) => m.id === realMessage.id)) {
            return prev.filter((m) => m.id !== tempId);
          }
          return prev.map((m) => (m.id === tempId ? realMessage : m));
        });
      } else {
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        alert("Failed to send message");
      }
    } catch (err) {
      console.error("Message send failed:", err);
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    } finally {
      setSending(false);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    const token =
      localStorage.getItem("token") || localStorage.getItem("accessToken");
    if (!token) return;

    try {
      await fetch(`${API_URL}/chat/messages/${messageId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
      setActiveMessageMenu(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleReact = async (messageId: string, emoji: string) => {
    const token =
      localStorage.getItem("token") || localStorage.getItem("accessToken");
    if (!token) return;

    try {
      const res = await fetch(`${API_URL}/chat/messages/${messageId}/react`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ emoji }),
      });

      if (res.ok) {
        const updatedMsg: Message = await res.json();
        setMessages((prev) =>
          prev.map((m) => (m.id === updatedMsg.id ? updatedMsg : m)),
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteConversation = async (convId: string) => {
    if (!confirm("Delete this conversation for you?")) return;
    const token =
      localStorage.getItem("token") || localStorage.getItem("accessToken");
    if (!token) return;

    try {
      await fetch(`${API_URL}/chat/conversations/${convId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setConversations((prev) => prev.filter((c) => c.id !== convId));
      setActiveConv(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenCreateGroup = async () => {
    const token = localStorage.getItem("token");
    if (!token || !user) return;
    try {
      const res = await fetch(`${API_URL}/users/${user.id}/following`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAvailableFollowings(data);
      }
    } catch {}
    setShowCreateGroupModal(true);
  };

  const handleCreateGroupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim() || selectedMembers.length === 0) return;
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const formData = new FormData();
      formData.append("name", groupName.trim());
      formData.append("memberIds", JSON.stringify(selectedMembers));
      if (groupAvatarFile) formData.append("file", groupAvatarFile);

      const res = await fetch(`${API_URL}/chat/groups`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (res.ok) {
        const newGroup = await res.json();
        setConversations((prev) => [newGroup, ...prev]);
        setActiveConv(newGroup);
        setShowCreateGroupModal(false);
        setGroupName("");
        setSelectedMembers([]);
        setGroupAvatarFile(null);
      }
    } catch (err) {
      console.error("Create group error:", err);
    }
  };

  const groupedMessages = useMemo(() => {
    const groups: { dateHeader: string; msgs: Message[] }[] = [];
    let currentHeader = "";

    messages.forEach((msg) => {
      const header = formatMessageDateHeader(msg.createdAt);
      if (header !== currentHeader) {
        currentHeader = header;
        groups.push({ dateHeader: header, msgs: [msg] });
      } else {
        groups[groups.length - 1].msgs.push(msg);
      }
    });

    return groups;
  }, [messages]);

  const otherParticipant = activeConv?.isGroup
    ? null
    : activeConv?.participants.find((p) => p.user.id !== user?.id)?.user;

  return (
    <div className="flex h-screen w-full bg-white text-neutral-900 dark:bg-black dark:text-neutral-100 overflow-hidden">

      <div
        className={`h-full w-full sm:w-80 lg:w-96 border-r border-neutral-200 dark:border-neutral-800 flex flex-col ${
          activeConv ? "hidden sm:flex" : "flex"
        }`}
      >
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <h1 className="text-xl font-extrabold tracking-tight">Messages</h1>
          <button
            onClick={handleOpenCreateGroup}
            title="Create Group"
            className="rounded-full bg-neutral-100 dark:bg-neutral-900 p-2 text-xs font-bold hover:bg-neutral-200 dark:hover:bg-neutral-800 transition"
          >
            👥 New Group
          </button>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-neutral-100 dark:divide-neutral-900">
          {loadingConv ? (
            <p className="p-4 text-xs text-neutral-400">Loading inbox...</p>
          ) : conversations.length === 0 ? (
            <div className="p-8 text-center text-neutral-500">
              <p className="font-bold text-sm">No messages yet</p>
              <p className="mt-1 text-xs">
                Search or visit a profile to start chatting.
              </p>
            </div>
          ) : (
            conversations.map((conv) => {
              const other = conv.isGroup
                ? null
                : conv.participants.find((p) => p.user.id !== user?.id)?.user;
              const isSelected = activeConv?.id === conv.id;

              return (
                <div
                  key={conv.id}
                  onClick={() => setActiveConv(conv)}
                  className={`group relative flex cursor-pointer items-center justify-between p-4 transition hover:bg-neutral-50 dark:hover:bg-neutral-900/60 ${
                    isSelected ? "bg-neutral-100 dark:bg-neutral-900" : ""
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="relative h-11 w-11 shrink-0">
                      <div className="h-full w-full rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden flex items-center justify-center font-bold text-xs">
                        {conv.isGroup ? (
                          conv.groupAvatarUrl ? (
                            <img
                              src={conv.groupAvatarUrl}
                              alt={conv.name || "Group"}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            "👥"
                          )
                        ) : other?.avatarUrl ? (
                          <img
                            src={other.avatarUrl}
                            alt={other.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          other?.name?.charAt(0).toUpperCase() || "U"
                        )}
                      </div>
                      {!conv.isGroup && other?.isOnline && (
                        <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full bg-green-500 border-2 border-white dark:border-black" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold truncate">
                        {conv.isGroup ? conv.name : other?.name}
                      </p>
                      <p className="text-xs text-neutral-500 truncate">
                        {!conv.isGroup && other?.isOnline
                          ? "Active now"
                          : conv.messages?.[0]?.content || "Direct message"}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteConversation(conv.id);
                    }}
                    title="Delete Conversation"
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-neutral-400 hover:text-red-500 transition"
                  >
                    🗑️
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div
        className={`flex-1 flex flex-col h-full bg-white dark:bg-black ${
          !activeConv ? "hidden sm:flex items-center justify-center" : "flex"
        }`}
      >
        {!activeConv ? (
          <div className="text-center p-8 text-neutral-500">
            <h2 className="text-xl font-bold text-neutral-800 dark:text-neutral-200">
              Select a message
            </h2>
            <p className="text-xs mt-1 text-neutral-400">
              Choose from your conversations or create a group to start
              chatting.
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between p-3.5 border-b border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-black/80 backdrop-blur-md sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setActiveConv(null)}
                  className="sm:hidden p-1 text-neutral-500 hover:text-white"
                >
                  ←
                </button>

                {activeConv.isGroup ? (
                  <div
                    onClick={() => setShowGroupMembersModal(true)}
                    className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition"
                  >
                    <div className="h-9 w-9 rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden flex items-center justify-center font-bold text-xs">
                      {activeConv.groupAvatarUrl ? (
                        <img
                          src={activeConv.groupAvatarUrl}
                          alt="Group"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        "👥"
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-bold leading-tight">
                        {activeConv.name}
                      </p>
                      <p className="text-[11px] text-neutral-500 leading-tight">
                        {activeConv.participants.length} members · tap for info
                      </p>
                    </div>
                  </div>
                ) : (
                  <Link
                    href={`/profile/${otherParticipant?.username}`}
                    className="flex items-center gap-3 hover:opacity-80 transition"
                  >
                    <div className="relative h-9 w-9">
                      <div className="h-full w-full rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden flex items-center justify-center font-bold text-xs">
                        {otherParticipant?.avatarUrl ? (
                          <img
                            src={otherParticipant.avatarUrl}
                            alt={otherParticipant.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          otherParticipant?.name?.charAt(0).toUpperCase() || "U"
                        )}
                      </div>
                      {otherParticipant?.isOnline && (
                        <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-white dark:border-black" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-bold leading-tight hover:underline">
                        {otherParticipant?.name}
                      </p>
                      <p className="text-[11px] text-neutral-500 leading-tight">
                        {formatPresenceStatus(
                          Boolean(otherParticipant?.isOnline),
                          otherParticipant?.lastSeen,
                        )}
                      </p>
                    </div>
                  </Link>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {groupedMessages.map((group) => (
                <div key={group.dateHeader} className="space-y-3">
                  <div className="flex justify-center my-3">
                    <span className="text-[11px] font-semibold text-neutral-400 bg-neutral-100 dark:bg-neutral-900 px-3 py-1 rounded-full">
                      {group.dateHeader}
                    </span>
                  </div>

                  {group.msgs.map((msg, index) => {
                    const isMe = msg.senderId === user?.id;
                    const isVideo = isVideoUrl(msg.mediaUrl, msg.mediaType);
                    const itemKey = msg.id || `msg-${index}-${msg.createdAt}`;

                    return (
                      <div
                        key={itemKey}
                        className={`group relative flex flex-col ${
                          isMe ? "items-end" : "items-start"
                        }`}
                      >
                        {activeConv.isGroup && !isMe && msg.sender && (
                          <span className="text-[10px] text-neutral-400 ml-2 mb-0.5">
                            {msg.sender.name}
                          </span>
                        )}

                        {msg.replyTo && (
                          <div className="text-[11px] text-neutral-400 mb-1 px-3 py-1 bg-neutral-100 dark:bg-neutral-900 rounded-lg max-w-[70%] truncate">
                            Replying to{" "}
                            <span className="font-bold">
                              {msg.replyTo.sender.name}
                            </span>
                            : {msg.replyTo.content}
                          </div>
                        )}

                        <div className="flex items-center gap-2 group">
                          {isMe && (
                            <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition text-xs text-neutral-400">
                              {EMOJI_LIST.slice(0, 3).map((emoji) => (
                                <button
                                  key={emoji}
                                  onClick={() => handleReact(msg.id, emoji)}
                                  className="hover:scale-125 transition"
                                >
                                  {emoji}
                                </button>
                              ))}
                              <button
                                onClick={() =>
                                  setActiveMessageMenu(
                                    activeMessageMenu === msg.id
                                      ? null
                                      : msg.id,
                                  )
                                }
                                className="p-1 hover:text-white"
                              >
                                •••
                              </button>
                            </div>
                          )}

                          <div
                            className={`relative max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${
                              isMe
                                ? "bg-black text-white dark:bg-white dark:text-black rounded-br-none"
                                : "bg-neutral-100 text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100 rounded-bl-none"
                            }`}
                          >
                            {msg.mediaUrl && (
                              <div className="mb-2 overflow-hidden rounded-xl bg-black">
                                {isVideo ? (
                                  <video
                                    src={msg.mediaUrl}
                                    controls
                                    playsInline
                                    preload="metadata"
                                    className="max-h-60 w-full rounded-xl object-contain"
                                  />
                                ) : (
                                  <img
                                    src={msg.mediaUrl}
                                    alt="Attached"
                                    className="max-h-60 w-full object-cover rounded-xl"
                                  />
                                )}
                              </div>
                            )}

                            {msg.content && (
                              <p className="leading-relaxed">{msg.content}</p>
                            )}
                            {msg.isEdited && (
                              <span className="text-[9px] opacity-60 ml-1">
                                (edited)
                              </span>
                            )}
                          </div>

                          {!isMe && (
                            <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition text-xs text-neutral-400">
                              {EMOJI_LIST.slice(0, 3).map((emoji) => (
                                <button
                                  key={emoji}
                                  onClick={() => handleReact(msg.id, emoji)}
                                  className="hover:scale-125 transition"
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        {activeMessageMenu === msg.id && (
                          <div className="my-1 rounded-xl border border-neutral-200 bg-white p-1 shadow-xl dark:border-neutral-800 dark:bg-neutral-900 z-20 text-xs flex gap-2">
                            <button
                              onClick={() => {
                                setReplyingTo(msg);
                                setActiveMessageMenu(null);
                              }}
                              className="p-1 hover:underline"
                            >
                              Reply
                            </button>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(msg.content);
                                setActiveMessageMenu(null);
                              }}
                              className="p-1 hover:underline"
                            >
                              Copy
                            </button>
                            {isMe && (
                              <>
                                <button
                                  onClick={() => {
                                    setEditingMessage(msg);
                                    setInputMessage(msg.content);
                                    setActiveMessageMenu(null);
                                  }}
                                  className="p-1 hover:underline"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteMessage(msg.id)}
                                  className="p-1 text-red-500 hover:underline"
                                >
                                  Delete
                                </button>
                              </>
                            )}
                          </div>
                        )}

                        {msg.reactions && msg.reactions.length > 0 && (
                          <div className="flex gap-1 mt-1">
                            {Array.from(
                              new Set(msg.reactions.map((r) => r.emoji)),
                            ).map((emoji) => (
                              <span
                                key={emoji}
                                className="rounded-full bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 text-xs shadow-sm"
                              >
                                {emoji}{" "}
                                {
                                  msg.reactions?.filter(
                                    (r) => r.emoji === emoji,
                                  ).length
                                }
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center gap-1.5 mt-1 text-[10px] text-neutral-400 px-1">
                          <span>
                            {new Date(msg.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          {isMe && (
                            <span>
                              {msg.status === "READ" ? (
                                <span
                                  className="text-blue-500 font-bold"
                                  title="Seen"
                                >
                                  Seen
                                </span>
                              ) : (
                                <span className="text-neutral-400" title="Sent">
                                  Sent
                                </span>
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}

              {typingUser && (
                <div className="flex items-center gap-2 text-xs text-neutral-400 animate-pulse pl-2">
                  <div className="h-6 w-10 bg-neutral-100 dark:bg-neutral-900 rounded-full flex items-center justify-center gap-1">
                    <span className="h-1.5 w-1.5 bg-neutral-400 rounded-full animate-bounce" />
                    <span className="h-1.5 w-1.5 bg-neutral-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                    <span className="h-1.5 w-1.5 bg-neutral-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                  </div>
                  <span>{typingUser} is typing...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {(replyingTo || editingMessage) && (
              <div className="flex items-center justify-between bg-neutral-100 dark:bg-neutral-900 px-4 py-2 text-xs border-t border-neutral-200 dark:border-neutral-800">
                <span>
                  {editingMessage
                    ? "Editing message"
                    : `Replying to ${replyingTo?.sender?.name}`}
                </span>
                <button
                  onClick={() => {
                    setReplyingTo(null);
                    setEditingMessage(null);
                    setInputMessage("");
                  }}
                  className="text-neutral-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
            )}

            {filePreview && (
              <div className="relative p-2 bg-neutral-100 dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 flex items-center gap-2">
                {fileType === "VIDEO" ? (
                  <video
                    src={filePreview}
                    className="h-20 rounded-lg object-cover"
                  />
                ) : (
                  <img
                    src={filePreview}
                    alt="Preview"
                    className="h-20 rounded-lg object-cover"
                  />
                )}
                <button
                  onClick={removeFile}
                  className="bg-black text-white rounded-full p-1 text-xs"
                >
                  ✕
                </button>
              </div>
            )}

            <form
              onSubmit={handleSendMessage}
              className="p-3 border-t border-neutral-200 dark:border-neutral-800 flex items-center gap-2 bg-white dark:bg-black"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                onChange={handleFileChange}
                className="hidden"
                id="chat-media-file"
              />
              <label
                htmlFor="chat-media-file"
                className="cursor-pointer p-2 text-neutral-500 hover:text-black dark:hover:text-white"
                title="Send Media"
              >
                📎
              </label>

              <input
                type="text"
                value={inputMessage}
                onChange={handleInputChange}
                placeholder="Message..."
                className="flex-1 rounded-full border border-neutral-300 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 px-4 py-2.5 text-sm focus:outline-none"
              />

              <button
                type="submit"
                disabled={(!inputMessage.trim() && !selectedFile) || sending}
                className="rounded-full bg-black text-white dark:bg-white dark:text-black px-4 py-2 text-xs font-bold transition hover:opacity-80 disabled:opacity-40"
              >
                {editingMessage ? "Update" : "Send"}
              </button>
            </form>
          </>
        )}
      </div>

      {showGroupMembersModal && activeConv?.isGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-extrabold text-base">Group Members</h3>
              <button
                onClick={() => setShowGroupMembersModal(false)}
                className="text-neutral-400 hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            </div>
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {activeConv.participants.map((p) => (
                <div key={p.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden flex items-center justify-center font-bold text-xs">
                      {p.user.avatarUrl ? (
                        <img
                          src={p.user.avatarUrl}
                          alt={p.user.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        p.user.name.charAt(0)
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-bold">{p.user.name}</p>
                      <p className="text-[10px] text-neutral-400">
                        @{p.user.username}
                      </p>
                    </div>
                  </div>
                  {p.user.id === activeConv.adminId && (
                    <span className="text-[10px] font-bold text-blue-500 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-full">
                      Admin
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {showCreateGroupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-extrabold text-base">New Group Chat</h3>
              <button
                onClick={() => setShowCreateGroupModal(false)}
                className="text-neutral-400 hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateGroupSubmit} className="space-y-4">
              <input
                type="text"
                required
                placeholder="Group Name"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="w-full rounded-xl border border-neutral-300 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 p-2.5 text-xs focus:outline-none"
              />

              <div>
                <p className="text-xs font-bold text-neutral-500 mb-2">
                  Select Members
                </p>
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {availableFollowings.map((f) => {
                    const isSelected = selectedMembers.includes(f.id);
                    return (
                      <div
                        key={f.id}
                        onClick={() =>
                          setSelectedMembers((prev) =>
                            isSelected
                              ? prev.filter((id) => id !== f.id)
                              : [...prev, f.id],
                          )
                        }
                        className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition ${
                          isSelected
                            ? "bg-blue-50 dark:bg-blue-950/40"
                            : "hover:bg-neutral-100 dark:hover:bg-neutral-800"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden flex items-center justify-center text-xs font-bold">
                            {f.name.charAt(0)}
                          </div>
                          <span className="text-xs font-semibold">
                            {f.name}
                          </span>
                        </div>
                        <span
                          className={`text-xs font-bold ${
                            isSelected ? "text-blue-500" : "text-neutral-400"
                          }`}
                        >
                          {isSelected ? "✓" : "+"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <button
                type="submit"
                disabled={!groupName.trim() || selectedMembers.length === 0}
                className="w-full rounded-full bg-black text-white dark:bg-white dark:text-black py-2.5 text-xs font-bold disabled:opacity-40"
              >
                Create Group ({selectedMembers.length})
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-neutral-400 text-center">Loading inbox...</div>
      }
    >
      <ChatContent />
    </Suspense>
  );
}
