"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type DeckItem = {
  id: string;
  title: string;
  language: string;
  difficulty_level: string | null;
  category: string | null;
  source_type: string | null;
  quality_score: number | null;
  source_name: string | null;
  provider: string | null;
  card_count: number;
  learner_card_count: number;
  avg_mastery_score: number;
  last_reviewed_at: string | null;
};

export default function DecksClient() {
  const router = useRouter();

  const [decks, setDecks] = useState<DeckItem[]>([]);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadDecks() {
      try {
        const response = await fetch("/api/decks/my");
        const result = await response.json();

        if (!response.ok) {
          setMessage(result.error || "Failed to load your decks.");
          return;
        }

        setDecks(result.decks || []);
      } catch (error) {
        console.error(error);
        setMessage("Failed to load your decks.");
      } finally {
        setIsLoading(false);
      }
    }

    loadDecks();
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-medium text-sky-700 dark:text-cyan-200">
          My decks
        </p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight text-stone-900 dark:text-white sm:text-5xl">
          Your learning decks
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-stone-600 dark:text-slate-300">
          See your assigned and created decks, review progress, and jump back into study.
        </p>
      </div>

      {message ? (
        <div className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-700 dark:border-white/10 dark:bg-black/20 dark:text-slate-200">
          {message}
        </div>
      ) : null}

      {isLoading ? (
        <div className="rounded-2xl border border-stone-200 bg-white px-4 py-6 text-sm text-stone-700 dark:border-white/10 dark:bg-black/20 dark:text-slate-200">
          Loading your decks...
        </div>
      ) : null}

      {!isLoading && decks.length === 0 ? (
        <div className="rounded-[28px] border border-dashed border-stone-300 bg-white p-6 text-sm text-stone-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
          <p className="font-medium text-stone-900 dark:text-white">
            No decks yet
          </p>
          <p className="mt-2">
            Start with basics or build a deck with AI to begin learning.
          </p>
          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={() => router.push("/starter-deck")}
              className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-2 text-sm font-medium text-stone-800 transition hover:bg-stone-100 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
            >
              Start with basics
            </button>

            <button
              type="button"
              onClick={() => router.push("/build")}
              className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-2 text-sm font-medium text-stone-800 transition hover:bg-stone-100 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
            >
              Build a deck
            </button>
          </div>
        </div>
      ) : null}

      {!isLoading && decks.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {decks.map((deck) => (
            <div
              key={deck.id}
              className="rounded-[28px] border border-stone-200 bg-[#FFFDF8] p-6 dark:border-white/10 dark:bg-[#0f172a]"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-stone-900 dark:text-white">
                    {deck.title}
                  </p>
                  <p className="mt-1 text-sm text-stone-600 dark:text-slate-300">
                    {deck.language} • {deck.difficulty_level ?? "Beginner"}
                  </p>
                </div>

                <span className="rounded-full border border-stone-200 bg-white px-3 py-1 text-xs text-stone-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                  {deck.card_count} cards
                </span>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {deck.category ? (
                  <span className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs text-stone-700 dark:border-white/10 dark:bg-black/20 dark:text-slate-300">
                    {deck.category}
                  </span>
                ) : null}

                {deck.source_name ? (
                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs text-emerald-800 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-100">
                    {deck.source_name}
                  </span>
                ) : null}

                {deck.quality_score !== null ? (
                  <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs text-amber-800 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-100">
                    Quality {Number(deck.quality_score).toFixed(0)}
                  </span>
                ) : null}
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-white/10 dark:bg-white/5">
                  <p className="text-xs uppercase tracking-wide text-stone-500 dark:text-slate-400">
                    Avg mastery
                  </p>
                  <p className="mt-2 text-xl font-semibold text-stone-900 dark:text-white">
                    {Math.round(deck.avg_mastery_score || 0)}
                  </p>
                </div>

                <div className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-white/10 dark:bg-white/5">
                  <p className="text-xs uppercase tracking-wide text-stone-500 dark:text-slate-400">
                    Last reviewed
                  </p>
                  <p className="mt-2 text-sm font-medium text-stone-900 dark:text-white">
                    {deck.last_reviewed_at
                      ? new Date(deck.last_reviewed_at).toLocaleString()
                      : "Not yet"}
                  </p>
                </div>
              </div>

              <div className="mt-5 flex gap-3">
                <button
                  type="button"
                  onClick={() => router.push(`/decks/${deck.id}`)}
                  className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm font-medium text-stone-800 transition hover:bg-stone-50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
                >
                  View deck
                </button>

                <button
                  type="button"
                  onClick={() => router.push("/study")}
                  className="rounded-2xl bg-stone-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-stone-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
                >
                  Study now
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}