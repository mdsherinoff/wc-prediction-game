"use client";

import Link from "next/link";
import Image from "next/image";
import SignOutForm from "@/components/SignOutForm";
import MobileNavToggle from "@/components/MobileNavToggle";

type NavUser = {
  name?: string | null;
  email?: string | null;
  image?: string | null;
} | null;

const LINKS = [
  { href: "/groups", label: "Groups" },
  { href: "/knockouts", label: "Knockouts" },
  { href: "/results", label: "Results" },
  { href: "/leaderboard", label: "Leaderboard" },
];

export default function NavBar({ user }: { user: NavUser }) {
  const navLinks = (onNavigate?: () => void) =>
    LINKS.map((link) => (
      <Link
        key={link.href}
        href={link.href}
        onClick={onNavigate}
        className="hover:text-amber transition-colors py-2.5 md:py-0"
      >
        {link.label}
      </Link>
    ));

  const authArea = user ? (
    <div className="flex items-center gap-3">
      {user.image ? (
        <Image
          src={user.image}
          alt={user.name ?? "User"}
          width={28}
          height={28}
          className="rounded-full border border-chalk/30 shrink-0"
        />
      ) : null}
      <SignOutForm />
    </div>
  ) : (
    <Link
      href="/login"
      className="inline-block bg-amber text-ink px-3 py-1.5 rounded font-semibold hover:brightness-95 transition text-center w-fit"
    >
      Sign in
    </Link>
  );

  return (
    <header className="bg-pitch text-chalk relative">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link
          href="/"
          className="font-display text-2xl font-800 tracking-wide flex items-center gap-2 shrink-0"
        >
          <span className="bg-amber text-ink px-2 py-0.5 rounded font-display font-700">
            WC26
          </span>
          <span className="hidden sm:inline">Prediction Pool</span>
        </Link>

        <MobileNavToggle
          desktopNav={
            <>
              {navLinks()}
              <div className="ml-2">{authArea}</div>
            </>
          }
          mobileNav={(closeMenu) => (
            <>
              {navLinks(closeMenu)}
              <div className="pt-2 mt-1 border-t border-chalk/15">
                {authArea}
              </div>
            </>
          )}
        />
      </div>
    </header>
  );
}
