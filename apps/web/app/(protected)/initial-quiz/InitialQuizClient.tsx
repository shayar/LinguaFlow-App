"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type QuizWord = {
  targetWord: string;
  translation: string;
};

type InitialQuizStatus = {
  alreadyCompleted: boolean;
  locked: boolean;
  targetLanguage: string;
  nativeLanguage: string;
  learnerLevel: string;
};

export default function InitialQuizClient() {
  const router = useRouter();

  const [targetLanguage, setTargetLanguage] = useState("Spanish");
  const [nativeLanguage, setNativeLanguage] = useState("English");
  const [learnerLevel, setLearnerLevel] = useState("Beginner");
  const [words, setWords] = useState<QuizWord[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [message, setMessage] = useState("");
  const [isLoadingQuiz, setIsLoadingQuiz] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function loadStatusAndQuiz() {
      try {
        const statusResponse = await fetch("/api/initial-quiz/status");
        const statusResult: InitialQuizStatus | { error: string } = await statusResponse.json();

        if (!statusResponse.ok) {
          setMessage(
            "error" in statusResult ? statusResult.error : "Failed to load initial quiz."
          );
          return;
        }

        const status = statusResult as InitialQuizStatus;

        if (status.alreadyCompleted || status.locked) {
          router.replace("/dashboard");
          router.refresh();
          return;
        }

        setTargetLanguage(status.targetLanguage);
        setNativeLanguage(status.nativeLanguage);
        setLearnerLevel(status.learnerLevel);

        const quizResponse = await fetch("/api/ai/generate-initial-quiz", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            target_language: status.targetLanguage,
            native_language: status.nativeLanguage,
            learner_level: status.learnerLevel,
            quiz_size: 8,
          }),
        });

        const quizResult = await quizResponse.json();

        if (!quizResponse.ok) {
          setMessage(quizResult.error || "Failed to generate initial quiz.");
          return;
        }

        setWords(quizResult.items || []);
      } catch (error) {
        console.error("Failed to load initial quiz:", error);
        setMessage("Failed to load initial quiz.");
      } finally {
        setIsLoadingQuiz(false);
      }
    }

    loadStatusAndQuiz();
  }, [router]);

  async function handleSubmit() {
    setIsSubmitting(true);
    setMessage("");

    try {
      let correct = 0;
      const knownWords: string[] = [];

      words.forEach((word, index) => {
        const answer = (answers[index] || "").trim().toLowerCase();
        const truth = word.translation.trim().toLowerCase();

        if (
          answer &&
          (answer === truth || truth.includes(answer) || answer.includes(truth))
        ) {
          correct += 1;
          knownWords.push(word.targetWord.toLowerCase());
        }
      });

      const response = await fetch("/api/initial-quiz/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          targetLanguage,
          knownWords,
          score: correct,
          total: words.length,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error || "Failed to submit initial quiz.");
        return;
      }

      setMessage("Initial quiz saved. Redirecting to dashboard...");
      router.replace("/dashboard");
      router.refresh();
    } catch (error) {
      console.error(error);
      setMessage("Failed to submit initial quiz.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="rounded-[28px] border border-stone-200 bg-[#FFFDF8] p-6 shadow-[0_18px_40px_rgba(60,40,20,0.08)] dark:border-white/10 dark:bg-[#0f172a] dark:shadow-none">
      <div className="mb-8">
        <p className="text-sm font-medium text-sky-700 dark:text-cyan-200">
          Getting started check
        </p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight">
          Basic {targetLanguage} words check
        </h2>
        <p className="mt-3 text-sm leading-6 text-stone-600 dark:text-slate-300">
          A short starter check for {targetLanguage}, tuned for a {learnerLevel} learner with{" "}
          {nativeLanguage} as the native language.
        </p>
      </div>

      {isLoadingQuiz ? (
        <div className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-700 dark:border-white/10 dark:bg-black/20 dark:text-slate-200">
          Generating your starter check...
        </div>
      ) : null}

      <div className="space-y-4">
        {words.map((word, index) => (
          <div
            key={`${word.targetWord}-${index}`}
            className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-white/10 dark:bg-white/5"
          >
            <p className="text-lg font-semibold">{word.targetWord}</p>
            <p className="mt-2 text-sm text-stone-500 dark:text-slate-400">
              What does this mean?
            </p>
            <input
              value={answers[index] || ""}
              onChange={(e) =>
                setAnswers((prev) => ({ ...prev, [index]: e.target.value }))
              }
              placeholder="Type the meaning in English or your native language"
              className="mt-3 w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm outline-none dark:border-white/10 dark:bg-black/20 dark:text-white"
            />
          </div>
        ))}

        {message ? (
          <div className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-700 dark:border-white/10 dark:bg-black/20 dark:text-slate-200">
            {message}
          </div>
        ) : null}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting || isLoadingQuiz || words.length === 0}
          className="w-full rounded-2xl bg-stone-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-stone-800 disabled:opacity-60 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
        >
          {isSubmitting ? "Saving..." : "Finish starter check"}
        </button>
      </div>
    </div>
  );
}