"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function FirstRunClient() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSetup() {
    try {
      setIsSubmitting(true);
      setMessage("");

      const response = await fetch("/api/first-run/setup-deck", {
        method: "POST",
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error || "Failed to set up your first deck.");
        return;
      }

      setMessage(
        `Deck ready: ${result.language} ${result.difficultyLevel}. Assigned ${result.assignedCount} cards. Redirecting to study...`
      );

      router.push("/study");
      router.refresh();
    } catch (error) {
      console.error(error);
      setMessage("Unable to complete first-run setup right now.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-white/10 p-6 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-8">
      <div className="mb-8">
        <p className="text-sm font-medium text-indigo-200">Starter setup</p>
        <h2 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">
          Start learning in one click
        </h2>
        <p className="mt-3 text-sm leading-6 text-slate-300">
          We’ll prepare a starter deck matched to your language and current level,
          assign it to your account, and send you straight into study mode.
        </p>
      </div>

      {message ? (
        <div className="mb-5 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-200">
          {message}
        </div>
      ) : null}

      <button
        type="button"
        onClick={handleSetup}
        disabled={isSubmitting}
        className="inline-flex w-full items-center justify-center rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Setting up..." : "Set up my personalized starter deck"}
      </button>
    </div>
  );
}