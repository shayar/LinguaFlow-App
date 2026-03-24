import { requireAuthenticatedUser } from "@/lib/auth-server";
import StudySummaryClient from "./StudySummaryClient";

export default async function StudySummaryPage() {
  await requireAuthenticatedUser();

  return (
    <main className="min-h-[calc(100vh-73px)] bg-[#F7F3EB] px-6 py-10 text-stone-900 dark:bg-[#111827] dark:text-slate-100 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <StudySummaryClient />
      </div>
    </main>
  );
}