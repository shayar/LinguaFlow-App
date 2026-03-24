import { requireAuthenticatedUser } from "@/lib/auth-server";
import LearnerSetupForm from "./LearnerSetupForm";

export default async function LearnerSetupPage() {
  await requireAuthenticatedUser();

  return (
    <main className="min-h-[calc(100vh-73px)] bg-[#F7F3EB] text-stone-900 dark:bg-[#111827] dark:text-slate-100">
      <div className="mx-auto max-w-5xl px-6 py-12 lg:px-10">
        <div className="grid gap-10 lg:grid-cols-[1.05fr_1fr] lg:gap-14">
          <section className="flex flex-col justify-center">
            <div className="mb-5 inline-flex w-fit items-center rounded-full border border-stone-200 bg-white px-4 py-1 text-sm text-stone-700 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
              Learner setup
            </div>

            <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
              Set up your{" "}
              <span className="bg-gradient-to-r from-sky-700 via-cyan-600 to-emerald-600 bg-clip-text text-transparent dark:from-cyan-300 dark:via-sky-300 dark:to-emerald-300">
                learning profile
              </span>
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-7 text-stone-600 dark:text-slate-300 sm:text-lg">
              Choose your native language, the language you want to learn, and your starting level. Then we’ll give you a short basics quiz before study begins.
            </p>
          </section>

          <section className="flex items-start justify-center">
            <LearnerSetupForm />
          </section>
        </div>
      </div>
    </main>
  );
}