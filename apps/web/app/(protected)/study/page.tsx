import { requireAuthenticatedUser } from "@/lib/auth-server";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import StudySessionClient from "./StudySessionClient";

export default async function StudyPage() {
  const user = await requireAuthenticatedUser();

  const result = await db.query(
    `
      SELECT onboarding_completed, initial_quiz_completed
      FROM learner_profiles
      WHERE user_id = $1
      LIMIT 1
    `,
    [user.id]
  );

  const profile = result.rows[0];

  if (!profile?.onboarding_completed) {
    redirect("/onboarding");
  }

  if (!profile?.initial_quiz_completed) {
    redirect("/initial-quiz");
  }

  return (
    <main className="min-h-[calc(100vh-73px)] bg-[#F7F3EB] px-6 py-10 text-stone-900 dark:bg-[#111827] dark:text-slate-100 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <StudySessionClient />
      </div>
    </main>
  );
}