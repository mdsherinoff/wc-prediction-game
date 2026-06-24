import Link from "next/link";
import Image from "next/image";
import { signOut } from "@/auth";

type NavUser = {
  name?: string | null;
  email?: string | null;
  image?: string | null;
} | null;

export default function NavBar({ user }: { user: NavUser }) {
  return (
    <header className="bg-pitch text-chalk">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="font-display text-2xl font-800 tracking-wide flex items-center gap-2">
          <span className="bg-amber text-ink px-2 py-0.5 rounded font-display font-700">WC26</span>
          <span className="hidden sm:inline">Prediction Pool</span>
        </Link>

        <nav className="flex items-center gap-5 text-sm font-medium">
          <Link href="/groups" className="hover:text-amber transition-colors">
            Groups
          </Link>
          <Link href="/knockouts" className="hover:text-amber transition-colors">
            Knockouts
          </Link>
          <Link href="/results" className="hover:text-amber transition-colors">
            Results
          </Link>
          <Link href="/leaderboard" className="hover:text-amber transition-colors">
            Leaderboard
          </Link>

          {user ? (
            <div className="flex items-center gap-3 ml-2">
              {user.image ? (
                <Image
                  src={user.image}
                  alt={user.name ?? "User"}
                  width={28}
                  height={28}
                  className="rounded-full border border-chalk/30"
                />
              ) : null}
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
              >
                <button className="text-chalk/70 hover:text-amber transition-colors text-xs">
                  Sign out
                </button>
              </form>
            </div>
          ) : (
            <Link
              href="/login"
              className="bg-amber text-ink px-3 py-1.5 rounded font-semibold hover:brightness-95 transition"
            >
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
