import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";

// Disable hyphenation so player/user names never get awkwardly split mid-word.
Font.registerHyphenationCallback((word) => [word]);

const styles = StyleSheet.create({
  page: {
    padding: 36,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#13261f",
  },
  title: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    marginBottom: 4,
  },
  meta: {
    fontSize: 9,
    color: "#666",
    marginBottom: 16,
  },
  table: {
    marginTop: 8,
  },
  headerRow: {
    flexDirection: "row",
    backgroundColor: "#0b3d2e",
    paddingVertical: 6,
    paddingHorizontal: 6,
  },
  headerCell: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#f5f3ec",
  },
  winnerRow: {
    flexDirection: "row",
    backgroundColor: "#e7efe9",
    paddingVertical: 6,
    paddingHorizontal: 6,
  },
  winnerCell: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#0b3d2e",
  },
  row: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: "#d8d3c3",
  },
  rowAlt: {
    backgroundColor: "#f7f6f1",
  },
  cell: {
    fontSize: 9,
  },
  colName: { width: "16%" },
  colCategory: { width: "21%" },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 36,
    right: 36,
    fontSize: 8,
    color: "#888",
    textAlign: "center",
  },
  noticeBox: {
    marginTop: 16,
    padding: 8,
    backgroundColor: "#f7f6f1",
    fontSize: 8,
    color: "#555",
  },
});

export type AwardCategoryKey =
  | "GOLDEN_BALL"
  | "GOLDEN_BOOT"
  | "GOLDEN_GLOVE"
  | "YOUNG_PLAYER";

/** Ordered categories rendered as columns, with display labels. */
export const AWARD_COLUMNS: { key: AwardCategoryKey; label: string }[] = [
  { key: "GOLDEN_BALL", label: "Golden Ball" },
  { key: "GOLDEN_BOOT", label: "Golden Boot" },
  { key: "GOLDEN_GLOVE", label: "Golden Glove" },
  { key: "YOUNG_PLAYER", label: "Best Young Player" },
];

export type AwardPicksPdfRow = {
  userName: string;
  /** category key -> picked player display text ("—" if no pick) */
  picks: Record<AwardCategoryKey, string>;
};

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

export default function AwardPicksPdf({
  generatedAt,
  rows,
  winners,
}: {
  generatedAt: string;
  rows: AwardPicksPdfRow[];
  /** Actual announced winners, if any, keyed by category. */
  winners: Partial<Record<AwardCategoryKey, string>>;
}) {
  const hasWinners = Object.keys(winners).length > 0;

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <Text style={styles.title}>Award picks</Text>
        <Text style={styles.meta}>
          Generated {formatTimestamp(generatedAt)} · {rows.length} player
          {rows.length === 1 ? "" : "s"}
        </Text>

        <View style={styles.table}>
          <View style={styles.headerRow}>
            <Text style={[styles.headerCell, styles.colName]}>Player</Text>
            {AWARD_COLUMNS.map((c) => (
              <Text key={c.key} style={[styles.headerCell, styles.colCategory]}>
                {c.label}
              </Text>
            ))}
          </View>

          {hasWinners && (
            <View style={styles.winnerRow}>
              <Text style={[styles.winnerCell, styles.colName]}>
                Actual winner
              </Text>
              {AWARD_COLUMNS.map((c) => (
                <Text key={c.key} style={[styles.winnerCell, styles.colCategory]}>
                  {winners[c.key] ?? "TBD"}
                </Text>
              ))}
            </View>
          )}

          {rows.map((r, i) => (
            <View
              key={i}
              style={i % 2 === 1 ? [styles.row, styles.rowAlt] : styles.row}
            >
              <Text style={[styles.cell, styles.colName]}>{r.userName}</Text>
              {AWARD_COLUMNS.map((c) => (
                <Text key={c.key} style={[styles.cell, styles.colCategory]}>
                  {r.picks[c.key]}
                </Text>
              ))}
            </View>
          ))}
        </View>

        {rows.length === 0 && (
          <Text style={{ marginTop: 12, fontSize: 9, color: "#666" }}>
            No award picks have been submitted yet.
          </Text>
        )}

        <View style={styles.noticeBox}>
          <Text>
            This record reflects the database state at the time of generation.
            Each cell shows the player a person picked for that award; “—” means
            no pick was submitted for that category.
          </Text>
        </View>

        <Text style={styles.footer}>
          World Cup 2026 Prediction Pool — Admin export
        </Text>
      </Page>
    </Document>
  );
}
