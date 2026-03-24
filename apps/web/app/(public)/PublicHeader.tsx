"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/login", label: "Login" },
  { href: "/onboarding", label: "Create account" },
];

export default function PublicHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-stone-200 bg-[#F7F3EB]/90 backdrop-blur dark:border-white/10 dark:bg-[#111827]/85">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-4 lg:px-10">
        <Link
          href="/login"
          className="text-lg font-semibold tracking-tight text-stone-900 dark:text-white"
        >
          LinguaFlow
        </Link>

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
      </div>
    </header>
  );
}