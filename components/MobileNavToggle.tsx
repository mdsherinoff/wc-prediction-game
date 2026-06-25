"use client";

import { useState, ReactNode } from "react";

export default function MobileNavToggle({
  desktopNav,
  mobileNav,
}: {
  desktopNav: ReactNode;
  mobileNav: (closeMenu: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="hidden md:flex items-center gap-5 text-sm font-medium">
        {desktopNav}
      </div>

      <button
        className="md:hidden p-2 -mr-2"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          {open ? (
            <path d="M6 6l12 12M6 18L18 6" strokeLinecap="round" />
          ) : (
            <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
          )}
        </svg>
      </button>

      {open && (
        <nav className="md:hidden absolute left-0 right-0 top-full border-t border-chalk/15 bg-pitch px-4 py-3 flex flex-col gap-1 text-sm font-medium z-50">
          {mobileNav(() => setOpen(false))}
        </nav>
      )}
    </>
  );
}
