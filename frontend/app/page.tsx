"use client";

import { useCallback, useEffect, useState } from "react";

import CreatePost from "@/components/CreatePost";
import Navbar from "@/components/Navbar";
import PostCard from "@/components/PostCard";
import ProfessionalCard from "@/components/ProfessionalCard";

import {
  getApiErrorMessage,
  getPosts,
  getProfessionals,
  type ApiPost,
  type ApiProfessional,
} from "@/lib/api";

const categories = [
  "All",
  "Training",
  "Nutrition",
  "Recovery",
  "Mental Wellness",
  "Supplements",
];

export default function HomePage() {
  const [posts, setPosts] = useState<ApiPost[]>([]);
  const [professionals, setProfessionals] = useState<
    ApiProfessional[]
  >([]);

  const [selectedCategory, setSelectedCategory] =
    useState("All");

  const [loadingPosts, setLoadingPosts] = useState(true);
  const [loadingProfessionals, setLoadingProfessionals] =
    useState(true);

  const [postsError, setPostsError] = useState<string | null>(
    null,
  );

  const [professionalsError, setProfessionalsError] =
    useState<string | null>(null);

  const loadPosts = useCallback(
    async (category: string) => {
      setLoadingPosts(true);
      setPostsError(null);

      try {
        const result = await getPosts({
          category:
            category === "All" ? undefined : category,
          limit: 20,
          offset: 0,
        });

        setPosts(result.posts);
      } catch (error) {
        setPostsError(getApiErrorMessage(error));
      } finally {
        setLoadingPosts(false);
      }
    },
    [],
  );

  const loadProfessionals = useCallback(async () => {
    setLoadingProfessionals(true);
    setProfessionalsError(null);

    try {
      const result = await getProfessionals();

      setProfessionals(result.professionals);
    } catch (error) {
      setProfessionalsError(getApiErrorMessage(error));
    } finally {
      setLoadingProfessionals(false);
    }
  }, []);

  useEffect(() => {
    void loadPosts(selectedCategory);
  }, [loadPosts, selectedCategory]);

  useEffect(() => {
    void loadProfessionals();
  }, [loadProfessionals]);

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <Navbar />

      {/* Hero */}
      <section className="border-b border-[var(--border)] bg-white">
        <div className="vf-container py-12 sm:py-16 lg:py-20">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--gold)]/40 bg-[var(--gold-light)] px-3 py-1.5 text-xs font-bold text-[#795b12]">
              <span className="h-2 w-2 rounded-full bg-[var(--gold)]" />
              Evidence-first fitness knowledge
            </div>

            <h1 className="mt-5 text-4xl font-black tracking-tight text-[var(--text)] sm:text-5xl lg:text-6xl">
              Fitness information you can{" "}
              <span className="text-[var(--primary)]">
                trust.
              </span>
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--text-muted)] sm:text-lg">
              Discover fitness knowledge, review evidence
              behind claims, and connect with qualified
              professionals.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <a
                href="#feed"
                className="vf-button bg-[var(--primary)] text-white hover:bg-[var(--primary-dark)]"
              >
                Explore knowledge
              </a>

              <a
                href="/professional"
                className="vf-button border border-[var(--border)] bg-white text-[var(--text)] hover:border-[var(--primary)] hover:text-[var(--primary)]"
              >
                Find a professional
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="border-b border-[var(--border)] bg-white">
        <div className="vf-container overflow-x-auto py-4">
          <div className="flex min-w-max gap-2">
            {categories.map((category) => {
              const active =
                selectedCategory === category;

              return (
                <button
                  key={category}
                  type="button"
                  onClick={() =>
                    setSelectedCategory(category)
                  }
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    active
                      ? "bg-[var(--primary)] text-white"
                      : "border border-[var(--border)] bg-white text-[var(--text-muted)] hover:border-[var(--primary)] hover:text-[var(--primary)]"
                  }`}
                >
                  {category}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Main */}
      <main
        id="feed"
        className="vf-container py-8 lg:py-10"
      >
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
          {/* Feed */}
          <section className="min-w-0">
            <CreatePost
              onPublished={() =>
                void loadPosts(selectedCategory)
              }
            />

            <div className="mt-8">
              <div className="mb-5 flex items-end justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-[var(--gold)]" />

                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--primary)]">
                      Community feed
                    </p>
                  </div>

                  <h2 className="mt-1 text-2xl font-black text-[var(--text)]">
                    Latest knowledge
                  </h2>
                </div>

                {!loadingPosts && (
                  <span className="text-sm text-[var(--text-muted)]">
                    {posts.length}{" "}
                    {posts.length === 1
                      ? "post"
                      : "posts"}
                  </span>
                )}
              </div>

              {loadingPosts && (
                <div className="space-y-5">
                  {[1, 2, 3].map((item) => (
                    <div
                      key={item}
                      className="vf-card animate-pulse"
                    >
                      <div className="h-5 w-40 rounded bg-[var(--border)]" />

                      <div className="mt-5 h-7 w-3/4 rounded bg-[var(--border)]" />

                      <div className="mt-3 h-4 w-full rounded bg-[var(--border)]" />

                      <div className="mt-2 h-4 w-5/6 rounded bg-[var(--border)]" />

                      <div className="mt-6 h-10 w-32 rounded-xl bg-[var(--border)]" />
                    </div>
                  ))}
                </div>
              )}

              {!loadingPosts && postsError && (
                <div className="vf-card border-[var(--danger)]/30">
                  <h3 className="font-bold text-[var(--text)]">
                    Could not load the feed
                  </h3>

                  <p className="mt-2 text-sm text-[var(--danger)]">
                    {postsError}
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      void loadPosts(
                        selectedCategory,
                      )
                    }
                    className="vf-button mt-4 bg-[var(--primary)] text-white hover:bg-[var(--primary-dark)]"
                  >
                    Try again
                  </button>
                </div>
              )}

              {!loadingPosts &&
                !postsError &&
                posts.length === 0 && (
                  <div className="vf-card text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--gold-light)] text-xl font-bold text-[var(--gold)]">
                      +
                    </div>

                    <h3 className="mt-4 text-lg font-black text-[var(--text)]">
                      No posts yet
                    </h3>

                    <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--text-muted)]">
                      Be the first to share useful
                      knowledge in this category.
                    </p>
                  </div>
                )}

              {!loadingPosts &&
                !postsError &&
                posts.length > 0 && (
                  <div className="space-y-5">
                    {posts.map((post) => (
                      <PostCard
                        key={post.id}
                        post={post}
                      />
                    ))}
                  </div>
                )}
            </div>
          </section>

          {/* Sidebar */}
          <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
            <div>
              <div className="mb-4">
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--gold)]" />

                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--primary)]">
                    Verified professionals
                  </p>
                </div>

                <h2 className="mt-1 text-xl font-black text-[var(--text)]">
                  Get professional guidance
                </h2>
              </div>

              {loadingProfessionals && (
                <div className="space-y-4">
                  {[1, 2].map((item) => (
                    <div
                      key={item}
                      className="vf-card animate-pulse"
                    >
                      <div className="h-12 w-12 rounded-2xl bg-[var(--border)]" />

                      <div className="mt-4 h-5 w-2/3 rounded bg-[var(--border)]" />

                      <div className="mt-2 h-4 w-1/2 rounded bg-[var(--border)]" />
                    </div>
                  ))}
                </div>
              )}

              {!loadingProfessionals &&
                professionalsError && (
                  <div className="vf-card">
                    <p className="text-sm text-[var(--danger)]">
                      {professionalsError}
                    </p>

                    <button
                      type="button"
                      onClick={() =>
                        void loadProfessionals()
                      }
                      className="mt-3 text-sm font-bold text-[var(--primary)]"
                    >
                      Retry
                    </button>
                  </div>
                )}

              {!loadingProfessionals &&
                !professionalsError &&
                professionals.length > 0 && (
                  <div className="space-y-4">
                    {professionals
                      .slice(0, 3)
                      .map((professional) => (
                        <ProfessionalCard
                          key={professional.id}
                          professional={professional}
                        />
                      ))}

                    <a
                      href="/professional"
                      className="block text-center text-sm font-bold text-[var(--primary)] hover:text-[var(--primary-dark)]"
                    >
                      View all professionals →
                    </a>
                  </div>
                )}

              {!loadingProfessionals &&
                !professionalsError &&
                professionals.length === 0 && (
                  <div className="vf-card">
                    <p className="text-sm text-[var(--text-muted)]">
                      No professionals are
                      available yet.
                    </p>
                  </div>
                )}
            </div>

            {/* Trust explanation */}
            <div className="rounded-2xl border border-[var(--gold)]/30 bg-[var(--gold-light)]/50 p-5">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-sm font-bold text-[#795b12] shadow-sm">
                  ✓
                </span>

                <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#795b12]">
                  How VeriFit works
                </p>
              </div>

              <div className="mt-5 space-y-4">
                <div className="flex gap-3">
                  <span className="text-xs font-black text-[#795b12]">
                    01
                  </span>

                  <div>
                    <p className="text-sm font-bold text-[var(--text)]">
                      Discover
                    </p>

                    <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
                      Explore community fitness
                      knowledge.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <span className="text-xs font-black text-[#795b12]">
                    02
                  </span>

                  <div>
                    <p className="text-sm font-bold text-[var(--text)]">
                      Check evidence
                    </p>

                    <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
                      Review fact-check information
                      attached to claims.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <span className="text-xs font-black text-[#795b12]">
                    03
                  </span>

                  <div>
                    <p className="text-sm font-bold text-[var(--text)]">
                      Consult
                    </p>

                    <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
                      Connect with verified
                      professionals when needed.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}