import { requireAuthenticatedUser } from "@/lib/auth-server";
import InitialQuizClient from "./InitialQuizClient";

export default async function InitialQuizPage() {
  await requireAuthenticatedUser();

  return (
    <main className="min-h-[calc(100vh-73px)] bg-[#F7F3EB] text-stone-900 dark:bg-[#111827] dark:text-slate-100">
      <div className="mx-auto max-w-4xl px-6 py-12 lg:px-10">
        <InitialQuizClient />
      </div>
    </main>
  );
}