"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { getUser, type ApiUser } from "../lib/api";
import { supabase } from "../lib/supabase";

type UserRole = "USER" | "PROFESSIONAL" | "ADMIN";

interface NavItem {
  label: string;
  href: string;
}

/*
 * Client-side auth cache.
 *
 * The Navbar can remount during client-side navigation.
 * Keeping the resolved user here prevents the navbar from
 * briefly returning to the anonymous/loading state on every
 * navigation.
 */
let cachedUser: ApiUser | null | undefined = undefined;
let authCheckPromise: Promise<ApiUser | null> | null = null;

async function resolveCurrentUser(): Promise<ApiUser | null> {
  if (cachedUser !== undefined) {
    return cachedUser;
  }

  if (authCheckPromise) {
    return authCheckPromise;
  }

  authCheckPromise = (async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        cachedUser = null;
        return null;
      }

      try {
        const profile = await getUser(session.user.id);
        cachedUser = profile;
        return profile;
      } catch {
        cachedUser = null;
        return null;
      }
    } catch {
      cachedUser = null;
      return null;
    } finally {
      authCheckPromise = null;
    }
  })();

  return authCheckPromise;
}

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();

  const [user, setUser] = useState<ApiUser | null>(
    cachedUser === undefined ? null : cachedUser,
  );

  const [loadingUser, setLoadingUser] = useState(
    cachedUser === undefined,
  );

  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadUser = async () => {
      const resolvedUser = await resolveCurrentUser();

      if (!mounted) {
        return;
      }

      setUser(resolvedUser);
      setLoadingUser(false);
    };

    void loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) {
        return;
      }

      /*
       * Navigation does not normally change the auth session.
       * Only react to actual authentication changes.
       */
      if (
        event === "SIGNED_OUT" ||
        event === "SIGNED_IN" ||
        event === "USER_UPDATED"
      ) {
        if (!session?.user) {
          cachedUser = null;
          setUser(null);
          setLoadingUser(false);
          return;
        }

        cachedUser = undefined;

        void resolveCurrentUser().then((resolvedUser) => {
          if (!mounted) {
            return;
          }

          setUser(resolvedUser);
          setLoadingUser(false);
        });
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const role: UserRole = user?.role ?? "USER";

  const navItems: NavItem[] = [
    {
      label: "Feed",
      href: "/",
    },
    {
      label: "Professionals",
      href: "/professional",
    },
    ...(user
      ? [
          {
            label: "My Bookings",
            href: "/bookings",
          },
        ]
      : []),
    ...(role === "PROFESSIONAL"
      ? [
          {
            label: "Studio",
            href: "/studio",
          },
        ]
      : []),
    ...(role === "ADMIN"
      ? [
          {
            label: "Admin",
            href: "/admin/professionals",
          },
        ]
      : []),
  ];

  const handleSignOut = async () => {
    cachedUser = null;

    await supabase.auth.signOut();

    setUser(null);
    setLoadingUser(false);
    setMobileOpen(false);

    router.push("/");
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-50 border-b border-[#DDE5E1] bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          onClick={() => setMobileOpen(false)}
          className="flex items-center gap-2"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#227A50] text-sm font-bold text-white">
            V
          </div>

          <span className="text-lg font-bold tracking-tight text-[#182321]">
            VeriFit
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                  isActive
                    ? "bg-[#E7F4ED] text-[#227A50]"
                    : "text-[#66736F] hover:bg-[#F6F8F7] hover:text-[#182321]"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {loadingUser ? (
            <div className="h-9 w-20 animate-pulse rounded-xl bg-[#F6F8F7]" />
          ) : user ? (
            <>
              <div className="flex items-center gap-2">
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt=""
                    className="h-8 w-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#E7F4ED] text-xs font-semibold text-[#227A50]">
                    {user.display_name?.charAt(0)?.toUpperCase() || "U"}
                  </div>
                )}

                <div className="hidden lg:block">
                  <p className="max-w-32 truncate text-sm font-medium text-[#182321]">
                    {user.display_name}
                  </p>

                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[#66736F]">
                    {role}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSignOut}
                className="rounded-xl border border-[#DDE5E1] px-3 py-2 text-sm font-medium text-[#66736F] transition hover:border-[#C94B4B] hover:text-[#C94B4B]"
              >
                Sign out
              </button>
            </>
          ) : (
            <Link
              href="/auth"
              className="rounded-xl bg-[#227A50] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#185C3B]"
            >
              Sign in
            </Link>
          )}
        </div>

        <button
          type="button"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((current) => !current)}
          className="rounded-xl border border-[#DDE5E1] p-2 text-[#182321] md:hidden"
        >
          <span className="block h-0.5 w-5 bg-current" />
          <span className="mt-1.5 block h-0.5 w-5 bg-current" />
          <span className="mt-1.5 block h-0.5 w-5 bg-current" />
        </button>
      </div>

      {mobileOpen && (
        <div className="border-t border-[#DDE5E1] bg-white px-4 py-4 md:hidden">
          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`block rounded-xl px-4 py-3 text-sm font-medium ${
                    isActive
                      ? "bg-[#E7F4ED] text-[#227A50]"
                      : "text-[#66736F] hover:bg-[#F6F8F7]"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-4 border-t border-[#DDE5E1] pt-4">
            {loadingUser ? (
              <div className="h-10 animate-pulse rounded-xl bg-[#F6F8F7]" />
            ) : user ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3 px-2">
                  {user.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt=""
                      className="h-9 w-9 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#E7F4ED] text-sm font-semibold text-[#227A50]">
                      {user.display_name?.charAt(0)?.toUpperCase() || "U"}
                    </div>
                  )}

                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[#182321]">
                      {user.display_name}
                    </p>

                    <p className="text-[10px] font-semibold uppercase tracking-wide text-[#66736F]">
                      {role}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSignOut}
                  className="w-full rounded-xl border border-[#DDE5E1] px-4 py-3 text-sm font-medium text-[#66736F] transition hover:border-[#C94B4B] hover:text-[#C94B4B]"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <Link
                href="/auth"
                onClick={() => setMobileOpen(false)}
                className="block rounded-xl bg-[#227A50] px-4 py-3 text-center text-sm font-semibold text-white"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}