"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type QuizItem = {
  targetWord: string;
  translation: string;
  difficulty?: "easy" | "medium" | "hard";
};

type PlacementStatus = {
  profile: {
    native_language: string;
    target_language: string;
    verified_level: string | null;
    self_reported_level: string | null;
    placement_last_completed_at: string | null;
    placement_version: number;
  };
};

type PlacementPayload = {
  profile: {
    native_language: string;
    target_language: string;
    verified_level: string | null;
    self_reported_level: string | null;
  };
  learnerLevel: string;
  items: QuizItem[];
};

export default function PlacementQuizClient() {
  const router = useRouter();

  const [status, setStatus] = useState<PlacementStatus | null>(null);
  const [payload, setPayload] = useState<PlacementPayload | null>(null);
  const [message, setMessage] = useState("");
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const [isLoadingQuiz, setIsLoadingQuiz] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [answers, setAnswers] = useState<Record<number, "know" | "unsure" | "dont_know">>({});
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    async function loadStatus() {
      try {
        const response = await fetch("/api/placement/status");
        const result = await response.json();

        if (!response.ok) {
          setMessage(result.error || "Failed to load placement status.");
          return;
        }

        setStatus(result);

        if (!result.profile?.placement_last_completed_at) {
          await loadQuiz();
        }
      } catch (error) {
        console.error(error);
        setMessage("Failed to load placement status.");
      } finally {
        setIsLoadingStatus(false);
      }
    }

    async function loadQuiz() {
      try {
        setIsLoadingQuiz(true);
        setMessage("");

        const response = await fetch("/api/placement");
        const result = await response.json();

        if (!response.ok) {
          setMessage(result.error || "Failed to load placement quiz.");
          return;
        }

        setPayload(result);
        setAnswers({});
        setCurrentIndex(0);
      } catch (error) {
        console.error(error);
        setMessage("Failed to load placement quiz.");
      } finally {
        setIsLoadingQuiz(false);
      }
    }

    loadStatus();
  }, []);

  async function startRetake() {
    try {
      setIsLoadingQuiz(true);
      setMessage("");

      const response = await fetch("/api/placement");
      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error || "Failed to load placement quiz.");
        return;
      }

      setPayload(result);
      setAnswers({});
      setCurrentIndex(0);
    } catch (error) {
      console.error(error);
      setMessage("Failed to load placement quiz.");
    } finally {
      setIsLoadingQuiz(false);
    }
  }

  const items = payload?.items ?? [];
  const currentItem = items[currentIndex] ?? null;
  const progress = items.length > 0 ? ((currentIndex + 1) / items.length) * 100 : 0;

  const answeredCount = useMemo(
    () => Object.keys(answers).length,
    [answers]
  );

  function setAnswer(value: "know" | "unsure" | "dont_know") {
    setAnswers((prev) => ({
      ...prev,
      [currentIndex]: value,
    }));
  }

  async function finishPlacement() {
    if (!payload) return;

    try {
      setIsSubmitting(true);
      setMessage("");

      const answerRows = items.map((item, index) => ({
        targetWord: item.targetWord,
        translation: item.translation,
        difficulty: item.difficulty ?? "easy",
        answer: answers[index] ?? "dont_know",
      }));

      const response = await fetch("/api/placement/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          answers: answerRows,
          targetLanguage: payload.profile.target_language,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error || "Failed to save placement results.");
        return;
      }

      setMessage(
        `Placement complete. Verified level: ${result.verifiedLevel}. Taking you to study...`
      );

      router.replace("/study");
      router.refresh();
    } catch (error) {
      console.error(error);
      setMessage("Failed to save placement results.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function goNext() {
    if (currentIndex < items.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      return;
    }

    void finishPlacement();
  }

  function goBack() {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  }

  const currentLevel =
    status?.profile?.verified_level ??
    status?.profile?.self_reported_level ??
    "Beginner";

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-medium text-sky-700 dark:text-cyan-200">
          Placement
        </p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight text-stone-900 dark:text-white sm:text-5xl">
          Check your level
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-stone-600 dark:text-slate-300">
          We use this to personalize your examples, review pace, and starter vocabulary.
        </p>
      </div>

      {message ? (
        <div className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-700 dark:border-white/10 dark:bg-black/20 dark:text-slate-200">
          {message}
        </div>
      ) : null}

      {isLoadingStatus ? (
        <div className="rounded-2xl border border-stone-200 bg-white px-4 py-6 text-sm text-stone-700 dark:border-white/10 dark:bg-black/20 dark:text-slate-200">
          Loading placement status...
        </div>
      ) : null}

      {!isLoadingStatus && status && !payload ? (
        <div className="rounded-[32px] border border-stone-200 bg-[#FFFDF8] p-8 dark:border-white/10 dark:bg-[#0f172a]">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-white/10 dark:bg-white/5">
              <p className="text-xs uppercase tracking-wide text-stone-500 dark:text-slate-400">
                Target language
              </p>
              <p className="mt-2 text-lg font-semibold text-stone-900 dark:text-white">
                {status.profile.target_language}
              </p>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-white/10 dark:bg-white/5">
              <p className="text-xs uppercase tracking-wide text-stone-500 dark:text-slate-400">
                Current level
              </p>
              <p className="mt-2 text-lg font-semibold text-stone-900 dark:text-white">
                {currentLevel}
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-stone-200 bg-white p-5 dark:border-white/10 dark:bg-white/5">
            <p className="text-xs uppercase tracking-wide text-stone-500 dark:text-slate-400">
              Last completed
            </p>
            <p className="mt-2 text-sm font-medium text-stone-900 dark:text-white">
              {status.profile.placement_last_completed_at
                ? new Date(status.profile.placement_last_completed_at).toLocaleString()
                : "Not yet"}
            </p>
          </div>

          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={() => void startRetake()}
              disabled={isLoadingQuiz}
              className="rounded-2xl bg-stone-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-stone-800 disabled:opacity-60 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
            >
              {isLoadingQuiz ? "Loading..." : "Retake placement"}
            </button>

            <button
              type="button"
              onClick={() => router.push("/study")}
              className="rounded-2xl border border-stone-200 bg-white px-5 py-3 text-sm font-medium text-stone-800 transition hover:bg-stone-50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
            >
              Go to study
            </button>
          </div>
        </div>
      ) : null}

      {isLoadingQuiz ? (
        <div className="rounded-2xl border border-stone-200 bg-white px-4 py-6 text-sm text-stone-700 dark:border-white/10 dark:bg-black/20 dark:text-slate-200">
          Building your placement quiz...
        </div>
      ) : null}

      {!isLoadingQuiz && payload ? (
        <div className="space-y-6">
          <div className="rounded-[28px] border border-stone-200 bg-[#FFFDF8] p-5 dark:border-white/10 dark:bg-[#0f172a]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm text-stone-500 dark:text-slate-400">
                  {payload.profile.target_language} from {payload.profile.native_language}
                </p>
                <p className="mt-1 text-sm font-medium text-stone-900 dark:text-white">
                  Current target level: {payload.learnerLevel}
                </p>
              </div>

              <span className="rounded-full border border-stone-200 bg-white px-3 py-1 text-xs text-stone-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                {answeredCount}/{items.length} answered
              </span>
            </div>

            <div className="mt-4 h-3 overflow-hidden rounded-full bg-stone-200 dark:bg-white/10">
              <div
                className="h-full rounded-full bg-stone-900 transition-all dark:bg-white"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {currentItem ? (
            <div className="rounded-[32px] border border-stone-200 bg-[#FFFDF8] p-8 shadow-[0_18px_40px_rgba(60,40,20,0.06)] dark:border-white/10 dark:bg-[#0f172a]">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-stone-500 dark:text-slate-400">
                  Question {currentIndex + 1} of {items.length}
                </p>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    currentItem.difficulty === "hard"
                      ? "border border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-100"
                      : currentItem.difficulty === "medium"
                      ? "border border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-100"
                      : "border border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-100"
                  }`}
                >
                  {currentItem.difficulty ?? "easy"}
                </span>
              </div>

              <div className="rounded-[28px] border border-stone-200 bg-white p-8 text-center dark:border-white/10 dark:bg-white/5">
                <p className="text-sm uppercase tracking-[0.2em] text-stone-500 dark:text-slate-400">
                  Do you know this?
                </p>

                <p className="mt-5 text-4xl font-semibold tracking-tight text-stone-900 dark:text-white sm:text-5xl">
                  {currentItem.targetWord}
                </p>

                <p className="mt-4 text-lg text-stone-600 dark:text-slate-300">
                  Expected meaning: {currentItem.translation}
                </p>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <button
                  type="button"
                  onClick={() => setAnswer("know")}
                  className={`rounded-2xl px-4 py-4 text-sm font-semibold transition ${
                    answers[currentIndex] === "know"
                      ? "bg-stone-900 text-white dark:bg-white dark:text-slate-900"
                      : "border border-stone-200 bg-white text-stone-800 hover:bg-stone-50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
                  }`}
                >
                  I know this
                </button>

                <button
                  type="button"
                  onClick={() => setAnswer("unsure")}
                  className={`rounded-2xl px-4 py-4 text-sm font-semibold transition ${
                    answers[currentIndex] === "unsure"
                      ? "bg-stone-900 text-white dark:bg-white dark:text-slate-900"
                      : "border border-stone-200 bg-white text-stone-800 hover:bg-stone-50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
                  }`}
                >
                  I’m not sure
                </button>

                <button
                  type="button"
                  onClick={() => setAnswer("dont_know")}
                  className={`rounded-2xl px-4 py-4 text-sm font-semibold transition ${
                    answers[currentIndex] === "dont_know"
                      ? "bg-stone-900 text-white dark:bg-white dark:text-slate-900"
                      : "border border-stone-200 bg-white text-stone-800 hover:bg-stone-50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
                  }`}
                >
                  I don’t know it
                </button>
              </div>

              <div className="mt-6 flex justify-between gap-3">
                <button
                  type="button"
                  onClick={goBack}
                  disabled={currentIndex === 0 || isSubmitting}
                  className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm font-medium text-stone-800 transition hover:bg-stone-50 disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
                >
                  Back
                </button>

                <button
                  type="button"
                  onClick={goNext}
                  disabled={!answers[currentIndex] || isSubmitting}
                  className="rounded-2xl bg-stone-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-stone-800 disabled:opacity-50 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
                >
                  {isSubmitting
                    ? "Saving..."
                    : currentIndex === items.length - 1
                    ? "Finish placement"
                    : "Next"}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}