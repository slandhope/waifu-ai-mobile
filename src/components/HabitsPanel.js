import { Feather } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { useEffect, useState } from 'react'
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { calcScore, HABITS, MILESTONES, todayKey } from '../constants'
import { useFitness } from '../context/FitnessContext'
import { useWaifuState } from '../context/WaifuStateContext'
import {
  canRewardHabit,
  canRewardMilestone,
  canRewardPerfectDay,
  loadTodayRewards,
  saveTodayRewards,
} from '../lib/habitRewards'
import { rewardHabitCompletion } from '../lib/waifuCare'
import { bonusHabitToRow, getGoalForHabit, loadDailyGoals } from '../lib/aiGoalsStore'
import { apiCall } from '../utils/api'

async function applyHabitReward({
  care,
  updateCare,
  habit,
  state,
  streak,
  seenMilestones,
  markMilestoneSeen,
  todayHabits,
  options = {},
}) {
  const perfectDay = options.perfectDay ?? HABITS.every((h) => todayHabits.includes(h.id))
  const givePerfect = perfectDay && canRewardPerfectDay(state)
  const newMilestone = MILESTONES.find(
    (m) => streak >= m && !seenMilestones.includes(m) && canRewardMilestone(state, m)
  )

  const { care: nextCare, message, coins } = rewardHabitCompletion(care, {
    pts: habit.pts,
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
  return { nextState, nextCare, message: message || `+${coins} coins!` }
}

export default function HabitsPanel({ data, onRewardMessage, active = true }) {
  const {
    todayHabits = [],
    streak = 0,
    toggleHabit,
    markMilestoneSeen,
    seenMilestones = [],
  } = data || {}
  const { care, updateCare } = useWaifuState()
  const { steps, sleepHours, connected } = useFitness()
  const [insight, setInsight] = useState(null)
  const [loadingInsight, setLoadingInsight] = useState(false)
  const [rewardState, setRewardState] = useState(null)
  const [coachGoals, setCoachGoals] = useState([])
  const [bonusHabit, setBonusHabit] = useState(null)

  const bonusRow = bonusHabitToRow(bonusHabit)
  const displayHabits = bonusRow ? [bonusRow, ...HABITS] : HABITS
  const totalHabitCount = HABITS.length + (bonusRow ? 1 : 0)
  const allDone = displayHabits.every((h) => todayHabits.includes(h.id))
  const score = calcScore(todayHabits)
  const doneCount = displayHabits.filter((h) => todayHabits.includes(h.id)).length

  useEffect(() => {
    loadDailyGoals().then((daily) => {
      setCoachGoals(daily.goals || [])
      setBonusHabit(daily.newHabit)
      if (daily.insight) setInsight(daily.insight)
    })
    loadTodayRewards().then(setRewardState)
  }, [])

  useEffect(() => {
    if (!active || !care || !updateCare) return
    let cancelled = false
    ;(async () => {
      let state = await loadTodayRewards()
      let currentCare = care
      let lastMessage = null
      for (const habit of displayHabits) {
        if (cancelled) break
        if (!todayHabits.includes(habit.id) || !canRewardHabit(state, habit.id)) continue
        const result = await applyHabitReward({
          care: currentCare,
          updateCare,
          habit,
          state,
          streak,
          seenMilestones,
          markMilestoneSeen,
          todayHabits,
        })
        state = result.nextState
        currentCare = result.nextCare
        lastMessage = result.message
      }
      if (cancelled) return
      setRewardState(state)
      if (lastMessage) onRewardMessage?.(lastMessage)
    })()
    return () => { cancelled = true }
  }, [active, todayHabits, streak, seenMilestones, markMilestoneSeen, updateCare, onRewardMessage, care, bonusHabit])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoadingInsight(true)
      try {
        const res = await apiCall('/api/daily-habits')
        if (res.ok) {
          const json = await res.json()
          if (!cancelled && json.insight) {
            setInsight((prev) => prev || json.insight)
          }
        }
      } catch {}
      if (!cancelled) setLoadingInsight(false)
    })()
    return () => { cancelled = true }
  }, [])

  async function handleToggle(habit) {
    if (!toggleHabit || !care) return
    const wasDone = todayHabits.includes(habit.id)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    const next = toggleHabit(habit.id)
    if (wasDone || !next.includes(habit.id)) return

    let state = rewardState || (await loadTodayRewards())
    if (!canRewardHabit(state, habit.id)) return

    const result = await applyHabitReward({
      care,
      updateCare,
      habit,
      state,
      streak,
      seenMilestones,
      markMilestoneSeen,
      todayHabits: next,
    })
    setRewardState(result.nextState)
    onRewardMessage?.(result.message)
  }

  if (!care) {
    return (
      <View style={styles.wrap}>
        <ActivityIndicator color="#6c5ce7" style={{ marginVertical: 32 }} />
        <Text style={styles.renewNote}>Loading rewards…</Text>
      </View>
    )
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.summaryRow}>
        <View style={styles.summaryPill}>
          <Text style={styles.summaryVal}>{score}</Text>
          <Text style={styles.summaryLabel}>Score</Text>
        </View>
        <View style={styles.summaryPill}>
          <Text style={styles.summaryVal}>{streak}d</Text>
          <Text style={styles.summaryLabel}>Streak</Text>
        </View>
        <View style={styles.summaryPill}>
          <Text style={styles.summaryVal}>{doneCount}/{totalHabitCount}</Text>
          <Text style={styles.summaryLabel}>Today</Text>
        </View>
        <View style={styles.summaryPill}>
          <Text style={styles.summaryVal}>{care?.coins ?? 0}</Text>
          <Text style={styles.summaryLabel}>🪙 Coins</Text>
        </View>
      </View>

      <Text style={styles.renewNote}>Fresh list every day · resets at midnight</Text>

      {connected && (
        <Text style={styles.healthHint}>
          {steps.toLocaleString()} steps · {sleepHours.toFixed(1)}h sleep — auto-tracks exercise & sleep
        </Text>
      )}

      {(insight || loadingInsight) && (
        <View style={styles.insightBox}>
          {loadingInsight ? (
            <ActivityIndicator size="small" color="#6c5ce7" />
          ) : (
            <Text style={styles.insightText}>✦ {insight}</Text>
          )}
        </View>
      )}

      {coachGoals.length > 0 && (
        <Text style={styles.coachBadge}>🎯 Coach personalized {coachGoals.length} focus areas today</Text>
      )}

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${totalHabitCount ? (doneCount / totalHabitCount) * 100 : 0}%` }]} />
      </View>

      <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
        {displayHabits.map((habit) => {
          const done = todayHabits.includes(habit.id)
          const coachGoal = habit.isBonus ? null : getGoalForHabit(coachGoals, habit.id)
          const tipText = coachGoal?.tip || coachGoal?.target || habit.tip || habit.science
          return (
            <TouchableOpacity
              key={habit.id}
              style={[styles.habitRow, done && styles.habitRowDone, habit.isBonus && styles.bonusRow]}
              onPress={() => handleToggle(habit)}
              activeOpacity={0.85}
            >
              <View style={[styles.check, done && { backgroundColor: habit.color, borderColor: habit.color }]}>
                {done && <Feather name="check" size={14} color="#fff" />}
              </View>
              <Text style={styles.habitEmoji}>{habit.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.habitLabel, done && styles.habitLabelDone]}>
                  {habit.isBonus ? `✦ ${habit.label}` : habit.label}
                </Text>
                <Text style={[styles.habitTip, coachGoal && styles.coachTip]} numberOfLines={2}>{tipText}</Text>
              </View>
              <Text style={styles.habitPts}>+{Math.max(5, Math.round((habit.pts || 10) / 2))}🪙</Text>
            </TouchableOpacity>
          )
        })}
      </ScrollView>

      <View style={styles.rewardsBox}>
        <Text style={styles.rewardsTitle}>Daily rewards</Text>
        <Text style={styles.rewardsLine}>• Each habit → coins + bond XP</Text>
        <Text style={styles.rewardsLine}>• All {HABITS.length} core habits → +50🪙 perfect-day bonus</Text>
        <Text style={styles.rewardsLine}>• Streak milestones ({MILESTONES.join(', ')}d) → bonus coins</Text>
        {allDone && <Text style={styles.perfectBanner}>🌟 Perfect day! Come back tomorrow for a fresh list.</Text>}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  summaryRow: { flexDirection: 'row', gap: 8 },
  summaryPill: {
    flex: 1,
    backgroundColor: 'rgba(108,92,231,0.08)',
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: 'center',
  },
  summaryVal: { fontSize: 16, fontWeight: '800', color: '#1a1a1a' },
  summaryLabel: { fontSize: 10, color: 'rgba(0,0,0,0.45)', marginTop: 2, fontWeight: '600' },
  renewNote: { fontSize: 12, color: 'rgba(0,0,0,0.45)', fontWeight: '600', textAlign: 'center' },
  coachBadge: { fontSize: 12, color: '#6c5ce7', fontWeight: '700', textAlign: 'center' },
  bonusRow: { backgroundColor: 'rgba(108,92,231,0.06)', borderRadius: 12 },
  coachTip: { color: '#6c5ce7', fontWeight: '600' },
  healthHint: { fontSize: 11, color: '#6c5ce7', textAlign: 'center', fontWeight: '600' },
  insightBox: {
    backgroundColor: 'rgba(108,92,231,0.1)',
    borderRadius: 14,
    padding: 12,
  },
  insightText: { fontSize: 13, color: '#1a1a1a', lineHeight: 19 },
  progressTrack: {
    height: 6,
    backgroundColor: 'rgba(0,0,0,0.08)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: '#6c5ce7', borderRadius: 3 },
  habitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  habitRowDone: { opacity: 0.85 },
  check: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  habitEmoji: { fontSize: 22 },
  habitLabel: { fontSize: 14, fontWeight: '700', color: '#1a1a1a' },
  habitLabelDone: { textDecorationLine: 'line-through', color: 'rgba(0,0,0,0.45)' },
  habitTip: { fontSize: 11, color: 'rgba(0,0,0,0.4)', marginTop: 2 },
  habitPts: { fontSize: 12, fontWeight: '700', color: '#c9a227' },
  rewardsBox: {
    marginTop: 8,
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.04)',
    borderRadius: 14,
  },
  rewardsTitle: { fontSize: 13, fontWeight: '800', color: '#1a1a1a', marginBottom: 6 },
  rewardsLine: { fontSize: 12, color: 'rgba(0,0,0,0.55)', lineHeight: 18 },
  perfectBanner: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: '700',
    color: '#6c5ce7',
    textAlign: 'center',
  },
})
