"use client";

import { useState } from "react";

import {
  getApiErrorMessage,
  upvotePost,
  type ApiPost,
} from "@/lib/api";
import Verification from "./Verification";

interface PostCardProps {
  post: ApiPost;
  onOpen?: (post: ApiPost) => void;
}

export default function PostCard({
  post,
  onOpen,
}: PostCardProps) {
  const [votes, setVotes] = useState(post.votes);
  const [voting, setVoting] = useState(false);
  const [voteError, setVoteError] = useState<string | null>(null);

  const [factCheckOpen, setFactCheckOpen] = useState(false);
  const [shareMessage, setShareMessage] = useState<string | null>(null);

  const authorInitials = post.author.display_name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const isProfessional = post.author.role === "PROFESSIONAL";
  const isVerifiedFactCheck =
    post.fact_check?.status === "verified";

  async function handleVote() {
    if (voting) {
      return;
    }

    setVoting(true);
    setVoteError(null);

    try {
      const result = await upvotePost(post.id);
      setVotes(result.votes);
    } catch (error) {
      setVoteError(getApiErrorMessage(error));
    } finally {
      setVoting(false);
    }
  }

  async function handleShare() {
    try {
      const url = `${window.location.origin}/post/${post.id}`;

      await navigator.clipboard.writeText(url);

      setShareMessage("Link copied");

      window.setTimeout(() => {
        setShareMessage(null);
      }, 2000);
    } catch {
      setShareMessage("Could not copy link");

      window.setTimeout(() => {
        setShareMessage(null);
      }, 2000);
    }
  }

  function handleOpen() {
    if (onOpen) {
      onOpen(post);
      return;
    }

    window.location.href = `/post/${post.id}`;
  }

  return (
    <article
      className={`vf-card overflow-hidden transition-all duration-200 ${
        isVerifiedFactCheck
          ? "border-[var(--vf-gold)]/30"
          : ""
      }`}
    >
      {/* Author */}
      <div className="flex items-center gap-3">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full ${
            isProfessional
              ? "bg-[var(--vf-gold-light)] ring-2 ring-[var(--vf-gold)]/15"
              : "bg-[var(--vf-primary-light)]"
          }`}
        >
          {post.author.avatar_url ? (
            <img
              src={post.author.avatar_url}
              alt={post.author.display_name}
              className="h-full w-full object-cover"
            />
          ) : (
            <span
              className={`text-sm font-bold ${
                isProfessional
                  ? "text-[var(--vf-gold-dark)]"
                  : "text-[var(--vf-primary)]"
              }`}
            >
              {authorInitials}
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() =>
                (window.location.href = `/users/${post.author.id}`)
              }
              className="truncate text-sm font-bold text-[var(--vf-text)] transition hover:text-[var(--vf-primary)]"
            >
              {post.author.display_name}
            </button>

            {isProfessional && (
              <span className="inline-flex items-center gap-1 rounded-full border border-[var(--vf-gold)]/40 bg-[var(--vf-gold-light)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#795b12]">
                <span
                  aria-hidden="true"
                  className="text-[var(--vf-gold-dark)]"
                >
                  ✓
                </span>
                Professional
              </span>
            )}
          </div>

          <p className="mt-0.5 text-xs text-[var(--vf-text-muted)]">
            {new Date(post.created_at).toLocaleDateString(
              undefined,
              {
                day: "numeric",
                month: "short",
                year: "numeric",
              },
            )}
          </p>
        </div>

        {post.category && (
          <span className="shrink-0 rounded-full bg-[var(--vf-primary-light)] px-3 py-1 text-xs font-semibold text-[var(--vf-primary-dark)]">
            {post.category}
          </span>
        )}
      </div>

      {/* Content */}
      <button
        type="button"
        onClick={handleOpen}
        className="mt-5 block w-full text-left"
      >
        <h2 className="text-xl font-black leading-tight text-[var(--vf-text)] transition hover:text-[var(--vf-primary)]">
          {post.title}
        </h2>

        <p className="mt-3 line-clamp-4 text-sm leading-6 text-[var(--vf-text-muted)]">
          {post.content}
        </p>
      </button>

      {/* Image */}
      {post.image_url && (
        <button
          type="button"
          onClick={handleOpen}
          className="mt-5 block w-full overflow-hidden rounded-2xl"
        >
          <img
            src={post.image_url}
            alt=""
            className="max-h-[420px] w-full object-cover transition duration-300 hover:scale-[1.01]"
          />
        </button>
      )}

      {/* Fact check */}
      {post.fact_check && (
        <div
          className={`mt-5 overflow-hidden rounded-2xl border ${
            isVerifiedFactCheck
              ? "border-[var(--vf-gold)]/40 bg-[var(--vf-gold-light)]/50"
              : "border-[var(--vf-border)] bg-[var(--vf-background)]"
          }`}
        >
          <button
            type="button"
            onClick={() =>
              setFactCheckOpen((current) => !current)
            }
            className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left"
          >
            <div className="flex items-center gap-3">
              <Verification
                status={post.fact_check.status}
                size="sm"
              />

              <span className="text-sm font-bold text-[var(--vf-text)]">
                Fact-check
              </span>
            </div>

            <span className="text-sm font-medium text-[var(--vf-text-muted)]">
              {factCheckOpen ? "Hide" : "View"}
            </span>
          </button>

          {factCheckOpen && (
            <div className="border-t border-[var(--vf-gold)]/20 px-4 py-4">
              {post.fact_check.summary && (
                <p className="text-sm leading-6 text-[var(--vf-text-muted)]">
                  {post.fact_check.summary}
                </p>
              )}

              {post.fact_check.confidence !== null &&
                post.fact_check.confidence !== undefined && (
                  <p className="mt-3 text-xs font-semibold text-[var(--vf-text-muted)]">
                    Confidence:{" "}
                    {Math.round(
                      post.fact_check.confidence * 100,
                    )}
                    %
                  </p>
                )}

              {post.fact_check.model_name && (
                <p className="mt-1 text-xs text-[var(--vf-text-muted)]">
                  Model: {post.fact_check.model_name}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="mt-5 flex items-center gap-2 border-t border-[var(--vf-border)] pt-4">
        <button
          type="button"
          onClick={handleVote}
          disabled={voting}
          className="inline-flex items-center gap-2 rounded-xl border border-[var(--vf-border)] bg-white px-4 py-2 text-sm font-bold text-[var(--vf-text)] transition hover:border-[var(--vf-primary)] hover:text-[var(--vf-primary)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span
            aria-hidden="true"
            className="text-[var(--vf-primary)]"
          >
            ▲
          </span>

          <span>
            {voting ? "Voting..." : votes}
          </span>
        </button>

        <button
          type="button"
          onClick={handleOpen}
          className="inline-flex items-center gap-2 rounded-xl border border-[var(--vf-border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--vf-text-muted)] transition hover:border-[var(--vf-primary)] hover:text-[var(--vf-primary)]"
        >
          <span aria-hidden="true">💬</span>

          {post.comments}
        </button>

        <button
          type="button"
          onClick={handleShare}
          className="ml-auto rounded-xl border border-[var(--vf-border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--vf-text-muted)] transition hover:border-[var(--vf-primary)] hover:text-[var(--vf-primary)]"
        >
          {shareMessage || "Share"}
        </button>
      </div>

      {/* Vote error */}
      {voteError && (
        <p className="mt-3 text-xs font-medium text-[var(--vf-danger)]">
          {voteError}
        </p>
      )}
    </article>
  );
}