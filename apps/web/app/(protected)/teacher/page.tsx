import { requireAuthenticatedUser } from "@/lib/auth-server";
import TeacherDashboardClient from "./TeacherDashboardClient";

export default async function TeacherDashboardPage() {
  await requireAuthenticatedUser();

  return (
    <main className="min-h-[calc(100vh-73px)] bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.16),_transparent_30%),linear-gradient(to_bottom,_#070b16,_#111827)] text-white">
      <div className="mx-auto flex min-h-[calc(100vh-73px)] max-w-7xl items-center px-6 py-16 lg:px-10">
        <div className="grid w-full gap-10 lg:grid-cols-2 lg:gap-16">
          <section className="flex flex-col justify-center">
            <div className="mb-6 inline-flex w-fit items-center rounded-full border border-white/10 bg-white/5 px-4 py-1 text-sm text-white/80 backdrop-blur">
              Teacher mode
            </div>

            <h1 className="max-w-2xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              Manage cohorts and{" "}
              <span className="bg-gradient-to-r from-cyan-300 via-indigo-300 to-fuchsia-300 bg-clip-text text-transparent">
                review learner output
              </span>
            </h1>

            <p className="mt-6 max-w-xl text-base leading-7 text-slate-300 sm:text-lg">
              Create classes, assign learners, and inspect AI-generated sentence
              quality across your cohort.
            </p>
          </section>

          <section className="flex items-center justify-center">
            <TeacherDashboardClient />
          </section>
        </div>
      </div>
    </main>
  );
}