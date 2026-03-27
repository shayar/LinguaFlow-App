import { requireAuthenticatedUser } from "@/lib/auth-server";
import ProgressClient from "./ProgressClient";

export default async function ProgressPage() {
  await requireAuthenticatedUser();

  return (
    <main className="min-h-[calc(100vh-73px)] bg-[#F7F3EB] text-stone-900 dark:bg-[#111827] dark:text-slate-100">
      <div className="mx-auto max-w-6xl px-6 py-12 lg:px-10">
        <ProgressClient />
      </div>
    </main>
  );
}