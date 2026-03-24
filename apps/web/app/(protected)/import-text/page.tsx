import { requireAuthenticatedUser } from "@/lib/auth-server";
import ImportTextClient from "./ImportTextClient";

export default async function ImportTextPage() {
  await requireAuthenticatedUser();

  return (
    <main className="min-h-[calc(100vh-73px)] bg-[#F7F3EB] text-stone-900 dark:bg-[#111827] dark:text-slate-100">
      <div className="mx-auto max-w-7xl px-6 py-12 lg:px-10">
        <div className="grid gap-10 lg:grid-cols-[1.05fr_1fr] lg:gap-14">
          <section className="flex flex-col justify-center">
            <div className="mb-5 inline-flex w-fit items-center rounded-full border border-stone-200 bg-white px-4 py-1 text-sm text-stone-700 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
              Import text
            </div>

            <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
              Turn scanned or copied text into a{" "}
              <span className="bg-gradient-to-r from-sky-700 via-cyan-600 to-emerald-600 bg-clip-text text-transparent dark:from-cyan-300 dark:via-sky-300 dark:to-emerald-300">
                study-ready deck
              </span>
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-7 text-stone-600 dark:text-slate-300 sm:text-lg">
              Paste OCR output, article text, class notes, or anything you want
              to learn from. We’ll extract candidate words, build learner-ready
              cards, and let you save them straight into your study flow.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-stone-200 bg-[#FFFDF8] p-4 dark:border-white/10 dark:bg-[#0f172a]">
                <p className="text-sm font-medium">OCR friendly</p>
                <p className="mt-2 text-sm text-stone-600 dark:text-slate-300">
                  Paste text from your scanner or hardware pipeline.
                </p>
              </div>

              <div className="rounded-2xl border border-stone-200 bg-[#FFFDF8] p-4 dark:border-white/10 dark:bg-[#0f172a]">
                <p className="text-sm font-medium">Learner-aware</p>
                <p className="mt-2 text-sm text-stone-600 dark:text-slate-300">
                  Cards are generated around your level and target language.
                </p>
              </div>

              <div className="rounded-2xl border border-stone-200 bg-[#FFFDF8] p-4 dark:border-white/10 dark:bg-[#0f172a]">
                <p className="text-sm font-medium">Fast to study</p>
                <p className="mt-2 text-sm text-stone-600 dark:text-slate-300">
                  Save deck, then move directly into the study queue.
                </p>
              </div>
            </div>
          </section>

          <section className="flex items-start justify-center">
            <ImportTextClient />
          </section>
        </div>
      </div>
    </main>
  );
}