"use client";

import { useEffect, useState } from "react";

type AssignmentProgress = {
  assignment_id: string;
  assigned_at: string;
  due_at: string | null;
  assignment_status: string;
  learner_id: string;
  learner_name: string | null;
  learner_email: string;
  deck_id: string;
  deck_title: string;
  language: string;
  total_cards: number;
  learner_cards: number;
  known_count: number;
  learning_count: number;
  hard_count: number;
  avg_mastery_score: number;
  last_reviewed_at: string | null;
};

export default function TeacherProgressClient() {
  const [assignments, setAssignments] = useState<AssignmentProgress[]>([]);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadProgress() {
      try {
        const response = await fetch("/api/teacher/progress");
        const result = await response.json();

        if (!response.ok) {
          setMessage(result.error || "Failed to load teacher progress.");
          return;
        }

        setAssignments(result.assignments ?? []);
      } catch (error) {
        console.error(error);
        setMessage("Failed to load teacher progress.");
      } finally {
        setIsLoading(false);
      }
    }

    loadProgress();
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-medium text-sky-700 dark:text-cyan-200">
          Teacher progress
        </p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight text-stone-900 dark:text-white sm:text-5xl">
          Learner progress
        </h1>
      </div>

      {message ? (
        <div className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-700 dark:border-white/10 dark:bg-black/20 dark:text-slate-200">
          {message}
        </div>
      ) : null}

      {isLoading ? (
        <div className="rounded-2xl border border-stone-200 bg-white px-4 py-6 text-sm text-stone-700 dark:border-white/10 dark:bg-black/20 dark:text-slate-200">
          Loading learner progress...
        </div>
      ) : null}

      {!isLoading && assignments.length === 0 ? (
        <div className="rounded-[28px] border border-dashed border-stone-300 bg-white p-6 text-sm text-stone-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
          No active assignments yet.
        </div>
      ) : null}

      {!isLoading && assignments.length > 0 ? (
        <div className="space-y-4">
          {assignments.map((item) => (
            <div
              key={item.assignment_id}
              className="rounded-[28px] border border-stone-200 bg-[#FFFDF8] p-6 dark:border-white/10 dark:bg-[#0f172a]"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-lg font-semibold text-stone-900 dark:text-white">
                    {item.deck_title}
                  </p>
                  <p className="mt-1 text-sm text-stone-600 dark:text-slate-300">
                    {item.learner_name || item.learner_email} • {item.language}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full border border-stone-200 bg-white px-3 py-1 text-xs text-stone-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                    {item.total_cards} cards
                  </span>
                  <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs text-amber-800 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-100">
                    Mastery {Math.round(item.avg_mastery_score || 0)}
                  </span>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-4">
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-400/20 dark:bg-emerald-500/10">
                  <p className="text-xs uppercase tracking-wide text-emerald-700 dark:text-emerald-100">
                    Known
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-emerald-800 dark:text-emerald-50">
                    {item.known_count}
                  </p>
                </div>

                <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 dark:border-cyan-300/20 dark:bg-cyan-400/10">
                  <p className="text-xs uppercase tracking-wide text-sky-700 dark:text-cyan-100">
                    Learning
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-sky-800 dark:text-cyan-50">
                    {item.learning_count}
                  </p>
                </div>

                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 dark:border-red-400/20 dark:bg-red-500/10">
                  <p className="text-xs uppercase tracking-wide text-rose-700 dark:text-red-100">
                    Hard
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-rose-800 dark:text-red-50">
                    {item.hard_count}
                  </p>
                </div>

                <div className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-white/10 dark:bg-white/5">
                  <p className="text-xs uppercase tracking-wide text-stone-500 dark:text-slate-400">
                    Last reviewed
                  </p>
                  <p className="mt-2 text-sm font-medium text-stone-900 dark:text-white">
                    {item.last_reviewed_at
                      ? new Date(item.last_reviewed_at).toLocaleString()
                      : "Not yet"}
                  </p>
                </div>
              </div>

              <div className="mt-4 text-xs text-stone-500 dark:text-slate-400">
                Assigned: {new Date(item.assigned_at).toLocaleString()}
                {item.due_at ? ` • Due: ${new Date(item.due_at).toLocaleString()}` : ""}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}