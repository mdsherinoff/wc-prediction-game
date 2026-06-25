import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";

// Disable hyphenation so team/user names never get awkwardly split mid-word.
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
  subtitle: {
    fontSize: 11,
    color: "#444",
    marginBottom: 2,
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
  colName: { width: "20%" },
  colPrediction: { width: "28%" },
  colPoints: { width: "10%", textAlign: "center" },
  colCreated: { width: "21%" },
  colUpdated: { width: "21%" },
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

export type PredictionPdfRow = {
  userName: string;
  predictionText: string;
  knownIncorrect: boolean;
  pointsAwarded: number | null;
  createdAt: string;
  updatedAt: string;
};

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "short",
  });
}

export default function MatchPredictionsPdf({
  homeTeamName,
  awayTeamName,
  stageLabel,
  kickoff,
  generatedAt,
  rows,
}: {
  homeTeamName: string;
  awayTeamName: string;
  stageLabel: string;
  kickoff: string;
  generatedAt: string;
  rows: PredictionPdfRow[];
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>
          {homeTeamName} vs {awayTeamName}
        </Text>
        <Text style={styles.subtitle}>
          {stageLabel} · Kickoff: {formatTimestamp(kickoff)}
        </Text>
        <Text style={styles.meta}>
          Prediction record generated {formatTimestamp(generatedAt)} ·{" "}
          {rows.length} prediction{rows.length === 1 ? "" : "s"}
        </Text>

        <View style={styles.table}>
          <View style={styles.headerRow}>
            <Text style={[styles.headerCell, styles.colName]}>Player</Text>
            <Text style={[styles.headerCell, styles.colPrediction]}>
              Prediction
            </Text>
            <Text style={[styles.headerCell, styles.colPoints]}>Points</Text>
            <Text style={[styles.headerCell, styles.colCreated]}>
              First submitted
            </Text>
            <Text style={[styles.headerCell, styles.colUpdated]}>
              Last updated
            </Text>
          </View>

          {rows.map((r, i) => (
            <View
              key={i}
              style={i % 2 === 1 ? [styles.row, styles.rowAlt] : styles.row}
            >
              <Text style={[styles.cell, styles.colName]}>{r.userName}</Text>
              <Text style={[styles.cell, styles.colPrediction]}>
                {r.knownIncorrect
                  ? "Marked wrong (no exact value on record)"
                  : r.predictionText}
              </Text>
              <Text style={[styles.cell, styles.colPoints]}>
                {r.pointsAwarded != null ? r.pointsAwarded : "—"}
              </Text>
              <Text style={[styles.cell, styles.colCreated]}>
                {formatTimestamp(r.createdAt)}
              </Text>
              <Text style={[styles.cell, styles.colUpdated]}>
                {formatTimestamp(r.updatedAt)}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.noticeBox}>
          <Text>
            This record reflects the database state at the time of generation.
            Timestamps are server-recorded at the moment each prediction was
            created or last modified, and are not editable by players.
          </Text>
        </View>

        <Text style={styles.footer}>
          World Cup 2026 Prediction Pool — Admin export
        </Text>
      </Page>
    </Document>
  );
}
