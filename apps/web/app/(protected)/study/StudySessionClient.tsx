"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type StudyCard = {
  learner_card_id: string;
  bucket: string;
  mastery_score: number;
  streak_count: number;
  target_word: string;
  translation: string;
  pronunciation: string | null;
  example_sentence: string | null;
  example_translation_native?: string | null;
  explanation: string | null;
  gloss_items_json?: Array<{
    token: string;
    gloss: string;
    isTarget: boolean;
  }> | null;
  deck_title: string;
  language: string;
};

type DiagnosticsState = {
  advancedWordCount: number;
  advancedWords: string[];
  knownWordsMatched: string[];
  iterationsUsed: number;
  replacementsUsed: Array<{ from: string; to: string }>;
} | null;

type QuizFeedbackState = {
  correct: boolean;
  score: number;
  label: "Excellent" | "Good" | "Almost" | "Needs work";
  learnerAnswer: string;
  correctedAnswer: string;
  focusWordMeaning: string;
  matchedKeywords: string[];
  missingKeywords: string[];
} | null;

function getSpeechLang(language: string) {
  const normalized = language.trim().toLowerCase();

  const map: Record<string, string> = {
    english: "en-US",
    spanish: "es-ES",
    french: "fr-FR",
    german: "de-DE",
    italian: "it-IT",
    portuguese: "pt-PT",
    nepali: "ne-NP",
    hindi: "hi-IN",
    japanese: "ja-JP",
    korean: "ko-KR",
  };

  return map[normalized] ?? "en-US";
}

export default function StudySessionClient() {
  const router = useRouter();
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const [queue, setQueue] = useState<StudyCard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const [aiExample, setAiExample] = useState<string | null>(null);
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [cardShownAt, setCardShownAt] = useState<number | null>(null);
  const [lastCompletedSessionId, setLastCompletedSessionId] = useState<string | null>(null);
  const [learnerLevel, setLearnerLevel] = useState<string>("Beginner");

  const [diagnostics, setDiagnostics] = useState<DiagnosticsState>(null);

  const [showQuiz, setShowQuiz] = useState(false);
  const [showNativeTranslation, setShowNativeTranslation] = useState(true);
  const [showLearningAids, setShowLearningAids] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [quizAnswer, setQuizAnswer] = useState("");
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizFeedback, setQuizFeedback] = useState<QuizFeedbackState>(null);

  const [showWordNotes, setShowWordNotes] = useState(false);
  const [wordNoteTitle, setWordNoteTitle] = useState("");
  const [wordNoteContent, setWordNoteContent] = useState("");
  const [isSavingWordNote, setIsSavingWordNote] = useState(false);

  const [isSpeakingWord, setIsSpeakingWord] = useState(false);
  const [isSpeakingSentence, setIsSpeakingSentence] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);

  const currentCard = useMemo(() => {
    return queue[currentIndex] ?? null;
  }, [queue, currentIndex]);

  const displayedExampleSentence =
    aiExample ?? currentCard?.example_sentence ?? null;

  const displayedExplanation =
    aiExplanation ?? currentCard?.explanation ?? null;

  const currentSentenceTranslation =
    currentCard?.example_translation_native ?? null;

  useEffect(() => {
    setSpeechSupported(typeof window !== "undefined" && "speechSynthesis" in window);
  }, []);

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  useEffect(() => {
    async function initializeStudy() {
      try {
        const profileResponse = await fetch("/api/learner/profile");
        const profileResult = await profileResponse.json();

        if (profileResponse.ok && profileResult.profile) {
          setLearnerLevel(
            profileResult.profile.verified_level ??
              profileResult.profile.self_reported_level ??
              "Beginner"
          );
        } else {
          setLearnerLevel("Beginner");
        }

        setMessage("Ready to study.");
      } catch (error) {
        console.error(error);
        setMessage("Failed to initialize study page.");
      } finally {
        setIsLoading(false);
      }
    }

    initializeStudy();
  }, []);

  useEffect(() => {
    async function loadLatestArtifact() {
      if (!currentCard) {
        setAiExample(null);
        setAiExplanation(null);
        setDiagnostics(null);
        return;
      }

      try {
        const response = await fetch(
          `/api/ai/artifacts?learnerCardId=${encodeURIComponent(
            currentCard.learner_card_id
          )}`
        );

        const result = await response.json();

        if (!response.ok) return;

        if (result.artifact) {
          setAiExample(result.artifact.exampleSentence ?? null);
          setAiExplanation(result.artifact.explanation ?? null);
        } else {
          setAiExample(null);
          setAiExplanation(null);
        }
      } catch (error) {
        console.error("Failed to load latest AI artifact:", error);
      }
    }

    loadLatestArtifact();
  }, [currentCard]);

  useEffect(() => {
    async function loadWordNote() {
      if (!currentCard) {
        setWordNoteTitle("");
        setWordNoteContent("");
        return;
      }

      try {
        const response = await fetch(
          `/api/notes/word?learnerCardId=${encodeURIComponent(
            currentCard.learner_card_id
          )}`
        );
        const result = await response.json();

        if (!response.ok) return;

        setWordNoteTitle(result.note?.title ?? "");
        setWordNoteContent(result.note?.content ?? "");
      } catch (error) {
        console.error("Failed to load word note:", error);
      }
    }

    loadWordNote();
  }, [currentCard]);

  function resetCardInteractionState() {
    setShowQuiz(false);
    setShowNativeTranslation(true);
    setShowLearningAids(false);
    setShowDiagnostics(false);
    setQuizAnswer("");
    setQuizSubmitted(false);
    setQuizFeedback(null);
    setDiagnostics(null);
  }

  function stopSpeaking() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    utteranceRef.current = null;
    setIsSpeakingWord(false);
    setIsSpeakingSentence(false);
  }

  function speakText(text: string, kind: "word" | "sentence") {
    if (!speechSupported || !currentCard || !text.trim()) {
      return;
    }

    stopSpeaking();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = getSpeechLang(currentCard.language);
    utterance.rate = kind === "word" ? 0.85 : 0.95;
    utterance.pitch = 1;

    utterance.onstart = () => {
      if (kind === "word") {
        setIsSpeakingWord(true);
      } else {
        setIsSpeakingSentence(true);
      }
    };

    utterance.onend = () => {
      setIsSpeakingWord(false);
      setIsSpeakingSentence(false);
      utteranceRef.current = null;
    };

    utterance.onerror = () => {
      setIsSpeakingWord(false);
      setIsSpeakingSentence(false);
      setMessage("Audio playback was not available in this browser.");
      utteranceRef.current = null;
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }

  function normalizeText(text: string) {
    return text
      .trim()
      .toLowerCase()
      .replace(/[.,!?;:()"']/g, "")
      .replace(/\s+/g, " ");
  }

  function tokenizeMeaning(text: string) {
    const normalized = normalizeText(text);
    if (!normalized) return [];
    return normalized.split(" ").filter(Boolean);
  }

  function getKeywordSet(text: string) {
    const stopwords = new Set([
      "the",
      "a",
      "an",
      "is",
      "are",
      "was",
      "were",
      "to",
      "of",
      "in",
      "on",
      "at",
      "for",
      "with",
      "and",
      "or",
      "this",
      "that",
      "it",
      "very",
      "my",
      "your",
      "our",
    ]);

    return Array.from(
      new Set(
        tokenizeMeaning(text).filter((token) => token.length > 2 && !stopwords.has(token))
      )
    );
  }

  function scoreQuizAnswer(
    learnerAnswer: string,
    correctedAnswer: string,
    focusWordMeaning: string
  ): Exclude<QuizFeedbackState, null> {
    const learnerNormalized = normalizeText(learnerAnswer);
    const correctedNormalized = normalizeText(correctedAnswer);
    const focusNormalized = normalizeText(focusWordMeaning);

    const correctedKeywords = getKeywordSet(correctedAnswer);
    const learnerKeywords = new Set(getKeywordSet(learnerAnswer));

    const matchedKeywords = correctedKeywords.filter((word) =>
      learnerKeywords.has(word)
    );
    const missingKeywords = correctedKeywords.filter(
      (word) => !learnerKeywords.has(word)
    );

    const exactMatch =
      learnerNormalized.length > 0 &&
      learnerNormalized === correctedNormalized;

    const containsMatch =
      learnerNormalized.length > 0 &&
      (correctedNormalized.includes(learnerNormalized) ||
        learnerNormalized.includes(correctedNormalized));

    const focusWordMatched =
      learnerNormalized.includes(focusNormalized) ||
      Array.from(learnerKeywords).some((word) => focusNormalized.includes(word));

    let score = 0;

    if (exactMatch) {
      score = 100;
    } else {
      const keywordScore =
        correctedKeywords.length > 0
          ? Math.round((matchedKeywords.length / correctedKeywords.length) * 100)
          : 0;

      score = keywordScore;

      if (containsMatch) score = Math.max(score, 85);
      if (focusWordMatched) score += 10;
      score = Math.min(score, 100);
    }

    let label: "Excellent" | "Good" | "Almost" | "Needs work" = "Needs work";
    let correct = false;

    if (score >= 90) {
      label = "Excellent";
      correct = true;
    } else if (score >= 70) {
      label = "Good";
      correct = true;
    } else if (score >= 45) {
      label = "Almost";
    }

    return {
      correct,
      score,
      label,
      learnerAnswer,
      correctedAnswer,
      focusWordMeaning,
      matchedKeywords,
      missingKeywords,
    };
  }

  function highlightTargetWord(sentence: string, targetWord: string) {
    const escaped = targetWord.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`\\b(${escaped})\\b`, "i");
    const parts = sentence.split(regex);

    return parts.map((part, index) => {
      if (part.toLowerCase() === targetWord.toLowerCase()) {
        return (
          <strong
            key={`${part}-${index}`}
            className="rounded-md bg-lime-300/85 px-2 py-0.5 font-semibold text-stone-900"
          >
            {part}
          </strong>
        );
      }

      return <span key={`${part}-${index}`}>{part}</span>;
    });
  }

  function buildSentenceGloss(
    sentence: string,
    targetWord: string,
    backendGlossItems?: Array<{
      token: string;
      gloss: string;
      isTarget: boolean;
    }> | null
  ) {
    if (backendGlossItems && backendGlossItems.length > 0) {
      return backendGlossItems.map((item, index) => {
        const isAdvanced =
          diagnostics?.advancedWords?.some(
            (word) => word.toLowerCase() === item.token.toLowerCase()
          ) ?? false;

        return (
          <div
            key={`${item.token}-${index}`}
            className={`min-w-[76px] rounded-2xl border px-3 py-2 text-center ${
              item.isTarget
                ? "border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-100"
                : isAdvanced
                ? "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-100"
                : "border-stone-200 bg-white text-stone-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
            }`}
          >
            <p className="text-xs font-medium">{item.token}</p>
            <p className="mt-1 text-[10px] text-stone-500 dark:text-slate-400">
              {item.gloss || "—"}
            </p>
          </div>
        );
      });
    }

    const tokens = sentence.match(/[A-Za-zÀ-ÿ\u0900-\u097F']+|[.,!?;:]/g) ?? [];

    return tokens.map((token, index) => {
      const clean = token.toLowerCase();
      const isTarget = clean === targetWord.toLowerCase();
      const isAdvanced =
        diagnostics?.advancedWords?.some(
          (word) => word.toLowerCase() === clean
        ) ?? false;

      return (
        <div
          key={`${token}-${index}`}
          className={`min-w-[76px] rounded-2xl border px-3 py-2 text-center ${
            isTarget
              ? "border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-100"
              : isAdvanced
              ? "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-100"
              : "border-stone-200 bg-white text-stone-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
          }`}
        >
          <p className="text-xs font-medium">{token}</p>
          <p className="mt-1 text-[10px] text-stone-500 dark:text-slate-400">
            {isTarget ? currentCard?.translation ?? "—" : "—"}
          </p>
        </div>
      );
    });
  }

  function submitQuiz() {
    if (!currentCard || !displayedExampleSentence) return;

    const correctedAnswer =
      currentSentenceTranslation || currentCard.translation;

    const feedback = scoreQuizAnswer(
      quizAnswer,
      correctedAnswer,
      currentCard.translation
    );

    setQuizSubmitted(true);
    setQuizFeedback(feedback);

    if (feedback.correct) {
      setMessage(`${feedback.label} — you captured the meaning well.`);
    } else if (feedback.label === "Almost") {
      setMessage("Almost there — you got part of the meaning.");
    } else {
      setMessage("Good try — now let’s tighten the meaning and focus word.");
    }
  }

  async function startSession() {
    const response = await fetch("/api/study/session/start", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sessionType: "review",
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Failed to start session");
    }

    return result.session.id as string;
  }

  async function endSession(completedSessionId?: string) {
    const effectiveSessionId = completedSessionId ?? sessionId;
    if (!effectiveSessionId) return;

    try {
      await fetch("/api/study/session/end", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId: effectiveSessionId,
        }),
      });
    } catch (error) {
      console.error("Failed to end session:", error);
    }
  }

  async function loadQueue() {
    setIsLoading(true);
    setMessage("");
    setAiExample(null);
    setAiExplanation(null);
    resetCardInteractionState();
    stopSpeaking();

    try {
      const newSessionId = await startSession();
      setSessionId(newSessionId);

      const response = await fetch("/api/study/queue");
      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error || "Failed to load study queue.");
        return;
      }

      if (result.learnerLevel) {
        setLearnerLevel(result.learnerLevel);
      }

      setQueue(result.queue || []);
      setCurrentIndex(0);
      setCardShownAt(Date.now());
      setMessage(`Loaded ${result.queue?.length ?? 0} cards.`);
    } catch (error) {
      console.error(error);
      setMessage("Failed to load study queue.");
    } finally {
      setIsLoading(false);
    }
  }

  async function regenerateExample() {
    if (!currentCard) return;

    setIsGenerating(true);
    setMessage("");

    try {
      const response = await fetch("/api/ai/generate-checked-example", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          targetWord: currentCard.target_word,
          translation: currentCard.translation,
          targetLanguage: currentCard.language,
          learnerLevel,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error || "Failed to generate checked example.");
        return;
      }

      setAiExample(result.exampleSentence);
      setAiExplanation(result.explanation);

      setDiagnostics({
        advancedWordCount: result.finalCheck?.advancedWordCount ?? 0,
        advancedWords: result.finalCheck?.unknownNonFocusWords ?? [],
        knownWordsMatched: result.finalCheck?.knownWordsMatched ?? [],
        iterationsUsed: result.iterationsUsed ?? 0,
        replacementsUsed:
          Array.isArray(result.refinementHistory) && result.refinementHistory.length > 0
            ? (result.refinementHistory[result.refinementHistory.length - 1]
                ?.replacementsUsed ?? [])
            : [],
      });

      const saveResponse = await fetch("/api/ai/artifacts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          learnerCardId: currentCard.learner_card_id,
          targetWord: currentCard.target_word,
          translation: currentCard.translation,
          targetLanguage: currentCard.language,
          learnerLevel,
          exampleSentence: result.exampleSentence,
          exampleTranslationNative: result.exampleTranslationNative,
          explanation: result.explanation,
          source: "fastapi-generate-example",
        }),
      });

      const saveResult = await saveResponse.json();

      if (!saveResponse.ok) {
        setMessage(saveResult.error || "Generated checked example but failed to save artifact.");
        return;
      }

      resetCardInteractionState();
      setMessage("Generated a refined example for this word.");
    } catch (error) {
      console.error(error);
      setMessage("Failed to generate checked example.");
    } finally {
      setIsGenerating(false);
    }
  }

  async function saveWordNote() {
    if (!currentCard) return;

    try {
      setIsSavingWordNote(true);

      const response = await fetch("/api/notes/word", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          learnerCardId: currentCard.learner_card_id,
          title: wordNoteTitle,
          content: wordNoteContent,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error || "Failed to save word note.");
        return;
      }

      setMessage("Word note saved.");
    } catch (error) {
      console.error(error);
      setMessage("Failed to save word note.");
    } finally {
      setIsSavingWordNote(false);
    }
  }

  async function updateBucket(bucket: "known" | "learning" | "hard") {
    if (!currentCard || !sessionId) return;

    setIsLoading(true);
    setMessage("");
    stopSpeaking();

    try {
      const updateResponse = await fetch("/api/learner/cards/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          learnerCardId: currentCard.learner_card_id,
          bucket,
        }),
      });

      const updateResult = await updateResponse.json();

      if (!updateResponse.ok) {
        setMessage(updateResult.error || "Failed to update card.");
        return;
      }

      const responseTimeMs = cardShownAt ? Date.now() - cardShownAt : null;

      const reviewResponse = await fetch("/api/study/review-event", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId,
          learnerCardId: currentCard.learner_card_id,
          result: bucket,
          bucketAfter: bucket,
          responseTimeMs,
        }),
      });

      const reviewResult = await reviewResponse.json();

      if (!reviewResponse.ok) {
        setMessage(reviewResult.error || "Card updated but failed to log review event.");
        return;
      }

      const updatedCard = updateResult.learnerCard;
      const nextReviewText = updatedCard?.next_review_at
        ? new Date(updatedCard.next_review_at).toLocaleString()
        : "later";

      const nextQueue = queue.filter(
        (card) => card.learner_card_id !== currentCard.learner_card_id
      );

      setQueue(nextQueue);
      setCurrentIndex(0);
      setAiExample(null);
      setAiExplanation(null);
      resetCardInteractionState();
      setCardShownAt(Date.now());

      if (nextQueue.length === 0) {
        const completedSessionId = sessionId;
        await endSession(completedSessionId);
        setLastCompletedSessionId(completedSessionId);
        setSessionId(null);
        setMessage(`Marked as ${bucket}. Session completed.`);

        router.push(
          `/study/summary?sessionId=${encodeURIComponent(completedSessionId)}`
        );
        return;
      }

      if (bucket === "known") {
        setMessage(
          `"${currentCard.target_word}" moved forward. Next review: ${nextReviewText}.`
        );
      } else if (bucket === "learning") {
        setMessage(
          `"${currentCard.target_word}" stays active. Next review: ${nextReviewText}.`
        );
      } else {
        setMessage(
          `"${currentCard.target_word}" will come back sooner for reinforcement. Next review: ${nextReviewText}.`
        );
      }
    } catch (error) {
      console.error(error);
      setMessage("Failed to update card.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="w-full max-w-5xl rounded-[32px] border border-stone-200 bg-[#F7F3EB] p-6 text-stone-900 shadow-[0_20px_60px_rgba(40,32,20,0.08)] dark:border-white/10 dark:bg-[#111827] dark:text-slate-100 dark:shadow-2xl sm:p-8">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-sky-700 dark:text-cyan-200">
            Study flow
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-stone-900 dark:text-white sm:text-4xl">
            Learn one word deeply
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600 dark:text-slate-300">
            Example first. Then continue. Then quiz. Then decide whether it feels known, active, or hard.
          </p>
        </div>

        <button
          type="button"
          onClick={loadQueue}
          disabled={isLoading}
          className="rounded-2xl bg-stone-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-stone-800 disabled:opacity-60 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
        >
          {isLoading ? "Loading..." : "Load study queue"}
        </button>
      </div>

      {message ? (
        <div className="mb-4 rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-700 dark:border-white/10 dark:bg-black/20 dark:text-slate-200">
          {message}
        </div>
      ) : null}

      {!currentCard && queue.length === 0 && !isLoading ? (
        <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-6 text-sm text-stone-600 dark:border-white/10 dark:bg-black/20 dark:text-slate-300">
          <p className="font-medium text-stone-900 dark:text-white">
            No study cards ready yet
          </p>
          <p className="mt-2">
            Start with basics or build a deck from AI/imported content first.
          </p>
          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={() => router.push("/starter-deck")}
              className="inline-flex rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs font-medium text-stone-800 transition hover:bg-stone-100 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
            >
              Go to starter deck
            </button>
            <button
              type="button"
              onClick={() => router.push("/build")}
              className="inline-flex rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs font-medium text-stone-800 transition hover:bg-stone-100 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
            >
              Go to build
            </button>
          </div>
        </div>
      ) : null}

      {currentCard ? (
        <div className="space-y-6">
          <div className="rounded-[32px] border border-stone-200 bg-[#FFFDF8] p-6 shadow-[0_18px_40px_rgba(60,40,20,0.06)] dark:border-white/10 dark:bg-[#0f172a] dark:shadow-none sm:p-8">
            <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-stone-500 dark:text-slate-400">
                  {currentCard.language} • {currentCard.deck_title}
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <span className="rounded-md bg-lime-300/85 px-3 py-1 text-sm font-semibold text-stone-900">
                    {currentCard.target_word}
                  </span>

                  <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs text-sky-800 dark:border-cyan-300/20 dark:bg-cyan-400/10 dark:text-cyan-100">
                    {currentCard.bucket}
                  </span>

                  <span className="rounded-full border border-stone-200 bg-white px-3 py-1 text-xs text-stone-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                    Mastery {currentCard.mastery_score}
                  </span>
                </div>

                <p className="mt-4 text-lg font-medium text-stone-900 dark:text-white">
                  {currentCard.translation}
                </p>

                {currentCard.pronunciation ? (
                  <p className="mt-2 text-sm text-stone-600 dark:text-slate-300">
                    Pronunciation: {currentCard.pronunciation}
                  </p>
                ) : null}
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowWordNotes((prev) => !prev)}
                  className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-medium text-stone-800 transition hover:bg-stone-50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
                >
                  {showWordNotes ? "Hide notes" : "Add notes"}
                </button>

                <button
                  type="button"
                  onClick={regenerateExample}
                  disabled={isGenerating}
                  className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-medium text-stone-800 transition hover:bg-stone-50 disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
                >
                  {isGenerating ? "Generating..." : "Regenerate with AI"}
                </button>
              </div>
            </div>

            <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-[28px] border border-stone-200 bg-white p-6 dark:border-white/10 dark:bg-white/5">
                <p className="text-xs uppercase tracking-[0.2em] text-stone-500 dark:text-slate-400">
                  Example
                </p>

                <div className="mt-4 text-2xl leading-[1.9] text-stone-900 dark:text-slate-100 sm:text-3xl">
                  {displayedExampleSentence
                    ? highlightTargetWord(displayedExampleSentence, currentCard.target_word)
                    : "No example available yet."}
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <button
                    type="button"
                    onClick={() => speakText(currentCard.target_word, "word")}
                    disabled={!speechSupported || isSpeakingSentence}
                    className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm font-medium text-stone-800 transition hover:bg-stone-100 disabled:opacity-60 dark:border-white/10 dark:bg-black/20 dark:text-white dark:hover:bg-black/30"
                  >
                    {isSpeakingWord ? "Playing word..." : "Play word"}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      displayedExampleSentence
                        ? speakText(displayedExampleSentence, "sentence")
                        : null
                    }
                    disabled={!speechSupported || !displayedExampleSentence || isSpeakingWord}
                    className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm font-medium text-stone-800 transition hover:bg-stone-100 disabled:opacity-60 dark:border-white/10 dark:bg-black/20 dark:text-white dark:hover:bg-black/30"
                  >
                    {isSpeakingSentence ? "Playing sentence..." : "Play sentence"}
                  </button>

                  <button
                    type="button"
                    onClick={stopSpeaking}
                    disabled={!isSpeakingWord && !isSpeakingSentence}
                    className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 transition hover:bg-rose-100 disabled:opacity-60 dark:border-red-400/20 dark:bg-red-500/10 dark:text-red-100 dark:hover:bg-red-500/15"
                  >
                    Stop audio
                  </button>
                </div>

                {!speechSupported ? (
                  <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-100">
                    Audio playback depends on browser speech support.
                  </div>
                ) : null}
              </div>

              <div className="space-y-4">
                {showNativeTranslation ? (
                  <div className="rounded-[28px] border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-400/20 dark:bg-emerald-500/10">
                    <p className="text-xs uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-100">
                      Sentence meaning
                    </p>
                    <p className="mt-3 text-lg leading-7 text-stone-900 dark:text-white">
                      {currentSentenceTranslation || currentCard.translation}
                    </p>
                  </div>
                ) : null}

                <div className="rounded-[28px] border border-stone-200 bg-stone-50 p-5 dark:border-white/10 dark:bg-black/20">
                  <p className="text-xs uppercase tracking-[0.18em] text-stone-500 dark:text-slate-400">
                    Focus word
                  </p>
                  <div className="mt-3 flex items-center gap-3">
                    <span className="rounded-md bg-lime-300/85 px-3 py-1 text-sm font-semibold text-stone-900">
                      {currentCard.target_word}
                    </span>
                    <span className="text-sm text-stone-600 dark:text-slate-300">
                      {currentCard.translation}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  {!showQuiz ? (
                    <button
                      type="button"
                      onClick={() => setShowQuiz(true)}
                      className="rounded-2xl bg-stone-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-stone-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
                    >
                      Continue to quiz
                    </button>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => setShowNativeTranslation((previous) => !previous)}
                    className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm font-medium text-stone-800 transition hover:bg-stone-50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
                  >
                    {showNativeTranslation ? "Hide translation" : "Show translation"}
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowLearningAids((previous) => !previous)}
                    className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm font-medium text-stone-800 transition hover:bg-stone-50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
                  >
                    {showLearningAids ? "Hide learning aids" : "Show learning aids"}
                  </button>

                  {diagnostics ? (
                    <button
                      type="button"
                      onClick={() => setShowDiagnostics((previous) => !previous)}
                      className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm font-medium text-stone-800 transition hover:bg-stone-50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
                    >
                      {showDiagnostics ? "Hide diagnostics" : "Show diagnostics"}
                    </button>
                  ) : null}
                </div>
              </div>
            </div>

            {showLearningAids ? (
              <div className="mt-6 grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 dark:border-white/10 dark:bg-black/20">
                  <p className="text-sm text-stone-500 dark:text-slate-400">
                    Focus word
                  </p>
                  <p className="mt-2 text-xl font-semibold text-stone-900 dark:text-white">
                    {currentCard.target_word}
                  </p>
                  <p className="mt-2 text-sm text-stone-600 dark:text-slate-300">
                    Meaning:{" "}
                    <span className="font-medium text-stone-900 dark:text-white">
                      {currentCard.translation}
                    </span>
                  </p>
                  {currentCard.pronunciation ? (
                    <p className="mt-2 text-sm text-stone-500 dark:text-slate-400">
                      Pronunciation: {currentCard.pronunciation}
                    </p>
                  ) : null}
                </div>

                {displayedExampleSentence ? (
                  <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 dark:border-white/10 dark:bg-black/20">
                    <p className="text-sm text-stone-500 dark:text-slate-400">
                      Sentence gloss
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {buildSentenceGloss(
                        displayedExampleSentence,
                        currentCard.target_word,
                        currentCard.gloss_items_json
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}

            {showWordNotes ? (
              <div className="mt-6 rounded-[24px] border border-stone-300 bg-[#FFFDF3] p-5 shadow-[inset_0_0_0_1px_rgba(180,160,120,0.18)] dark:border-white/10 dark:bg-[#1a2233]">
                <div className="mb-4 flex items-center gap-3">
                  <span className="inline-block rounded-sm bg-lime-300/80 px-2 py-1 text-sm font-semibold text-stone-900">
                    {currentCard.target_word}
                  </span>
                  <p className="text-sm text-stone-600 dark:text-slate-300">
                    Word notebook
                  </p>
                </div>

                <div className="space-y-4">
                  <input
                    value={wordNoteTitle}
                    onChange={(e) => setWordNoteTitle(e.target.value)}
                    placeholder="Short title for this note..."
                    className="w-full rounded-xl border border-stone-200 bg-white/80 px-4 py-3 text-sm text-stone-900 outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
                  />

                  <textarea
                    value={wordNoteContent}
                    onChange={(e) => setWordNoteContent(e.target.value)}
                    rows={8}
                    placeholder="Write your memory trick, grammar reminder, pronunciation note, or your own sentence..."
                    className="w-full rounded-xl border border-stone-200 bg-[repeating-linear-gradient(to_bottom,#fffdf5_0px,#fffdf5_30px,#dbeafe_31px)] px-4 py-4 text-[15px] leading-[31px] text-stone-800 outline-none dark:border-white/10 dark:bg-[repeating-linear-gradient(to_bottom,#111827_0px,#111827_30px,#334155_31px)] dark:text-slate-100"
                    style={{ fontFamily: '"Patrick Hand","Comic Sans MS","Bradley Hand",cursive' }}
                  />

                  <button
                    type="button"
                    onClick={saveWordNote}
                    disabled={isSavingWordNote}
                    className="rounded-2xl bg-stone-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-stone-800 disabled:opacity-60 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
                  >
                    {isSavingWordNote ? "Saving note..." : "Save word note"}
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          {showQuiz ? (
            <div className="rounded-[28px] border border-stone-200 bg-[#FFFDF8] p-6 shadow-[0_12px_30px_rgba(60,40,20,0.05)] dark:border-white/10 dark:bg-[#0f172a] dark:shadow-none">
              <p className="text-xs uppercase tracking-[0.2em] text-stone-500 dark:text-slate-400">
                Quiz
              </p>
              <p className="mt-3 text-lg text-stone-900 dark:text-white">
                Translate the sentence in your own words.
              </p>

              <textarea
                value={quizAnswer}
                onChange={(event) => setQuizAnswer(event.target.value)}
                placeholder="Type the meaning in your native language..."
                rows={4}
                className="mt-4 w-full rounded-2xl border border-stone-200 bg-white px-4 py-4 text-sm text-stone-900 outline-none placeholder:text-stone-400 focus:border-stone-400 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500"
              />

              <div className="mt-4 flex gap-3">
                <button
                  type="button"
                  onClick={submitQuiz}
                  disabled={quizSubmitted || quizAnswer.trim().length === 0}
                  className="rounded-2xl bg-stone-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-stone-800 disabled:opacity-60 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
                >
                  Submit answer
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setQuizAnswer("");
                    setQuizSubmitted(false);
                    setQuizFeedback(null);
                  }}
                  className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm font-medium text-stone-800 transition hover:bg-stone-50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
                >
                  Reset
                </button>
              </div>

              {quizFeedback ? (
                <div className="mt-5 rounded-2xl border border-stone-200 bg-white p-4 dark:border-white/10 dark:bg-white/5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p
                      className={`text-base font-semibold ${
                        quizFeedback.correct
                          ? "text-emerald-700 dark:text-emerald-200"
                          : quizFeedback.label === "Almost"
                          ? "text-amber-700 dark:text-amber-200"
                          : "text-rose-700 dark:text-rose-200"
                      }`}
                    >
                      {quizFeedback.label}
                    </p>

                    <span className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs text-stone-700 dark:border-white/10 dark:bg-black/20 dark:text-slate-300">
                      Score {quizFeedback.score}
                    </span>
                  </div>

                  <p className="mt-3 text-sm text-stone-600 dark:text-slate-300">
                    “{currentCard.target_word}” means{" "}
                    <strong className="text-stone-900 dark:text-white">
                      {quizFeedback.focusWordMeaning}
                    </strong>.
                  </p>

                  <div className="mt-4 rounded-2xl border border-stone-200 bg-stone-50 p-4 dark:border-white/10 dark:bg-black/20">
                    <p className="text-xs uppercase tracking-wide text-stone-500 dark:text-slate-400">
                      Corrected sentence meaning
                    </p>
                    <p className="mt-2 text-lg font-medium text-stone-900 dark:text-white">
                      {quizFeedback.correctedAnswer}
                    </p>
                  </div>

                  {displayedExplanation ? (
                    <div className="mt-4 rounded-2xl border border-stone-200 bg-stone-50 p-4 dark:border-white/10 dark:bg-black/20">
                      <p className="text-xs uppercase tracking-wide text-stone-500 dark:text-slate-400">
                        Why this helps
                      </p>
                      <p className="mt-2 text-sm leading-6 text-stone-600 dark:text-slate-300">
                        {displayedExplanation}
                      </p>
                    </div>
                  ) : null}

                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 dark:border-white/10 dark:bg-black/20">
                      <p className="text-xs uppercase tracking-wide text-stone-500 dark:text-slate-400">
                        Matched keywords
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {quizFeedback.matchedKeywords.length > 0 ? (
                          quizFeedback.matchedKeywords.map((word) => (
                            <span
                              key={word}
                              className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs text-emerald-800 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-100"
                            >
                              {word}
                            </span>
                          ))
                        ) : (
                          <span className="text-sm text-stone-500 dark:text-slate-400">
                            None
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 dark:border-white/10 dark:bg-black/20">
                      <p className="text-xs uppercase tracking-wide text-stone-500 dark:text-slate-400">
                        Missing keywords
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {quizFeedback.missingKeywords.length > 0 ? (
                          quizFeedback.missingKeywords.map((word) => (
                            <span
                              key={word}
                              className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs text-amber-800 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-100"
                            >
                              {word}
                            </span>
                          ))
                        ) : (
                          <span className="text-sm text-stone-500 dark:text-slate-400">
                            None
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {quizSubmitted ? (
            <div className="grid gap-3 sm:grid-cols-3">
              <button
                type="button"
                onClick={() => updateBucket("known")}
                disabled={isLoading}
                className="rounded-2xl bg-stone-900 px-4 py-4 text-sm font-semibold text-white transition hover:bg-stone-800 disabled:opacity-60 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
              >
                Known
              </button>

              <button
                type="button"
                onClick={() => updateBucket("learning")}
                disabled={isLoading}
                className="rounded-2xl border border-stone-200 bg-white px-4 py-4 text-sm font-semibold text-stone-800 transition hover:bg-stone-50 disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
              >
                Learning
              </button>

              <button
                type="button"
                onClick={() => updateBucket("hard")}
                disabled={isLoading}
                className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-60 dark:border-red-400/20 dark:bg-red-500/10 dark:text-red-100 dark:hover:bg-red-500/15"
              >
                Hard
              </button>
            </div>
          ) : null}

          {showDiagnostics && diagnostics ? (
            <div className="rounded-[28px] border border-stone-200 bg-[#FFFDF8] p-6 dark:border-white/10 dark:bg-[#0f172a]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-stone-500 dark:text-slate-400">
                    Sentence diagnostics
                  </p>
                  <p className="mt-1 text-xs text-stone-400 dark:text-slate-500">
                    Hybrid AI check for known-word fit
                  </p>
                </div>

                <div
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    diagnostics.advancedWordCount <= 1
                      ? "border border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-100"
                      : "border border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-100"
                  }`}
                >
                  {diagnostics.advancedWordCount <= 1 ? "Accepted" : "Needs simplification"}
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-white/10 dark:bg-white/5">
                  <p className="text-xs text-stone-500 dark:text-slate-400">
                    Unknown non-focus words
                  </p>
                  <p className="mt-2 text-lg font-semibold text-stone-900 dark:text-white">
                    {diagnostics.advancedWordCount}
                  </p>
                </div>

                <div className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-white/10 dark:bg-white/5">
                  <p className="text-xs text-stone-500 dark:text-slate-400">
                    Iterations
                  </p>
                  <p className="mt-2 text-lg font-semibold text-stone-900 dark:text-white">
                    {diagnostics.iterationsUsed}
                  </p>
                </div>

                <div className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-white/10 dark:bg-white/5">
                  <p className="text-xs text-stone-500 dark:text-slate-400">
                    Known words matched
                  </p>
                  <p className="mt-2 text-lg font-semibold text-stone-900 dark:text-white">
                    {diagnostics.knownWordsMatched.length}
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3 text-xs text-stone-500 dark:text-slate-400">
            <span>Mastery: {currentCard.mastery_score}</span>
            <span>Streak: {currentCard.streak_count}</span>
            <span>Remaining in queue: {queue.length}</span>
            <span>AI level: {learnerLevel}</span>
            {lastCompletedSessionId ? (
              <span>Last completed session: {lastCompletedSessionId}</span>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}