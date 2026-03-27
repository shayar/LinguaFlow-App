"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type OwnedDeck = {
  id: string;
  title: string;
  language: string;
  difficulty_level: string | null;
  category: string | null;
  source_type: string | null;
  quality_score: number | null;
  visibility: string;
  deck_origin: string;
  source_name: string | null;
  provider: string | null;
  card_count: number;
  learner_card_count: number;
  avg_mastery_score: number;
  last_reviewed_at: string | null;
};

type AssignedDeck = {
  assignment_id: string;
  assignment_status: string;
  due_at: string | null;
  assigned_at: string;
  id: string;
  title: string;
  language: string;
  difficulty_level: string | null;
  category: string | null;
  source_type: string | null;
  quality_score: number | null;
  visibility: string;
  deck_origin: string;
  owner_name: string | null;
  card_count: number;
  learner_card_count: number;
  avg_mastery_score: number;
  last_reviewed_at: string | null;
};

export default function DecksClient() {
  const router = useRouter();

  const [ownedDecks, setOwnedDecks] = useState<OwnedDeck[]>([]);
  const [assignedDecks, setAssignedDecks] = useState<AssignedDeck[]>([]);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [busyDeckId, setBusyDeckId] = useState<string | null>(null);

  async function loadDecks() {
    try {
      setIsLoading(true);

      const response = await fetch("/api/decks/my", {
        cache: "no-store",
      });
      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error || "Failed to load your decks.");
        return;
      }

      setOwnedDecks(result.ownedDecks ?? []);
      setAssignedDecks(result.assignedDecks ?? []);
    } catch (error) {
      console.error(error);
      setMessage("Failed to load your decks.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadDecks();
  }, []);

  async function publishDeck(deckId: string) {
    try {
      setBusyDeckId(deckId);
      setMessage("");

      const response = await fetch("/api/community/publish", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          deckId,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error || "Failed to publish deck.");
        return;
      }

      setMessage("Deck published to community.");
      await loadDecks();
    } catch (error) {
      console.error(error);
      setMessage("Failed to publish deck.");
    } finally {
      setBusyDeckId(null);
    }
  }

  async function unpublishDeck(deckId: string) {
    try {
      setBusyDeckId(deckId);
      setMessage("");

      const response = await fetch("/api/community/unpublish", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          deckId,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error || "Failed to unpublish deck.");
        return;
      }

      setMessage("Deck removed from community.");
      await loadDecks();
    } catch (error) {
      console.error(error);
      setMessage("Failed to unpublish deck.");
    } finally {
      setBusyDeckId(null);
    }
  }

  async function deleteDeck(deckId: string) {
    const confirmed = window.confirm(
      "Delete this deck? This will remove its cards from your library."
    );

    if (!confirmed) return;

    try {
      setBusyDeckId(deckId);
      setMessage("");

      const response = await fetch("/api/decks/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          deckId,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error || "Failed to delete deck.");
        return;
      }

      setMessage("Deck deleted.");
      await loadDecks();
    } catch (error) {
      console.error(error);
      setMessage("Failed to delete deck.");
    } finally {
      setBusyDeckId(null);
    }
  }

  function renderDeckCard(
    deck: {
      id: string;
      title: string;
      language: string;
      difficulty_level: string | null;
      category: string | null;
      quality_score: number | null;
      card_count: number;
      avg_mastery_score: number;
      last_reviewed_at: string | null;
      visibility?: string;
    },
    options?: {
      extraBadge?: string;
      canDelete?: boolean;
      canShare?: boolean;
    }
  ) {
    const extraBadge = options?.extraBadge;
    const canDelete = options?.canDelete ?? false;
    const canShare = options?.canShare ?? false;

    const isBusy = busyDeckId === deck.id;
    const isCommunity = deck.visibility === "community";

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

          {extraBadge ? (
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs text-emerald-800 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-100">
              {extraBadge}
            </span>
          ) : null}

          {isCommunity ? (
            <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs text-sky-800 dark:border-cyan-300/20 dark:bg-cyan-400/10 dark:text-cyan-100">
              community
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

        <div className="mt-5 flex flex-wrap gap-3">
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

          {canShare && !isCommunity ? (
            <button
              type="button"
              onClick={() => void publishDeck(deck.id)}
              disabled={isBusy}
              className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm font-medium text-stone-800 transition hover:bg-stone-50 disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
            >
              {isBusy ? "Sharing..." : "Share"}
            </button>
          ) : null}

          {canShare && isCommunity ? (
            <button
              type="button"
              onClick={() => void unpublishDeck(deck.id)}
              disabled={isBusy}
              className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-medium text-sky-700 transition hover:bg-sky-100 disabled:opacity-60 dark:border-cyan-300/20 dark:bg-cyan-400/10 dark:text-cyan-100 dark:hover:bg-cyan-400/15"
            >
              {isBusy ? "Removing..." : "Unpublish"}
            </button>
          ) : null}

          {canDelete ? (
            <button
              type="button"
              onClick={() => void deleteDeck(deck.id)}
              disabled={isBusy}
              className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 transition hover:bg-rose-100 disabled:opacity-60 dark:border-red-400/20 dark:bg-red-500/10 dark:text-red-100 dark:hover:bg-red-500/15"
            >
              {isBusy ? "Deleting..." : "Delete"}
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-medium text-sky-700 dark:text-cyan-200">
          Decks
        </p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight text-stone-900 dark:text-white sm:text-5xl">
          Your decks
        </h1>
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

      {!isLoading ? (
        <>
          <section className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-lg font-semibold text-stone-900 dark:text-white">
                Owned by you
              </p>
              <button
                type="button"
                onClick={() => router.push("/build")}
                className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-medium text-stone-800 transition hover:bg-stone-50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
              >
                Build deck
              </button>
            </div>

            {ownedDecks.length > 0 ? (
              <div className="grid gap-4 lg:grid-cols-2">
                {ownedDecks.map((deck) =>
                  renderDeckCard(deck, {
                    extraBadge: deck.deck_origin.replaceAll("_", " "),
                    canDelete: true,
                    canShare: true,
                  })
                )}
              </div>
            ) : (
              <div className="rounded-[28px] border border-dashed border-stone-300 bg-white p-6 text-sm text-stone-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                No owned decks yet.
              </div>
            )}
          </section>

          <section className="space-y-4">
            <p className="text-lg font-semibold text-stone-900 dark:text-white">
              Assigned to you
            </p>

            {assignedDecks.length > 0 ? (
              <div className="grid gap-4 lg:grid-cols-2">
                {assignedDecks.map((deck) =>
                  renderDeckCard(deck, {
                    extraBadge: deck.owner_name
                      ? `assigned by ${deck.owner_name}`
                      : "assigned",
                    canDelete: false,
                    canShare: false,
                  })
                )}
              </div>
            ) : (
              <div className="rounded-[28px] border border-dashed border-stone-300 bg-white p-6 text-sm text-stone-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                No assigned decks right now.
              </div>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}