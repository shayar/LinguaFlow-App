"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type DeckDetail = {
  id: string;
  title: string;
  language: string;
  difficulty_level: string | null;
  category: string | null;
  source_type: string | null;
  quality_score: number | null;
  source_url: string | null;
  metadata_json: Record<string, unknown> | null;
  source_name: string | null;
  provider: string | null;
  license_label: string | null;
  card_count: number;
  learner_card_count: number;
  avg_mastery_score: number;
  known_count: number;
  learning_count: number;
  hard_count: number;
  last_reviewed_at: string | null;
};

type DeckWord = {
  card_id: string;
  learner_card_id: string;
  target_word: string;
  translation: string;
  pronunciation: string | null;
  example_sentence: string | null;
  example_translation_native: string | null;
  explanation: string | null;
  bucket: string;
  mastery_score: number;
  streak_count: number;
  last_reviewed_at: string | null;
  next_review_at: string | null;
};

type Props = {
  deckId: string;
};

export default function DeckDetailClient({ deckId }: Props) {
  const router = useRouter();

  const [deck, setDeck] = useState<DeckDetail | null>(null);
  const [words, setWords] = useState<DeckWord[]>([]);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function loadDeck() {
      try {
        const response = await fetch(`/api/decks/${deckId}`);
        const result = await response.json();

        if (!response.ok) {
          setMessage(result.error || "Failed to load deck details.");
          return;
        }

        setDeck(result.deck ?? null);
        setWords(result.words ?? []);
      } catch (error) {
        console.error(error);
        setMessage("Failed to load deck details.");
      } finally {
        setIsLoading(false);
      }
    }

    loadDeck();
  }, [deckId]);

  const filteredWords = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return words;

    return words.filter((word) => {
      return (
        word.target_word.toLowerCase().includes(q) ||
        word.translation.toLowerCase().includes(q)
      );
    });
  }, [words, search]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-sky-700 dark:text-cyan-200">
            Deck details
          </p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight text-stone-900 dark:text-white sm:text-5xl">
            {deck?.title ?? "Deck"}
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-stone-600 dark:text-slate-300">
            Review deck progress, browse words, and jump back into learning.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => router.push("/decks")}
            className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm font-medium text-stone-800 transition hover:bg-stone-50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
          >
            Back to decks
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

      {message ? (
        <div className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-700 dark:border-white/10 dark:bg-black/20 dark:text-slate-200">
          {message}
        </div>
      ) : null}

      {isLoading ? (
        <div className="rounded-2xl border border-stone-200 bg-white px-4 py-6 text-sm text-stone-700 dark:border-white/10 dark:bg-black/20 dark:text-slate-200">
          Loading deck details...
        </div>
      ) : null}

      {!isLoading && deck ? (
        <>
          <div className="grid gap-4 lg:grid-cols-4">
            <div className="rounded-[28px] border border-stone-200 bg-[#FFFDF8] p-5 dark:border-white/10 dark:bg-[#0f172a]">
              <p className="text-sm text-stone-500 dark:text-slate-400">Language</p>
              <p className="mt-2 text-2xl font-semibold text-stone-900 dark:text-white">
                {deck.language}
              </p>
            </div>

            <div className="rounded-[28px] border border-stone-200 bg-[#FFFDF8] p-5 dark:border-white/10 dark:bg-[#0f172a]">
              <p className="text-sm text-stone-500 dark:text-slate-400">Cards</p>
              <p className="mt-2 text-2xl font-semibold text-stone-900 dark:text-white">
                {deck.card_count}
              </p>
            </div>

            <div className="rounded-[28px] border border-stone-200 bg-[#FFFDF8] p-5 dark:border-white/10 dark:bg-[#0f172a]">
              <p className="text-sm text-stone-500 dark:text-slate-400">Avg mastery</p>
              <p className="mt-2 text-2xl font-semibold text-stone-900 dark:text-white">
                {Math.round(deck.avg_mastery_score || 0)}
              </p>
            </div>

            <div className="rounded-[28px] border border-stone-200 bg-[#FFFDF8] p-5 dark:border-white/10 dark:bg-[#0f172a]">
              <p className="text-sm text-stone-500 dark:text-slate-400">Last reviewed</p>
              <p className="mt-2 text-sm font-medium text-stone-900 dark:text-white">
                {deck.last_reviewed_at
                  ? new Date(deck.last_reviewed_at).toLocaleString()
                  : "Not yet"}
              </p>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <div className="space-y-6">
              <div className="rounded-[28px] border border-stone-200 bg-[#FFFDF8] p-6 dark:border-white/10 dark:bg-[#0f172a]">
                <div className="flex flex-wrap gap-2">
                  {deck.difficulty_level ? (
                    <span className="rounded-full border border-stone-200 bg-white px-3 py-1 text-xs text-stone-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                      {deck.difficulty_level}
                    </span>
                  ) : null}

                  {deck.category ? (
                    <span className="rounded-full border border-stone-200 bg-white px-3 py-1 text-xs text-stone-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
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

                <div className="mt-5 grid gap-4 sm:grid-cols-3">
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-400/20 dark:bg-emerald-500/10">
                    <p className="text-xs uppercase tracking-wide text-emerald-700 dark:text-emerald-100">
                      Known
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-emerald-800 dark:text-emerald-50">
                      {deck.known_count}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 dark:border-cyan-300/20 dark:bg-cyan-400/10">
                    <p className="text-xs uppercase tracking-wide text-sky-700 dark:text-cyan-100">
                      Learning
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-sky-800 dark:text-cyan-50">
                      {deck.learning_count}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 dark:border-red-400/20 dark:bg-red-500/10">
                    <p className="text-xs uppercase tracking-wide text-rose-700 dark:text-red-100">
                      Hard
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-rose-800 dark:text-red-50">
                      {deck.hard_count}
                    </p>
                  </div>
                </div>

                {(deck.provider || deck.license_label || deck.source_url) ? (
                  <div className="mt-5 rounded-2xl border border-stone-200 bg-white p-4 dark:border-white/10 dark:bg-white/5">
                    <p className="text-sm font-medium text-stone-900 dark:text-white">
                      Source details
                    </p>

                    <div className="mt-3 space-y-2 text-sm text-stone-600 dark:text-slate-300">
                      {deck.provider ? <p>Provider: {deck.provider}</p> : null}
                      {deck.license_label ? <p>License: {deck.license_label}</p> : null}
                      {deck.source_url ? (
                        <p className="break-all">Source URL: {deck.source_url}</p>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="rounded-[28px] border border-stone-200 bg-[#FFFDF8] p-6 dark:border-white/10 dark:bg-[#0f172a]">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-medium text-stone-900 dark:text-white">
                    Words in this deck
                  </p>

                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search words..."
                    className="w-full max-w-xs rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 outline-none placeholder:text-stone-400 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500"
                  />
                </div>

                <div className="mt-5 space-y-3">
                  {filteredWords.map((word) => (
                    <div
                      key={word.learner_card_id}
                      className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-white/10 dark:bg-white/5"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-base font-semibold text-stone-900 dark:text-white">
                            {word.target_word}
                          </p>
                          <p className="mt-1 text-sm text-stone-600 dark:text-slate-300">
                            {word.translation}
                          </p>
                          {word.pronunciation ? (
                            <p className="mt-1 text-xs text-stone-500 dark:text-slate-400">
                              {word.pronunciation}
                            </p>
                          ) : null}
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <span className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs text-stone-700 dark:border-white/10 dark:bg-black/20 dark:text-slate-300">
                            {word.bucket}
                          </span>
                          <span className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs text-stone-700 dark:border-white/10 dark:bg-black/20 dark:text-slate-300">
                            Mastery {word.mastery_score}
                          </span>
                        </div>
                      </div>

                      {word.example_sentence ? (
                        <p className="mt-3 text-sm leading-6 text-stone-700 dark:text-slate-300">
                          {word.example_sentence}
                        </p>
                      ) : null}

                      <div className="mt-4">
                        <button
                          type="button"
                          onClick={() => router.push(`/words/${word.learner_card_id}`)}
                          className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs font-medium text-stone-800 transition hover:bg-stone-100 dark:border-white/10 dark:bg-black/20 dark:text-white dark:hover:bg-black/30"
                        >
                          Open word details
                        </button>
                      </div>
                    </div>
                  ))}

                  {filteredWords.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-4 text-sm text-stone-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
                      No words match your search.
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-[28px] border border-stone-200 bg-[#FFFDF8] p-6 dark:border-white/10 dark:bg-[#0f172a]">
                <p className="text-sm font-medium text-stone-900 dark:text-white">
                  Quick actions
                </p>

                <div className="mt-4 grid gap-3">
                  <button
                    type="button"
                    onClick={() => router.push("/study")}
                    className="rounded-2xl bg-stone-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-stone-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
                  >
                    Continue studying
                  </button>

                  <button
                    type="button"
                    onClick={() => router.push("/build")}
                    className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm font-medium text-stone-800 transition hover:bg-stone-50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
                  >
                    Build more decks
                  </button>
                </div>
              </div>

              <div className="rounded-[28px] border border-stone-200 bg-[#FFFDF8] p-6 dark:border-white/10 dark:bg-[#0f172a]">
  <p className="text-sm font-medium text-stone-900 dark:text-white">
    Quick view
  </p>

  <div className="mt-4 grid gap-3">
    <div className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-white/10 dark:bg-white/5">
      <p className="text-xs uppercase tracking-wide text-stone-500 dark:text-slate-400">
        Cards
      </p>
      <p className="mt-2 text-xl font-semibold text-stone-900 dark:text-white">
        {deck.card_count}
      </p>
    </div>

    <div className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-white/10 dark:bg-white/5">
      <p className="text-xs uppercase tracking-wide text-stone-500 dark:text-slate-400">
        Average mastery
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
</div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}