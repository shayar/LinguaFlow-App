import PublicHeader from "./PublicHeader";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#F7F3EB] text-stone-900 dark:bg-[#111827] dark:text-slate-100">
      <PublicHeader />
      {children}
    </div>
  );
}