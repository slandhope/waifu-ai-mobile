import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Svg, { Defs, Path, Stop, LinearGradient as SvgGradient } from 'react-native-svg';
import GlassSurface from '../components/GlassSurface';
import TabScreenShell from '../components/TabScreenShell';
import { calcScore, HABITS } from '../constants';
import { useFitness } from '../context/FitnessContext';
import {
  getDayLabels,
  getEarnedAwards,
  getScoreSeries,
  getStepsSeries,
  weekOverWeekChange,
} from '../lib/statsHelpers';

const WellnessWave = ({ data, color, height = 120, chartWidth }) => {
  if (!data?.length) return null;
  const safe = data.map((v) => Math.max(v, 0));
  const max = Math.max(...safe, 1);
  const width = chartWidth || 280;
  if (safe.length < 2) return null;
  const points = safe.map((v, i) => ({
    x: (i / (safe.length - 1)) * width,
    y: height - (v / max) * height + 10
  }));

  let d = `M 0,${height + 20} L 0,${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const curr = points[i];
    const next = points[i + 1];
    const cpX = (curr.x + next.x) / 2;
    d += ` Q ${cpX},${curr.y} ${next.x},${next.y}`;
  }
  d += ` L ${width},${height + 20} L 0,${height + 20} Z`;

  return (
    <View style={StyleSheet.absoluteFill}>
      <Svg height={height + 40} width={width}>
        <Defs>
          <SvgGradient id={`grad-${color}`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={color} stopOpacity="0.4" />
            <Stop offset="100%" stopColor={color} stopOpacity="0" />
          </SvgGradient>
        </Defs>
        <Path d={d} fill={`url(#grad-${color})`} stroke={color} strokeWidth="3" strokeLinecap="round" />
      </Svg>
    </View>
  );
};

export default function StatsScreen({ data, navigation, wallpaper }) {
  const { todayHabits, streak, history } = data || {}
  const { steps, sleepHours, connected, stepsHistory } = useFitness()

  const habitWeek = weekOverWeekChange(history, 'count')
  const scoreWeek = weekOverWeekChange(history, 'score')
  const todayScore = calcScore(todayHabits || [])
  const chartData = getScoreSeries(history, 7)
  const stepsChartData = getStepsSeries(stepsHistory, 7)
  const dayLabels = getDayLabels(7)
  const earnedAwards = getEarnedAwards({ streak, steps, todayHabits: todayHabits || [], sleepHours })
  const previewAwards = earnedAwards.length > 0
    ? earnedAwards.slice(-3)
    : [
        { icon: 'medal-outline', label: '3-Day Streak', color: 'rgba(0,0,0,0.15)' },
        { icon: 'fire', label: '30-Day Streak', color: 'rgba(0,0,0,0.15)' },
        { icon: 'weather-sunset', label: '5K Steps', color: 'rgba(0,0,0,0.15)' },
      ]

  const getDate = () => new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' })

  const statList = [
    {
      label: 'Current Streak',
      val: String(streak || 0),
      unit: 'DAYS',
      tw: scoreWeek.thisW + ' pts',
      lw: scoreWeek.lastW + ' pts'
    },
    {
      label: 'Steps Today',
      val: (steps || 0).toLocaleString(),
      unit: 'STEPS',
      tw: steps >= 8000 ? 'Goal met' : '—',
      lw: '—'
    },
    {
      label: 'Sleep Last Night',
      val: (sleepHours || 0).toFixed(1),
      unit: 'HRS',
      tw: sleepHours >= 7 ? 'Good' : 'Low',
      lw: '—'
    },
    {
      label: 'Habits This Week',
      val: String(habitWeek.thisW),
      unit: `/ ${HABITS.length * 7}`,
      tw: (habitWeek.pct >= 0 ? '+' : '') + habitWeek.pct + '%',
      lw: habitWeek.lastW + `/${HABITS.length * 7}`
    },
    {
      label: 'Today Completion',
      val: String((todayHabits || []).length),
      unit: `/ ${HABITS.length}`,
      tw: todayScore + '%',
      lw: '—'
    },
  ];

  const stackNav = () => navigation.getParent?.() || navigation
  const openFitness = () => stackNav().navigate('Fitness')

  return (
    <TabScreenShell wallpaper={wallpaper}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

          <View style={styles.header}>
            <Text style={styles.dateText}>{getDate()}</Text>
            <Text style={styles.pageTitle}>waifu.ai STATS</Text>
          </View>

          {!connected && steps === 0 && (
            <TouchableOpacity activeOpacity={0.85} onPress={openFitness} style={{ marginBottom: 20 }}>
              <GlassSurface borderRadius={24} style={styles.connectBanner}>
                <Feather name="heart" size={20} color="#f472b6" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.connectTitle}>Connect Apple Health</Text>
                  <Text style={styles.connectSub}>Auto-track steps, sleep, and fitness habits</Text>
                </View>
                <Feather name="chevron-right" size={18} color="rgba(0,0,0,0.35)" />
              </GlassSurface>
            </TouchableOpacity>
          )}

          <TouchableOpacity activeOpacity={0.9} onPress={() => stackNav().navigate('AnalyticsDetail')}>
            <GlassSurface borderRadius={35} style={styles.trendsCard}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardLabel}>Wellness Trends</Text>
                <Feather name="chevron-right" size={18} color="rgba(0,0,0,0.35)" />
              </View>
              <View style={styles.chartArea}>
                <WellnessWave data={chartData} color="#f6ad55" chartWidth={280} />
                {stepsChartData.some((s) => s > 0) && (
                  <WellnessWave data={stepsChartData} color="#f687b3" chartWidth={280} />
                )}
              </View>
              <View style={styles.daysRow}>
                {dayLabels.map((day) => (
                  <Text key={day} style={styles.dayText}>{day}</Text>
                ))}
              </View>
            </GlassSurface>
          </TouchableOpacity>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Awards</Text>
            <TouchableOpacity onPress={() => stackNav().navigate('AwardsList')}>
              <Feather name="chevron-right" size={20} color="rgba(0,0,0,0.35)" />
            </TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.awardsScroll}>
            {previewAwards.map((award) => (
              <View key={award.label} style={styles.awardItem}>
                <MaterialCommunityIcons name={award.icon} size={32} color={award.color} />
                <Text style={styles.awardLabel}>{award.label}</Text>
              </View>
            ))}
          </ScrollView>

          <GlassSurface borderRadius={30} style={styles.statsContainer}>
            <View style={styles.tableHeader}>
              <Text style={[styles.headerText, { flex: 2 }]}>STATS</Text>
              <Text style={[styles.headerText, { flex: 1, textAlign: 'right' }]}>THIS WEEK</Text>
              <Text style={[styles.headerText, { flex: 1, textAlign: 'right' }]}>LAST WEEK</Text>
            </View>
            <View style={styles.divider} />

            {statList.map((item, idx) => (
              <View key={item.label}>
                <View style={styles.statRow}>
                  <View style={{ flex: 2 }}>
                    <Text style={styles.statLabel}>{item.label}</Text>
                    <View style={styles.valGroup}>
                      <Text style={styles.statVal}>{item.val}</Text>
                      <Text style={styles.statUnit}>{item.unit}</Text>
                    </View>
                  </View>
                  <Text style={styles.trendText}>{item.tw}</Text>
                  <Text style={[styles.trendText, styles.mutedTrend]}>{item.lw}</Text>
                </View>
                {idx < statList.length - 1 && <View style={styles.divider} />}
              </View>
            ))}
          </GlassSurface>

          <View style={{ height: 120 }} />
        </ScrollView>
    </TabScreenShell>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20 },
  header: { marginBottom: 25 },
  dateText: { fontSize: 14, color: 'rgba(0,0,0,0.45)', fontWeight: '600' },
  pageTitle: { fontSize: 32, fontWeight: '900', color: '#1a1a1a', letterSpacing: -0.8 },
  connectBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  connectTitle: { color: '#1a1a1a', fontSize: 15, fontWeight: '700' },
  connectSub: { color: 'rgba(0,0,0,0.45)', fontSize: 12, marginTop: 2 },
  trendsCard: { padding: 20, marginBottom: 25, overflow: 'hidden', height: 240 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardLabel: { color: '#1a1a1a', fontSize: 19, fontWeight: '700' },
  chartArea: { height: 140, marginTop: 10 },
  daysRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  dayText: { fontSize: 10, color: 'rgba(0,0,0,0.35)', fontWeight: '700' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  sectionTitle: { color: '#1a1a1a', fontSize: 22, fontWeight: '700' },
  awardsScroll: { marginBottom: 30, paddingLeft: 10 },
  awardItem: { alignItems: 'center', marginRight: 30, gap: 8 },
  awardLabel: { color: '#1a1a1a', fontSize: 12, fontWeight: '600' },
  statsContainer: { padding: 20, overflow: 'hidden' },
  tableHeader: { flexDirection: 'row', marginBottom: 10, paddingHorizontal: 5 },
  headerText: { color: 'rgba(0,0,0,0.4)', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  statRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 18 },
  statLabel: { color: 'rgba(0,0,0,0.55)', fontSize: 15, fontWeight: '500', marginBottom: 2 },
  valGroup: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  statVal: { color: '#1a1a1a', fontSize: 20, fontWeight: '800' },
  statUnit: { color: 'rgba(0,0,0,0.35)', fontSize: 10, fontWeight: '800' },
  trendText: { flex: 1, color: '#16a34a', fontSize: 13, fontWeight: '700', textAlign: 'right' },
  mutedTrend: { color: 'rgba(0,0,0,0.35)' },
  divider: { height: 1, backgroundColor: 'rgba(0,0,0,0.06)' }
});
