"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type LearnerProfile = {
  target_language: string;
  native_language: string;
  verified_level: string | null;
  self_reported_level: string | null;
};

export default function StarterDeckClient() {
  const router = useRouter();

  const [profile, setProfile] = useState<LearnerProfile | null>(null);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      try {
        const response = await fetch("/api/learner/profile");
        const result = await response.json();

        if (!response.ok) {
          setMessage(result.error || "Failed to load learner profile.");
          return;
        }

        setProfile(result.profile ?? null);
      } catch (error) {
        console.error(error);
        setMessage("Failed to load learner profile.");
      } finally {
        setIsLoading(false);
      }
    }

    loadProfile();
  }, []);

  async function handleStartBasics() {
    try {
      setIsStarting(true);
      setMessage("");

      const response = await fetch("/api/first-run/setup-deck", {
        method: "POST",
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error || "Failed to set up starter deck.");
        return;
      }

      setMessage(`Starter deck ready. Assigned ${result.assignedCount} cards.`);
      router.push("/study");
      router.refresh();
    } catch (error) {
      console.error(error);
      setMessage("Failed to set up starter deck.");
    } finally {
      setIsStarting(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-medium text-sky-700 dark:text-cyan-200">
          Start with basics
        </p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight text-stone-900 dark:text-white sm:text-5xl">
          Start your first learner deck
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-stone-600 dark:text-slate-300">
          We’ll prepare a starter deck based on your target language and level so you can begin studying right away.
        </p>
      </div>

      {message ? (
        <div className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-700 dark:border-white/10 dark:bg-black/20 dark:text-slate-200">
          {message}
        </div>
      ) : null}

      {isLoading ? (
        <div className="rounded-2xl border border-stone-200 bg-white px-4 py-6 text-sm text-stone-700 dark:border-white/10 dark:bg-black/20 dark:text-slate-200">
          Loading starter setup...
        </div>
      ) : null}

      {!isLoading && profile ? (
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[28px] border border-stone-200 bg-[#FFFDF8] p-6 dark:border-white/10 dark:bg-[#0f172a]">
            <p className="text-sm text-stone-500 dark:text-slate-400">
              Target language
            </p>
            <p className="mt-2 text-3xl font-semibold text-stone-900 dark:text-white">
              {profile.target_language}
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-white/10 dark:bg-white/5">
                <p className="text-xs uppercase tracking-wide text-stone-500 dark:text-slate-400">
                  Native language
                </p>
                <p className="mt-2 text-lg font-medium text-stone-900 dark:text-white">
                  {profile.native_language}
                </p>
              </div>

              <div className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-white/10 dark:bg-white/5">
                <p className="text-xs uppercase tracking-wide text-stone-500 dark:text-slate-400">
                  Learner level
                </p>
                <p className="mt-2 text-lg font-medium text-stone-900 dark:text-white">
                  {profile.verified_level ?? profile.self_reported_level ?? "Beginner"}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleStartBasics}
              disabled={isStarting}
              className="mt-6 rounded-2xl bg-stone-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-stone-800 disabled:opacity-60 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
            >
              {isStarting ? "Preparing..." : `Start basics in ${profile.target_language}`}
            </button>
          </div>

          <div className="rounded-[28px] border border-stone-200 bg-[#FFFDF8] p-6 dark:border-white/10 dark:bg-[#0f172a]">
            <p className="text-sm font-medium text-stone-900 dark:text-white">
              What you’ll get
            </p>
            <div className="mt-4 space-y-3 text-sm text-stone-600 dark:text-slate-300">
              <div className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-white/10 dark:bg-white/5">
                Beginner-friendly core words
              </div>
              <div className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-white/10 dark:bg-white/5">
                Example-first study flow
              </div>
              <div className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-white/10 dark:bg-white/5">
                Notes, quiz, and learner buckets
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}