import AsyncStorage from '@react-native-async-storage/async-storage'
import { todayKey } from '../constants'
import { apiCall } from '../utils/api'

const STORE_KEY = 'ai-goals-v1'

export function goalsToCloudPayload(daily) {
  if (!daily?.date) return null
  const goals = (daily.goals || []).map((g) => ({
    id: g.habitId || g.id,
    habitId: g.habitId || g.id,
    label: g.target || g.label,
    target: g.target || g.label,
    tip: g.tip || '',
    emoji: g.emoji || '✨',
    points: g.points || 10,
  }))
  return {
    aiGoals: goals,
    aiGoalsDate: daily.date,
    aiNewHabit: daily.newHabit || null,
    aiInsight: daily.insight || null,
  }
}

export function cloudToDailyGoals(server) {
  if (!server?.aiGoalsDate || server.aiGoalsDate !== todayKey()) {
    return { date: null, goals: [], newHabit: null, insight: null }
  }
  const goals = (server.aiGoals || []).map((g) => ({
    habitId: g.habitId || String(g.id || '').replace(/_.*$/, '') || g.id,
    target: g.target || g.label || '',
    tip: g.tip || '',
    emoji: g.emoji,
    points: g.points,
  }))
  return {
    date: server.aiGoalsDate,
    goals,
    newHabit: server.aiNewHabit || null,
    insight: server.aiInsight || null,
  }
}

export async function mergeCoachFromServer(serverData) {
  if (!serverData?.aiGoalsDate) return null
  const cloud = cloudToDailyGoals(serverData)
  if (!cloud.date) return null
  const local = await loadDailyGoals()
  if (local.date === cloud.date && (local.goals?.length || 0) >= (cloud.goals?.length || 0)) {
    return local
  }
  await AsyncStorage.setItem(STORE_KEY, JSON.stringify(cloud))
  return cloud
}

export async function pushCoachToCloud(daily) {
  const payload = goalsToCloudPayload(daily || await loadDailyGoals())
  if (!payload) return false
  try {
    const res = await apiCall('/api/sync', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    return res.ok
  } catch (_e) {
    return false
  }
}

async function migrateLegacy() {
  const today = todayKey()
  const legacyDate = await AsyncStorage.getItem('ai-goals-date')
  if (legacyDate !== today) return null
  const [goalsRaw, habitRaw] = await AsyncStorage.multiGet(['ai-goals', 'ai-new-habit'])
  const goals = goalsRaw[1] ? JSON.parse(goalsRaw[1]) : []
  const newHabit = habitRaw[1] ? JSON.parse(habitRaw[1]) : null
  if (!goals.length && !newHabit) return null
  const payload = { date: today, goals, newHabit, insight: null }
  await AsyncStorage.setItem(STORE_KEY, JSON.stringify(payload))
  await AsyncStorage.multiRemove(['ai-goals', 'ai-goals-date', 'ai-new-habit'])
  return payload
}

export async function loadDailyGoals() {
  try {
    const raw = await AsyncStorage.getItem(STORE_KEY)
    if (raw) {
      const data = JSON.parse(raw)
      if (data.date === todayKey()) return data
      return { date: null, goals: [], newHabit: null, insight: null }
    }
    const migrated = await migrateLegacy()
    if (migrated) return migrated
  } catch {}
  return { date: null, goals: [], newHabit: null, insight: null }
}

export async function saveDailyGoals(parsed) {
  const payload = {
    date: todayKey(),
    goals: Array.isArray(parsed.goals) ? parsed.goals : [],
    newHabit: parsed.newHabit || null,
    insight: parsed.insight || null,
  }
  await AsyncStorage.setItem(STORE_KEY, JSON.stringify(payload))
  await AsyncStorage.multiRemove(['ai-goals', 'ai-goals-date', 'ai-new-habit'])
  pushCoachToCloud(payload).catch(() => {})
  return payload
}

export function getGoalForHabit(goals, habitId) {
  if (!Array.isArray(goals)) return null
  return goals.find((g) => String(g.habitId || g.id) === String(habitId)) || null
}

export function bonusHabitToRow(newHabit) {
  if (!newHabit?.label) return null
  const id = String(newHabit.id || `bonus_${todayKey()}`)
  return {
    id,
    label: newHabit.label,
    emoji: newHabit.emoji || '✨',
    tip: newHabit.tip || 'Suggested by your coach for today',
    pts: Number(newHabit.points) || 10,
    shortLabel: newHabit.label.split(' ').slice(0, 2).join(' '),
    color: '#6c5ce7',
    isBonus: true,
  }
}
