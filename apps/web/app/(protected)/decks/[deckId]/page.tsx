import { requireAuthenticatedUser } from "@/lib/auth-server";
import DeckDetailClient from "./DeckDetailClient";

type PageProps = {
  params: Promise<{
    deckId: string;
  }>;
};

export default async function DeckDetailPage({ params }: PageProps) {
  await requireAuthenticatedUser();
  const { deckId } = await params;

  return (
    <main className="min-h-[calc(100vh-73px)] bg-[#F7F3EB] text-stone-900 dark:bg-[#111827] dark:text-slate-100">
      <div className="mx-auto max-w-7xl px-6 py-12 lg:px-10">
        <DeckDetailClient deckId={deckId} />
      </div>
    </main>
  );
}