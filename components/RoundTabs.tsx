"use client";

import { useState, ReactNode } from "react";

export type RoundTab = {
  key: string;
  label: string;
  content: ReactNode;
};

export default function RoundTabs({
  tabs,
  defaultKey,
}: {
  tabs: RoundTab[];
  defaultKey?: string;
}) {
  const [active, setActive] = useState(defaultKey ?? tabs[0]?.key ?? "");

  return (
    <div>
      <div
        className="flex gap-1.5 overflow-x-auto pb-2 mb-4 -mx-1 px-1"
        style={{ scrollbarWidth: "thin" }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActive(tab.key)}
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
