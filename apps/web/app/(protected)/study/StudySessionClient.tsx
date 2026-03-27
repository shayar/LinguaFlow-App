"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type ExampleMode =
  | "phrase"
  | "micro_sentence"
  | "guided_sentence"
  | "natural_sentence";

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
  deck_title: string;
  language: string;
  example_mode?: ExampleMode;
  mode_reason?: string | null;
};

type QuizFeedbackState = {
  correct: boolean;
  score: number;
  label: "Excellent" | "Good" | "Almost" | "Needs work";
  learnerAnswer: string;
  correctedAnswer: string;
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

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function renderHighlightedContent(content: string, targetWord: string) {
  if (!content) return null;

  const pattern = new RegExp(`\\b(${escapeRegExp(targetWord)})\\b`, "i");
  const parts = content.split(pattern);

  return (
    <>
      {parts.map((part, index) => {
        const isTarget = part.toLowerCase() === targetWord.toLowerCase();

        if (isTarget) {
          return (
            <span
              key={`${part}-${index}`}
              className="rounded-md bg-lime-300/85 px-2 py-0.5 font-semibold text-stone-900"
            >
              {part}
            </span>
          );
        }

        return <span key={`${part}-${index}`}>{part}</span>;
      })}
    </>
  );
}

export default function StudySessionClient() {
  const router = useRouter();
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const [queue, setQueue] = useState<StudyCard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const [showQuiz, setShowQuiz] = useState(false);
  const [quizAnswer, setQuizAnswer] = useState("");
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizFeedback, setQuizFeedback] = useState<QuizFeedbackState>(null);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [cardShownAt, setCardShownAt] = useState<number | null>(null);

  const [speechSupported, setSpeechSupported] = useState(false);
  const [isSpeakingWord, setIsSpeakingWord] = useState(false);
  const [isSpeakingSentence, setIsSpeakingSentence] = useState(false);

  const currentCard = useMemo(() => queue[currentIndex] ?? null, [queue, currentIndex]);

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

  async function loadQueue() {
    setIsLoading(true);
    setMessage("");
    setShowQuiz(false);
    setQuizAnswer("");
    setQuizSubmitted(false);
    setQuizFeedback(null);

    try {
      const newSessionId = await startSession();
      setSessionId(newSessionId);

      const response = await fetch("/api/study/queue");
      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error || "Failed to load study queue.");
        return;
      }

      setQueue(result.queue || []);
      setCurrentIndex(0);
      setCardShownAt(Date.now());
    } catch (error) {
      console.error(error);
      setMessage("Failed to load study queue.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadQueue();
  }, []);

  function stopSpeaking() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    utteranceRef.current = null;
    setIsSpeakingWord(false);
    setIsSpeakingSentence(false);
  }

  function speakText(text: string, kind: "word" | "sentence") {
    if (!speechSupported || !currentCard || !text.trim()) return;

    stopSpeaking();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = getSpeechLang(currentCard.language);
    utterance.rate = kind === "word" ? 0.85 : 0.95;

    utterance.onstart = () => {
      if (kind === "word") setIsSpeakingWord(true);
      else setIsSpeakingSentence(true);
    };

    utterance.onend = () => {
      setIsSpeakingWord(false);
      setIsSpeakingSentence(false);
      utteranceRef.current = null;
    };

    utterance.onerror = () => {
      setIsSpeakingWord(false);
      setIsSpeakingSentence(false);
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

  function scoreQuizAnswer(learnerAnswer: string, correctedAnswer: string): QuizFeedbackState {
    const learnerNormalized = normalizeText(learnerAnswer);
    const correctedNormalized = normalizeText(correctedAnswer);

    const exactMatch = learnerNormalized.length > 0 && learnerNormalized === correctedNormalized;
    const partialMatch =
      learnerNormalized.length > 0 &&
      (correctedNormalized.includes(learnerNormalized) ||
        learnerNormalized.includes(correctedNormalized));

    let score = 0;
    if (exactMatch) score = 100;
    else if (partialMatch) score = 80;
    else if (learnerNormalized.length > 0) score = 45;

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
    };
  }

  function submitQuiz() {
    if (!currentCard) return;

    const correctedAnswer =
      currentCard.example_translation_native || currentCard.translation;

    const feedback = scoreQuizAnswer(quizAnswer, correctedAnswer);
    setQuizSubmitted(true);
    setQuizFeedback(feedback);
  }

  async function updateBucket(bucket: "known" | "learning" | "hard") {
    if (!currentCard || !sessionId) return;

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
        setMessage(updateResult.error || "Failed to update word.");
        return;
      }

      const responseTimeMs = cardShownAt ? Date.now() - cardShownAt : null;

      await fetch("/api/study/review-event", {
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

      const nextQueue = queue.filter(
        (item) => item.learner_card_id !== currentCard.learner_card_id
      );

      setQueue(nextQueue);
      setCurrentIndex(0);
      setShowQuiz(false);
      setQuizAnswer("");
      setQuizSubmitted(false);
      setQuizFeedback(null);
      setCardShownAt(Date.now());

      if (nextQueue.length === 0) {
        router.push(`/study/summary?sessionId=${encodeURIComponent(sessionId)}`);
      }
    } catch (error) {
      console.error(error);
      setMessage("Failed to update word.");
    }
  }

  function renderCardFront(card: StudyCard) {
    const mode = card.example_mode ?? "guided_sentence";
    const content = card.example_sentence ?? card.target_word;

    if (mode === "phrase") {
      return (
        <div className="mt-8 text-center">
          <span className="inline-block rounded-md bg-lime-300/85 px-3 py-1 text-sm font-semibold text-stone-900">
            {card.target_word}
          </span>

          <div className="mt-8 rounded-[28px] border border-stone-200 bg-white p-8 dark:border-white/10 dark:bg-white/5">
            <p className="text-xs uppercase tracking-[0.18em] text-stone-500 dark:text-slate-400">
              Phrase
            </p>
            <div className="mt-4 text-3xl leading-[1.8] text-stone-900 dark:text-white sm:text-4xl">
              {renderHighlightedContent(content, card.target_word)}
            </div>
          </div>
        </div>
      );
    }

    if (mode === "micro_sentence") {
      return (
        <div className="mt-8 text-center">
          <span className="inline-block rounded-md bg-lime-300/85 px-3 py-1 text-sm font-semibold text-stone-900">
            {card.target_word}
          </span>

          <div className="mt-8 rounded-[28px] border border-stone-200 bg-white p-8 dark:border-white/10 dark:bg-white/5">
            <p className="text-xs uppercase tracking-[0.18em] text-stone-500 dark:text-slate-400">
              Tiny sentence
            </p>
            <div className="mt-4 text-2xl leading-[1.9] text-stone-900 dark:text-white sm:text-3xl">
              {renderHighlightedContent(content, card.target_word)}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="mt-8 text-center">
        <span className="inline-block rounded-md bg-lime-300/85 px-3 py-1 text-sm font-semibold text-stone-900">
          {card.target_word}
        </span>

        <div className="mt-8 rounded-[28px] border border-stone-200 bg-white p-8 dark:border-white/10 dark:bg-white/5">
          <p className="text-xs uppercase tracking-[0.18em] text-stone-500 dark:text-slate-400">
            Example
          </p>
          <div className="mt-4 text-2xl leading-[1.9] text-stone-900 dark:text-white sm:text-3xl">
            {renderHighlightedContent(content, card.target_word)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {message ? (
        <div className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-700 dark:border-white/10 dark:bg-black/20 dark:text-slate-200">
          {message}
        </div>
      ) : null}

      {isLoading ? (
        <div className="rounded-2xl border border-stone-200 bg-white px-4 py-6 text-sm text-stone-700 dark:border-white/10 dark:bg-black/20 dark:text-slate-200">
          Loading study...
        </div>
      ) : null}

      {!isLoading && currentCard ? (
        <div className="mx-auto max-w-3xl">
          <div className="rounded-[32px] border border-stone-200 bg-[#FFFDF8] p-6 shadow-[0_18px_40px_rgba(60,40,20,0.06)] dark:border-white/10 dark:bg-[#0f172a] sm:p-8">
            <div className="flex items-center justify-between gap-3">
              <span className="rounded-full border border-stone-200 bg-white px-3 py-1 text-xs text-stone-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                {currentCard.deck_title}
              </span>

              <button
                type="button"
                onClick={() => router.push(`/words/${currentCard.learner_card_id}`)}
                className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-medium text-stone-800 transition hover:bg-stone-50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
              >
                Word details
              </button>
            </div>

            {renderCardFront(currentCard)}

            {!showQuiz ? (
              <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-400/20 dark:bg-emerald-500/10">
                <p className="text-xs uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-100">
                  Meaning
                </p>
                <p className="mt-2 text-base text-stone-900 dark:text-white">
                  {currentCard.example_translation_native || currentCard.translation}
                </p>
              </div>
            ) : null}

            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={() => speakText(currentCard.target_word, "word")}
                disabled={!speechSupported || isSpeakingSentence}
                className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm font-medium text-stone-800 transition hover:bg-stone-50 disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
              >
                {isSpeakingWord ? "Playing word..." : "Play word"}
              </button>

              <button
                type="button"
                onClick={() =>
                  currentCard.example_sentence
                    ? speakText(currentCard.example_sentence, "sentence")
                    : null
                }
                disabled={!speechSupported || !currentCard.example_sentence || isSpeakingWord}
                className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm font-medium text-stone-800 transition hover:bg-stone-50 disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
              >
                {isSpeakingSentence ? "Playing content..." : "Play"}
              </button>
            </div>

            {!showQuiz ? (
              <div className="mt-8 text-center">
                <button
                  type="button"
                  onClick={() => setShowQuiz(true)}
                  className="rounded-2xl bg-stone-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-stone-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
                >
                  Continue
                </button>
              </div>
            ) : null}
          </div>

          {showQuiz ? (
            <div className="mt-6 rounded-[28px] border border-stone-200 bg-[#FFFDF8] p-6 dark:border-white/10 dark:bg-[#0f172a]">
              <p className="text-sm font-medium text-stone-900 dark:text-white">
                What does this mean?
              </p>

              <textarea
                value={quizAnswer}
                onChange={(e) => setQuizAnswer(e.target.value)}
                rows={4}
                placeholder="Type the meaning..."
                className="mt-4 w-full rounded-2xl border border-stone-200 bg-white px-4 py-4 text-sm text-stone-900 outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
              />

              {!quizSubmitted ? (
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={submitQuiz}
                    disabled={quizAnswer.trim().length === 0}
                    className="rounded-2xl bg-stone-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-stone-800 disabled:opacity-50 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
                  >
                    Check answer
                  </button>
                </div>
              ) : null}

              {quizFeedback ? (
                <div className="mt-5 space-y-4">
                  <div className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-white/10 dark:bg-white/5">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-base font-semibold text-stone-900 dark:text-white">
                        {quizFeedback.label}
                      </p>
                      <span className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs text-stone-700 dark:border-white/10 dark:bg-black/20 dark:text-slate-300">
                        {quizFeedback.score}
                      </span>
                    </div>

                    <p className="mt-3 text-sm text-stone-600 dark:text-slate-300">
                      Correct meaning: {quizFeedback.correctedAnswer}
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <button
                      type="button"
                      onClick={() => updateBucket("known")}
                      className="rounded-2xl bg-stone-900 px-4 py-4 text-sm font-semibold text-white transition hover:bg-stone-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
                    >
                      Known
                    </button>

                    <button
                      type="button"
                      onClick={() => updateBucket("learning")}
                      className="rounded-2xl border border-stone-200 bg-white px-4 py-4 text-sm font-semibold text-stone-800 transition hover:bg-stone-50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
                    >
                      Learning
                    </button>

                    <button
                      type="button"
                      onClick={() => updateBucket("hard")}
                      className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 dark:border-red-400/20 dark:bg-red-500/10 dark:text-red-100 dark:hover:bg-red-500/15"
                    >
                      Hard
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}