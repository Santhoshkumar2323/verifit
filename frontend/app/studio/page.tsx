"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import Navbar from "@/components/Navbar";
import Verification from "@/components/Verification";

import {
  createPost,
  getApiErrorMessage,
  getMyCredentials,
  getMyProfessionalProfile,
  getPosts,
  type ApiCredential,
  type ApiPost,
  type ApiProfessional,
} from "@/lib/api";

type StudioTab =
  | "overview"
  | "posts"
  | "credentials"
  | "rewards";

function formatDate(dateString: string) {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatRelativeDate(dateString: string) {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const diff = Date.now() - date.getTime();
  const seconds = Math.floor(diff / 1000);

  if (seconds < 60) {
    return "Just now";
  }

  const minutes = Math.floor(seconds / 60);

  if (minutes < 60) {
    return `${minutes} min ago`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours} hr ago`;
  }

  const days = Math.floor(hours / 24);

  if (days < 30) {
    return `${days} day${days === 1 ? "" : "s"} ago`;
  }

  return formatDate(dateString);
}

function getInitials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "P"
  );
}

function formatVerificationLabel(
  status: ApiProfessional["verification_status"],
) {
  switch (status) {
    case "VERIFIED":
      return "Verified";

    case "REJECTED":
      return "Rejected";

    case "PENDING":
    default:
      return "Pending";
  }
}

function credentialStatusClasses(status: ApiCredential["status"]) {
  if (status === "VERIFIED") {
    return "border-[var(--vf-gold)]/40 bg-[var(--vf-gold-light)] text-[#795b12]";
  }

  if (status === "REJECTED") {
    return "border-[var(--vf-danger)]/30 bg-red-50 text-[var(--vf-danger)]";
  }

  return "border-[var(--vf-border)] bg-[var(--vf-background)] text-[var(--vf-text-muted)]";
}

function credentialStatusLabel(status: ApiCredential["status"]) {
  switch (status) {
    case "VERIFIED":
      return "Verified";

    case "REJECTED":
      return "Rejected";

    case "PENDING":
    default:
      return "Pending review";
  }
}

export default function StudioPage() {
  const [activeTab, setActiveTab] =
    useState<StudioTab>("overview");

  const [professional, setProfessional] =
    useState<ApiProfessional | null>(null);

  const [credentials, setCredentials] =
    useState<ApiCredential[]>([]);

  const [posts, setPosts] = useState<ApiPost[]>([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [showComposer, setShowComposer] =
    useState(false);

  const [title, setTitle] = useState("");

  const [postText, setPostText] = useState("");

  const [category, setCategory] = useState("");

  const [publishing, setPublishing] =
    useState(false);

  const [publishError, setPublishError] =
    useState("");

  const [publishSuccess, setPublishSuccess] =
    useState("");

  async function loadStudio() {
    try {
      setLoading(true);
      setError("");

      const profile =
        await getMyProfessionalProfile();

      const [credentialData, postData] =
        await Promise.all([
          getMyCredentials(),
          getPosts({
            limit: 100,
            offset: 0,
          }),
        ]);

      const ownPosts = postData.posts.filter(
        (post) =>
          post.author?.id === profile.user_id,
      );

      setProfessional(profile);
      setCredentials(credentialData);
      setPosts(ownPosts);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadStudio();
  }, []);

  const helpfulVotes = useMemo(
    () =>
      posts.reduce(
        (total, post) => total + post.votes,
        0,
      ),
    [posts],
  );

  const verifiedCredentials = useMemo(
    () =>
      credentials.filter(
        (credential) =>
          credential.status === "VERIFIED",
      ).length,
    [credentials],
  );

  async function publishPost() {
    if (!title.trim() || !postText.trim()) {
      return;
    }

    try {
      setPublishing(true);
      setPublishError("");
      setPublishSuccess("");

      const createdPost = await createPost({
        title: title.trim(),
        content: postText.trim(),
        category: category.trim() || undefined,
      });

      setPosts((current) => [
        createdPost,
        ...current.filter(
          (post) => post.id !== createdPost.id,
        ),
      ]);

      setTitle("");
      setPostText("");
      setCategory("");

      setPublishSuccess(
        "Your post was published successfully.",
      );

      setShowComposer(false);
    } catch (err) {
      setPublishError(
        getApiErrorMessage(err),
      );
    } finally {
      setPublishing(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[var(--vf-background)]">
        <Navbar />

        <div className="vf-container py-10">
          <div className="vf-card p-8">
            <div className="animate-pulse space-y-5">
              <div className="h-28 rounded-xl bg-[var(--vf-border)]" />

              <div className="h-8 w-64 rounded bg-[var(--vf-border)]" />

              <div className="h-4 w-96 max-w-full rounded bg-[var(--vf-border)]" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (error || !professional) {
    return (
      <main className="min-h-screen bg-[var(--vf-background)]">
        <Navbar />

        <div className="vf-container py-10">
          <section className="vf-card p-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-xl text-[var(--vf-danger)]">
              !
            </div>

            <h1 className="mt-5 text-xl font-bold text-[var(--vf-text)]">
              Studio unavailable
            </h1>

            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-[var(--vf-text-muted)]">
              {error ||
                "A professional profile could not be loaded."}
            </p>

            <button
              type="button"
              onClick={() => void loadStudio()}
              className="vf-button mt-6 rounded-xl bg-[var(--vf-primary)] px-5 py-3 text-sm font-semibold text-white hover:bg-[var(--vf-primary-dark)]"
            >
              Try again
            </button>
          </section>
        </div>
      </main>
    );
  }

  const initials = getInitials(
    professional.name,
  );

  const verificationBadgeStatus =
    professional.verified
      ? "verified"
      : "pending";

  return (
    <main className="min-h-screen bg-[var(--vf-background)]">
      <Navbar />

      <div className="vf-container py-8 md:py-10">
        {/* Header */}
        <section className="vf-card overflow-hidden">
          <div className="relative h-28 bg-[var(--vf-black)] md:h-36">
            <div className="absolute right-6 top-6 h-20 w-20 rounded-full border border-[var(--vf-gold)]/20 bg-[var(--vf-gold)]/10 blur-2xl" />
          </div>

          <div className="px-5 pb-6 md:px-8 md:pb-8">
            <div className="-mt-12 flex flex-col gap-5 md:-mt-14 md:flex-row md:items-end md:justify-between">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                {professional.avatar_url ? (
                  <img
                    src={professional.avatar_url}
                    alt={professional.name}
                    className="h-24 w-24 shrink-0 rounded-3xl border-4 border-white object-cover shadow-md md:h-28 md:w-28"
                  />
                ) : (
                  <div className="relative flex h-24 w-24 shrink-0 items-center justify-center rounded-3xl border-4 border-white bg-[var(--vf-primary)] text-2xl font-bold text-white shadow-md md:h-28 md:w-28">
                    {initials}

                    {professional.verified && (
                      <span
                        aria-hidden="true"
                        className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-[var(--vf-gold)] text-sm font-black text-white shadow-sm"
                      >
                        ✓
                      </span>
                    )}
                  </div>
                )}

                <div className="pb-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-2xl font-bold tracking-tight text-[var(--vf-text)]">
                      {professional.name}
                    </h1>

                    <Verification
                      status={verificationBadgeStatus}
                      label={
                        professional.verified
                          ? "Verified Professional"
                          : formatVerificationLabel(
                              professional.verification_status,
                            )
                      }
                      size="sm"
                    />
                  </div>

                  <p className="mt-1 text-sm text-[var(--vf-text-muted)]">
                    {professional.specialization}
                    {" · "}
                    {professional.experience_years}{" "}
                    {professional.experience_years ===
                    1
                      ? "year"
                      : "years"}{" "}
                    experience
                  </p>

                  {professional.bio && (
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--vf-text-muted)]">
                      {professional.bio}
                    </p>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setPublishError("");
                  setPublishSuccess("");
                  setShowComposer(true);
                }}
                className="vf-button rounded-xl bg-[var(--vf-primary)] px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[var(--vf-primary-dark)]"
              >
                + Share a post
              </button>
            </div>
          </div>
        </section>

        {/* Navigation */}
        <div className="mt-6 overflow-x-auto border-b border-[var(--vf-border)]">
          <div className="flex min-w-max gap-1">
            {[
              ["overview", "Overview"],
              ["posts", "Post history"],
              ["credentials", "Credentials"],
              ["rewards", "Community rewards"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() =>
                  setActiveTab(
                    value as StudioTab,
                  )
                }
                className={`px-4 py-3 text-sm font-semibold transition ${
                  activeTab === value
                    ? "border-b-2 border-[var(--vf-gold)] text-[var(--vf-text)]"
                    : "text-[var(--vf-text-muted)] hover:text-[var(--vf-text)]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Composer */}
        {showComposer && (
          <section className="vf-card vf-fade-up mt-6 p-5 md:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-[var(--vf-text)]">
                  Share with the community
                </h2>

                <p className="mt-1 text-sm text-[var(--vf-text-muted)]">
                  Publish useful fitness knowledge
                  for the VeriFit community.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowComposer(false)
                }
                className="text-sm font-medium text-[var(--vf-text-muted)] hover:text-[var(--vf-text)]"
              >
                Close
              </button>
            </div>

            <div className="mt-5 grid gap-4">
              <input
                value={title}
                onChange={(event) =>
                  setTitle(event.target.value)
                }
                placeholder="Post title"
                className="vf-input w-full rounded-xl"
              />

              <input
                value={category}
                onChange={(event) =>
                  setCategory(event.target.value)
                }
                placeholder="Category (optional)"
                className="vf-input w-full rounded-xl"
              />

              <textarea
                value={postText}
                onChange={(event) =>
                  setPostText(event.target.value)
                }
                placeholder="What would you like to share?"
                rows={6}
                className="vf-focus w-full resize-none rounded-xl border border-[var(--vf-border)] bg-[var(--vf-background)] p-4 text-sm leading-6 outline-none focus:border-[var(--vf-primary)]"
              />
            </div>

            {publishError && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-[var(--vf-danger)]">
                {publishError}
              </div>
            )}

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-xs text-[var(--vf-text-muted)]">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--vf-gold)]" />

                <span>
                  Claims may be reviewed against
                  available evidence.
                </span>
              </div>

              <button
                type="button"
                onClick={() => void publishPost()}
                disabled={
                  publishing ||
                  !title.trim() ||
                  !postText.trim()
                }
                className="vf-button rounded-xl bg-[var(--vf-primary)] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
              >
                {publishing
                  ? "Publishing..."
                  : "Publish"}
              </button>
            </div>
          </section>
        )}

        {publishSuccess && (
          <div className="mt-5 rounded-xl border border-[var(--vf-primary)]/20 bg-[var(--vf-primary-light)] px-4 py-3 text-sm text-[var(--vf-primary-dark)]">
            {publishSuccess}
          </div>
        )}

        {/* Overview */}
        {activeTab === "overview" && (
          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
            <div className="space-y-6">
              {/* Real statistics */}
              <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <div className="vf-card p-4">
                  <p className="text-2xl font-bold text-[var(--vf-text)]">
                    {posts.length}
                  </p>

                  <p className="mt-1 text-xs leading-5 text-[var(--vf-text-muted)]">
                    Posts published
                  </p>
                </div>

                <div className="vf-card p-4">
                  <p className="text-2xl font-bold text-[var(--vf-text)]">
                    {helpfulVotes}
                  </p>

                  <p className="mt-1 text-xs leading-5 text-[var(--vf-text-muted)]">
                    Helpful votes
                  </p>
                </div>

                <div className="vf-card p-4">
                  <p className="text-2xl font-bold text-[var(--vf-text)]">
                    {verifiedCredentials}
                  </p>

                  <p className="mt-1 text-xs leading-5 text-[var(--vf-text-muted)]">
                    Verified credentials
                  </p>
                </div>

                <div className="vf-card p-4">
                  <p className="text-2xl font-bold text-[var(--vf-text)]">
                    {professional.experience_years}
                  </p>

                  <p className="mt-1 text-xs leading-5 text-[var(--vf-text-muted)]">
                    Years experience
                  </p>
                </div>
              </section>

              {/* Recent posts */}
              <section className="vf-card p-5 md:p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-bold text-[var(--vf-text)]">
                      Recent posts
                    </h2>

                    <p className="mt-1 text-sm text-[var(--vf-text-muted)]">
                      Your latest community
                      contributions.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setActiveTab("posts")
                    }
                    className="text-sm font-semibold text-[var(--vf-primary)] hover:underline"
                  >
                    View all
                  </button>
                </div>

                <div className="mt-5 divide-y divide-[var(--vf-border)]">
                  {posts.length === 0 ? (
                    <div className="py-8 text-center">
                      <p className="text-sm text-[var(--vf-text-muted)]">
                        You have not published any
                        posts yet.
                      </p>

                      <button
                        type="button"
                        onClick={() =>
                          setShowComposer(true)
                        }
                        className="mt-3 text-sm font-semibold text-[var(--vf-primary)]"
                      >
                        Create your first post
                      </button>
                    </div>
                  ) : (
                    posts
                      .slice(0, 5)
                      .map((post) => (
                        <Link
                          key={post.id}
                          href={`/post/${post.id}`}
                          className="vf-interactive block py-4 first:pt-0 last:pb-0"
                        >
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                {post.category && (
                                  <span className="rounded-full bg-[var(--vf-primary-light)] px-2.5 py-1 text-[11px] font-semibold text-[var(--vf-primary-dark)]">
                                    {post.category}
                                  </span>
                                )}

                                <span className="text-xs text-[var(--vf-text-muted)]">
                                  {formatRelativeDate(
                                    post.created_at,
                                  )}
                                </span>
                              </div>

                              <h3 className="mt-2 font-semibold text-[var(--vf-text)]">
                                {post.title}
                              </h3>
                            </div>

                            <div className="flex shrink-0 gap-4 text-xs text-[var(--vf-text-muted)]">
                              <span>
                                {post.votes} votes
                              </span>

                              <span>
                                {post.comments} comments
                              </span>
                            </div>
                          </div>
                        </Link>
                      ))
                  )}
                </div>
              </section>
            </div>

            {/* Verification panel */}
            <aside className="space-y-6">
              <section className="vf-card p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--vf-gold)]/30 bg-[var(--vf-gold-light)] text-[var(--vf-gold-dark)]">
                    ✓
                  </div>

                  <div>
                    <h2 className="font-bold text-[var(--vf-text)]">
                      Professional verification
                    </h2>

                    <p className="text-xs text-[var(--vf-text-muted)]">
                      {formatVerificationLabel(
                        professional.verification_status,
                      )}
                    </p>
                  </div>
                </div>

                <div className="mt-5 rounded-xl border border-[var(--vf-gold)]/30 bg-[var(--vf-gold-light)]/40 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-[var(--vf-text-muted)]">
                      Verification status
                    </span>

                    <Verification
                      status={
                        professional.verified
                          ? "verified"
                          : "pending"
                      }
                      size="sm"
                    />
                  </div>

                  <p className="mt-3 text-sm leading-6 text-[var(--vf-text-muted)]">
                    Verification is controlled by the
                    backend professional verification
                    workflow.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setActiveTab("credentials")
                  }
                  className="mt-4 w-full rounded-xl border border-[var(--vf-border)] px-4 py-2.5 text-sm font-semibold text-[var(--vf-text)] hover:bg-[var(--vf-background)]"
                >
                  Manage credentials
                </button>
              </section>

              <section className="vf-card p-5">
                <h2 className="font-bold text-[var(--vf-text)]">
                  Profile information
                </h2>

                <div className="mt-4 space-y-3">
                  <div className="rounded-xl bg-[var(--vf-background)] p-3">
                    <p className="text-xs text-[var(--vf-text-muted)]">
                      Specialization
                    </p>

                    <p className="mt-1 text-sm font-semibold text-[var(--vf-text)]">
                      {professional.specialization}
                    </p>
                  </div>

                  <div className="rounded-xl bg-[var(--vf-background)] p-3">
                    <p className="text-xs text-[var(--vf-text-muted)]">
                      Experience
                    </p>

                    <p className="mt-1 text-sm font-semibold text-[var(--vf-text)]">
                      {professional.experience_years}{" "}
                      {professional.experience_years ===
                      1
                        ? "year"
                        : "years"}
                    </p>
                  </div>
                </div>
              </section>
            </aside>
          </div>
        )}

        {/* Posts */}
        {activeTab === "posts" && (
          <section className="vf-card mt-6 p-5 md:p-6">
            <div>
              <h2 className="text-xl font-bold text-[var(--vf-text)]">
                Post history
              </h2>

              <p className="mt-1 text-sm text-[var(--vf-text-muted)]">
                Your actual published community
                content.
              </p>
            </div>

            <div className="mt-6 space-y-3">
              {posts.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[var(--vf-border)] p-8 text-center">
                  <p className="text-sm text-[var(--vf-text-muted)]">
                    No posts published yet.
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      setShowComposer(true)
                    }
                    className="mt-3 text-sm font-semibold text-[var(--vf-primary)]"
                  >
                    Share your first post
                  </button>
                </div>
              ) : (
                posts.map((post) => (
                  <div
                    key={post.id}
                    className="rounded-2xl border border-[var(--vf-border)] p-4"
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          {post.category && (
                            <span className="rounded-full bg-[var(--vf-primary-light)] px-2.5 py-1 text-[11px] font-semibold text-[var(--vf-primary-dark)]">
                              {post.category}
                            </span>
                          )}

                          <span className="text-xs text-[var(--vf-text-muted)]">
                            {formatDate(
                              post.created_at,
                            )}
                          </span>
                        </div>

                        <h3 className="mt-2 font-semibold text-[var(--vf-text)]">
                          {post.title}
                        </h3>

                        <p className="mt-2 line-clamp-2 text-sm leading-6 text-[var(--vf-text-muted)]">
                          {post.content}
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-4 text-xs text-[var(--vf-text-muted)]">
                        <span>
                          {post.votes} votes
                        </span>

                        <span>
                          {post.comments} comments
                        </span>

                        <Link
                          href={`/post/${post.id}`}
                          className="font-semibold text-[var(--vf-primary)]"
                        >
                          Open
                        </Link>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        )}

        {/* Credentials */}
        {activeTab === "credentials" && (
          <section className="vf-card mt-6 p-5 md:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-xl font-bold text-[var(--vf-text)]">
                  Certificates & credentials
                </h2>

                <p className="mt-1 max-w-2xl text-sm leading-6 text-[var(--vf-text-muted)]">
                  Credentials submitted through your
                  professional profile.
                </p>
              </div>

              <Link
                href="/professional/register"
                className="vf-button rounded-xl border border-[var(--vf-border)] px-4 py-2.5 text-center text-sm font-semibold text-[var(--vf-text)] hover:bg-[var(--vf-background)]"
              >
                Manage credentials
              </Link>
            </div>

            <div className="mt-6 grid gap-3">
              {credentials.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[var(--vf-border)] p-8 text-center">
                  <p className="text-sm text-[var(--vf-text-muted)]">
                    No credentials have been submitted
                    yet.
                  </p>

                  <Link
                    href="/professional/register"
                    className="mt-3 inline-block text-sm font-semibold text-[var(--vf-primary)]"
                  >
                    Submit a credential
                  </Link>
                </div>
              ) : (
                credentials.map((credential) => {
                  const isVerified =
                    credential.status ===
                    "VERIFIED";

                  return (
                    <div
                      key={credential.id}
                      className={`rounded-2xl border p-4 ${
                        isVerified
                          ? "border-[var(--vf-gold)]/30 bg-[var(--vf-gold-light)]/20"
                          : "border-[var(--vf-border)]"
                      }`}
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex gap-3">
                          <div
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                              isVerified
                                ? "border border-[var(--vf-gold)]/30 bg-[var(--vf-gold-light)] text-[var(--vf-gold-dark)]"
                                : "bg-[var(--vf-background)] text-[var(--vf-text-muted)]"
                            }`}
                          >
                            {isVerified
                              ? "✓"
                              : "•"}
                          </div>

                          <div>
                            <h3 className="font-semibold text-[var(--vf-text)]">
                              {
                                credential.credential_name
                              }
                            </h3>

                            <div className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-sm text-[var(--vf-text-muted)]">
                              {credential.issuer && (
                                <span>
                                  {
                                    credential.issuer
                                  }
                                </span>
                              )}

                              {credential.credential_type && (
                                <>
                                  <span>·</span>

                                  <span>
                                    {
                                      credential.credential_type
                                    }
                                  </span>
                                </>
                              )}
                            </div>

                            {credential.credential_number && (
                              <p className="mt-1 text-xs text-[var(--vf-text-muted)]">
                                Credential number:{" "}
                                {
                                  credential.credential_number
                                }
                              </p>
                            )}
                          </div>
                        </div>

                        <span
                          className={`w-fit rounded-full px-3 py-1.5 text-xs font-semibold ${credentialStatusClasses(
                            credential.status,
                          )}`}
                        >
                          {credentialStatusLabel(
                            credential.status,
                          )}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        )}

        {/* Rewards */}
        {activeTab === "rewards" && (
          <section className="mt-6">
            <div className="vf-card p-6 md:p-8">
              <div className="mx-auto max-w-2xl text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--vf-gold)]/30 bg-[var(--vf-gold-light)] text-2xl text-[var(--vf-gold-dark)]">
                  ★
                </div>

                <h2 className="mt-5 text-xl font-bold text-[var(--vf-text)]">
                  Community rewards
                </h2>

                <p className="mt-2 text-sm leading-6 text-[var(--vf-text-muted)]">
                  Reward and recognition metrics are
                  not connected to the backend yet.
                </p>

                <div className="mt-6 rounded-2xl border border-[var(--vf-border)] bg-[var(--vf-background)] p-5 text-left">
                  <p className="text-sm font-semibold text-[var(--vf-text)]">
                    Current data available
                  </p>

                  <ul className="mt-3 space-y-2 text-sm text-[var(--vf-text-muted)]">
                    <li>
                      • Published posts:{" "}
                      {posts.length}
                    </li>

                    <li>
                      • Helpful votes:{" "}
                      {helpfulVotes}
                    </li>

                    <li>
                      • Verified credentials:{" "}
                      {verifiedCredentials}
                    </li>
                  </ul>
                </div>

                <p className="mt-5 text-xs leading-5 text-[var(--vf-text-muted)]">
                  No reward points or ranking numbers
                  are displayed until the corresponding
                  backend data model exists.
                </p>
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}