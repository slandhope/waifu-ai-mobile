import { Dimensions, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS, HABITS, calcScore, calcStreak } from "../constants";

const { width } = Dimensions.get("window");

export default function StatsScreen({ data }) {
  const { history } = data;
  const streak = calcStreak(history);

  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const key = d.toISOString().split("T")[0];
    return {
      day: d.toLocaleDateString("en", { weekday: "short" }),
      score: calcScore(history[key] || []),
    };
  });

  const habitStats = HABITS.map((h) => {
    let done = 0;
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0];
      if ((history[key] || []).includes(h.id)) done++;
    }
    return { ...h, pct: Math.round((done / 7) * 100) };
  });

  const avgScore = Math.round(last7.reduce((s, d) => s + d.score, 0) / 7);
  const bestScore = Math.max(...last7.map((d) => d.score));
  const totalDays = Object.keys(history).filter(k => (history[k] || []).length >= Math.ceil(HABITS.length / 2)).length;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.pageTitle}>Your Progress</Text>

        <View style={styles.statGrid}>
          {[
            { label: "Current streak", value: `${streak}d`, color: COLORS.flame },
            { label: "Avg score (7d)", value: `${avgScore}`, color: COLORS.purple },
            { label: "Best score (7d)", value: `${bestScore}`, color: "#f472b6" },
            { label: "Total active days", value: `${totalDays}`, color: "#34d399" },
          ].map((s) => (
            <View key={s.label} style={styles.statCard}>
              <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>SCORE — LAST 7 DAYS</Text>
          <View style={styles.barChart}>
            {last7.map((d, i) => (
              <View key={i} style={styles.barCol}>
                <Text style={styles.barValue}>{d.score > 0 ? d.score : ""}</Text>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, {
                    height: d.score > 0 ? Math.max((d.score / 100) * 80, 4) : 2,
                    backgroundColor: d.score >= 70 ? "#a78bfa" : d.score >= 40 ? "#f472b6" : "#333",
                  }]} />
                </View>
                <Text style={styles.barDay}>{d.day}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>HABIT COMPLETION — 7 DAYS</Text>
          {habitStats.map((h) => (
            <View key={h.id} style={styles.habitRow}>
              <Text style={styles.habitEmoji}>{h.emoji}</Text>
              <View style={{ flex: 1 }}>
                <View style={styles.habitRowHeader}>
                  <Text style={styles.habitRowName}>{h.shortLabel}</Text>
                  <Text style={styles.habitRowPct}>{h.pct}%</Text>
                </View>
                <View style={styles.habitBar}>
                  <View style={[styles.habitBarFill, { width: `${h.pct}%`, backgroundColor: h.color }]} />
                </View>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.scienceCard}>
          <Text style={styles.scienceTitle}>✨ Did you know?</Text>
          <Text style={styles.scienceText}>Users who engage with a habit app weekly have a 90% chance of staying long-term. Your streak is your most powerful retention tool.</Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 20 },
  pageTitle: { fontSize: 22, fontWeight: "300", color: COLORS.text, marginBottom: 20, letterSpacing: -0.5 },
  statGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 20 },
  statCard: { width: (width - 50) / 2, backgroundColor: COLORS.surfaceAlt, borderRadius: 16, padding: 16 },
  statValue: { fontSize: 28, fontWeight: "300", letterSpacing: -1 },
  statLabel: { fontSize: 11, color: COLORS.textMuted, marginTop: 4 },
  card: { backgroundColor: COLORS.surface, borderRadius: 18, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: COLORS.border },
  cardTitle: { fontSize: 10, color: COLORS.textMuted, letterSpacing: 2, marginBottom: 16 },
  barChart: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  barCol: { alignItems: "center", flex: 1 },
  barValue: { fontSize: 10, color: COLORS.textMuted, marginBottom: 4 },
  barTrack: { width: 24, height: 80, justifyContent: "flex-end", backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 4 },
  barFill: { width: "100%", borderRadius: 4 },
  barDay: { fontSize: 10, color: COLORS.textFaint, marginTop: 6 },
  habitRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 },
  habitEmoji: { fontSize: 18, width: 28 },
  habitRowHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 5 },
  habitRowName: { fontSize: 12, color: COLORS.textMuted },
  habitRowPct: { fontSize: 12, color: COLORS.textFaint },
  habitBar: { height: 4, backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 2, overflow: "hidden" },
  habitBarFill: { height: "100%", borderRadius: 2 },
  scienceCard: { backgroundColor: "rgba(108,92,231,0.08)", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "rgba(108,92,231,0.2)" },
  scienceTitle: { fontSize: 13, color: "#a89ef0", fontWeight: "500", marginBottom: 8 },
  scienceText: { fontSize: 13, color: "rgba(255,255,255,0.6)", lineHeight: 20 },
});