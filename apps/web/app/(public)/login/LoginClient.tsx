"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginClient() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error || "Failed to log in.");
        return;
      }

      setMessage("Login successful. Redirecting...");
      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      console.error(error);
      setMessage("Failed to log in.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="w-full max-w-xl rounded-[28px] border border-stone-200 bg-[#FFFDF8] p-6 shadow-[0_18px_40px_rgba(60,40,20,0.08)] dark:border-white/10 dark:bg-[#0f172a] dark:shadow-none sm:p-8">
      <div className="mb-8">
        <p className="text-sm font-medium text-sky-700 dark:text-cyan-200">
          Login
        </p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight text-stone-900 dark:text-white">
          Access your study workspace
        </h2>
        <p className="mt-3 text-sm leading-6 text-stone-600 dark:text-slate-300">
          Sign in to continue your personalized language learning flow.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
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
            placeholder="Your password"
            className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 outline-none placeholder:text-stone-400 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500"
          />
        </div>

        {message ? (
          <div className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-700 dark:border-white/10 dark:bg-black/20 dark:text-slate-200">
            {message}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-2xl bg-stone-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-stone-800 disabled:opacity-60 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
        >
          {isSubmitting ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </div>
  );
}