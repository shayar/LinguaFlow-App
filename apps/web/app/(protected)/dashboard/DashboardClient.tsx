"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type DashboardProfile = {
  target_language: string;
  native_language: string;
  verified_level: string | null;
  self_reported_level: string | null;
  daily_goal_words: number | null;
};

type DashboardStats = {
  total_cards: number;
  known_count: number;
  learning_count: number;
  hard_count: number;
};

type FocusWord = {
  learner_card_id: string;
  bucket: string;
  mastery_score: number;
  next_review_at: string | null;
  target_word: string;
  translation: string;
  example_sentence?: string | null;
  language: string;
  deck_title: string;
};

type DeckSummary = {
  id: string;
  title: string;
  language: string;
  card_count: number;
  avg_mastery_score: number;
};

export default function DashboardClient() {
  const router = useRouter();

  const [profile, setProfile] = useState<DashboardProfile | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [reviewedToday, setReviewedToday] = useState(0);
  const [dailyGoal, setDailyGoal] = useState(10);
  const [dueNow, setDueNow] = useState<FocusWord[]>([]);
  const [decks, setDecks] = useState<DeckSummary[]>([]);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const response = await fetch("/api/dashboard");
        const result = await response.json();

        if (!response.ok) {
          setMessage(result.error || "Failed to load dashboard.");
          return;
        }

        setProfile(result.profile ?? null);
        setStats(result.stats ?? null);
        setReviewedToday(result.reviewedToday ?? 0);
        setDailyGoal(result.dailyGoal ?? 10);
        setDueNow(result.dueNow ?? []);
        setDecks(result.decks ?? []);
      } catch (error) {
        console.error(error);
        setMessage("Failed to load dashboard.");
      } finally {
        setIsLoading(false);
      }
    }

    loadDashboard();
  }, []);

  const progressPercent = useMemo(() => {
    if (!dailyGoal || dailyGoal <= 0) return 0;
    return Math.min(100, Math.round((reviewedToday / dailyGoal) * 100));
  }, [reviewedToday, dailyGoal]);

  const level =
    profile?.verified_level ?? profile?.self_reported_level ?? "Beginner";

  return (
    <div className="space-y-8">
      {message ? (
        <div className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-700 dark:border-white/10 dark:bg-black/20 dark:text-slate-200">
          {message}
        </div>
      ) : null}

      {isLoading ? (
        <div className="rounded-2xl border border-stone-200 bg-white px-4 py-6 text-sm text-stone-700 dark:border-white/10 dark:bg-black/20 dark:text-slate-200">
          Loading dashboard...
        </div>
      ) : null}

      {!isLoading ? (
        <>
          <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="rounded-[32px] border border-stone-200 bg-[#FFFDF8] p-8 dark:border-white/10 dark:bg-[#0f172a]">
              <p className="text-sm font-medium text-sky-700 dark:text-cyan-200">
                Home
              </p>

              <h1 className="mt-3 text-4xl font-semibold tracking-tight text-stone-900 dark:text-white sm:text-5xl">
                Continue learning
              </h1>

              <div className="mt-5 flex flex-wrap items-center gap-2">
                {profile?.target_language ? (
                  <span className="rounded-full border border-stone-200 bg-white px-3 py-1 text-xs text-stone-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                    {profile.target_language}
                  </span>
                ) : null}

                {profile?.native_language ? (
                  <span className="rounded-full border border-stone-200 bg-white px-3 py-1 text-xs text-stone-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                    from {profile.native_language}
                  </span>
                ) : null}

                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs text-emerald-800 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-100">
                  {level}
                </span>
              </div>

              <div className="mt-8 flex gap-3">
                <button
                  type="button"
                  onClick={() => router.push("/study")}
                  className="rounded-2xl bg-stone-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-stone-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
                >
                  Start study
                </button>

                <button
                  type="button"
                  onClick={() => router.push("/decks")}
                  className="rounded-2xl border border-stone-200 bg-white px-5 py-3 text-sm font-medium text-stone-800 transition hover:bg-stone-50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
                >
                  Open decks
                </button>
              </div>
            </div>

            <div className="rounded-[32px] border border-stone-200 bg-[#FFFDF8] p-8 dark:border-white/10 dark:bg-[#0f172a]">
              <p className="text-sm font-medium text-stone-900 dark:text-white">
                Daily goal
              </p>

              <div className="mt-6">
                <div className="flex items-end justify-between gap-3">
                  <p className="text-4xl font-semibold tracking-tight text-stone-900 dark:text-white">
                    {reviewedToday}
                  </p>
                  <p className="text-sm text-stone-500 dark:text-slate-400">
                    of {dailyGoal}
                  </p>
                </div>

                <div className="mt-4 h-3 overflow-hidden rounded-full bg-stone-200 dark:bg-white/10">
                  <div
                    className="h-full rounded-full bg-stone-900 transition-all dark:bg-white"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              <div className="mt-8 grid grid-cols-3 gap-3">
                <div className="rounded-2xl border border-stone-200 bg-white p-4 text-center dark:border-white/10 dark:bg-white/5">
                  <p className="text-xs uppercase tracking-wide text-stone-500 dark:text-slate-400">
                    Known
                  </p>
                  <p className="mt-2 text-xl font-semibold text-stone-900 dark:text-white">
                    {stats?.known_count ?? 0}
                  </p>
                </div>

                <div className="rounded-2xl border border-stone-200 bg-white p-4 text-center dark:border-white/10 dark:bg-white/5">
                  <p className="text-xs uppercase tracking-wide text-stone-500 dark:text-slate-400">
                    Learning
                  </p>
                  <p className="mt-2 text-xl font-semibold text-stone-900 dark:text-white">
                    {stats?.learning_count ?? 0}
                  </p>
                </div>

                <div className="rounded-2xl border border-stone-200 bg-white p-4 text-center dark:border-white/10 dark:bg-white/5">
                  <p className="text-xs uppercase tracking-wide text-stone-500 dark:text-slate-400">
                    Hard
                  </p>
                  <p className="mt-2 text-xl font-semibold text-stone-900 dark:text-white">
                    {stats?.hard_count ?? 0}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-[32px] border border-stone-200 bg-[#FFFDF8] p-8 dark:border-white/10 dark:bg-[#0f172a]">
              <div className="mb-5 flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-stone-900 dark:text-white">
                  Today’s focus
                </p>
                <button
                  type="button"
                  onClick={() => router.push("/study")}
                  className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-medium text-stone-800 transition hover:bg-stone-50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
                >
                  Study
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {dueNow.length > 0 ? (
                  dueNow.map((word) => (
                    <button
                      key={word.learner_card_id}
                      type="button"
                      onClick={() => router.push(`/words/${word.learner_card_id}`)}
                      className="rounded-2xl border border-stone-200 bg-white p-4 text-left transition hover:bg-stone-50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-base font-semibold text-stone-900 dark:text-white">
                          {word.target_word}
                        </p>
                        <span className="rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1 text-[11px] text-stone-700 dark:border-white/10 dark:bg-black/20 dark:text-slate-300">
                          {word.bucket}
                        </span>
                      </div>

                      <p className="mt-1 text-sm text-stone-600 dark:text-slate-300">
                        {word.translation}
                      </p>
                    </button>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-5 text-sm text-stone-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
                    No focus words right now.
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-[32px] border border-stone-200 bg-[#FFFDF8] p-8 dark:border-white/10 dark:bg-[#0f172a]">
              <div className="mb-5 flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-stone-900 dark:text-white">
                  Decks
                </p>
                <button
                  type="button"
                  onClick={() => router.push("/decks")}
                  className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-medium text-stone-800 transition hover:bg-stone-50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
                >
                  View all
                </button>
              </div>

              <div className="space-y-3">
                {decks.length > 0 ? (
                  decks.map((deck) => (
                    <button
                      key={deck.id}
                      type="button"
                      onClick={() => router.push(`/decks/${deck.id}`)}
                      className="w-full rounded-2xl border border-stone-200 bg-white p-4 text-left transition hover:bg-stone-50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-stone-900 dark:text-white">
                            {deck.title}
                          </p>
                          <p className="mt-1 text-xs text-stone-500 dark:text-slate-400">
                            {deck.language} • {deck.card_count} cards
                          </p>
                        </div>

                        <span className="rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1 text-[11px] text-stone-700 dark:border-white/10 dark:bg-black/20 dark:text-slate-300">
                          {Math.round(deck.avg_mastery_score || 0)}
                        </span>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-4 text-sm text-stone-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
                    No decks yet.
                  </div>
                )}
              </div>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}