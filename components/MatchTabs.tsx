"use client";

import { useState, ReactNode } from "react";
import { useSearchParams } from "next/navigation";

type View = "upcoming" | "completed";

export default function MatchTabs({
  upcoming,
  completed,
  upcomingCount,
  completedCount,
  paramName = "view",
}: {
  upcoming: ReactNode;
  completed: ReactNode;
  upcomingCount: number;
  completedCount: number;
  /** Query-string key this tab persists under (e.g. ?view=completed). */
  paramName?: string;
}) {
  const searchParams = useSearchParams();

  // Initialise from the URL so the choice survives navigation, refresh and
  // shared links; anything other than "completed" defaults to "upcoming".
  const initial: View =
    searchParams.get(paramName) === "completed" ? "completed" : "upcoming";
  const [tab, setTab] = useState<View>(initial);

  function selectTab(next: View) {
    setTab(next);
    const params = new URLSearchParams(window.location.search);
    params.set(paramName, next);
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}?${params.toString()}`,
    );
  }

  return (
    <div>
      <div className="flex gap-1 mb-6 border-b border-line">
        <TabButton
          active={tab === "upcoming"}
          onClick={() => selectTab("upcoming")}
          label="Upcoming"
          count={upcomingCount}
        />
        <TabButton
          active={tab === "completed"}
          onClick={() => selectTab("completed")}
          label="Completed"
          count={completedCount}
        />
      </div>

      {tab === "upcoming" ? upcoming : completed}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`font-display text-sm font-600 px-4 py-2 -mb-px border-b-2 transition ${
        active
          ? "border-turf text-turf"
          : "border-transparent text-ink/40 hover:text-ink/70"
      }`}
    >
      {label}
      <span
        className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${
          active ? "bg-turf text-chalk" : "bg-line text-ink/50"
        }`}
      >
        {count}
      </span>
    </button>
  );
}
