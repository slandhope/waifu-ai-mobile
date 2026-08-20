import { Feather } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Svg, { Defs, Path, Stop, LinearGradient as SvgGradient } from 'react-native-svg';
import GlassSurface from '../components/GlassSurface';
import TabScreenShell from '../components/TabScreenShell';
import { calcScore, todayKey } from '../constants';
import { useFitness } from '../context/FitnessContext';
import {
  buildLocalInsight,
  getDayLabels,
  getDaysHistory,
  getScoreSeries,
  getStepsSeries,
  weekOverWeekChange,
} from '../lib/statsHelpers';
import { apiCall } from '../utils/api';

const { width } = Dimensions.get("window");

const DetailedWave = ({ data, color, height = 200 }) => {
  const safe = (data || []).map((v) => Math.max(v, 0));
  const max = Math.max(...safe, 1);
  const chartWidth = width - 80;
  if (safe.length < 2) return null;
  const points = safe.map((v, i) => ({
    x: (i / (safe.length - 1)) * chartWidth,
    y: height - (v / max) * height + 20
  }));

  let d = `M 0,${height + 50} L 0,${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const curr = points[i];
    const next = points[i + 1];
    const cpX = (curr.x + next.x) / 2;
    d += ` Q ${cpX},${curr.y} ${next.x},${next.y}`;
  }
  d += ` L ${chartWidth},${height + 50} L 0,${height + 50} Z`;

  return (
    <Svg height={height + 60} width={chartWidth}>
      <Defs>
        <SvgGradient id={`gradLarge-${color}`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={color} stopOpacity="0.6" />
          <Stop offset="100%" stopColor={color} stopOpacity="0" />
        </SvgGradient>
      </Defs>
      <Path d={d} fill={`url(#gradLarge-${color})`} stroke={color} strokeWidth="4" />
    </Svg>
  );
};

const TIMEFRAMES = ['DAY', 'WEEK', 'MONTH', 'YEAR']

const hasHabit = (habits, id) => (habits || []).includes(id)

export default function AnalyticsDetailScreen({ navigation, data = {}, wallpaper }) {
  const { history = {}, streak = 0, weeklyInsight } = data
  const { steps = 0, sleepHours = 0, activeMinutes = 0, stepsHistory = {} } = useFitness()
  const [insight, setInsight] = useState('Loading insight...')
  const [timeframe, setTimeframe] = useState(1)

  useEffect(() => {
    const loadInsight = async () => {
      if (weeklyInsight) {
        setInsight(weeklyInsight)
        return
      }
      try {
        const res = await apiCall('/api/daily-habits')
        if (res.ok) {
          const json = await res.json()
          setInsight(json.insight || buildLocalInsight(history, streak))
          return
        }
      } catch (e) {}
      setInsight(buildLocalInsight(history, streak))
    }
    loadInsight()
  }, [weeklyInsight, history, streak])

  const getDaysCount = () => {
    if (timeframe === 0) return 1
    if (timeframe === 1) return 7
    if (timeframe === 2) return 30
    return 365
  }

  const days = getDaysCount()
  const chartDays = Math.min(days, 30)

  const focusData = getScoreSeries(history, chartDays)
  const energyData = focusData.map((s) => s * 0.7)

  const periodHabits = getDaysHistory(history, days, 0)
  const hydrationDays = periodHabits.filter((habits) => hasHabit(habits, 'hydration')).length
  const sleepHabitDays = periodHabits.filter((habits) => hasHabit(habits, 'sleep')).length

  const getHydration = () => {
    if (timeframe === 0) {
      const todayHabits = history[todayKey()] || []
      return hasHabit(todayHabits, 'hydration') ? '2.0L' : '0.0L'
    }
    return (hydrationDays * 2.0).toFixed(1) + 'L'
  }

  const getSleep = () => {
    if (timeframe === 0) return sleepHours.toFixed(1) + 'h'
    if (sleepHabitDays > 0) return ((sleepHabitDays / days) * 8).toFixed(1) + 'h avg'
    return sleepHours > 0 ? sleepHours.toFixed(1) + 'h' : '—'
  }

  const getStepsDisplay = () => {
    if (timeframe === 0) return steps.toLocaleString()
    const series = getStepsSeries(stepsHistory, Math.min(days, 7))
    const total = series.reduce((a, b) => a + b, 0)
    if (total > 0) return total.toLocaleString()
    return Math.round((steps * Math.min(days, 7)) / 7).toLocaleString()
  }

  const recovery = Math.min(Math.round((sleepHours / 8) * 50 + streak * 5), 100)
  const { pct: weekPct } = weekOverWeekChange(history, 'score')

  const getChartTitle = () => {
    if (timeframe === 0) return "Today's Focus vs Energy"
    if (timeframe === 1) return "This Week's Focus vs Energy"
    if (timeframe === 2) return "This Month's Focus vs Energy"
    return "This Year's Focus vs Energy"
  }

  const getChartSubtitle = () => {
    if (timeframe === 0) {
      const todayScore = calcScore(history[todayKey()] || [])
      return `Today's score: ${todayScore}/100`
    }
    const avg = focusData.length > 0
      ? Math.round(focusData.reduce((a, b) => a + b, 0) / focusData.length)
      : 0
    const trend = timeframe === 1 && weekPct !== 0 ? ` · ${weekPct > 0 ? '+' : ''}${weekPct}% vs last week` : ''
    return `Average score: ${avg}/100${trend}`
  }

  const getDayLabelsForChart = () => {
    if (timeframe === 0) return ['6am', '9am', '12pm', '3pm', '6pm', '9pm', 'Now']
    if (timeframe === 1) return getDayLabels(7)
    if (timeframe === 2) return ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7']
    return ['JAN', 'MAR', 'MAY', 'JUL', 'SEP', 'NOV', 'DEC']
  }

  return (
    <TabScreenShell wallpaper={wallpaper}>
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Feather name="chevron-left" size={28} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Wellness Deep Dive</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.toggleContainer}>
          {TIMEFRAMES.map((item, i) => (
            <TouchableOpacity
              key={item}
              style={[styles.toggleBtn, i === timeframe && styles.toggleActive]}
              onPress={() => setTimeframe(i)}
            >
              <Text style={[styles.toggleText, i === timeframe && styles.textActive]}>{item}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <GlassSurface borderRadius={30} style={styles.mainChartCard}>
          <View>
            <Text style={styles.chartTitle}>{getChartTitle()}</Text>
            <Text style={styles.chartSubtitle}>{getChartSubtitle()}</Text>
          </View>
          <View style={styles.chartWrapper}>
            <DetailedWave data={focusData.length > 1 ? focusData : [0, calcScore(history[todayKey()] || []) || 10]} color="#f6ad55" />
            <View style={{ position: 'absolute', top: 0 }}>
              <DetailedWave data={energyData.length > 1 ? energyData : [0, 7]} color="#f687b3" />
            </View>
          </View>
          <View style={styles.dayLabels}>
            {getDayLabelsForChart().map((label) => (
              <Text key={label} style={styles.dayLabel}>{label}</Text>
            ))}
          </View>
        </GlassSurface>

        <View style={styles.statsGrid}>
          <GlassSurface borderRadius={24} style={styles.gridItem}>
            <Feather name="droplet" size={20} color="#6366f1" />
            <Text style={styles.gridVal}>{getHydration()}</Text>
            <Text style={styles.gridLabel}>Hydration</Text>
          </GlassSurface>

          <GlassSurface borderRadius={24} style={styles.gridItem}>
            <Feather name="moon" size={20} color="#a855f7" />
            <Text style={styles.gridVal}>{getSleep()}</Text>
            <Text style={styles.gridLabel}>Sleep</Text>
          </GlassSurface>

          <GlassSurface borderRadius={24} style={styles.gridItem}>
            <Feather name="zap" size={20} color="#f59e0b" />
            <Text style={styles.gridVal}>{recovery}%</Text>
            <Text style={styles.gridLabel}>Recovery</Text>
          </GlassSurface>
        </View>

        <View style={styles.statsGrid}>
          <GlassSurface borderRadius={24} style={styles.gridItem}>
            <Feather name="activity" size={20} color="#ff3b57" />
            <Text style={styles.gridVal}>{getStepsDisplay()}</Text>
            <Text style={styles.gridLabel}>Steps</Text>
          </GlassSurface>

          <GlassSurface borderRadius={24} style={styles.gridItem}>
            <Feather name="clock" size={20} color="#00d4ff" />
            <Text style={styles.gridVal}>{activeMinutes}min</Text>
            <Text style={styles.gridLabel}>Active</Text>
          </GlassSurface>

          <GlassSurface borderRadius={24} style={styles.gridItem}>
            <Feather name="trending-up" size={20} color="#4ADE80" />
            <Text style={styles.gridVal}>{streak}d</Text>
            <Text style={styles.gridLabel}>Streak</Text>
          </GlassSurface>
        </View>

        <GlassSurface borderRadius={28} style={styles.insightCard}>
          <Text style={styles.insightTitle}>✦ waifu.ai Insight</Text>
          <Text style={styles.insightText}>{insight}</Text>
        </GlassSurface>

        <View style={{ height: 50 }} />
      </ScrollView>
    </TabScreenShell>
  );
}

const styles = StyleSheet.create({
  navBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8 },
  navTitle: { color: '#1a1a1a', fontSize: 18, fontWeight: '700' },
  scrollContent: { padding: 20 },
  toggleContainer: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.45)', borderRadius: 15, marginBottom: 25, padding: 4 },
  toggleBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 12 },
  toggleActive: { backgroundColor: 'rgba(255,255,255,0.85)' },
  toggleText: { color: 'rgba(0,0,0,0.4)', fontSize: 12, fontWeight: '700' },
  textActive: { color: '#1a1a1a' },
  mainChartCard: { padding: 20, marginBottom: 20, overflow: 'hidden' },
  chartTitle: { color: '#1a1a1a', fontSize: 20, fontWeight: '800' },
  chartSubtitle: { color: 'rgba(0,0,0,0.45)', fontSize: 13, marginTop: 4 },
  chartWrapper: { height: 260, marginTop: 10, marginLeft: -10 },
  dayLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  dayLabel: { fontSize: 10, color: 'rgba(0,0,0,0.35)', fontWeight: '700' },
  statsGrid: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  gridItem: { flex: 1, padding: 15, alignItems: 'center', overflow: 'hidden' },
  gridVal: { color: '#1a1a1a', fontSize: 16, fontWeight: '800', marginTop: 8 },
  gridLabel: { color: 'rgba(0,0,0,0.45)', fontSize: 11, marginTop: 2 },
  insightCard: { padding: 20, overflow: 'hidden' },
  insightTitle: { color: '#1a1a1a', fontSize: 16, fontWeight: '700', marginBottom: 8 },
  insightText: { color: 'rgba(0,0,0,0.65)', fontSize: 14, lineHeight: 22 }
});
