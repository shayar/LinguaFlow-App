"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/study", label: "Study" },
  { href: "/decks", label: "My Decks" },
  { href: "/build", label: "Build" },
  { href: "/sentence-reviews", label: "Reviews" },
];

export default function ProtectedHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleLogout() {
    try {
      setIsLoggingOut(true);

      const response = await fetch("/api/auth/logout", {
        method: "POST",
      });

      if (!response.ok) {
        console.error("Logout failed");
        return;
      }

      router.push("/login");
      router.refresh();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setIsLoggingOut(false);
    }
  }

  return (
    <header className="sticky top-0 z-40 border-b border-stone-200 bg-[#F7F3EB]/90 backdrop-blur dark:border-white/10 dark:bg-[#111827]/85">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-4 lg:px-10">
        <Link
          href="/dashboard"
          className="text-lg font-semibold tracking-tight text-stone-900 dark:text-white"
        >
          LinguaFlow
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          <nav className="flex flex-wrap items-center gap-2">
            {links.map((link) => {
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