"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type ProgressPayload = {
  buckets: {
    known_count: number;
    learning_count: number;
    hard_count: number;
    total_cards: number;
  };
  decks: {
    deck_count: number;
  };
  sessions: {
    session_count: number;
  };
  recentSessions: Array<{
    id: string;
    started_at: string;
    ended_at: string | null;
    session_type: string;
  }>;
};

export default function ProgressClient() {
  const router = useRouter();
  const [payload, setPayload] = useState<ProgressPayload | null>(null);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadProgress() {
      try {
        const response = await fetch("/api/progress/overview", {
          cache: "no-store",
        });

        const result = await response.json();

        if (!response.ok) {
          setMessage(result.error || "Failed to load progress.");
          return;
        }

        setPayload(result);
      } catch (error) {
        console.error(error);
        setMessage("Failed to load progress.");
      } finally {
        setIsLoading(false);
      }
    }

    void loadProgress();
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-sky-700 dark:text-cyan-200">
            Progress
          </p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight text-stone-900 dark:text-white sm:text-5xl">
            Your learning progress
          </h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-stone-600 dark:text-slate-300">
            See how your review buckets and study sessions are growing over time.
          </p>
        </div>

        <button
          type="button"
          onClick={() => router.push("/study")}
          className="rounded-2xl bg-stone-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-stone-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
        >
          Back to study
        </button>
      </div>

      {message ? (
        <div className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-700 dark:border-white/10 dark:bg-black/20 dark:text-slate-200">
          {message}
        </div>
      ) : null}

      {isLoading ? (
        <div className="rounded-2xl border border-stone-200 bg-white px-4 py-6 text-sm text-stone-700 dark:border-white/10 dark:bg-black/20 dark:text-slate-200">
          Loading progress...
        </div>
      ) : null}

      {!isLoading && payload ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-[24px] border border-stone-200 bg-[#FFFDF8] p-5 dark:border-white/10 dark:bg-[#0f172a]">
              <p className="text-sm text-stone-500 dark:text-slate-400">Total cards</p>
              <p className="mt-2 text-3xl font-semibold text-stone-900 dark:text-white">
                {payload.buckets.total_cards}
              </p>
            </div>

            <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-400/20 dark:bg-emerald-500/10">
              <p className="text-sm text-emerald-700 dark:text-emerald-100">Known</p>
              <p className="mt-2 text-3xl font-semibold text-emerald-800 dark:text-emerald-50">
                {payload.buckets.known_count}
              </p>
            </div>

            <div className="rounded-[24px] border border-sky-200 bg-sky-50 p-5 dark:border-cyan-300/20 dark:bg-cyan-400/10">
              <p className="text-sm text-sky-700 dark:text-cyan-100">Learning</p>
              <p className="mt-2 text-3xl font-semibold text-sky-800 dark:text-cyan-50">
                {payload.buckets.learning_count}
              </p>
            </div>

            <div className="rounded-[24px] border border-rose-200 bg-rose-50 p-5 dark:border-red-400/20 dark:bg-red-500/10">
              <p className="text-sm text-rose-700 dark:text-red-100">Hard</p>
              <p className="mt-2 text-3xl font-semibold text-rose-800 dark:text-red-50">
                {payload.buckets.hard_count}
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-[24px] border border-stone-200 bg-[#FFFDF8] p-5 dark:border-white/10 dark:bg-[#0f172a]">
              <p className="text-sm text-stone-500 dark:text-slate-400">Your decks</p>
              <p className="mt-2 text-3xl font-semibold text-stone-900 dark:text-white">
                {payload.decks.deck_count}
              </p>
            </div>

            <div className="rounded-[24px] border border-stone-200 bg-[#FFFDF8] p-5 dark:border-white/10 dark:bg-[#0f172a]">
              <p className="text-sm text-stone-500 dark:text-slate-400">Study sessions</p>
              <p className="mt-2 text-3xl font-semibold text-stone-900 dark:text-white">
                {payload.sessions.session_count}
              </p>
            </div>
          </div>

          <div className="rounded-[24px] border border-stone-200 bg-[#FFFDF8] p-5 dark:border-white/10 dark:bg-[#0f172a]">
            <p className="text-sm text-stone-500 dark:text-slate-400">
              Recent sessions
            </p>

            <div className="mt-4 space-y-3">
              {payload.recentSessions.length > 0 ? (
                payload.recentSessions.map((session) => (
                  <div
                    key={session.id}
                    className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-white/10 dark:bg-white/5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-base font-semibold text-stone-900 dark:text-white">
                          {session.session_type}
                        </p>
                        <p className="mt-1 text-sm text-stone-600 dark:text-slate-300">
                          {new Date(session.started_at).toLocaleString()}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          router.push(`/study/summary?sessionId=${encodeURIComponent(session.id)}`)
                        }
                        className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-medium text-stone-800 transition hover:bg-stone-50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
                      >
                        View summary
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-4 text-sm text-stone-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
                  No sessions yet.
                </div>
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}