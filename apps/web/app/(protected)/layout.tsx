import { ReactNode } from "react";
import { requireAuthenticatedUser } from "@/lib/auth-server";
import ProtectedHeader from "./ProtectedHeader";

export default async function ProtectedLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await requireAuthenticatedUser();

  return (
    <div className="min-h-screen bg-[#070b16] text-white">
      <ProtectedHeader />
      {children}
    </div>
  );
}