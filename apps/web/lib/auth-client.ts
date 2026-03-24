export type CurrentUser = {
  id: string;
  email: string;
  fullName: string;
  role: string;
};

export async function fetchCurrentUser(): Promise<CurrentUser | null> {
  const response = await fetch("/api/auth/me", {
    method: "GET",
    credentials: "include",
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || "Failed to fetch current user");
  }

  return result.user ?? null;
}