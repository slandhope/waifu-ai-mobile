import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
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

const WellnessWave = ({ data, color, height = 120 }) => {
  const max = Math.max(...data, 100);
  const chartWidth = width - 80;
  if(!data || data.length < 2) return null;
  const points = data.map((v, i) => ({
    x: (i / (data.length - 1)) * chartWidth,
    y: height - (v / max) * height + 10
  }));

  let d = `M 0,${height + 20} L 0,${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const curr = points[i];
    const next = points[i + 1];
    const cpX = (curr.x + next.x) / 2;
    d += ` Q ${cpX},${curr.y} ${next.x},${next.y}`;
  }
  d += ` L ${chartWidth},${height + 20} L 0,${height + 20} Z`;

  return (
    <View style={StyleSheet.absoluteFill}>
      <Svg height={height + 40} width={chartWidth}>
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

export default function StatsScreen({ data, navigation }) {
  const { todayHabits, streak, history } = data || {}
  const { steps, sleepHours } = useFitnessData(() => {}, todayHabits || [])
  const [completedCount, setCompletedCount] = useState(0)

  useEffect(() => {
    const loadCompleted = async () => {
      try {
        const userId = await AsyncStorage.getItem('user-id')
        if(!userId) return
        const res = await apiCall('/api/daily-habits/' + userId)
        const json = await res.json()
        setCompletedCount((json.completed || []).length)
      } catch(e) {}
    }
    loadCompleted()
  }, [])

  // calculate real stats from history
  const todayKey = new Date().toISOString().split('T')[0]
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - i)
    return history?.[d.toISOString().split('T')[0]] || []
  })
  const prev7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (i + 7))
    return history?.[d.toISOString().split('T')[0]] || []
  })

  const thisWeekScore = last7Days.reduce((a, h) => a + h.length, 0)
  const lastWeekScore = prev7Days.reduce((a, h) => a + h.length, 0)
  const weekChange = lastWeekScore > 0 ? Math.round(((thisWeekScore - lastWeekScore) / lastWeekScore) * 100) : 0

  // chart data — last 7 days scores
  const chartData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return calcScore(history?.[d.toISOString().split('T')[0]] || [])
  })

  // chart data — last 7 days steps (from local data, simplified)
  const stepsChartData = chartData.map(s => s * 50) // approximate

  const getDate = () => new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' })

  const statList = [
    {
      label: 'Current Streak',
      val: String(streak || 0),
      unit: 'DAYS',
      tw: thisWeekScore + '/49',
      lw: lastWeekScore + '/49'
    },
    {
      label: 'Steps Today',
      val: (steps || 0).toLocaleString(),
      unit: 'STEPS',
      tw: '+' + Math.round((steps || 0) / 100) / 10 + 'k',
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
      val: String(thisWeekScore),
      unit: '/ 49',
      tw: (weekChange >= 0 ? '+' : '') + weekChange + '%',
      lw: lastWeekScore + '/49'
    },
    {
      label: 'Today Completion',
      val: String(completedCount),
      unit: 'DONE',
      tw: completedCount > 0 ? 'Active' : '—',
      lw: '—'
    },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)'}}>
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

          <View style={styles.header}>
            <Text style={styles.dateText}>{getDate()}</Text>
            <Text style={styles.pageTitle}>CLARITY STATS</Text>
          </View>

          {/* Trends Card */}
          <TouchableOpacity activeOpacity={0.9} onPress={() => navigation.navigate('AnalyticsDetail')}>
            <GlassView style={styles.trendsCard} glassEffectStyle='regular'>
              <View style={styles.cardHeader}>
                <Text style={styles.cardLabel}>Wellness Trends</Text>
                <Feather name="chevron-right" size={18} color="rgba(255,255,255,0.4)" />
              </View>
              <View style={styles.chartArea}>
                <WellnessWave data={chartData} color="#f6ad55" />
                <WellnessWave data={stepsChartData} color="#f687b3" />
              </View>
              <View style={styles.daysRow}>
                {['MON','TUE','WED','THU','FRI','SAT','SUN'].map(day => (
                  <Text key={day} style={styles.dayText}>{day}</Text>
                ))}
              </View>
            </GlassView>
          </TouchableOpacity>

          {/* Awards */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Awards</Text>
            <TouchableOpacity onPress={() => navigation.navigate('AwardsList')}>
              <Feather name="chevron-right" size={20} color="rgba(255,255,255,0.4)" />
            </TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.awardsScroll}>
            <View style={styles.awardItem}>
              <MaterialCommunityIcons name="medal" size={32} color={streak >= 7 ? "#FFD700" : "rgba(255,255,255,0.2)"} />
              <Text style={styles.awardLabel}>7-Day Streak</Text>
            </View>
            <View style={styles.awardItem}>
              <MaterialCommunityIcons name="fire" size={32} color={streak >= 30 ? "#ff3b30" : "rgba(255,255,255,0.2)"} />
              <Text style={styles.awardLabel}>30-Day Streak</Text>
            </View>
            <View style={styles.awardItem}>
              <MaterialCommunityIcons name="weather-sunset" size={32} color={steps >= 5000 ? "#4fbaff" : "rgba(255,255,255,0.2)"} />
              <Text style={styles.awardLabel}>5K Steps</Text>
            </View>
          </ScrollView>

          <GlassView style={styles.statsContainer} glassEffectStyle='regular'>
            <View style={styles.tableHeader}>
              <Text style={[styles.headerText, { flex: 2 }]}>STATS</Text>
              <Text style={[styles.headerText, { flex: 1, textAlign: 'right' }]}>THIS WEEK</Text>
              <Text style={[styles.headerText, { flex: 1, textAlign: 'right' }]}>LAST WEEK</Text>
            </View>
            <View style={styles.divider} />

            {statList.map((item, idx) => (
              <View key={idx}>
                <View style={styles.statRow}>
                  <View style={{ flex: 2 }}>
                    <Text style={styles.statLabel}>{item.label}</Text>
                    <View style={styles.valGroup}>
                      <Text style={styles.statVal}>{item.val}</Text>
                      <Text style={styles.statUnit}>{item.unit}</Text>
                    </View>
                  </View>
                  <Text style={styles.trendText}>{item.tw}</Text>
                  <Text style={styles.trendText}>{item.lw}</Text>
                </View>
                {idx < statList.length - 1 && <View style={styles.divider} />}
              </View>
            ))}
          </GlassView>

          <View style={{ height: 120 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 20 },
  header: { marginBottom: 25 },
  dateText: { fontSize: 14, color: 'rgba(255,255,255,0.5)', fontWeight: '600' },
  pageTitle: { fontSize: 32, fontWeight: '900', color: '#fff', letterSpacing: -0.8 },
  trendsCard: { padding: 20, borderRadius: 35, marginBottom: 25, overflow: 'hidden', height: 240 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardLabel: { color: '#fff', fontSize: 19, fontWeight: '700' },
  chartArea: { height: 140, marginTop: 10 },
  daysRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  dayText: { fontSize: 10, color: 'rgba(255,255,255,0.3)', fontWeight: '700' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  sectionTitle: { color: '#fff', fontSize: 22, fontWeight: '700' },
  awardsScroll: { marginBottom: 30, paddingLeft: 10 },
  awardItem: { alignItems: 'center', marginRight: 30, gap: 8 },
  awardLabel: { color: '#fff', fontSize: 12, fontWeight: '600' },
  statsContainer: { padding: 20, borderRadius: 30, overflow: 'hidden' },
  tableHeader: { flexDirection: 'row', marginBottom: 10, paddingHorizontal: 5 },
  headerText: { color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  statRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 18 },
  statLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 15, fontWeight: '500', marginBottom: 2 },
  valGroup: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  statVal: { color: '#fff', fontSize: 20, fontWeight: '800' },
  statUnit: { color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: '800' },
  trendText: { flex: 1, color: '#4ADE80', fontSize: 13, fontWeight: '700', textAlign: 'right' },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.08)' }
});