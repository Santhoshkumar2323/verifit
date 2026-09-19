"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

import Comments from "@/components/Comments";
import Navbar from "@/components/Navbar";
import Verification from "@/components/Verification";

import {
  deletePost,
  getApiErrorMessage,
  getPost,
  upvotePost,
  type ApiPost,
} from "@/lib/api";

export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();

  const postId =
    typeof params.id === "string" ? params.id : "";

  const [post, setPost] = useState<ApiPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [voting, setVoting] = useState(false);
  const [voteError, setVoteError] = useState("");
  const [shareMessage, setShareMessage] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadCurrentUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!cancelled) {
        setCurrentUserId(user?.id ?? null);
      }
    }

    void loadCurrentUser();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!postId) {
      return;
    }

    let cancelled = false;

    async function loadPost() {
      setLoading(true);
      setError("");

      try {
        const result = await getPost(postId);

        if (!cancelled) {
          setPost(result);
        }
      } catch (err) {
        if (!cancelled) {
          setError(getApiErrorMessage(err));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadPost();

    return () => {
      cancelled = true;
    };
  }, [postId]);

  async function handleVote() {
    if (!post || voting) {
      return;
    }

    setVoting(true);
    setVoteError("");

    try {
      const result = await upvotePost(post.id);

      setPost((current) =>
        current
          ? {
            ...current,
            votes: result.votes,
          }
          : current,
      );
    } catch (err) {
      setVoteError(getApiErrorMessage(err));
    } finally {
      setVoting(false);
    }
  }

  async function handleDelete() {
    if (!post || deleting) {
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to delete this post?",
    );

    if (!confirmed) {
      return;
    }

    setDeleting(true);
    setDeleteError("");

    try {
      await deletePost(post.id);
      router.push("/");
      router.refresh();
    } catch (err) {
      setDeleteError(getApiErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  }

  async function handleShare() {
    if (!post) {
      return;
    }

    const url = window.location.href;

    try {
      setShareMessage("");

      if (navigator.share) {
        await navigator.share({
          title: post.title,
          text: `Check out this post on VeriFit: ${post.title}`,
          url,
        });

        setShareMessage("Share opened.");
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        setShareMessage("Post link copied.");
      } else {
        setShareMessage(
          "Copy the URL from your browser to share this post.",
        );
      }
    } catch (err) {
      if (
        err instanceof DOMException &&
        err.name === "AbortError"
      ) {
        return;
      }

      setShareMessage(
        "Could not share automatically. Copy the URL from your browser.",
      );
    }

    window.setTimeout(() => {
      setShareMessage("");
    }, 3000);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[var(--background)]">
        <Navbar />

        <div className="vf-container py-12">
          <div className="mx-auto max-w-4xl">
            <div className="animate-pulse">
              <div className="h-8 w-32 rounded bg-[var(--border)]" />

              <div className="mt-6 h-12 w-4/5 rounded bg-[var(--border)]" />

              <div className="mt-4 h-5 w-2/5 rounded bg-[var(--border)]" />

              <div className="mt-10 space-y-4">
                <div className="h-5 rounded bg-[var(--border)]" />
                <div className="h-5 rounded bg-[var(--border)]" />
                <div className="h-5 w-3/4 rounded bg-[var(--border)]" />
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (error || !post) {
    return (
      <main className="min-h-screen bg-[var(--background)]">
        <Navbar />

        <div className="vf-container py-16">
          <div className="mx-auto max-w-xl rounded-2xl border border-[var(--border)] bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--danger)]/10 text-lg font-black text-[var(--danger)]">
              !
            </div>

            <h1 className="mt-5 text-2xl font-black text-[var(--text)]">
              Post not found
            </h1>

            <p className="mt-2 text-[var(--text-muted)]">
              {error ||
                "This post may have been removed or does not exist."}
            </p>

            <button
              type="button"
              onClick={() => router.back()}
              className="vf-button mt-6 bg-[var(--primary)] text-white hover:bg-[var(--primary-dark)]"
            >
              Go back
            </button>
          </div>
        </div>
      </main>
    );
  }

  const verificationStatus =
    post.fact_check?.status ?? "unverified";

  const formattedDate = new Date(
    post.created_at,
  ).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <main className="min-h-screen bg-[var(--background)]">
      <Navbar />

      <div className="vf-container py-8 lg:py-12">
        <div className="mx-auto max-w-4xl">
          <div className="mb-6 flex items-center justify-between gap-4">
            <Link
              href="/"
              className="text-sm font-semibold text-[var(--primary)] transition hover:text-[var(--primary-dark)]"
            >
              ← Back to feed
            </Link>

          </div>

          <article className="overflow-hidden rounded-3xl border border-[var(--border)] bg-white shadow-sm">
            {post.image_url && (
              <div className="aspect-[16/7] overflow-hidden bg-[var(--primary-light)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={post.image_url}
                  alt={post.title}
                  className="h-full w-full object-cover"
                />
              </div>
            )}

            <div className="p-6 sm:p-8 lg:p-10">
              <div className="flex flex-wrap items-center gap-3">
                {post.category && (
                  <span className="rounded-full bg-[var(--primary-light)] px-3 py-1 text-xs font-bold uppercase tracking-wide text-[var(--primary)]">
                    {post.category}
                  </span>
                )}

                <Verification
                  status={verificationStatus}
                />
              </div>

              <h1 className="mt-5 text-3xl font-black leading-tight tracking-tight text-[var(--text)] sm:text-4xl lg:text-5xl">
                {post.title}
              </h1>

              <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-[var(--text-muted)]">
                <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-[var(--primary-light)] font-bold text-[var(--primary)]">
                  {post.author.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={post.author.avatar_url}
                      alt={post.author.display_name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    post.author.display_name
                      .slice(0, 1)
                      .toUpperCase()
                  )}
                </div>

                <div>
                  <div className="font-semibold text-[var(--text)]">
                    {post.author.display_name}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {post.author.role === "PROFESSIONAL" && (
                      <>
                        <span className="font-medium text-[var(--primary)]">
                          Professional
                        </span>
                        <span>•</span>
                      </>
                    )}

                    <time dateTime={post.created_at}>
                      {formattedDate}
                    </time>
                  </div>
                </div>
              </div>

              <div className="my-8 h-px bg-[var(--border)]" />

              <div className="whitespace-pre-wrap text-[17px] leading-8 text-[var(--text)]">
                {post.content}
              </div>

              {post.fact_check && (
                <section className="mt-10 rounded-2xl border border-[var(--gold)]/40 bg-[var(--gold-light)] p-5 sm:p-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">
                        Fact check
                      </p>

                      <h2 className="mt-1 text-lg font-bold text-[var(--text)]">
                        Verification analysis
                      </h2>
                    </div>

                    <Verification
                      status={verificationStatus}
                    />
                  </div>

                  {post.fact_check.summary && (
                    <p className="mt-4 leading-7 text-[var(--text)]">
                      {post.fact_check.summary}
                    </p>
                  )}

                  {post.fact_check.confidence !== null &&
                    post.fact_check.confidence !==
                    undefined && (
                      <p className="mt-4 text-sm text-[var(--text-muted)]">
                        Model confidence:{" "}
                        <span className="font-semibold text-[var(--text)]">
                          {Math.round(
                            post.fact_check.confidence * 100,
                          )}
                          %
                        </span>
                      </p>
                    )}

                  {post.fact_check.model_name && (
                    <p className="mt-2 text-xs text-[var(--text-muted)]">
                      Analysis model:{" "}
                      {post.fact_check.model_name}
                    </p>
                  )}
                </section>
              )}

              <div className="mt-10 flex flex-wrap items-center gap-3 border-t border-[var(--border)] pt-6">
                <button
                  type="button"
                  onClick={() => void handleVote()}
                  disabled={voting}
                  className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-white px-5 py-3 text-sm font-bold text-[var(--text)] transition hover:border-[var(--primary)] hover:text-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {voting ? "Voting..." : "▲ Upvote"}

                  <span className="rounded-full bg-[var(--primary-light)] px-2 py-0.5 text-[var(--primary)]">
                    {post.votes}
                  </span>
                </button>

                <a
                  href="#comments"
                  className="rounded-xl border border-[var(--border)] bg-white px-5 py-3 text-sm font-semibold text-[var(--text-muted)] transition hover:border-[var(--primary)] hover:text-[var(--primary)]"
                >
                  {post.comments}{" "}
                  {post.comments === 1
                    ? "comment"
                    : "comments"}
                </a>
                {currentUserId === post.author.id && (
                  <button
                    type="button"
                    onClick={() => void handleDelete()}
                    disabled={deleting}
                    className="rounded-xl border border-[var(--danger)]/40 bg-white px-5 py-3 text-sm font-bold text-[var(--danger)] transition hover:border-[var(--danger)] hover:bg-[var(--danger)]/5 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {deleting ? "Deleting..." : "Delete post"}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => void handleShare()}
                  className="rounded-xl border border-[var(--border)] bg-white px-5 py-3 text-sm font-bold text-[var(--text)] transition hover:border-[var(--primary)] hover:text-[var(--primary)]"
                >
                  Share post
                </button>
              </div>

              {voteError && (
                <div className="mt-4 rounded-xl border border-[var(--danger)]/30 bg-[var(--danger)]/10 px-4 py-3 text-sm text-[var(--danger)]">
                  {voteError}
                </div>
              )}

              {deleteError && (
                <div className="mt-4 rounded-xl border border-[var(--danger)]/30 bg-[var(--danger)]/10 px-4 py-3 text-sm text-[var(--danger)]">
                  {deleteError}
                </div>
              )}

              {shareMessage && (
                <div className="mt-4 rounded-xl border border-[var(--primary)]/30 bg-[var(--primary-light)] px-4 py-3 text-sm font-semibold text-[var(--primary-dark)]">
                  {shareMessage}
                </div>
              )}
            </div>
          </article>

          <div id="comments" className="mt-8">
            <Comments
              postId={post.id}
            />
          </div>

          <section className="mt-8 rounded-2xl border border-[var(--border)] bg-white p-6">
            <h2 className="font-bold text-[var(--text)]">
              About VeriFit verification
            </h2>

            <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
              Content verification evaluates the evidence
              associated with a post. Professional credentials
              are verified separately. A fact-check status does
              not determine whether a person is professionally
              qualified.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}