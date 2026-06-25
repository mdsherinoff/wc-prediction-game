"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { BracketSlot } from "@/lib/bracket-data";

type Sizes = {
  slotHeight: number;
  slotGap: number;
  boxWidth: number;
  columnGap: number;
};

// Desktop sizing
const DESKTOP: Sizes = {
  slotHeight: 64,
  slotGap: 12,
  boxWidth: 168,
  columnGap: 56,
};
// Compact sizing used under the md breakpoint — roughly 60% scale, which
// keeps the whole 16-slot-tall tree closer to one mobile screen's height
// instead of requiring 3x the viewport of vertical scrolling.
const MOBILE: Sizes = {
  slotHeight: 40,
  slotGap: 8,
  boxWidth: 112,
  columnGap: 36,
};

type RoundKey = "R32" | "R16" | "QF" | "SF";
const ROUNDS: { key: RoundKey; label: string; count: number }[] = [
  { key: "R32", label: "R32", count: 16 },
  { key: "R16", label: "R16", count: 8 },
  { key: "QF", label: "QF", count: 4 },
  { key: "SF", label: "SF", count: 2 },
];

/**
 * For round index r (0=R32, 1=R16, 2=QF, 3=SF) and slot index i within that
 * round, returns the vertical center (in px, relative to the bracket's top)
 * of that slot's box. R32 slots are evenly spaced; every later round's slot
 * centers exactly between the two child slots that feed into it.
 */
function centerOf(sizes: Sizes, roundIndex: number, slotIndex: number): number {
  const unit = sizes.slotHeight + sizes.slotGap;
  const spacing = unit * Math.pow(2, roundIndex);
  return spacing * slotIndex + spacing / 2;
}

function getSlots(
  data: Map<string, BracketSlot>,
  round: RoundKey,
  count: number,
): (BracketSlot | undefined)[] {
  return Array.from({ length: count }, (_, i) => data.get(`${round}-${i + 1}`));
}

/** True once we know the viewport is narrower than the md breakpoint (768px). */
function useIsCompact(): boolean {
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const check = () => setCompact(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return compact;
}

export default function BracketTree({
  bySlot,
  final,
  thirdPlace,
}: {
  bySlot: Map<string, BracketSlot>;
  final: BracketSlot | null;
  thirdPlace: BracketSlot | null;
}) {
  const compact = useIsCompact();
  const sizes = compact ? MOBILE : DESKTOP;
  const unit = sizes.slotHeight + sizes.slotGap;
  const totalHeight = unit * 16;

  return (
    <div className="overflow-x-auto pb-4">
      <div
        className="flex items-stretch"
        style={{
          minWidth:
            ROUNDS.length * (sizes.boxWidth + sizes.columnGap) +
            sizes.boxWidth +
            40,
        }}
      >
        {ROUNDS.map((round, roundIndex) => {
          const slots = getSlots(bySlot, round.key, round.count);
          return (
            <div key={round.key} className="flex items-stretch">
              <div
                className="relative"
                style={{ width: sizes.boxWidth, height: totalHeight }}
              >
                <div
                  className="absolute left-0 right-0 text-center text-[10px] tracking-wide font-display font-bold"
                  style={{ top: -22, color: "var(--board-text-muted)" }}
                >
                  {round.label}
                </div>
                {slots.map((slot, i) => {
                  const center = centerOf(sizes, roundIndex, i);
                  return (
                    <SlotBox
                      key={`${round.key}-${i}`}
                      slot={slot}
                      compact={compact}
                      style={{
                        position: "absolute",
                        top: center - sizes.slotHeight / 2,
                        left: 0,
                        width: sizes.boxWidth,
                        height: sizes.slotHeight,
                      }}
                    />
                  );
                })}
              </div>

              {roundIndex < ROUNDS.length - 1 && (
                <Connectors
                  sizes={sizes}
                  roundIndex={roundIndex}
                  pairCount={round.count / 2}
                  totalHeight={totalHeight}
                />
              )}
            </div>
          );
        })}

        <Connectors
          sizes={sizes}
          roundIndex={3}
          pairCount={1}
          totalHeight={totalHeight}
        />
        <div
          className="relative"
          style={{ width: sizes.boxWidth, height: totalHeight }}
        >
          <div
            className="absolute left-0 right-0 text-center text-[10px] tracking-wide font-display font-bold"
            style={{ top: -22, color: "var(--amber)" }}
          >
            FINAL
          </div>
          <SlotBox
            slot={final ?? undefined}
            highlight
            compact={compact}
            style={{
              position: "absolute",
              top: centerOf(sizes, 4, 0) - sizes.slotHeight / 2,
              left: 0,
              width: sizes.boxWidth,
              height: sizes.slotHeight,
            }}
          />
          {thirdPlace && (
            <div
              style={{
                position: "absolute",
                top:
                  centerOf(sizes, 4, 0) -
                  sizes.slotHeight / 2 +
                  sizes.slotHeight +
                  28,
                left: 0,
                width: sizes.boxWidth,
              }}
            >
              <div
                className="text-center text-[9px] tracking-wide font-display font-bold mb-1"
                style={{ color: "var(--board-text-muted)" }}
              >
                3RD PLACE
              </div>
              <SlotBox
                slot={thirdPlace}
                compact
                style={{ width: sizes.boxWidth, height: sizes.slotHeight }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Connectors({
  sizes,
  roundIndex,
  pairCount,
  totalHeight,
}: {
  sizes: Sizes;
  roundIndex: number;
  pairCount: number;
  totalHeight: number;
}) {
  const lines = Array.from({ length: pairCount }, (_, i) => {
    const topChild = centerOf(sizes, roundIndex, i * 2);
    const bottomChild = centerOf(sizes, roundIndex, i * 2 + 1);
    const mid = (topChild + bottomChild) / 2;
    return { topChild, bottomChild, mid };
  });

  return (
    <svg
      width={sizes.columnGap}
      height={totalHeight}
      style={{ display: "block", flexShrink: 0 }}
      aria-hidden="true"
    >
      {lines.map((l, i) => (
        <g key={i} stroke="var(--board-divider)" strokeWidth={2} fill="none">
          <path d={`M0,${l.topChild} H${sizes.columnGap / 2} V${l.mid}`} />
          <path d={`M0,${l.bottomChild} H${sizes.columnGap / 2} V${l.mid}`} />
          <path d={`M${sizes.columnGap / 2},${l.mid} H${sizes.columnGap}`} />
        </g>
      ))}
    </svg>
  );
}

function SlotBox({
  slot,
  style,
  highlight,
  compact,
}: {
  slot?: BracketSlot;
  style?: React.CSSProperties;
  highlight?: boolean;
  compact?: boolean;
}) {
  if (!slot || (!slot.homeTeam && !slot.awayTeam)) {
    return (
      <div
        style={style}
        className="scoreboard-card flex items-center justify-center text-[10px]"
      >
        <span style={{ color: "var(--board-digit-dim)" }}>TBD</span>
      </div>
    );
  }

  const finished = slot.status === "FINISHED";

  return (
    <Link
      href={`/match/${slot.matchId}`}
      style={{
        ...style,
        boxShadow: highlight ? "0 0 0 2px var(--amber)" : undefined,
      }}
      className="scoreboard-card flex flex-col justify-center px-2 gap-1 hover:brightness-110 transition"
    >
      <TeamRow
        team={slot.homeTeam}
        score={slot.homeScore}
        isWinner={finished && slot.winnerTeamId === slot.homeTeam?.id}
        pickCount={
          slot.pickCounts.find((p) => p.teamId === slot.homeTeam?.id)?.count ??
          0
        }
        totalPicks={slot.totalPicks}
        compact={compact}
      />
      <TeamRow
        team={slot.awayTeam}
        score={slot.awayScore}
        isWinner={finished && slot.winnerTeamId === slot.awayTeam?.id}
        pickCount={
          slot.pickCounts.find((p) => p.teamId === slot.awayTeam?.id)?.count ??
          0
        }
        totalPicks={slot.totalPicks}
        compact={compact}
      />
    </Link>
  );
}

function TeamRow({
  team,
  score,
  isWinner,
  pickCount,
  totalPicks,
  compact,
}: {
  team: { id: string; name: string; flagUrl: string | null } | null;
  score: number | null;
  isWinner: boolean;
  pickCount: number;
  totalPicks: number;
  compact?: boolean;
}) {
  const pct =
    totalPicks > 0 ? Math.round((pickCount / totalPicks) * 100) : null;

  return (
    <div className="flex items-center justify-between gap-1 min-w-0">
      <span
        className={`truncate ${isWinner ? "font-bold" : ""} ${compact ? "text-[9px]" : "text-[11px]"}`}
        style={{ color: isWinner ? "var(--amber)" : "var(--chalk)" }}
      >
        {team?.name?.toUpperCase() ?? "TBD"}
      </span>
      <span className="flex items-center gap-1 shrink-0">
        {!compact && pct != null && (
          <span
            className="text-[9px]"
            style={{ color: "var(--board-text-muted)" }}
          >
            {pct}%
          </span>
        )}
        {score != null && (
          <span
            className={`font-display font-bold ${compact ? "text-[10px]" : "text-[12px]"}`}
            style={{
              fontFamily: "'DSEG7 Classic', 'Barlow Condensed', monospace",
              color: isWinner ? "var(--amber)" : "var(--board-text-muted)",
            }}
          >
            {score}
          </span>
        )}
      </span>
    </div>
  );
}
