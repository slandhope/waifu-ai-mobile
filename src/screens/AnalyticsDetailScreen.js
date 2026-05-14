import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GlassView } from 'expo-glass-effect';
import { useEffect, useState } from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Defs, Path, Stop, LinearGradient as SvgGradient } from 'react-native-svg';
import { calcScore } from '../constants';
import { useFitnessData } from '../hooks/useFitnessData';
import { apiCall } from '../utils/api';

const { width } = Dimensions.get("window");

const DetailedWave = ({ data, color, height = 200 }) => {
  const max = Math.max(...data, 100);
  const chartWidth = width - 40;
  if(!data || data.length < 2) return null;
  const points = data.map((v, i) => ({
    x: (i / (data.length - 1)) * chartWidth,
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

const isHydrationHabit = (h) => {
  if(typeof h !== 'string') return false
  const lower = h.toLowerCase()
  return lower.includes('hydrat') || lower.includes('water') || lower.includes('drink')
}

const isSleepHabit = (h) => {
  if(typeof h !== 'string') return false
  const lower = h.toLowerCase()
  return lower.includes('sleep') || lower.includes('rest') || lower.includes('bed')
}

export default function AnalyticsDetailScreen({ navigation, data = {} }) {
  const { history = {}, streak = 0 } = data
  const { steps = 0, sleepHours = 0, activeMinutes = 0 } = useFitnessData(() => {}, [])
  const [insight, setInsight] = useState('Loading insight...')
  const [timeframe, setTimeframe] = useState(1)

  useEffect(() => {
    const loadInsight = async () => {
      try {
        const userId = await AsyncStorage.getItem('user-id')
        if(!userId) return
        const res = await apiCall('/api/daily-habits/' + userId)
        const json = await res.json()
        setInsight(json.insight || 'Keep building your habits!')
      } catch(e) {
        setInsight('Keep building your habits!')
      }
    }
    loadInsight()
  }, [])

  const getDaysCount = () => {
    if(timeframe === 0) return 1
    if(timeframe === 1) return 7
    if(timeframe === 2) return 30
    return 365
  }

  const days = getDaysCount()

  const getHistoryForDays = (count) => Array.from({ length: count }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - i)
    return history[d.toISOString().split('T')[0]] || []
  })

  const focusData = Array.from({ length: Math.min(days, 30) }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (Math.min(days, 30) - 1 - i))
    return calcScore(history[d.toISOString().split('T')[0]] || [])
  })
  const energyData = focusData.map(s => s * 0.7)

  const periodHabits = getHistoryForDays(days)
  const hydrationDays = periodHabits.filter(habits => habits.some(isHydrationHabit)).length
  const sleepDays = periodHabits.filter(habits => habits.some(isSleepHabit)).length

  const getHydration = () => {
    if(timeframe === 0) {
      const todayKey = new Date().toISOString().split('T')[0]
      const todayHabits = history[todayKey] || []
      return todayHabits.some(isHydrationHabit) ? '2.0L' : '0.0L'
    }
    return (hydrationDays * 2.0).toFixed(1) + 'L'
  }

  const getSleep = () => {
    if(timeframe === 0) return sleepHours.toFixed(1) + 'h'
    if(days <= 7) {
      const avg = sleepDays > 0 ? ((sleepDays / days) * 8).toFixed(1) : sleepHours.toFixed(1)
      return avg + 'h avg'
    }
    return ((sleepDays / days) * 8).toFixed(1) + 'h avg'
  }

  const getSteps = () => {
    if(timeframe === 0) return steps.toLocaleString()
    return (steps * Math.min(days, 7) / 7).toLocaleString()
  }

  const recovery = Math.min(Math.round((sleepHours / 8) * 50 + streak * 5), 100)

  const getChartTitle = () => {
    if(timeframe === 0) return "Today's Focus vs Energy"
    if(timeframe === 1) return "This Week's Focus vs Energy"
    if(timeframe === 2) return "This Month's Focus vs Energy"
    return "This Year's Focus vs Energy"
  }

  const getChartSubtitle = () => {
    if(timeframe === 0) {
      const todayKey = new Date().toISOString().split('T')[0]
      const todayScore = calcScore(history[todayKey] || [])
      return `Today's score: ${todayScore}/100`
    }
    const avg = focusData.length > 0
      ? Math.round(focusData.reduce((a, b) => a + b, 0) / focusData.length)
      : 0
    return `Average score: ${avg}/100`
  }

  const getDayLabels = () => {
    if(timeframe === 0) return ['6am', '9am', '12pm', '3pm', '6pm', '9pm', 'Now']
    if(timeframe === 1) return ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']
    if(timeframe === 2) return ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7']
    return ['JAN', 'MAR', 'MAY', 'JUL', 'SEP', 'NOV', 'DEC']
  }

  return (
    <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.navBar}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Feather name="chevron-left" size={28} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.navTitle}>Wellness Deep Dive</Text>
          <TouchableOpacity>
            <Feather name="share-2" size={22} color="#fff" />
          </TouchableOpacity>
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

          <GlassView style={styles.mainChartCard} glassEffectStyle='regular'>
            <View>
              <Text style={styles.chartTitle}>{getChartTitle()}</Text>
              <Text style={styles.chartSubtitle}>{getChartSubtitle()}</Text>
            </View>
            <View style={styles.chartWrapper}>
              <DetailedWave data={focusData.length > 1 ? focusData : [0, 10]} color="#f6ad55" />
              <View style={{ position: 'absolute', top: 0 }}>
                <DetailedWave data={energyData.length > 1 ? energyData : [0, 7]} color="#f687b3" />
              </View>
            </View>
            <View style={styles.dayLabels}>
              {getDayLabels().map(label => (
                <Text key={label} style={styles.dayLabel}>{label}</Text>
              ))}
            </View>
          </GlassView>

          {/* Row 1: Hydration, Sleep, Recovery */}
          <View style={styles.statsGrid}>
            <GlassView style={styles.gridItem} glassEffectStyle='regular'>
              <Feather name="droplet" size={20} color="#6366f1" />
              <Text style={styles.gridVal}>{getHydration()}</Text>
              <Text style={styles.gridLabel}>Hydration</Text>
            </GlassView>

            <GlassView style={styles.gridItem} glassEffectStyle='regular'>
              <Feather name="moon" size={20} color="#a855f7" />
              <Text style={styles.gridVal}>{getSleep()}</Text>
              <Text style={styles.gridLabel}>Sleep</Text>
            </GlassView>

            <GlassView style={styles.gridItem} glassEffectStyle='regular'>
              <Feather name="zap" size={20} color="#f59e0b" />
              <Text style={styles.gridVal}>{recovery}%</Text>
              <Text style={styles.gridLabel}>Recovery</Text>
            </GlassView>
          </View>

          {/* Row 2: Steps, Active, Streak */}
          <View style={styles.statsGrid}>
            <GlassView style={styles.gridItem} glassEffectStyle='regular'>
              <Feather name="activity" size={20} color="#ff3b57" />
              <Text style={styles.gridVal}>{getSteps()}</Text>
              <Text style={styles.gridLabel}>Steps</Text>
            </GlassView>

            <GlassView style={styles.gridItem} glassEffectStyle='regular'>
              <Feather name="clock" size={20} color="#00d4ff" />
              <Text style={styles.gridVal}>{activeMinutes}min</Text>
              <Text style={styles.gridLabel}>Active</Text>
            </GlassView>

            <GlassView style={styles.gridItem} glassEffectStyle='regular'>
              <Feather name="trending-up" size={20} color="#4ADE80" />
              <Text style={styles.gridVal}>{streak}d</Text>
              <Text style={styles.gridLabel}>Streak</Text>
            </GlassView>
          </View>

          <GlassView style={styles.insightCard} glassEffectStyle='regular'>
            <Text style={styles.insightTitle}>✦ Clarity Insight</Text>
            <Text style={styles.insightText}>{insight}</Text>
          </GlassView>

          <View style={{ height: 50 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  navBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  navTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  scrollContent: { padding: 20 },
  toggleContainer: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 15, marginBottom: 25, padding: 4 },
  toggleBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 12 },
  toggleActive: { backgroundColor: 'rgba(255,255,255,0.2)' },
  toggleText: { color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '700' },
  textActive: { color: '#fff' },
  mainChartCard: { borderRadius: 30, padding: 20, marginBottom: 20, overflow: 'hidden' },
  chartTitle: { color: '#fff', fontSize: 20, fontWeight: '800' },
  chartSubtitle: { color: 'rgba(255,255,255,0.4)', fontSize: 13, marginTop: 4 },
  chartWrapper: { height: 260, marginTop: 10, marginLeft: -20 },
  dayLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  dayLabel: { fontSize: 10, color: 'rgba(255,255,255,0.3)', fontWeight: '700' },
  statsGrid: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  gridItem: { flex: 1, padding: 15, borderRadius: 24, alignItems: 'center', overflow: 'hidden' },
  gridVal: { color: '#fff', fontSize: 16, fontWeight: '800', marginTop: 8 },
  gridLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 2 },
  insightCard: { padding: 20, borderRadius: 28, overflow: 'hidden' },
  insightTitle: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 8 },
  insightText: { color: 'rgba(255,255,255,0.7)', fontSize: 14, lineHeight: 22 }
});