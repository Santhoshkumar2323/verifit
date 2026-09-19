"use client";

import {
  type FormEvent,
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase";

type AuthMode = "login" | "signup";
type SignupRole = "USER" | "PROFESSIONAL";

export default function AuthPage() {
  const router = useRouter();

  const [mode, setMode] = useState<AuthMode>("login");
  const [signupRole, setSignupRole] =
    useState<SignupRole>("USER");

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] =
    useState(true);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function checkSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!mounted) {
        return;
      }

      if (session) {
        router.replace("/");
        return;
      }

      setCheckingSession(false);
    }

    void checkSession();

    return () => {
      mounted = false;
    };
  }, [router]);

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode);
    setError("");
    setMessage("");
  }

  function switchSignupRole(nextRole: SignupRole) {
    setSignupRole(nextRole);
    setError("");
    setMessage("");
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError("");
    setMessage("");
    setLoading(true);

    try {
      if (mode === "signup") {
        const trimmedName = displayName.trim();
        const trimmedEmail = email.trim();

        if (trimmedName.length < 2) {
          throw new Error(
            "Display name must contain at least 2 characters.",
          );
        }

        if (password.length < 6) {
          throw new Error(
            "Password must contain at least 6 characters.",
          );
        }

        const { data, error: signUpError } =
          await supabase.auth.signUp({
            email: trimmedEmail,
            password,
            options: {
              data: {
                display_name: trimmedName,
                role: signupRole,
              },
            },
          });

        if (signUpError) {
          throw signUpError;
        }

        /*
         * If email confirmation is disabled, Supabase may return
         * a session immediately. In that case we can continue
         * onboarding directly.
         */
        if (data.session) {
          if (signupRole === "PROFESSIONAL") {
            router.replace(
              "/professional/register",
            );
          } else {
            router.replace("/");
          }

          return;
        }

        /*
         * When email confirmation is enabled, there is no
         * authenticated session yet. The user must confirm
         * their email and then sign in.
         */
        setMessage(
          signupRole === "PROFESSIONAL"
            ? "Account created. Check your email if confirmation is required, then sign in to continue professional registration."
            : "Account created. Check your email if confirmation is required, then sign in.",
        );

        setMode("login");
        setPassword("");
        return;
      }

      const trimmedEmail = email.trim();

      const {
        data,
        error: signInError,
      } =
        await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password,
        });

      if (signInError) {
        throw signInError;
      }

      if (!data.session) {
        throw new Error(
          "Sign-in completed without an active session. Please try again.",
        );
      }

      /*
       * Do not use signup metadata as an authorization source.
       * The backend reads the authenticated user's actual role.
       *
       * The root page is safe for every authenticated role.
       * Professional-specific authorization is enforced by the
       * backend and professional onboarding routes.
       */
      router.replace("/");
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(
          "Authentication failed. Please try again.",
        );
      }
    } finally {
      setLoading(false);
    }
  }

  if (checkingSession) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--background)] px-6">
        <div className="text-sm text-[var(--text-muted)]">
          Checking session...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--background)]">
      <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-6 py-10">
        <div className="grid w-full overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)] shadow-[0_20px_60px_rgba(16,23,22,0.08)] md:grid-cols-2">
          {/* Brand panel */}
          <section className="hidden bg-[var(--primary-dark)] p-10 text-white md:flex md:flex-col md:justify-between">
            <div>
              <div className="mb-8 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--gold)] text-lg font-black text-[var(--black)]">
                  V
                </div>

                <span className="text-2xl font-bold tracking-tight">
                  VeriFit
                </span>
              </div>

              <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--gold)]">
                Verified fitness knowledge
              </p>

              <h1 className="max-w-md text-4xl font-bold leading-tight">
                Discover fitness information with
                context you can trust.
              </h1>

              <p className="mt-5 max-w-md text-sm leading-7 text-white/75">
                Explore posts, qualified professionals,
                evidence and community knowledge in one
                place.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="mb-2 flex items-center gap-2">
                <span className="text-[var(--gold)]">
                  ✓
                </span>

                <span className="font-semibold">
                  Verification matters
                </span>
              </div>

              <p className="text-sm leading-6 text-white/65">
                Professional credentials and content
                verification are handled as separate trust
                signals.
              </p>
            </div>
          </section>

          {/* Authentication panel */}
          <section className="p-6 sm:p-10">
            <div className="mx-auto max-w-md">
              <div className="mb-8 flex items-center gap-3 md:hidden">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary)] font-black text-white">
                  V
                </div>

                <span className="text-xl font-bold text-[var(--text)]">
                  VeriFit
                </span>
              </div>

              <div className="mb-8">
                <p className="mb-2 text-sm font-semibold text-[var(--primary)]">
                  {mode === "login"
                    ? "Welcome back"
                    : "Create your account"}
                </p>

                <h2 className="text-3xl font-bold tracking-tight text-[var(--text)]">
                  {mode === "login"
                    ? "Sign in to VeriFit"
                    : "Join VeriFit"}
                </h2>

                <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
                  {mode === "login"
                    ? "Continue to your verified fitness community."
                    : "Create an account to participate in the VeriFit community."}
                </p>
              </div>

              {/* Mode switch */}
              <div className="mb-7 grid grid-cols-2 rounded-xl bg-[var(--background)] p-1">
                <button
                  type="button"
                  onClick={() =>
                    switchMode("login")
                  }
                  className={`rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
                    mode === "login"
                      ? "bg-white text-[var(--primary-dark)] shadow-sm"
                      : "text-[var(--text-muted)]"
                  }`}
                >
                  Sign in
                </button>

                <button
                  type="button"
                  onClick={() =>
                    switchMode("signup")
                  }
                  className={`rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
                    mode === "signup"
                      ? "bg-white text-[var(--primary-dark)] shadow-sm"
                      : "text-[var(--text-muted)]"
                  }`}
                >
                  Create account
                </button>
              </div>

              <form
                onSubmit={handleSubmit}
                className="space-y-5"
              >
                {mode === "signup" && (
                  <>
                    {/* Account type */}
                    <div>
                      <div className="mb-2 block text-sm font-semibold text-[var(--text)]">
                        Account type
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() =>
                            switchSignupRole("USER")
                          }
                          className={`rounded-xl border px-4 py-4 text-left transition ${
                            signupRole === "USER"
                              ? "border-[var(--primary)] bg-[var(--primary-light)]"
                              : "border-[var(--border)] bg-white hover:border-[var(--primary)]/50"
                          }`}
                        >
                          <div
                            className={`text-sm font-bold ${
                              signupRole === "USER"
                                ? "text-[var(--primary-dark)]"
                                : "text-[var(--text)]"
                            }`}
                          >
                            User
                          </div>

                          <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
                            Discover knowledge, follow
                            posts and connect with
                            professionals.
                          </p>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            switchSignupRole(
                              "PROFESSIONAL",
                            )
                          }
                          className={`rounded-xl border px-4 py-4 text-left transition ${
                            signupRole ===
                            "PROFESSIONAL"
                              ? "border-[var(--gold)] bg-[var(--gold-light)]"
                              : "border-[var(--border)] bg-white hover:border-[var(--gold)]/60"
                          }`}
                        >
                          <div
                            className={`text-sm font-bold ${
                              signupRole ===
                              "PROFESSIONAL"
                                ? "text-[#795b12]"
                                : "text-[var(--text)]"
                            }`}
                          >
                            Professional
                          </div>

                          <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
                            Build a professional profile
                            and submit credentials for
                            verification.
                          </p>
                        </button>
                      </div>

                      {signupRole ===
                        "PROFESSIONAL" && (
                        <div className="mt-3 rounded-xl border border-[var(--gold)]/40 bg-[var(--gold-light)] px-4 py-3">
                          <p className="text-xs leading-5 text-[#795b12]">
                            Professional registration does
                            not automatically grant verified
                            status. Credentials must be
                            reviewed before the professional
                            can receive bookings.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Display name */}
                    <div>
                      <label
                        htmlFor="displayName"
                        className="mb-2 block text-sm font-semibold text-[var(--text)]"
                      >
                        Display name
                      </label>

                      <input
                        id="displayName"
                        type="text"
                        value={displayName}
                        onChange={(event) =>
                          setDisplayName(
                            event.target.value,
                          )
                        }
                        placeholder="Your name"
                        autoComplete="name"
                        required
                        className="vf-input w-full"
                      />
                    </div>
                  </>
                )}

                {/* Email */}
                <div>
                  <label
                    htmlFor="email"
                    className="mb-2 block text-sm font-semibold text-[var(--text)]"
                  >
                    Email
                  </label>

                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(event) =>
                      setEmail(event.target.value)
                    }
                    placeholder="you@example.com"
                    autoComplete="email"
                    required
                    className="vf-input w-full"
                  />
                </div>

                {/* Password */}
                <div>
                  <label
                    htmlFor="password"
                    className="mb-2 block text-sm font-semibold text-[var(--text)]"
                  >
                    Password
                  </label>

                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(event) =>
                      setPassword(event.target.value)
                    }
                    placeholder="Enter your password"
                    autoComplete={
                      mode === "login"
                        ? "current-password"
                        : "new-password"
                    }
                    minLength={6}
                    required
                    className="vf-input w-full"
                  />

                  {mode === "signup" && (
                    <p className="mt-2 text-xs text-[var(--text-muted)]">
                      Use at least 6 characters.
                    </p>
                  )}
                </div>

                {error && (
                  <div className="rounded-xl border border-[var(--danger)]/30 bg-red-50 px-4 py-3 text-sm text-[var(--danger)]">
                    {error}
                  </div>
                )}

                {message && (
                  <div className="rounded-xl border border-[var(--primary)]/25 bg-[var(--primary-light)] px-4 py-3 text-sm text-[var(--primary-dark)]">
                    {message}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-[var(--primary)] px-5 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-[var(--primary-dark)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading
                    ? "Please wait..."
                    : mode === "login"
                      ? "Sign in"
                      : signupRole === "PROFESSIONAL"
                        ? "Continue as professional"
                        : "Create account"}
                </button>
              </form>

              <p className="mt-6 text-center text-xs leading-5 text-[var(--text-muted)]">
                By continuing, you agree to use VeriFit
                responsibly and respect the community.
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}