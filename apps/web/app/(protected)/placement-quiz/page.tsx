import PlacementQuizForm from "./PlacementQuizForm";

export default function PlacementQuizPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.16),_transparent_30%),linear-gradient(to_bottom,_#070b16,_#111827)] text-white">
      <div className="mx-auto flex min-h-screen max-w-7xl items-center px-6 py-16 lg:px-10">
        <div className="grid w-full gap-10 lg:grid-cols-2 lg:gap-16">
          <section className="flex flex-col justify-center">
            <div className="mb-6 inline-flex w-fit items-center rounded-full border border-white/10 bg-white/5 px-4 py-1 text-sm text-white/80 backdrop-blur">
              Placement quiz
            </div>

            <h1 className="max-w-2xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              Let’s verify your{" "}
              <span className="bg-gradient-to-r from-cyan-300 via-indigo-300 to-fuchsia-300 bg-clip-text text-transparent">
                real level
              </span>
            </h1>

            <p className="mt-6 max-w-xl text-base leading-7 text-slate-300 sm:text-lg">
              Your self-reported level is useful, but we want a better starting
              point for decks, examples, and future recommendations.
            </p>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                <p className="text-sm text-slate-400">Smart start</p>
                <p className="mt-2 font-medium text-white">Better deck matching</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                <p className="text-sm text-slate-400">Adaptive</p>
                <p className="mt-2 font-medium text-white">Level-aware examples</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                <p className="text-sm text-slate-400">Future-ready</p>
                <p className="mt-2 font-medium text-white">Foundation for personalization</p>
              </div>
            </div>
          </section>

          <section className="flex items-center justify-center">
            <PlacementQuizForm />
          </section>
        </div>
      </div>
    </main>
  );
}