import { requireAuthenticatedUser } from "@/lib/auth-server";
import DecksClient from "./DecksClient";

export default async function DecksPage() {
  await requireAuthenticatedUser();

  return (
    <main className="min-h-[calc(100vh-73px)] bg-[#F7F3EB] text-stone-900 dark:bg-[#111827] dark:text-slate-100">
      <div className="mx-auto max-w-7xl px-6 py-12 lg:px-10">
        <DecksClient />
      </div>
    </main>
  );
}