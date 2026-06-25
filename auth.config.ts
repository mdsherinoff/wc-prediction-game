import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

// Comma-separated allowlist of emails permitted to sign in.
// Leave ALLOWED_EMAILS unset/empty to allow any Google account to sign in.
function getAllowedEmails(): string[] | null {
  const raw = process.env.ALLOWED_EMAILS?.trim();
  if (!raw) return null;
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export const authConfig: NextAuthConfig = {
  providers: [Google],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async signIn({ profile }) {
      const allowed = getAllowedEmails();
      if (!allowed) return true; // no allowlist configured -> allow any Google user
      const email = profile?.email?.toLowerCase();
      if (!email) return false;
      return allowed.includes(email);
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isProtected =
        nextUrl.pathname.startsWith("/groups") ||
        nextUrl.pathname.startsWith("/knockouts") ||
        nextUrl.pathname.startsWith("/results") ||
        nextUrl.pathname.startsWith("/match") ||
        nextUrl.pathname.startsWith("/users") ||
        nextUrl.pathname.startsWith("/admin");
      if (isProtected && !isLoggedIn) {
        return Response.redirect(new URL("/login", nextUrl));
      }
      return true;
    },
  },
  session: {
    strategy: "jwt",
  },
};
