"use client";

import { useEffect, useState } from "react";

type SentenceReview = {
  id: string;
  target_word: string;
  target_language: string;
  learner_level: string | null;
  generated_sentence: string;
  explanation: string | null;
  advanced_word_count: number;
  advanced_words_json: string[] | null;
  known_words_matched_json: string[] | null;
  replacements_used_json: Array<{ from: string; to: string }> | null;
  iterations_used: number;
  accepted: boolean;
  review_status: string;
  teacher_feedback: string | null;
  created_at: string;
};

export default function SentenceReviewsClient() {
  const [reviews, setReviews] = useState<SentenceReview[]>([]);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  async function loadReviews() {
    const response = await fetch("/api/ai/sentence-reviews");
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Failed to load sentence reviews.");
    }

    setReviews(result.sentenceReviews || []);
  }

  async function updateReviewStatus(
    reviewId: string,
    reviewStatus: "teacher_approved" | "teacher_rejected"
  ) {
    try {
      const response = await fetch(`/api/ai/sentence-reviews/${reviewId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reviewStatus,
          teacherFeedback:
            reviewStatus === "teacher_approved"
              ? "Approved by teacher review."
              : "Rejected by teacher review.",
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error || "Failed to update review.");
        return;
      }

      setMessage(`Review marked as ${reviewStatus}.`);
      await loadReviews();
    } catch (error) {
      console.error(error);
      setMessage("Failed to update review.");
    }
  }

  useEffect(() => {
    async function initialize() {
      try {
        await loadReviews();
        setMessage("Sentence review history loaded.");
      } catch (error) {
        console.error(error);
        setMessage("Failed to load sentence review history.");
      } finally {
        setIsLoading(false);
      }
    }

    initialize();
  }, []);

  return (
    <div className="w-full max-w-3xl rounded-3xl border border-white/10 bg-white/10 p-6 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-8">
      <div className="mb-8">
        <p className="text-sm font-medium text-emerald-200">Review history</p>
        <h2 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">
          Sentence quality log
        </h2>
        <p className="mt-3 text-sm leading-6 text-slate-300">
          Every generated sentence can now be inspected, reviewed, and approved later.
        </p>
      </div>

      {message ? (
        <div className="mb-5 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-200">
          {message}
        </div>
      ) : null}

      {isLoading ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-6 text-sm text-slate-400">
          Loading sentence reviews...
        </div>
      ) : null}

      {!isLoading ? (
        <div className="space-y-4">
          {reviews.map((review) => (
            <div
              key={review.id}
              className="rounded-2xl border border-white/10 bg-black/20 p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-white">
                    {review.target_word}
                  </p>
                  <p className="text-sm text-slate-400">
                    {review.target_language} • {review.learner_level ?? "Unknown level"}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200">
                    {review.review_status}
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200">
                    {review.advanced_word_count} advanced words
                  </span>
                </div>
              </div>

              <p className="mt-4 text-sm text-white">{review.generated_sentence}</p>

              {review.explanation ? (
                <p className="mt-3 text-sm text-slate-400">{review.explanation}</p>
              ) : null}

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-slate-400">Advanced words</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(review.advanced_words_json ?? []).length > 0 ? (
                      (review.advanced_words_json ?? []).map((word) => (
                        <span
                          key={word}
                          className="rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-1 text-xs text-amber-100"
                        >
                          {word}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-slate-500">None</span>
                    )}
                  </div>
                </div>

                <div>
                  <p className="text-xs text-slate-400">Replacements</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(review.replacements_used_json ?? []).length > 0 ? (
                      (review.replacements_used_json ?? []).map((item, index) => (
                        <span
                          key={`${item.from}-${item.to}-${index}`}
                          className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-xs text-cyan-100"
                        >
                          {item.from} → {item.to}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-slate-500">None</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-5 flex gap-3">
                <button
                  type="button"
                  onClick={() => updateReviewStatus(review.id, "teacher_approved")}
                  className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-100 transition hover:bg-emerald-500/15"
                >
                  Teacher approve
                </button>

                <button
                  type="button"
                  onClick={() => updateReviewStatus(review.id, "teacher_rejected")}
                  className="rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-100 transition hover:bg-red-500/15"
                >
                  Teacher reject
                </button>
              </div>
            </div>
          ))}

          {reviews.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-6 text-sm text-slate-400">
              No sentence reviews found yet. Generate AI examples first.
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}