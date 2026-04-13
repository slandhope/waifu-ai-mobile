import { useNavigation } from '@react-navigation/native'
import * as Haptics from 'expo-haptics'
import { LinearGradient } from 'expo-linear-gradient'
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFitnessData } from '../hooks/useFitnessData'
import { useTheme } from '../hooks/useTheme'

const IOS_SOURCES = [
  { name: 'Apple Health', icon: '❤️', bg: '#ff4444', sub: 'Steps, sleep, workouts' },
  { name: 'Apple Watch', icon: '⌚', bg: '#1a1a1a', sub: 'Via Apple Health' },
  { name: 'Fitbit', icon: '🔵', bg: '#00b0b9', sub: 'Via Apple Health' },
  { name: 'Garmin', icon: '🏃', bg: '#006ef5', sub: 'Via Apple Health' },
  { name: 'Whoop', icon: '⚫', bg: '#1a1a1a', sub: 'Via Apple Health' },
  { name: 'Oura Ring', icon: '💍', bg: '#2d2d2d', sub: 'Via Apple Health' },
]

const ANDROID_SOURCES = [
  { name: 'Google Fit', icon: '🟢', bg: '#4285f4', sub: 'Steps, sleep, workouts' },
  { name: 'Health Connect', icon: '❤️', bg: '#ea4335', sub: 'Android health hub' },
  { name: 'Fitbit', icon: '🔵', bg: '#00b0b9', sub: 'Via Google Fit' },
  { name: 'Garmin', icon: '🏃', bg: '#006ef5', sub: 'Via Google Fit' },
  { name: 'Whoop', icon: '⚫', bg: '#1a1a1a', sub: 'Via Google Fit' },
  { name: 'Oura Ring', icon: '💍', bg: '#2d2d2d', sub: 'Via Google Fit' },
]

const AUTO_HABITS = [
  { habit: '🌙 Sleep 8hrs', source: 'Sleep data', threshold: '7+ hours detected' },
  { habit: '💪 Exercise 30m', source: 'Workout data', threshold: '30+ min workout' },
  { habit: '🚶 Steps goal', source: 'Step count', threshold: '8,000+ steps' },
]

export default function FitnessScreen({ data }) {
  const { colors, accent } = useTheme()
  const navigation = useNavigation()
  const { connected, steps, sleepHours, activeMinutes, isExpoGo, connectFitness } = useFitnessData(
    data?.toggleHabit,
    data?.todayHabits || []
  )

  const sources = Platform.OS === 'ios' ? IOS_SOURCES : ANDROID_SOURCES
  const primarySource = Platform.OS === 'ios' ? 'Apple Health' : 'Google Fit'

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Text style={[styles.backBtn, { color: accent.primary }]}>← Back</Text>
          </TouchableOpacity>
          <Text style={[styles.pageTitle, { color: colors.text }]}>Connect Fitness</Text>
          <View style={{ width: 60 }} />
        </View>

        {/* status card */}
        {connected ? (
          <View style={[styles.statusCard, { backgroundColor: 'rgba(52,211,153,0.1)', borderColor: 'rgba(52,211,153,0.3)' }]}>
            <Text style={styles.statusIcon}>✅</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.statusTitle, { color: '#34d399' }]}>Connected!</Text>
              <Text style={[styles.statusSub, { color: colors.textMuted }]}>
                {steps} steps · {sleepHours}hrs sleep · {activeMinutes}min active
              </Text>
            </View>
          </View>
        ) : (
          <View style={[styles.infoBanner, { backgroundColor: accent.glow, borderColor: accent.primary + '40' }]}>
            <Text style={styles.infoIcon}>✨</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.infoTitle, { color: accent.primary }]}>Auto-track your habits</Text>
              <Text style={[styles.infoSub, { color: colors.textMuted }]}>
                Connect your fitness app and Clarity will automatically check off habits based on your real activity data
              </Text>
            </View>
          </View>
        )}

        {/* sources */}
        <Text style={[styles.sectionLabel, { color: colors.textFaint }]}>
          {Platform.OS === 'ios' ? 'IOS' : 'ANDROID'}
        </Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {sources.map((s, i) => (
            <TouchableOpacity
              key={s.name}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                connectFitness()
              }}
              style={[styles.row, i < sources.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}
              activeOpacity={0.7}
            >
              <View style={[styles.rowIcon, { backgroundColor: s.bg }]}>
                <Text style={styles.rowIconText}>{s.icon}</Text>
              </View>
              <View style={styles.rowInfo}>
                <Text style={[styles.rowName, { color: colors.text }]}>{s.name}</Text>
                <Text style={[styles.rowSub, { color: colors.textFaint }]}>{s.sub}</Text>
              </View>
              <View style={[styles.connectBadge, { backgroundColor: connected ? 'rgba(52,211,153,0.15)' : accent.glow }]}>
                <Text style={[styles.connectText, { color: connected ? '#34d399' : accent.primary }]}>
                  {connected ? 'Connected' : 'Connect'}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* auto track */}
        <Text style={[styles.sectionLabel, { color: colors.textFaint }]}>AUTO-TRACKED HABITS</Text>
        <View style={[styles.autoCard, { backgroundColor: accent.glow, borderColor: accent.primary + '30' }]}>
          <Text style={[styles.autoCardTitle, { color: accent.primary }]}>
            When connected these habits auto-check ✓
          </Text>
          {AUTO_HABITS.map((h, i) => (
            <View key={i} style={styles.autoRow}>
              <View>
                <Text style={[styles.autoHabit, { color: colors.text }]}>{h.habit}</Text>
                <Text style={[styles.autoThreshold, { color: colors.textFaint }]}>{h.threshold}</Text>
              </View>
              <Text style={[styles.autoSource, { color: colors.textFaint }]}>{h.source}</Text>
            </View>
          ))}
        </View>

        {/* coming soon */}
        {isExpoGo && (
          <View style={[styles.comingSoon, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={styles.comingSoonIcon}>🔧</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.comingSoonTitle, { color: colors.text }]}>Coming in full release</Text>
              <Text style={[styles.comingSoonSub, { color: colors.textFaint }]}>
                Fitness integration will be fully active when Clarity launches on the App Store.
              </Text>
            </View>
          </View>
        )}

        {/* cta */}
        <TouchableOpacity onPress={connectFitness} style={styles.ctaBtn} activeOpacity={0.8}>
          <LinearGradient colors={accent.gradient} start={{x:0,y:0}} end={{x:1,y:0}} style={styles.ctaInner}>
            <Text style={styles.ctaText}>
              {connected ? '✓ Connected' : `Connect ${primarySource} →`}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { paddingHorizontal: 20 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 16, marginBottom: 20 },
  backBtn: { fontSize: 15, fontWeight: '500' },
  pageTitle: { fontSize: 17, fontWeight: '600' },
  statusCard: { flexDirection: 'row', gap: 12, borderRadius: 16, padding: 14, marginBottom: 24, borderWidth: 1, alignItems: 'center' },
  statusIcon: { fontSize: 24 },
  statusTitle: { fontSize: 14, fontWeight: '600' },
  statusSub: { fontSize: 11, marginTop: 2 },
  infoBanner: { flexDirection: 'row', gap: 12, borderRadius: 16, padding: 14, marginBottom: 24, borderWidth: 1 },
  infoIcon: { fontSize: 20 },
  infoTitle: { fontSize: 13, fontWeight: '600', marginBottom: 4 },
  infoSub: { fontSize: 11, lineHeight: 16 },
  sectionLabel: { fontSize: 10, letterSpacing: 1.5, marginBottom: 8, marginLeft: 4 },
  card: { borderRadius: 16, borderWidth: 1, overflow: 'hidden', marginBottom: 24 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  rowIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rowIconText: { fontSize: 18 },
  rowInfo: { flex: 1 },
  rowName: { fontSize: 14, fontWeight: '500' },
  rowSub: { fontSize: 11, marginTop: 2 },
  connectBadge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  connectText: { fontSize: 11, fontWeight: '600' },
  autoCard: { borderRadius: 16, padding: 14, borderWidth: 1, marginBottom: 16 },
  autoCardTitle: { fontSize: 12, fontWeight: '500', marginBottom: 12 },
  autoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  autoHabit: { fontSize: 13 },
  autoThreshold: { fontSize: 10, marginTop: 2 },
  autoSource: { fontSize: 11 },
  comingSoon: { flexDirection: 'row', gap: 12, borderRadius: 16, padding: 14, marginBottom: 16, borderWidth: 1 },
  comingSoonIcon: { fontSize: 20 },
  comingSoonTitle: { fontSize: 13, fontWeight: '600', marginBottom: 4 },
  comingSoonSub: { fontSize: 11, lineHeight: 16 },
  ctaBtn: { borderRadius: 14, overflow: 'hidden' },
  ctaInner: { paddingVertical: 16, alignItems: 'center' },
  ctaText: { color: '#fff', fontWeight: '600', fontSize: 15 },
})