"use client";

import { useState } from "react";
import { useAuth } from "../context/AuthContext";

export interface PollOptionItem {
  id: string;
  text: string;
  votes: { userId: string }[];
}

export interface PollItem {
  id: string;
  expiresAt: string;
  options: PollOptionItem[];
}

interface PollCardProps {
  poll: PollItem;
  postId: string;
  onVoted?: (updatedPost: any) => void;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function PollCard({ poll, onVoted }: PollCardProps) {
  const { user } = useAuth();
  const [voting, setVoting] = useState(false);

  const totalVotes = poll.options.reduce(
    (acc, opt) => acc + (opt.votes?.length || 0),
    0,
  );
  const isExpired = new Date() > new Date(poll.expiresAt);
  const userVotedOption = poll.options.find((opt) =>
    opt.votes?.some((v) => v.userId === user?.id),
  );
  const hasVoted = Boolean(userVotedOption);

  const handleVote = async (optionId: string) => {
    if (!user) {
      alert("Please login to vote");
      return;
    }
    if (hasVoted || isExpired) return;

    const token =
      localStorage.getItem("token") || localStorage.getItem("accessToken");
    if (!token) return;

    setVoting(true);
    try {
      const res = await fetch(`${API_URL}/posts/poll/vote/${optionId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Vote failed");
      }

      const updatedPost = await res.json();
      onVoted?.(updatedPost);
    } catch (err: any) {
      alert(err.message || "Something went wrong");
    } finally {
      setVoting(false);
    }
  };

  return (
    <div className="mt-3 space-y-2 rounded-xl border border-neutral-200 bg-neutral-50/50 p-3.5 dark:border-neutral-800 dark:bg-neutral-900/40">
      {poll.options.map((option) => {
        const voteCount = option.votes?.length || 0;
        const percentage =
          totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
        const isSelected = userVotedOption?.id === option.id;

        return (
          <div key={option.id} className="relative">
            {hasVoted || isExpired ? (
           
              <div className="relative flex h-10 w-full items-center justify-between overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100 px-3 text-xs dark:border-neutral-700/60 dark:bg-neutral-800">
                <div
                  className={`absolute inset-y-0 left-0 transition-all duration-500 ${
                    isSelected
                      ? "bg-blue-500/20 dark:bg-blue-600/30"
                      : "bg-neutral-300/40 dark:bg-neutral-700/50"
                  }`}
                  style={{ width: `${percentage}%` }}
                />
                <span className="relative z-10 font-medium text-neutral-800 dark:text-neutral-200">
                  {option.text} {isSelected && "✓"}
                </span>
                <span className="relative z-10 font-bold text-neutral-600 dark:text-neutral-400">
                  {percentage}%
                </span>
              </div>
            ) : (
             
              <button
                type="button"
                onClick={() => handleVote(option.id)}
                disabled={voting}
                className="flex h-10 w-full items-center justify-center rounded-lg border border-blue-500/30 bg-white px-4 text-xs font-semibold text-blue-600 transition hover:bg-blue-50 active:scale-[0.99] disabled:opacity-50 dark:border-blue-500/40 dark:bg-neutral-800/80 dark:text-blue-400 dark:hover:bg-neutral-800"
              >
                {option.text}
              </button>
            )}
          </div>
        );
      })}

      <div className="flex items-center justify-between pt-1 text-[11px] text-neutral-500 dark:text-neutral-400">
        <span>
          {totalVotes} {totalVotes === 1 ? "vote" : "votes"}
        </span>
        <span>
          {isExpired
            ? "Final results"
            : `Ends ${new Date(poll.expiresAt).toLocaleDateString()}`}
        </span>
      </div>
    </div>
  );
}
