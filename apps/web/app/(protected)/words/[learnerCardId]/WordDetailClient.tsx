"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type WordDetail = {
  learner_card_id: string;
  bucket: string;
  mastery_score: number;
  streak_count: number;
  last_reviewed_at: string | null;
  next_review_at: string | null;
  card_id: string;
  target_word: string;
  translation: string;
  pronunciation: string | null;
  example_sentence: string | null;
  example_translation_native: string | null;
  explanation: string | null;
  gloss_items_json: Array<{
    token: string;
    gloss: string;
    isTarget: boolean;
  }> | null;
  metadata_json: Record<string, unknown> | null;
  deck_id: string;
  deck_title: string;
  language: string;
  category: string | null;
  source_type: string | null;
  source_name: string | null;
  provider: string | null;
  license_label: string | null;
  source_url: string | null;
};

type WordNote = {
  id: string;
  title: string | null;
  content: string;
  created_at: string;
  updated_at: string;
} | null;

type ReviewHistoryItem = {
  id: string;
  result: string;
  bucket_after: string;
  response_time_ms: number | null;
  created_at: string;
};

type Props = {
  learnerCardId: string;
};

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

export default function WordDetailClient({ learnerCardId }: Props) {
  const router = useRouter();
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const [word, setWord] = useState<WordDetail | null>(null);
  const [note, setNote] = useState<WordNote>(null);
  const [history, setHistory] = useState<ReviewHistoryItem[]>([]);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [isSavingNote, setIsSavingNote] = useState(false);

  const [speechSupported, setSpeechSupported] = useState(false);
  const [isSpeakingWord, setIsSpeakingWord] = useState(false);
  const [isSpeakingSentence, setIsSpeakingSentence] = useState(false);

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
    async function loadWord() {
      try {
        const response = await fetch(`/api/words/${learnerCardId}`);
        const result = await response.json();

        if (!response.ok) {
          setMessage(result.error || "Failed to load word details.");
          return;
        }

        setWord(result.word ?? null);
        setNote(result.note ?? null);
        setHistory(result.history ?? []);
        setNoteTitle(result.note?.title ?? "");
        setNoteContent(result.note?.content ?? "");
      } catch (error) {
        console.error(error);
        setMessage("Failed to load word details.");
      } finally {
        setIsLoading(false);
      }
    }

    loadWord();
  }, [learnerCardId]);

  function stopSpeaking() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    utteranceRef.current = null;
    setIsSpeakingWord(false);
    setIsSpeakingSentence(false);
  }

  function speakText(text: string, kind: "word" | "sentence") {
    if (!speechSupported || !word || !text.trim()) return;

    stopSpeaking();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = getSpeechLang(word.language);
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
      setMessage("Audio playback was not available.");
      utteranceRef.current = null;
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }

  async function saveNote() {
    if (!word) return;

    try {
      setIsSavingNote(true);

      const response = await fetch("/api/notes/word", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          learnerCardId: word.learner_card_id,
          title: noteTitle,
          content: noteContent,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error || "Failed to save note.");
        return;
      }

      setNote(result.note ?? null);
      setMessage("Word note saved.");
    } catch (error) {
      console.error(error);
      setMessage("Failed to save note.");
    } finally {
      setIsSavingNote(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-sky-700 dark:text-cyan-200">
            Word details
          </p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight text-stone-900 dark:text-white sm:text-5xl">
            {word?.target_word ?? "Word"}
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-stone-600 dark:text-slate-300">
            Review the word, hear it, inspect notes, and see how it has performed in study.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm font-medium text-stone-800 transition hover:bg-stone-50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
          >
            Go back
          </button>

          <button
            type="button"
            onClick={() => router.push("/study")}
            className="rounded-2xl bg-stone-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-stone-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
          >
            Study now
          </button>
        </div>
      </div>

      {message ? (
        <div className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-700 dark:border-white/10 dark:bg-black/20 dark:text-slate-200">
          {message}
        </div>
      ) : null}

      {isLoading ? (
        <div className="rounded-2xl border border-stone-200 bg-white px-4 py-6 text-sm text-stone-700 dark:border-white/10 dark:bg-black/20 dark:text-slate-200">
          Loading word details...
        </div>
      ) : null}

      {!isLoading && word ? (
        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-6">
            <div className="rounded-[32px] border border-stone-200 bg-[#FFFDF8] p-6 dark:border-white/10 dark:bg-[#0f172a]">
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-md bg-lime-300/85 px-3 py-1 text-sm font-semibold text-stone-900">
                  {word.target_word}
                </span>

                <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs text-sky-800 dark:border-cyan-300/20 dark:bg-cyan-400/10 dark:text-cyan-100">
                  {word.bucket}
                </span>

                <span className="rounded-full border border-stone-200 bg-white px-3 py-1 text-xs text-stone-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                  Mastery {word.mastery_score}
                </span>
              </div>

              <p className="mt-5 text-2xl font-semibold text-stone-900 dark:text-white">
                {word.translation}
              </p>

              {word.pronunciation ? (
                <p className="mt-2 text-sm text-stone-600 dark:text-slate-300">
                  Pronunciation: {word.pronunciation}
                </p>
              ) : null}

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <button
                  type="button"
                  onClick={() => speakText(word.target_word, "word")}
                  disabled={!speechSupported || isSpeakingSentence}
                  className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm font-medium text-stone-800 transition hover:bg-stone-50 disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
                >
                  {isSpeakingWord ? "Playing word..." : "Play word"}
                </button>

                <button
                  type="button"
                  onClick={() => word.example_sentence ? speakText(word.example_sentence, "sentence") : null}
                  disabled={!speechSupported || !word.example_sentence || isSpeakingWord}
                  className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm font-medium text-stone-800 transition hover:bg-stone-50 disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
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

              {word.example_sentence ? (
                <div className="mt-6 rounded-[28px] border border-stone-200 bg-white p-5 dark:border-white/10 dark:bg-white/5">
                  <p className="text-xs uppercase tracking-[0.2em] text-stone-500 dark:text-slate-400">
                    Example sentence
                  </p>
                  <p className="mt-3 text-xl leading-8 text-stone-900 dark:text-white">
                    {word.example_sentence}
                  </p>

                  {word.example_translation_native ? (
                    <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-400/20 dark:bg-emerald-500/10">
                      <p className="text-xs uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-100">
                        Sentence meaning
                      </p>
                      <p className="mt-2 text-base text-stone-900 dark:text-white">
                        {word.example_translation_native}
                      </p>
                    </div>
                  ) : null}

                  {word.explanation ? (
                    <div className="mt-4 rounded-2xl border border-stone-200 bg-stone-50 p-4 dark:border-white/10 dark:bg-black/20">
                      <p className="text-xs uppercase tracking-[0.18em] text-stone-500 dark:text-slate-400">
                        Why this helps
                      </p>
                      <p className="mt-2 text-sm leading-6 text-stone-600 dark:text-slate-300">
                        {word.explanation}
                      </p>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="rounded-[28px] border border-stone-300 bg-[#FFFDF3] p-6 shadow-[inset_0_0_0_1px_rgba(180,160,120,0.18)] dark:border-white/10 dark:bg-[#1a2233]">
              <div className="mb-4 flex items-center gap-3">
                <span className="inline-block rounded-sm bg-lime-300/80 px-2 py-1 text-sm font-semibold text-stone-900">
                  {word.target_word}
                </span>
                <p className="text-sm text-stone-600 dark:text-slate-300">
                  Word notebook
                </p>
              </div>

              <div className="space-y-4">
                <input
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  placeholder="Short title for this note..."
                  className="w-full rounded-xl border border-stone-200 bg-white/80 px-4 py-3 text-sm text-stone-900 outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
                />

                <textarea
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  rows={8}
                  placeholder="Write your memory trick, grammar reminder, pronunciation note, or your own sentence..."
                  className="w-full rounded-xl border border-stone-200 bg-[repeating-linear-gradient(to_bottom,#fffdf5_0px,#fffdf5_30px,#dbeafe_31px)] px-4 py-4 text-[15px] leading-[31px] text-stone-800 outline-none dark:border-white/10 dark:bg-[repeating-linear-gradient(to_bottom,#111827_0px,#111827_30px,#334155_31px)] dark:text-slate-100"
                  style={{ fontFamily: '"Patrick Hand","Comic Sans MS","Bradley Hand",cursive' }}
                />

                <button
                  type="button"
                  onClick={saveNote}
                  disabled={isSavingNote}
                  className="rounded-2xl bg-stone-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-stone-800 disabled:opacity-60 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
                >
                  {isSavingNote ? "Saving note..." : "Save word note"}
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-[28px] border border-stone-200 bg-[#FFFDF8] p-6 dark:border-white/10 dark:bg-[#0f172a]">
              <p className="text-sm font-medium text-stone-900 dark:text-white">
                Word summary
              </p>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-white/10 dark:bg-white/5">
                  <p className="text-xs uppercase tracking-wide text-stone-500 dark:text-slate-400">
                    Streak
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-stone-900 dark:text-white">
                    {word.streak_count}
                  </p>
                </div>

                <div className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-white/10 dark:bg-white/5">
                  <p className="text-xs uppercase tracking-wide text-stone-500 dark:text-slate-400">
                    Next review
                  </p>
                  <p className="mt-2 text-sm font-medium text-stone-900 dark:text-white">
                    {word.next_review_at
                      ? new Date(word.next_review_at).toLocaleString()
                      : "Not scheduled"}
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-stone-200 bg-white p-4 dark:border-white/10 dark:bg-white/5">
                <p className="text-xs uppercase tracking-wide text-stone-500 dark:text-slate-400">
                  Deck
                </p>
                <p className="mt-2 text-base font-medium text-stone-900 dark:text-white">
                  {word.deck_title}
                </p>
                <button
                  type="button"
                  onClick={() => router.push(`/decks/${word.deck_id}`)}
                  className="mt-3 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs font-medium text-stone-800 transition hover:bg-stone-100 dark:border-white/10 dark:bg-black/20 dark:text-white dark:hover:bg-black/30"
                >
                  Open deck
                </button>
              </div>

              {(word.source_name || word.provider || word.license_label || word.source_url) ? (
                <div className="mt-4 rounded-2xl border border-stone-200 bg-white p-4 dark:border-white/10 dark:bg-white/5">
                  <p className="text-xs uppercase tracking-wide text-stone-500 dark:text-slate-400">
                    Provenance
                  </p>

                  <div className="mt-3 space-y-2 text-sm text-stone-600 dark:text-slate-300">
                    {word.source_name ? <p>Source: {word.source_name}</p> : null}
                    {word.provider ? <p>Provider: {word.provider}</p> : null}
                    {word.license_label ? <p>License: {word.license_label}</p> : null}
                    {word.source_url ? <p className="break-all">URL: {word.source_url}</p> : null}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="rounded-[28px] border border-stone-200 bg-[#FFFDF8] p-6 dark:border-white/10 dark:bg-[#0f172a]">
              <p className="text-sm font-medium text-stone-900 dark:text-white">
                Review history
              </p>

              <div className="mt-4 space-y-3">
                {history.length > 0 ? (
                  history.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-white/10 dark:bg-white/5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap gap-2">
                          <span className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs text-stone-700 dark:border-white/10 dark:bg-black/20 dark:text-slate-300">
                            Result: {item.result}
                          </span>
                          <span className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs text-stone-700 dark:border-white/10 dark:bg-black/20 dark:text-slate-300">
                            Bucket: {item.bucket_after}
                          </span>
                        </div>

                        <span className="text-xs text-stone-500 dark:text-slate-400">
                          {new Date(item.created_at).toLocaleString()}
                        </span>
                      </div>

                      <p className="mt-2 text-sm text-stone-600 dark:text-slate-300">
                        Response time:{" "}
                        {item.response_time_ms !== null
                          ? `${Math.round(item.response_time_ms)} ms`
                          : "Not recorded"}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-4 text-sm text-stone-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
                    No review history yet.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}