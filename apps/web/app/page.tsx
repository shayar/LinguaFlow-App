import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#F7F3EB] text-stone-900 dark:bg-[#111827] dark:text-slate-100">
      <div className="mx-auto max-w-7xl px-6 py-16 lg:px-10">
        <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <section>
            <div className="mb-5 inline-flex w-fit items-center rounded-full border border-stone-200 bg-white px-4 py-1 text-sm text-stone-700 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
              LinguaFlow
            </div>

            <h1 className="max-w-4xl text-5xl font-semibold tracking-tight sm:text-6xl lg:text-7xl">
              Learn languages through
              <span className="bg-gradient-to-r from-sky-700 via-cyan-600 to-emerald-600 bg-clip-text text-transparent dark:from-cyan-300 dark:via-sky-300 dark:to-emerald-300">
                {" "}smarter examples
              </span>
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-stone-600 dark:text-slate-300">
              Build decks from AI, OCR, and real multilingual sources. Study one focus word at a time with examples, quizzes, notes, and a cleaner learner flow.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/onboarding"
                className="rounded-2xl bg-stone-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-stone-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
              >
                Create account
              </Link>

              <Link
                href="/login"
                className="rounded-2xl border border-stone-200 bg-white px-5 py-3 text-sm font-semibold text-stone-800 transition hover:bg-stone-50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
              >
                Login
              </Link>
            </div>
          </section>

          <section className="grid gap-4">
            <div className="rounded-[28px] border border-stone-200 bg-[#FFFDF8] p-6 dark:border-white/10 dark:bg-[#0f172a]">
              <p className="text-sm font-medium text-stone-900 dark:text-white">
                Learn
              </p>
              <p className="mt-2 text-sm leading-6 text-stone-600 dark:text-slate-300">
                Example first, then continue, then quiz, then note-taking and learner buckets.
              </p>
            </div>

            <div className="rounded-[28px] border border-stone-200 bg-[#FFFDF8] p-6 dark:border-white/10 dark:bg-[#0f172a]">
              <p className="text-sm font-medium text-stone-900 dark:text-white">
                Build
              </p>
              <p className="mt-2 text-sm leading-6 text-stone-600 dark:text-slate-300">
                Generate decks with AI, import OCR/text, or bring in source-backed sentence content.
              </p>
            </div>

            <div className="rounded-[28px] border border-stone-200 bg-[#FFFDF8] p-6 dark:border-white/10 dark:bg-[#0f172a]">
              <p className="text-sm font-medium text-stone-900 dark:text-white">
                Track
              </p>
              <p className="mt-2 text-sm leading-6 text-stone-600 dark:text-slate-300">
                Review sessions, progress, notes, and improvement over time.
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}