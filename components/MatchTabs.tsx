"use client";

import { useState, ReactNode } from "react";

export default function MatchTabs({
  upcoming,
  completed,
  upcomingCount,
  completedCount,
}: {
  upcoming: ReactNode;
  completed: ReactNode;
  upcomingCount: number;
  completedCount: number;
}) {
  const [tab, setTab] = useState<"upcoming" | "completed">("upcoming");

  return (
    <div>
      <div className="flex gap-1 mb-6 border-b border-line">
        <TabButton
          active={tab === "upcoming"}
          onClick={() => setTab("upcoming")}
          label="Upcoming"
          count={upcomingCount}
        />
        <TabButton
          active={tab === "completed"}
          onClick={() => setTab("completed")}
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
