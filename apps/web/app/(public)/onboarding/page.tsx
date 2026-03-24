import OnboardingForm from "./OnboardingForm";

export default function OnboardingPage() {
  return (
    <main className="min-h-screen bg-[#F7F3EB] text-stone-900 dark:bg-[#111827] dark:text-slate-100">
      <div className="mx-auto max-w-6xl px-6 py-12 lg:px-10">
        <div className="grid gap-10 lg:grid-cols-[1.05fr_1fr] lg:gap-14">
          <section className="flex flex-col justify-center">
            <div className="mb-5 inline-flex w-fit items-center rounded-full border border-stone-200 bg-white px-4 py-1 text-sm text-stone-700 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
              Create your account
            </div>

            <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
              Start a calmer, smarter{" "}
              <span className="bg-gradient-to-r from-sky-700 via-cyan-600 to-emerald-600 bg-clip-text text-transparent dark:from-cyan-300 dark:via-sky-300 dark:to-emerald-300">
                language learning flow
              </span>
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-7 text-stone-600 dark:text-slate-300 sm:text-lg">
              Create your account, choose the language you want to learn from a
              dropdown, and then take a short basics quiz before full study begins.
            </p>
          </section>

          <section className="flex items-start justify-center">
            <OnboardingForm />
          </section>
        </div>
      </div>
    </main>
  );
}