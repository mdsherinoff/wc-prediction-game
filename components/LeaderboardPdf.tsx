import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";

Font.registerHyphenationCallback((word) => [word]);

const styles = StyleSheet.create({
  page: {
    padding: 36,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#8A1538",
  },
  title: {
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
    marginBottom: 4,
    color: "#8A1538"
  },
  meta: {
    fontSize: 9,
    color: "#666",
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: "row",
    backgroundColor: "#8A1538",
    paddingVertical: 6,
    paddingHorizontal: 6,
  },
  headerCell: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#f5f3ec",
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
  topRow: {
    backgroundColor: "#fdf3e0",
  },
  cell: {
    fontSize: 9,
  },
  colRank: { width: "8%" },
  colName: { width: "28%" },
  colGroup: { width: "13%", textAlign: "right" },
  colKnockout: { width: "13%", textAlign: "right" },
  colBracket: { width: "13%", textAlign: "right" },
  colAwards: { width: "13%", textAlign: "right" },
  colTotal: { width: "12%", textAlign: "right", fontFamily: "Helvetica-Bold" },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 36,
    right: 36,
    fontSize: 8,
    color: "#888",
    textAlign: "center",
  },
});

export type LeaderboardPdfRow = {
  rank: number;
  name: string;
  groupPoints: number;
  knockoutPoints: number;
  bracketPoints: number;
  awardPoints: number;
  total: number;
};

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

export default function LeaderboardPdf({
  generatedAt,
  rows,
}: {
  generatedAt: string;
  rows: LeaderboardPdfRow[];
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>
          PSMO College Alumni Qatar - FIFA 26 Contest Leaderboard
        </Text>
        <Text style={styles.meta}>
          Generated {formatTimestamp(generatedAt)} · {rows.length} participant
          {rows.length === 1 ? "" : "s"}
        </Text>

        <View style={styles.headerRow}>
          <Text style={[styles.headerCell, styles.colRank]}>#</Text>
          <Text style={[styles.headerCell, styles.colName]}>Player</Text>
          <Text style={[styles.headerCell, styles.colGroup]}>Groups</Text>
          <Text style={[styles.headerCell, styles.colKnockout]}>Knockouts</Text>
          <Text style={[styles.headerCell, styles.colBracket]}>Bracket</Text>
          <Text style={[styles.headerCell, styles.colAwards]}>Awards</Text>
          <Text style={[styles.headerCell, styles.colTotal]}>Total</Text>
        </View>

        {rows.map((r, i) => (
          <View
            key={i}
            style={
              i === 0
                ? [styles.row, styles.topRow]
                : i % 2 === 1
                  ? [styles.row, styles.rowAlt]
                  : styles.row
            }
          >
            <Text style={[styles.cell, styles.colRank]}>{r.rank}</Text>
            <Text style={[styles.cell, styles.colName]}>{r.name}</Text>
            <Text style={[styles.cell, styles.colGroup]}>{r.groupPoints}</Text>
            <Text style={[styles.cell, styles.colKnockout]}>
              {r.knockoutPoints}
            </Text>
            <Text style={[styles.cell, styles.colBracket]}>
              {r.bracketPoints}
            </Text>
            <Text style={[styles.cell, styles.colAwards]}>{r.awardPoints}</Text>
            <Text style={[styles.cell, styles.colTotal]}>{r.total}</Text>
          </View>
        ))}

        <Text style={styles.footer}>PAAQ World Cup 2026 Prediction Pool</Text>
      </Page>
    </Document>
  );
}
