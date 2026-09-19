"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import {
  createComment,
  deleteComment,
  getApiErrorMessage,
  getComments,
  type ApiComment,
} from "@/lib/api";

interface CommentsProps {
  postId: string;
}

export default function Comments({
  postId,
}: CommentsProps) {
  const [comments, setComments] = useState<ApiComment[]>([]);
  const [content, setContent] = useState("");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(
    null,
  );

  const [error, setError] = useState("");
  const [submitError, setSubmitError] = useState("");

  async function loadComments() {
    setError("");

    try {
      const response = await getComments(postId);
      setComments(response.comments);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setLoading(true);
    void loadComments();
  }, [postId]);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const trimmedContent = content.trim();

    if (!trimmedContent) {
      setSubmitError("Comment cannot be empty.");
      return;
    }

    if (trimmedContent.length > 2000) {
      setSubmitError(
        "Comment must be 2000 characters or fewer.",
      );
      return;
    }

    if (submitting) {
      return;
    }

    setSubmitting(true);
    setSubmitError("");

    try {
      const newComment = await createComment(postId, {
        content: trimmedContent,
      });

      setComments((current) => [
        ...current,
        newComment,
      ]);

      setContent("");
    } catch (err) {
      setSubmitError(getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(commentId: string) {
    if (deletingId) {
      return;
    }

    setDeletingId(commentId);
    setError("");

    try {
      await deleteComment(commentId);

      setComments((current) =>
        current.filter(
          (comment) => comment.id !== commentId,
        ),
      );
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setDeletingId(null);
    }
  }

  function formatDate(value: string) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    return new Intl.DateTimeFormat("en", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  }

  return (
    <section className="mt-8">
      <div className="mb-5">
        <h2 className="text-xl font-bold text-[var(--text)]">
          Comments
        </h2>

        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Discuss the post and add useful context.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4"
      >
        <label
          htmlFor={`comment-${postId}`}
          className="mb-2 block text-sm font-semibold text-[var(--text)]"
        >
          Add a comment
        </label>

        <textarea
          id={`comment-${postId}`}
          value={content}
          onChange={(event) => {
            setContent(event.target.value);

            if (submitError) {
              setSubmitError("");
            }
          }}
          placeholder="Share your thoughts..."
          rows={4}
          maxLength={2000}
          disabled={submitting}
          className="vf-input min-h-[110px] w-full resize-y"
        />

        <div className="mt-2 flex items-center justify-between gap-4">
          <span className="text-xs text-[var(--text-muted)]">
            {content.length}/2000
          </span>

          <button
            type="submit"
            disabled={
              submitting || !content.trim()
            }
            className="rounded-xl bg-[var(--primary)] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[var(--primary-dark)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting
              ? "Posting..."
              : "Post comment"}
          </button>
        </div>

        {submitError && (
          <div className="mt-3 rounded-xl border border-[var(--danger)]/30 bg-red-50 px-4 py-3 text-sm text-[var(--danger)]">
            {submitError}
          </div>
        )}
      </form>

      {loading && (
        <div className="mt-5 space-y-3">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4"
            >
              <div className="h-4 w-32 rounded bg-[var(--border)]" />
              <div className="mt-3 h-4 w-full rounded bg-[var(--border)]" />
              <div className="mt-2 h-4 w-3/4 rounded bg-[var(--border)]" />
            </div>
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="mt-5 rounded-2xl border border-[var(--danger)]/30 bg-red-50 p-4">
          <p className="text-sm text-[var(--danger)]">
            {error}
          </p>

          <button
            type="button"
            onClick={() => {
              setLoading(true);
              void loadComments();
            }}
            className="mt-3 rounded-lg border border-[var(--danger)]/30 px-3 py-2 text-sm font-semibold text-[var(--danger)] transition hover:bg-white"
          >
            Try again
          </button>
        </div>
      )}

      {!loading &&
        !error &&
        comments.length === 0 && (
          <div className="mt-5 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--background)] p-8 text-center">
            <p className="text-sm font-semibold text-[var(--text)]">
              No comments yet
            </p>

            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Be the first person to contribute to the
              discussion.
            </p>
          </div>
        )}

      {!loading &&
        !error &&
        comments.length > 0 && (
          <div className="mt-5 space-y-3">
            {comments.map((comment) => (
              <article
                key={comment.id}
                className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    {comment.author?.avatar_url ? (
                      <img
                        src={comment.author.avatar_url}
                        alt=""
                        className="h-9 w-9 shrink-0 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--primary-light)] text-sm font-bold text-[var(--primary-dark)]">
                        {(
                          comment.author?.display_name ||
                          "U"
                        )
                          .charAt(0)
                          .toUpperCase()}
                      </div>
                    )}

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-sm font-bold text-[var(--text)]">
                          {comment.author?.display_name ||
                            "User"}
                        </span>

                        {comment.author?.role ===
                          "PROFESSIONAL" && (
                          <span className="rounded-full bg-[var(--gold-light)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#795b12]">
                            Professional
                          </span>
                        )}

                        {comment.author?.role ===
                          "ADMIN" && (
                          <span className="rounded-full bg-[var(--primary-light)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--primary-dark)]">
                            Admin
                          </span>
                        )}
                      </div>

                      <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                        {formatDate(comment.created_at)}
                      </p>
                    </div>
                  </div>

                  {/* 
                   * The current ApiComment contract does not expose
                   * can_delete. For now, deletion is available through
                   * the UI only when the comment belongs to the current
                   * user after we add ownership information to the API.
                   */}
                  <button
                    type="button"
                    onClick={() =>
                      void handleDelete(comment.id)
                    }
                    disabled={
                      deletingId === comment.id
                    }
                    className="shrink-0 text-xs font-semibold text-[var(--danger)] transition hover:underline disabled:opacity-50"
                  >
                    {deletingId === comment.id
                      ? "Deleting..."
                      : "Delete"}
                  </button>
                </div>

                <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-[var(--text)]">
                  {comment.content}
                </p>
              </article>
            ))}
          </div>
        )}
    </section>
  );
}