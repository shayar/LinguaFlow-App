"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type GeneratedCard = {
  targetWord: string;
  translation: string;
  pronunciation?: string | null;
  exampleSentence?: string | null;
  exampleTranslationNative?: string | null;
  glossItems?: Array<{
    token: string;
    gloss: string;
    isTarget: boolean;
  }>;
  explanation?: string | null;
  metadata?: Record<string, unknown>;
};

const TARGET_LANGUAGE_OPTIONS = [
  "Spanish",
  "English",
  "French",
  "German",
  "Italian",
  "Portuguese",
  "Nepali",
  "Hindi",
  "Japanese",
  "Korean",
];

export default function AiDeckBuilderClient() {
  const router = useRouter();

  const [sourceText, setSourceText] = useState("");
  const [targetLanguage, setTargetLanguage] = useState("English");
  const [learnerLevel, setLearnerLevel] = useState("Beginner");
  const [nativeLanguage, setNativeLanguage] = useState("English");

  const [generatedTitle, setGeneratedTitle] = useState("");
  const [generatedCards, setGeneratedCards] = useState<GeneratedCard[]>([]);
  const [message, setMessage] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      try {
        const response = await fetch("/api/learner/profile");
        const result = await response.json();

        if (!response.ok || !result.profile) return;

        setTargetLanguage(result.profile.target_language ?? "English");
        setLearnerLevel(
          result.profile.verified_level ??
            result.profile.self_reported_level ??
            "Beginner"
        );
        setNativeLanguage(result.profile.native_language ?? "English");
      } catch (error) {
        console.error("Failed to load learner profile for deck builder:", error);
      }
    }

    loadProfile();
  }, []);

  async function handleGenerate() {
    if (!sourceText.trim()) {
      setMessage("Please paste some source text first.");
      return;
    }

    try {
      setIsGenerating(true);
      setMessage("");
      setGeneratedCards([]);

      const response = await fetch("/api/ai/generate-deck", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          source_text: sourceText,
          target_language: targetLanguage,
          learner_level: learnerLevel,
          native_language: nativeLanguage,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error || "Failed to generate deck.");
        return;
      }

      setGeneratedTitle(result.title);
      setGeneratedCards(result.cards || []);
      setMessage(`Generated ${result.cards?.length ?? 0} cards.`);
    } catch (error) {
      console.error(error);
      setMessage("Failed to generate deck.");
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleSave() {
    if (!generatedTitle || generatedCards.length === 0) {
      setMessage("Generate a deck first.");
      return;
    }

    try {
      setIsSaving(true);
      setMessage("");

      const response = await fetch("/api/decks/create-from-ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: generatedTitle,
          language: targetLanguage,
          difficultyLevel: learnerLevel,
          category: "generated-from-text",
          cards: generatedCards,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error || "Failed to save AI deck.");
        return;
      }

      setMessage(
        `Deck saved and ${result.assignedCount} cards assigned. Redirecting to study...`
      );

      router.push("/study");
      router.refresh();
    } catch (error) {
      console.error(error);
      setMessage("Failed to save AI deck.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="w-full max-w-2xl rounded-[28px] border border-stone-200 bg-[#FFFDF8] p-6 shadow-[0_18px_40px_rgba(60,40,20,0.08)] dark:border-white/10 dark:bg-[#0f172a] dark:shadow-none sm:p-8">
      <div className="mb-8">
        <p className="text-sm font-medium text-sky-700 dark:text-cyan-200">
          AI deck builder
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-stone-900 dark:text-white sm:text-3xl">
          Generate a deck from text
        </h2>
        <p className="mt-3 text-sm leading-6 text-stone-600 dark:text-slate-300">
          The selected target language follows the learner profile, not a hidden Spanish default.
        </p>
      </div>

      <div className="space-y-5">
        <textarea
          value={sourceText}
          onChange={(event) => setSourceText(event.target.value)}
          placeholder="Paste learner text, article text, or OCR output here..."
          rows={8}
          className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 outline-none placeholder:text-stone-400 transition focus:border-stone-400 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500"
        />

        <div className="grid gap-5 sm:grid-cols-3">
          <div>
            <label className="mb-2 block text-sm font-medium text-stone-800 dark:text-slate-200">
              Target language
            </label>
            <select
              value={targetLanguage}
              onChange={(event) => setTargetLanguage(event.target.value)}
              className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 dark:border-white/10 dark:bg-white/5 dark:text-white"
            >
              {TARGET_LANGUAGE_OPTIONS.map((language) => (
                <option key={language} value={language}>
                  {language}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-stone-800 dark:text-slate-200">
              Learner level
            </label>
            <select
              value={learnerLevel}
              onChange={(event) => setLearnerLevel(event.target.value)}
              className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 dark:border-white/10 dark:bg-white/5 dark:text-white"
            >
              <option value="Beginner">Beginner</option>
              <option value="Elementary">Elementary</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Advanced">Advanced</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-stone-800 dark:text-slate-200">
              Native language
            </label>
            <input
              value={nativeLanguage}
              onChange={(event) => setNativeLanguage(event.target.value)}
              className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 dark:border-white/10 dark:bg-white/5 dark:text-white"
            />
          </div>
        </div>

        {message ? (
          <div className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-700 dark:border-white/10 dark:bg-black/20 dark:text-slate-200">
            {message}
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating}
            className="rounded-2xl bg-stone-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-stone-800 disabled:opacity-60 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
          >
            {isGenerating ? "Generating..." : "Generate deck with AI"}
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || generatedCards.length === 0}
            className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm font-semibold text-stone-800 transition hover:bg-stone-50 disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
          >
            {isSaving ? "Saving..." : "Save deck to app"}
          </button>
        </div>

        {generatedCards.length > 0 ? (
          <div className="space-y-3 pt-2">
            <p className="text-sm font-medium text-stone-900 dark:text-white">
              Generated deck: {generatedTitle}
            </p>

            {generatedCards.map((card, index) => (
              <div
                key={`${card.targetWord}-${index}`}
                className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-white/10 dark:bg-white/5"
              >
                <p className="text-base font-semibold text-stone-900 dark:text-white">
                  {card.targetWord}
                </p>
                <p className="mt-1 text-sm text-stone-600 dark:text-slate-300">
                  {card.translation}
                </p>

                {card.exampleSentence ? (
                  <p className="mt-2 text-sm text-stone-900 dark:text-slate-200">
                    Example: {card.exampleSentence}
                  </p>
                ) : null}

                {card.exampleTranslationNative ? (
                  <p className="mt-2 text-sm text-emerald-700 dark:text-emerald-200">
                    Native translation: {card.exampleTranslationNative}
                  </p>
                ) : null}

                {card.explanation ? (
                  <p className="mt-2 text-sm text-stone-500 dark:text-slate-400">
                    {card.explanation}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}