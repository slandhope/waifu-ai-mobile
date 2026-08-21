import { Feather } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  DeviceEventEmitter,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import AddHabitModal from '../components/habits/AddHabitModal'
import HabitCard from '../components/habits/HabitCard'
import GymTabPanel from '../components/gym/GymTabPanel'
import GlassSurface from '../components/GlassSurface'
import TabScreenShell from '../components/TabScreenShell'
import { HABITS, MILESTONES, todayKey } from '../constants'
import { useWaifuState } from '../context/WaifuStateContext'
import { useFitness } from '../context/FitnessContext'
import { buildHabitList, notifyAsukaHabitComplete, renewAsukaHabits, ASUKA_HABITS_UPDATED } from '../lib/asukaHabits'
import { addCustomHabit, loadCustomHabits } from '../lib/customHabitsStore'
import { formatHabitsHeaderDate } from '../lib/habitHelpers'
import {
  canRewardHabit,
  canRewardMilestone,
  canRewardPerfectDay,
  loadTodayRewards,
  saveTodayRewards,
} from '../lib/habitRewards'
import { rewardHabitCompletion } from '../lib/waifuCare'
import { SYNC_EXTRAS_APPLIED } from '../lib/extrasSync'

const TABS = [
  { key: 'gym', label: 'Gym' },
  { key: 'habits', label: 'Habits' },
]

async function applyHabitReward({
  care, updateCare, habit, state, streak, seenMilestones, markMilestoneSeen, todayHabits,
}) {
  const perfectDay = HABITS.every((h) => todayHabits.includes(h.id))
  const givePerfect = perfectDay && canRewardPerfectDay(state)
  const newMilestone = MILESTONES.find(
    (m) => streak >= m && !seenMilestones.includes(m) && canRewardMilestone(state, m)
  )
  const { care: nextCare, message, coins } = rewardHabitCompletion(care, {
    pts: habit.pts || 10,
    perfectDay: givePerfect,
    milestone: newMilestone,
    label: habit.shortLabel || habit.label,
  })
  const nextState = {
    ...state,
    date: todayKey(),
    habitIds: [...state.habitIds, habit.id],
    perfectDay: state.perfectDay || givePerfect,
    milestones: newMilestone ? [...state.milestones, newMilestone] : state.milestones,
  }
  await saveTodayRewards(nextState)
  updateCare(nextCare, { push: true })
  if (newMilestone && markMilestoneSeen) markMilestoneSeen(newMilestone)
  return { nextState, message: message || `+${coins} coins!` }
}

export default function HabitsScreen({ data, wallpaper, navigation, route }) {
  const insets = useSafeAreaInsets()
  const initialTab = route.params?.tab === 'habits' ? 'habits' : 'gym'
  const [tab, setTab] = useState(initialTab)
  const {
    history = {},
    toggleHabit,
    streak = 0,
    seenMilestones = [],
    markMilestoneSeen,
  } = data || {}
  const { care, updateCare } = useWaifuState()
  const { steps, sleepHours } = useFitness()
  const [asukaPack, setAsukaPack] = useState({ habits: [], insight: null, adjustment: null })
  const [customHabits, setCustomHabits] = useState([])
  const [showAdd, setShowAdd] = useState(false)
  const [rewardState, setRewardState] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    if (route.params?.tab) setTab(route.params.tab === 'habits' ? 'habits' : 'gym')
  }, [route.params?.tab])

  const refreshAll = useCallback(async (force = false) => {
    const [pack, custom] = await Promise.all([
      renewAsukaHabits({ force }),
      loadCustomHabits(),
    ])
    setAsukaPack(pack)
    setCustomHabits(custom)
    return pack
  }, [])

  useEffect(() => {
    refreshAll().finally(() => setLoading(false))
    loadTodayRewards().then(setRewardState)
    const sub = DeviceEventEmitter.addListener(SYNC_EXTRAS_APPLIED, () => refreshAll())
    const sub2 = DeviceEventEmitter.addListener(ASUKA_HABITS_UPDATED, (pack) => setAsukaPack(pack))
    return () => { sub.remove(); sub2.remove() }
  }, [refreshAll])

  const habits = buildHabitList(asukaPack, customHabits)
  const doneToday = habits.filter((h) => (history[todayKey()] || []).includes(h.id)).length
  const progressPct = habits.length ? (doneToday / habits.length) * 100 : 0

  async function handleToggleToday(habit) {
    const wasDone = (history[todayKey()] || []).includes(habit.id)
    const next = toggleHabit(habit.id)

    if (!wasDone && next?.includes(habit.id)) {
      if (care) {
        const state = rewardState || (await loadTodayRewards())
        if (canRewardHabit(state, habit.id)) {
          const result = await applyHabitReward({
            care, updateCare, habit, state, streak, seenMilestones, markMilestoneSeen,
            todayHabits: next,
          })
          setRewardState(result.nextState)
        }
      }
      if (habit.fromAsuka) {
        const updated = await notifyAsukaHabitComplete(habit.id, {
          history: { ...history, [todayKey()]: next },
          steps,
          sleepHours,
        })
        if (updated) setAsukaPack(updated)
      }
    }
  }

  async function onRefreshHabits() {
    setRefreshing(true)
    await refreshAll(true)
    setRefreshing(false)
  }

  function switchTab(next) {
    if (next === tab) return
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setTab(next)
  }

  return (
    <TabScreenShell wallpaper={wallpaper}>
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
            <Feather name="arrow-left" size={22} color="#1a1a1a" />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.title}>Habits & Gym</Text>
            <Text style={styles.date}>
              {tab === 'habits' ? formatHabitsHeaderDate() : 'Asuka plans · you log sets'}
            </Text>
          </View>
          {tab === 'habits' ? (
            <>
              <TouchableOpacity style={styles.iconBtn} onPress={onRefreshHabits} disabled={refreshing}>
                <Feather name="refresh-cw" size={20} color={refreshing ? 'rgba(0,0,0,0.2)' : '#1a1a1a'} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconBtn} onPress={() => setShowAdd(true)}>
                <Feather name="plus" size={22} color="#1a1a1a" />
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.iconSpacer} />
          )}
        </View>

        <View style={styles.tabRow}>
          {TABS.map((t) => {
            const active = tab === t.key
            return (
              <TouchableOpacity
                key={t.key}
                style={[styles.tabBtn, active && styles.tabBtnActive]}
                onPress={() => switchTab(t.key)}
                activeOpacity={0.85}
              >
                <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{t.label}</Text>
              </TouchableOpacity>
            )
          })}
        </View>

        {tab === 'gym' ? (
          <GymTabPanel
            navigation={navigation}
            refreshing={refreshing}
            onRefreshingChange={setRefreshing}
          />
        ) : loading ? (
          <ActivityIndicator color="#6c5ce7" style={{ marginTop: 48 }} />
        ) : (
          <>
            <GlassSurface borderRadius={20} style={styles.progressCard}>
              <View style={styles.progressTop}>
                <Text style={styles.progressVal}>{doneToday}/{habits.length}</Text>
                <Text style={styles.progressLabel}>completed today</Text>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
              </View>
              {!!asukaPack.insight && (
                <Text style={styles.insight}>✦ {asukaPack.insight}</Text>
              )}
              {!!asukaPack.adjustment && (
                <Text style={styles.adjustment}>↻ {asukaPack.adjustment}</Text>
              )}
            </GlassSurface>

            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefreshHabits} tintColor="#6c5ce7" />
              }
            >
              <Text style={styles.sectionHint}>Tap the row to check off today · chevron for history</Text>
              {habits.length === 0 && (
                <Text style={styles.emptyText}>Asuka is building your list… pull down to refresh.</Text>
              )}
              {habits.map((habit) => (
                <HabitCard
                  key={habit.id}
                  habit={habit}
                  history={history}
                  onToggleToday={() => handleToggleToday(habit)}
                  onPress={() => navigation.navigate('HabitDetail', { habitId: habit.id })}
                />
              ))}
              <View style={{ height: 100 }} />
            </ScrollView>
          </>
        )}
      </View>

      <AddHabitModal
        visible={showAdd}
        onClose={() => setShowAdd(false)}
        onSave={async (p) => {
          await addCustomHabit(p)
          setCustomHabits(await loadCustomHabits())
        }}
      />
    </TabScreenShell>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingBottom: 10,
    gap: 6,
  },
  headerText: { flex: 1, paddingHorizontal: 4 },
  title: { fontSize: 20, fontWeight: '800', color: '#1a1a1a' },
  date: { fontSize: 12, color: 'rgba(0,0,0,0.45)', marginTop: 1 },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  iconSpacer: { width: 40 },
  tabRow: {
    flexDirection: 'row',
    marginHorizontal: 18,
    marginBottom: 14,
    padding: 4,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.45)',
    gap: 4,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 11,
    alignItems: 'center',
  },
  tabBtnActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  tabLabel: { fontSize: 14, fontWeight: '600', color: 'rgba(0,0,0,0.4)' },
  tabLabelActive: { color: '#1a1a1a', fontWeight: '800' },
  progressCard: { marginHorizontal: 18, marginBottom: 14, padding: 18 },
  progressTop: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 10 },
  progressVal: { fontSize: 28, fontWeight: '800', color: '#1a1a1a' },
  progressLabel: { fontSize: 13, color: 'rgba(0,0,0,0.45)', fontWeight: '600' },
  progressTrack: {
    height: 8,
    backgroundColor: 'rgba(0,0,0,0.06)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: '#6c5ce7', borderRadius: 4 },
  insight: { fontSize: 13, color: '#1a1a1a', lineHeight: 19, marginTop: 14 },
  adjustment: { fontSize: 12, color: '#6c5ce7', lineHeight: 17, marginTop: 8, fontWeight: '600' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 18 },
  sectionHint: {
    fontSize: 11,
    color: 'rgba(0,0,0,0.35)',
    marginBottom: 10,
    fontWeight: '500',
  },
  emptyText: { fontSize: 14, color: 'rgba(0,0,0,0.4)', textAlign: 'center', marginTop: 24 },
})
