"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type CommunityDeck = {
  id: string;
  title: string;
  language: string;
  difficulty_level: string | null;
  category: string | null;
  source_type: string | null;
  quality_score: number | null;
  visibility: string;
  deck_origin: string;
  created_at: string;
  owner_user_id: string | null;
  owner_name: string | null;
  is_owned_by_current_user: boolean;
  card_count: number;
};

export default function CommunityDecksClient() {
  const router = useRouter();

  const [decks, setDecks] = useState<CommunityDeck[]>([]);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [busyDeckId, setBusyDeckId] = useState<string | null>(null);

  async function loadDecks(search = "") {
    try {
      setIsLoading(true);
      setMessage("");

      const response = await fetch(
        `/api/community/decks?q=${encodeURIComponent(search)}`,
        { cache: "no-store" }
      );
      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error || "Failed to load community decks.");
        return;
      }

      setDecks(result.decks ?? []);
    } catch (error) {
      console.error(error);
      setMessage("Failed to load community decks.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadDecks();
  }, []);

  async function cloneDeck(deckId: string) {
    try {
      setBusyDeckId(deckId);
      setMessage("");

      const response = await fetch("/api/community/clone", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ deckId }),
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error || "Failed to add deck.");
        return;
      }

      setMessage("Deck added to your library.");
      router.push(`/decks/${result.deckId}`);
    } catch (error) {
      console.error(error);
      setMessage("Failed to add deck.");
    } finally {
      setBusyDeckId(null);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-sky-700 dark:text-cyan-200">
            Community
          </p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight text-stone-900 dark:text-white sm:text-5xl">
            Shared decks
          </h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-stone-600 dark:text-slate-300">
            Explore decks shared by other learners and teachers.
          </p>
        </div>

        <div className="flex gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search decks..."
            className="w-64 rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
          />
          <button
            type="button"
            onClick={() => void loadDecks(query)}
            className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm font-medium text-stone-800 transition hover:bg-stone-50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
          >
            Search
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
          Loading community decks...
        </div>
      ) : null}

      {!isLoading && decks.length === 0 ? (
        <div className="rounded-[28px] border border-dashed border-stone-300 bg-white p-6 text-sm text-stone-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
          No community decks found.
        </div>
      ) : null}

      {!isLoading && decks.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {decks.map((deck) => {
            const isOwnDeck = deck.is_owned_by_current_user;

            return (
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

                  {deck.owner_name ? (
                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs text-emerald-800 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-100">
                      by {deck.owner_name}
                    </span>
                  ) : null}

                  {isOwnDeck ? (
                    <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs text-sky-800 dark:border-cyan-300/20 dark:bg-cyan-400/10 dark:text-cyan-100">
                      your deck
                    </span>
                  ) : null}

                  {deck.quality_score !== null ? (
                    <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs text-amber-800 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-100">
                      Quality {Number(deck.quality_score).toFixed(0)}
                    </span>
                  ) : null}
                </div>

                <div className="mt-5 flex gap-3">
                  <button
                    type="button"
                    onClick={() => router.push(`/decks/${deck.id}`)}
                    className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm font-medium text-stone-800 transition hover:bg-stone-50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
                  >
                    View
                  </button>

                  <button
                    type="button"
                    onClick={() => void cloneDeck(deck.id)}
                    disabled={busyDeckId === deck.id || isOwnDeck}
                    className="rounded-2xl bg-stone-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
                  >
                    {isOwnDeck
                      ? "Already yours"
                      : busyDeckId === deck.id
                      ? "Adding..."
                      : "Add to my decks"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}