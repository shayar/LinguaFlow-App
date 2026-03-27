"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

type SessionSummary = {
  total_reviews: number;
  known_count: number;
  learning_count: number;
  hard_count: number;
  average_response_time_ms: number;
};

type ReviewedWord = {
  target_word: string;
  translation: string;
  result: string;
  bucket_after: string;
  response_time_ms: number | null;
  created_at: string;
};

type SessionMeta = {
  id: string;
  started_at: string;
  ended_at: string | null;
  session_type: string;
};

export default function StudySummaryClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get("sessionId");

  const [session, setSession] = useState<SessionMeta | null>(null);
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [reviewedWords, setReviewedWords] = useState<ReviewedWord[]>([]);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadSummary() {
      if (!sessionId) {
        setMessage("Missing session.");
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(
          `/api/study/session-summary?sessionId=${encodeURIComponent(sessionId)}`,
          { cache: "no-store" }
        );

        const result = await response.json();

        if (!response.ok) {
          setMessage(result.error || "Failed to load session summary.");
          return;
        }

        setSession(result.session);
        setSummary(result.summary);
        setReviewedWords(result.reviewedWords || []);
      } catch (error) {
        console.error(error);
        setMessage("Failed to load session summary.");
      } finally {
        setIsLoading(false);
      }
    }

    void loadSummary();
  }, [sessionId]);

  return (
    <div className="w-full max-w-5xl rounded-[32px] border border-stone-200 bg-[#F7F3EB] p-6 text-stone-900 shadow-[0_20px_60px_rgba(40,32,20,0.08)] dark:border-white/10 dark:bg-[#111827] dark:text-slate-100 dark:shadow-2xl sm:p-8">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-sky-700 dark:text-cyan-200">
            Session summary
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-stone-900 dark:text-white sm:text-4xl">
            Review session recap
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600 dark:text-slate-300">
            See what you reviewed and how the session went.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => router.push("/progress")}
            className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm font-medium text-stone-800 transition hover:bg-stone-50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
          >
            View progress
          </button>

          <button
            type="button"
            onClick={() => router.push("/study")}
            className="rounded-2xl bg-stone-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-stone-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
          >
            Back to study
          </button>
        </div>
      </div>

      {message ? (
        <div className="mb-4 rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-700 dark:border-white/10 dark:bg-black/20 dark:text-slate-200">
          {message}
        </div>
      ) : null}

      {isLoading ? (
        <div className="rounded-2xl border border-stone-200 bg-white px-4 py-6 text-sm text-stone-700 dark:border-white/10 dark:bg-black/20 dark:text-slate-200">
          Loading session summary...
        </div>
      ) : null}

      {!isLoading && session && summary ? (
        <div className="space-y-6">
          <div className="rounded-[24px] border border-stone-200 bg-[#FFFDF8] p-6 dark:border-white/10 dark:bg-[#0f172a]">
            <p className="text-sm text-stone-500 dark:text-slate-400">
              Session type
            </p>
            <p className="mt-2 text-2xl font-semibold text-stone-900 dark:text-white">
              {session.session_type}
            </p>
            <p className="mt-2 text-sm text-stone-600 dark:text-slate-300">
              Started: {new Date(session.started_at).toLocaleString()}
            </p>
            {session.ended_at ? (
              <p className="mt-1 text-sm text-stone-600 dark:text-slate-300">
                Ended: {new Date(session.ended_at).toLocaleString()}
              </p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-[24px] border border-stone-200 bg-[#FFFDF8] p-5 dark:border-white/10 dark:bg-[#0f172a]">
              <p className="text-sm text-stone-500 dark:text-slate-400">Total reviews</p>
              <p className="mt-2 text-3xl font-semibold text-stone-900 dark:text-white">
                {summary.total_reviews}
              </p>
            </div>

            <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-400/20 dark:bg-emerald-500/10">
              <p className="text-sm text-emerald-700 dark:text-emerald-100">Known</p>
              <p className="mt-2 text-3xl font-semibold text-emerald-800 dark:text-emerald-50">
                {summary.known_count}
              </p>
            </div>

            <div className="rounded-[24px] border border-sky-200 bg-sky-50 p-5 dark:border-cyan-300/20 dark:bg-cyan-400/10">
              <p className="text-sm text-sky-700 dark:text-cyan-100">Learning</p>
              <p className="mt-2 text-3xl font-semibold text-sky-800 dark:text-cyan-50">
                {summary.learning_count}
              </p>
            </div>

            <div className="rounded-[24px] border border-rose-200 bg-rose-50 p-5 dark:border-red-400/20 dark:bg-red-500/10">
              <p className="text-sm text-rose-700 dark:text-red-100">Hard</p>
              <p className="mt-2 text-3xl font-semibold text-rose-800 dark:text-red-50">
                {summary.hard_count}
              </p>
            </div>
          </div>

          <div className="rounded-[24px] border border-stone-200 bg-[#FFFDF8] p-5 dark:border-white/10 dark:bg-[#0f172a]">
            <p className="text-sm text-stone-500 dark:text-slate-400">
              Average response time
            </p>
            <p className="mt-2 text-2xl font-semibold text-stone-900 dark:text-white">
              {Math.round(summary.average_response_time_ms || 0)} ms
            </p>
          </div>

          <div className="rounded-[24px] border border-stone-200 bg-[#FFFDF8] p-5 dark:border-white/10 dark:bg-[#0f172a]">
            <p className="text-sm text-stone-500 dark:text-slate-400">
              Reviewed words
            </p>

            <div className="mt-4 space-y-3">
              {reviewedWords.length > 0 ? (
                reviewedWords.map((word, index) => (
                  <div
                    key={`${word.target_word}-${index}`}
                    className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-white/10 dark:bg-white/5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-base font-semibold text-stone-900 dark:text-white">
                          {word.target_word}
                        </p>
                        <p className="text-sm text-stone-600 dark:text-slate-300">
                          {word.translation}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs text-stone-700 dark:border-white/10 dark:bg-black/20 dark:text-slate-300">
                          {word.result}
                        </span>
                        <span className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs text-stone-700 dark:border-white/10 dark:bg-black/20 dark:text-slate-300">
                          {word.bucket_after}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-4 text-sm text-stone-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
                  No reviewed words found for this session.
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}