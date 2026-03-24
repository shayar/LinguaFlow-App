"use client";

import { SubmitEvent, useState } from "react";

const QUESTIONS = [
  {
    id: 1,
    question: "How comfortable are you reading very basic greetings and introductions?",
    options: [
      { label: "Not comfortable yet", value: 1 },
      { label: "A little comfortable", value: 2 },
      { label: "Pretty comfortable", value: 3 },
    ],
  },
  {
    id: 2,
    question: "How well can you understand simple everyday sentences?",
    options: [
      { label: "I struggle a lot", value: 1 },
      { label: "I understand some", value: 2 },
      { label: "I understand most", value: 3 },
    ],
  },
  {
    id: 3,
    question: "How well can you recognize common vocabulary in short passages?",
    options: [
      { label: "Very little", value: 1 },
      { label: "A fair amount", value: 2 },
      { label: "Most of it", value: 3 },
    ],
  },
  {
    id: 4,
    question: "How well can you follow basic grammar patterns in the language?",
    options: [
      { label: "Barely", value: 1 },
      { label: "Sometimes", value: 2 },
      { label: "Usually", value: 3 },
    ],
  },
  {
    id: 5,
    question: "How confident are you holding simple conversation in the language?",
    options: [
      { label: "Not confident", value: 1 },
      { label: "Somewhat confident", value: 2 },
      { label: "Quite confident", value: 3 },
    ],
  },
];

export default function PlacementQuizForm() {
  const [userId, setUserId] = useState("");
  const [answers, setAnswers] = useState<number[]>(Array(QUESTIONS.length).fill(0));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successResult, setSuccessResult] = useState<null | {
    estimated_level: string;
    score: number;
    confidence: number;
  }>(null);

  function handleAnswerChange(questionIndex: number, value: number) {
    setAnswers((previous) => {
      const next = [...previous];
      next[questionIndex] = value;
      return next;
    });
  }

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    setErrorMessage("");
    setSuccessResult(null);

    if (!userId) {
      setErrorMessage("Please enter a user ID from your onboarding result.");
      return;
    }

    if (answers.some((answer) => answer === 0)) {
      setErrorMessage("Please answer every question before submitting.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/placement-quiz", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          answers,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setErrorMessage(result.error || "Something went wrong.");
        return;
      }

      setSuccessResult(result.result);
    } catch (error) {
      console.error("Placement quiz submit failed:", error);
      setErrorMessage("Unable to submit the quiz right now.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-white/10 p-6 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-8">
      <div className="mb-8">
        <p className="text-sm font-medium text-cyan-200">Quiz setup</p>
        <h2 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">
          Find your best starting level
        </h2>
        <p className="mt-3 text-sm leading-6 text-slate-300">
          For now, enter a user ID from the onboarding API response. Later,
          we’ll wire this automatically from authentication.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label
            htmlFor="userId"
            className="mb-2 block text-sm font-medium text-slate-200"
          >
            User ID
          </label>
          <input
            id="userId"
            name="userId"
            value={userId}
            onChange={(event) => setUserId(event.target.value)}
            placeholder="Paste the user UUID here"
            className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-400 transition focus:border-cyan-300/40 focus:bg-black/30"
          />
        </div>

        <div className="space-y-4">
          {QUESTIONS.map((question, questionIndex) => (
            <div
              key={question.id}
              className="rounded-2xl border border-white/10 bg-black/20 p-4"
            >
              <p className="text-sm font-medium text-white">
                {question.id}. {question.question}
              </p>

              <div className="mt-4 grid gap-3">
                {question.options.map((option) => {
                  const isSelected = answers[questionIndex] === option.value;

                  return (
                    <label
                      key={option.label}
                      className={`cursor-pointer rounded-2xl border px-4 py-3 text-sm transition ${
                        isSelected
                          ? "border-cyan-300/50 bg-cyan-400/10 text-white"
                          : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                      }`}
                    >
                      <input
                        type="radio"
                        name={`question-${question.id}`}
                        value={option.value}
                        checked={isSelected}
                        onChange={() =>
                          handleAnswerChange(questionIndex, option.value)
                        }
                        className="sr-only"
                      />
                      {option.label}
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {errorMessage ? (
          <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {errorMessage}
          </div>
        ) : null}

        {successResult ? (
          <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-4 text-sm text-emerald-100">
            <p className="font-semibold">Placement result saved</p>
            <p className="mt-2">Estimated level: {successResult.estimated_level}</p>
            <p>Score: {successResult.score}</p>
            <p>Confidence: {successResult.confidence}%</p>
          </div>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex w-full items-center justify-center rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Submitting..." : "Submit placement quiz"}
        </button>
      </form>
    </div>
  );
}