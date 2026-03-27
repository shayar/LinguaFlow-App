"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type MeResponse = {
  user: {
    id: string;
    role: string;
    fullName: string | null;
    email: string;
  } | null;
};

const learnerPrimaryLinks = [
  { href: "/dashboard", label: "Home" },
  { href: "/study", label: "Study" },
  { href: "/decks", label: "Decks" },
  { href: "/community", label: "Community" },
];

const learnerSecondaryLinks = [
  { href: "/placement", label: "Placement" },
  { href: "/build", label: "Build" },
];

const teacherPrimaryLinks = [
  { href: "/teacher", label: "Teacher" },
  { href: "/teacher/progress", label: "Progress" },
  { href: "/decks", label: "Decks" },
];

const teacherSecondaryLinks = [
  { href: "/build", label: "Build" },
];

export default function ProtectedHeader() {
  const pathname = usePathname();
  const router = useRouter();

  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [role, setRole] = useState("learner");

  useEffect(() => {
    const controller = new AbortController();

    async function loadMe() {
      try {
        const response = await fetch("/api/auth/me", {
          method: "GET",
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) {
          return;
        }

        const result: MeResponse = await response.json();

        if (result?.user?.role) {
          setRole(result.user.role);
        }
      } catch (error) {
        if (controller.signal.aborted) return;

        // Fail softly in dev/reload situations.
        setRole("learner");
      }
    }

    void loadMe();

    return () => {
      controller.abort();
    };
  }, []);

  async function handleLogout() {
    try {
      setIsLoggingOut(true);

      const response = await fetch("/api/auth/logout", {
        method: "POST",
      });

      if (!response.ok) return;

      router.push("/login");
      router.refresh();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setIsLoggingOut(false);
    }
  }

  const isTeacherMode = ["teacher", "community_manager"].includes(role);
  const primaryLinks = isTeacherMode ? teacherPrimaryLinks : learnerPrimaryLinks;
  const secondaryLinks = isTeacherMode ? teacherSecondaryLinks : learnerSecondaryLinks;
  const homeHref = isTeacherMode ? "/teacher" : "/dashboard";

  return (
    <header className="sticky top-0 z-40 border-b border-stone-200 bg-[#F7F3EB]/90 backdrop-blur dark:border-white/10 dark:bg-[#111827]/85">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4 lg:px-10">
        <Link
          href={homeHref}
          className="text-lg font-semibold tracking-tight text-stone-900 dark:text-white"
        >
          LinguaFlow
        </Link>

        <div className="flex items-center gap-3">
          <nav className="hidden items-center gap-2 md:flex">
            {primaryLinks.map((link) => {
              const active = pathname === link.href;

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-xl px-3 py-2 text-sm transition ${
                    active
                      ? "border border-sky-200 bg-sky-50 text-sky-800 dark:border-cyan-300/20 dark:bg-cyan-400/10 dark:text-cyan-100"
                      : "border border-stone-200 bg-white text-stone-700 hover:bg-stone-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <div className="hidden items-center gap-2 lg:flex">
            {secondaryLinks.map((link) => {
              const active = pathname === link.href;

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-xl px-3 py-2 text-xs transition ${
                    active
                      ? "border border-stone-300 bg-stone-100 text-stone-900 dark:border-white/15 dark:bg-white/10 dark:text-white"
                      : "border border-transparent bg-transparent text-stone-500 hover:text-stone-800 dark:text-slate-400 dark:hover:text-white"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-100 disabled:opacity-60 dark:border-red-400/20 dark:bg-red-500/10 dark:text-red-100 dark:hover:bg-red-500/15"
          >
            {isLoggingOut ? "Logging out..." : "Logout"}
          </button>
        </div>
      </div>
    </header>
  );
}