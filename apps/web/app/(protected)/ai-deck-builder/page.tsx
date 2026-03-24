import { requireAuthenticatedUser } from "@/lib/auth-server";
import AiDeckBuilderClient from "./AiDeckBuilderClient";

export default async function AiDeckBuilderPage() {
  await requireAuthenticatedUser();

  return (
    <main className="min-h-[calc(100vh-73px)] bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.16),_transparent_30%),linear-gradient(to_bottom,_#070b16,_#111827)] text-white">
      <div className="mx-auto flex min-h-[calc(100vh-73px)] max-w-7xl items-center px-6 py-16 lg:px-10">
        <div className="grid w-full gap-10 lg:grid-cols-2 lg:gap-16">
          <section className="flex flex-col justify-center">
            <div className="mb-6 inline-flex w-fit items-center rounded-full border border-white/10 bg-white/5 px-4 py-1 text-sm text-white/80 backdrop-blur">
              AI deck builder
            </div>

            <h1 className="max-w-2xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              Turn learner text into a{" "}
              <span className="bg-gradient-to-r from-indigo-300 via-cyan-300 to-fuchsia-300 bg-clip-text text-transparent">
                study deck
              </span>
            </h1>

            <p className="mt-6 max-w-xl text-base leading-7 text-slate-300 sm:text-lg">
              Paste text, let AI extract candidate vocabulary, and create a deck
              directly in your learning app.
            </p>
          </section>

          <section className="flex items-center justify-center">
            <AiDeckBuilderClient />
          </section>
        </div>
      </div>
    </main>
  );
}