import AsyncStorage from '@react-native-async-storage/async-storage'
import { todayKey } from '../constants'

const REWARD_KEY = 'habit-rewards-day-v1'

export async function loadTodayRewards() {
  try {
    const raw = await AsyncStorage.getItem(REWARD_KEY)
    const today = todayKey()
    if (!raw) return { date: today, habitIds: [], perfectDay: false, milestones: [] }
    const parsed = JSON.parse(raw)
    if (parsed.date !== today) return { date: today, habitIds: [], perfectDay: false, milestones: [] }
    return {
      date: today,
      habitIds: parsed.habitIds || [],
      perfectDay: !!parsed.perfectDay,
      milestones: parsed.milestones || [],
    }
  } catch {
    return { date: todayKey(), habitIds: [], perfectDay: false, milestones: [] }
  }
}

export async function saveTodayRewards(state) {
  try {
    await AsyncStorage.setItem(REWARD_KEY, JSON.stringify(state))
  } catch {}
}

export function canRewardHabit(state, habitId) {
  return !state.habitIds.includes(habitId)
}

export function canRewardPerfectDay(state) {
  return !state.perfectDay
}

export function canRewardMilestone(state, milestone) {
  return !state.milestones.includes(milestone)
}
