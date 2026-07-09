"use client";

import { useState, ReactNode } from "react";
import { useSearchParams } from "next/navigation";

export type RoundTab = {
  key: string;
  label: string;
  content: ReactNode;
};

export default function RoundTabs({
  tabs,
  defaultKey,
  paramName = "round",
}: {
  tabs: RoundTab[];
  defaultKey?: string;
  /** Query-string key this tab group persists under (e.g. ?round=R16). */
  paramName?: string;
}) {
  const searchParams = useSearchParams();
  const fallback = defaultKey ?? tabs[0]?.key ?? "";

  // Initialise from the URL so the tab survives navigating away and back, a
  // refresh, or opening a shared link. If the URL holds a stale key (a round
  // that no longer exists), fall back to the default.
  const fromUrl = searchParams.get(paramName);
  const initial = tabs.some((t) => t.key === fromUrl) ? fromUrl! : fallback;

  const [active, setActive] = useState(initial);

  function selectTab(key: string) {
    setActive(key); // drive the UI immediately
    // Mirror into the URL for persistence — replaceState updates the address
    // bar without a server round-trip or scroll jump, and without adding a
    // history entry (so Back still returns to the previous page, not the
    // previous tab).
    const params = new URLSearchParams(window.location.search);
    params.set(paramName, key);
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}?${params.toString()}`,
    );
  }

  return (
    <div>
      <div
        className="flex gap-1.5 overflow-x-auto pb-2 mb-4 -mx-1 px-1"
        style={{ scrollbarWidth: "thin" }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => selectTab(tab.key)}
            className={`shrink-0 font-display text-xs font-bold tracking-wide px-3 py-1.5 rounded-full border transition whitespace-nowrap ${
              active === tab.key
                ? "bg-[var(--amber)] text-[var(--ink)] border-[var(--amber)]"
                : "bg-transparent text-ink/60 border-line hover:border-amber"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {tabs.find((t) => t.key === active)?.content}
    </div>
  );
}
