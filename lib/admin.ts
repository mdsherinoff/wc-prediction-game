import { auth } from "@/auth";

export async function requireAdmin() {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase();
  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  if (!email || !adminEmails.includes(email)) {
    return null;
  }
  return session;
}
