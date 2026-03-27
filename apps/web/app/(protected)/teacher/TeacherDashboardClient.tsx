"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type TeacherStats = {
  ownedDeckCount: number;
  activeAssignmentCount: number;
};

type TeacherInfo = {
  fullName: string | null;
  role: string;
};

type OwnedDeck = {
  id: string;
  title: string;
  language: string;
  difficulty_level: string | null;
  deck_origin: string;
  visibility: string;
  card_count: number;
};

type RecentAssignment = {
  assignment_id: string;
  created_at: string;
  due_at: string | null;
  deck_id: string;
  deck_title: string;
  learner_id: string;
  learner_name: string | null;
  learner_email: string;
};

type Learner = {
  id: string;
  full_name: string | null;
  email: string;
  role: string;
  target_language: string | null;
  native_language: string | null;
  verified_level: string | null;
  self_reported_level: string | null;
};

export default function TeacherDashboardClient() {
  const router = useRouter();

  const [teacher, setTeacher] = useState<TeacherInfo | null>(null);
  const [stats, setStats] = useState<TeacherStats | null>(null);
  const [ownedDecks, setOwnedDecks] = useState<OwnedDeck[]>([]);
  const [recentAssignments, setRecentAssignments] = useState<RecentAssignment[]>([]);
  const [learners, setLearners] = useState<Learner[]>([]);

  const [selectedDeckId, setSelectedDeckId] = useState("");
  const [selectedLearnerId, setSelectedLearnerId] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [learnerSearch, setLearnerSearch] = useState("");

  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isAssigning, setIsAssigning] = useState(false);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [dashboardResponse, learnersResponse] = await Promise.all([
          fetch("/api/teacher/dashboard"),
          fetch("/api/teacher/learners"),
        ]);

        const dashboardResult = await dashboardResponse.json();
        const learnersResult = await learnersResponse.json();

        if (!dashboardResponse.ok) {
          setMessage(dashboardResult.error || "Failed to load teacher dashboard.");
          return;
        }

        if (!learnersResponse.ok) {
          setMessage(learnersResult.error || "Failed to load learners.");
          return;
        }

        setTeacher(dashboardResult.teacher ?? null);
        setStats(dashboardResult.stats ?? null);
        setOwnedDecks(dashboardResult.ownedDecks ?? []);
        setRecentAssignments(dashboardResult.recentAssignments ?? []);
        setLearners(learnersResult.learners ?? []);
      } catch (error) {
        console.error(error);
        setMessage("Failed to load teacher dashboard.");
      } finally {
        setIsLoading(false);
      }
    }

    loadDashboard();
  }, []);

  async function searchLearners() {
    try {
      const response = await fetch(
        `/api/teacher/learners?q=${encodeURIComponent(learnerSearch)}`
      );
      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error || "Failed to search learners.");
        return;
      }

      setLearners(result.learners ?? []);
    } catch (error) {
      console.error(error);
      setMessage("Failed to search learners.");
    }
  }

  async function assignDeck() {
    if (!selectedDeckId || !selectedLearnerId) {
      setMessage("Please select a deck and a learner.");
      return;
    }

    try {
      setIsAssigning(true);
      setMessage("");

      const response = await fetch("/api/decks/assign", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          deckId: selectedDeckId,
          assignedToUserId: selectedLearnerId,
          dueAt: dueAt || null,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error || "Failed to assign deck.");
        return;
      }

      setMessage("Deck assigned successfully.");
      setSelectedLearnerId("");
      setDueAt("");

      const refreshResponse = await fetch("/api/teacher/dashboard");
      const refreshResult = await refreshResponse.json();
      if (refreshResponse.ok) {
        setRecentAssignments(refreshResult.recentAssignments ?? []);
        setStats(refreshResult.stats ?? null);
      }
    } catch (error) {
      console.error(error);
      setMessage("Failed to assign deck.");
    } finally {
      setIsAssigning(false);
    }
  }

  return (
    <div className="space-y-8">
      {message ? (
        <div className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-700 dark:border-white/10 dark:bg-black/20 dark:text-slate-200">
          {message}
        </div>
      ) : null}

      {isLoading ? (
        <div className="rounded-2xl border border-stone-200 bg-white px-4 py-6 text-sm text-stone-700 dark:border-white/10 dark:bg-black/20 dark:text-slate-200">
          Loading teacher dashboard...
        </div>
      ) : null}

      {!isLoading ? (
        <>
          <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-[32px] border border-stone-200 bg-[#FFFDF8] p-8 dark:border-white/10 dark:bg-[#0f172a]">
              <p className="text-sm font-medium text-sky-700 dark:text-cyan-200">
                Teacher
              </p>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight text-stone-900 dark:text-white sm:text-5xl">
                {teacher?.fullName || "Teacher Dashboard"}
              </h1>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => router.push("/decks")}
                  className="rounded-2xl bg-stone-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-stone-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
                >
                  Open decks
                </button>

                <button
                  type="button"
                  onClick={() => router.push("/build")}
                  className="rounded-2xl border border-stone-200 bg-white px-5 py-3 text-sm font-medium text-stone-800 transition hover:bg-stone-50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
                >
                  Build new deck
                </button>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[28px] border border-stone-200 bg-[#FFFDF8] p-6 dark:border-white/10 dark:bg-[#0f172a]">
                <p className="text-sm text-stone-500 dark:text-slate-400">Owned decks</p>
                <p className="mt-2 text-3xl font-semibold text-stone-900 dark:text-white">
                  {stats?.ownedDeckCount ?? 0}
                </p>
              </div>

              <div className="rounded-[28px] border border-stone-200 bg-[#FFFDF8] p-6 dark:border-white/10 dark:bg-[#0f172a]">
                <p className="text-sm text-stone-500 dark:text-slate-400">Active assignments</p>
                <p className="mt-2 text-3xl font-semibold text-stone-900 dark:text-white">
                  {stats?.activeAssignmentCount ?? 0}
                </p>
              </div>
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
            <div className="rounded-[32px] border border-stone-200 bg-[#FFFDF8] p-8 dark:border-white/10 dark:bg-[#0f172a]">
              <div className="mb-5 flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-stone-900 dark:text-white">
                  Assign a deck
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-stone-800 dark:text-slate-200">
                    Deck
                  </label>
                  <select
                    value={selectedDeckId}
                    onChange={(e) => setSelectedDeckId(e.target.value)}
                    className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
                  >
                    <option value="">Select a deck</option>
                    {ownedDecks.map((deck) => (
                      <option key={deck.id} value={deck.id}>
                        {deck.title} — {deck.language}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-stone-800 dark:text-slate-200">
                    Find learner
                  </label>
                  <div className="flex gap-2">
                    <input
                      value={learnerSearch}
                      onChange={(e) => setLearnerSearch(e.target.value)}
                      placeholder="Search by name, email, or target language"
                      className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={searchLearners}
                      className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm font-medium text-stone-800 transition hover:bg-stone-50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
                    >
                      Search
                    </button>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-stone-800 dark:text-slate-200">
                    Learner
                  </label>
                  <select
                    value={selectedLearnerId}
                    onChange={(e) => setSelectedLearnerId(e.target.value)}
                    className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
                  >
                    <option value="">Select a learner</option>
                    {learners.map((learner) => (
                      <option key={learner.id} value={learner.id}>
                        {(learner.full_name || learner.email)} — {learner.target_language || "No language"}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-stone-800 dark:text-slate-200">
                    Due date
                  </label>
                  <input
                    type="datetime-local"
                    value={dueAt}
                    onChange={(e) => setDueAt(e.target.value)}
                    className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
                  />
                </div>

                <button
                  type="button"
                  onClick={assignDeck}
                  disabled={isAssigning}
                  className="w-full rounded-2xl bg-stone-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-stone-800 disabled:opacity-60 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
                >
                  {isAssigning ? "Assigning..." : "Assign deck"}
                </button>
              </div>
            </div>

            <div className="rounded-[32px] border border-stone-200 bg-[#FFFDF8] p-8 dark:border-white/10 dark:bg-[#0f172a]">
              <p className="text-sm font-medium text-stone-900 dark:text-white">
                Recent assignments
              </p>

              <div className="mt-5 space-y-3">
                {recentAssignments.length > 0 ? (
                  recentAssignments.map((item) => (
                    <div
                      key={item.assignment_id}
                      className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-white/10 dark:bg-white/5"
                    >
                      <p className="text-sm font-semibold text-stone-900 dark:text-white">
                        {item.deck_title}
                      </p>
                      <p className="mt-1 text-xs text-stone-500 dark:text-slate-400">
                        {item.learner_name || item.learner_email}
                      </p>
                      <p className="mt-2 text-xs text-stone-500 dark:text-slate-400">
                        Assigned: {new Date(item.created_at).toLocaleString()}
                      </p>
                      {item.due_at ? (
                        <p className="mt-1 text-xs text-stone-500 dark:text-slate-400">
                          Due: {new Date(item.due_at).toLocaleString()}
                        </p>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-4 text-sm text-stone-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
                    No assignments yet.
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