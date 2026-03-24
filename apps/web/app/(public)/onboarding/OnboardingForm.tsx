"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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

const LEVEL_OPTIONS = ["Beginner", "Elementary", "Intermediate", "Advanced"];

export default function OnboardingForm() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [nativeLanguage, setNativeLanguage] = useState("English");
  const [targetLanguage, setTargetLanguage] = useState("Spanish");
  const [selfReportedLevel, setSelfReportedLevel] = useState("Beginner");
  const [dailyGoalWords, setDailyGoalWords] = useState(10);

  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    setMessage("");

    try {
      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
          fullName,
          nativeLanguage,
          targetLanguage,
          selfReportedLevel,
          dailyGoalWords,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error || "Failed to create account.");
        return;
      }

      setMessage("Account created. Redirecting to initial quiz...");
      router.push("/initial-quiz");
      router.refresh();
    } catch (error) {
      console.error(error);
      setMessage("Failed to create account.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="w-full max-w-3xl rounded-[28px] border border-stone-200 bg-[#FFFDF8] p-6 shadow-[0_18px_40px_rgba(60,40,20,0.08)] dark:border-white/10 dark:bg-[#0f172a] dark:shadow-none sm:p-8">
      <div className="mb-8">
        <p className="text-sm font-medium text-sky-700 dark:text-cyan-200">
          Signup
        </p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight text-stone-900 dark:text-white">
          Create your learner account
        </h2>
        <p className="mt-3 text-sm leading-6 text-stone-600 dark:text-slate-300">
          Set up your account and learning preferences in one flow.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="mb-2 block text-sm font-medium text-stone-800 dark:text-slate-200">
            Full name
          </label>
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Your full name"
            className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 outline-none placeholder:text-stone-400 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-stone-800 dark:text-slate-200">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 outline-none placeholder:text-stone-400 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-stone-800 dark:text-slate-200">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a password"
              className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 outline-none placeholder:text-stone-400 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-stone-800 dark:text-slate-200">
              Native language
            </label>
            <input
              value={nativeLanguage}
              onChange={(e) => setNativeLanguage(e.target.value)}
              className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-stone-800 dark:text-slate-200">
              Learning language
            </label>
            <select
              value={targetLanguage}
              onChange={(e) => setTargetLanguage(e.target.value)}
              className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
            >
              {TARGET_LANGUAGE_OPTIONS.map((language) => (
                <option key={language} value={language}>
                  {language}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-stone-800 dark:text-slate-200">
              Current level
            </label>
            <select
              value={selfReportedLevel}
              onChange={(e) => setSelfReportedLevel(e.target.value)}
              className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
            >
              {LEVEL_OPTIONS.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-stone-800 dark:text-slate-200">
              Daily goal words
            </label>
            <input
              type="number"
              min={5}
              max={50}
              value={dailyGoalWords}
              onChange={(e) => setDailyGoalWords(Number(e.target.value))}
              className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
            />
          </div>
        </div>

        {message ? (
          <div className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-700 dark:border-white/10 dark:bg-black/20 dark:text-slate-200">
            {message}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={isSaving}
          className="w-full rounded-2xl bg-stone-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-stone-800 disabled:opacity-60 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
        >
          {isSaving ? "Creating account..." : "Create account"}
        </button>
      </form>
    </div>
  );
}