import AsyncStorage from '@react-native-async-storage/async-storage'
import { DeviceEventEmitter } from 'react-native'
import { todayKey } from '../constants'
import { apiCall } from '../utils/api'
import { saveDailyGoals } from './aiGoalsStore'
import { HABITS } from '../constants'
import { getCardColor } from './habitHelpers'

const STORE_KEY = 'asuka-habits-v1'
export const ASUKA_HABITS_UPDATED = 'asuka-habits-updated'

export async function loadAsukaHabits() {
  try {
    const raw = await AsyncStorage.getItem(STORE_KEY)
    if (!raw) return { date: null, habits: [], insight: null, intent: null, adjustment: null }
    return JSON.parse(raw)
  } catch {
    return { date: null, habits: [], insight: null, intent: null, adjustment: null }
  }
}

async function persistAsukaHabits(pack) {
  await AsyncStorage.setItem(STORE_KEY, JSON.stringify(pack))
  DeviceEventEmitter.emit(ASUKA_HABITS_UPDATED, pack)
  import('./extrasSync').then((m) => m.pushExtrasSoon()).catch(() => {})
  return pack
}

function mapServerHabits(habits) {
  return (habits || []).map((h) => ({
    id: String(h.id || h.habitId || `asuka_${Date.now()}`),
    label: h.label || h.target || 'Habit',
    emoji: h.emoji || '✨',
    tip: h.tip || '',
    points: h.points || 15,
  }))
}

function asukaToGoals(habits) {
  return habits.map((h) => ({
    habitId: h.id,
    target: h.label,
    tip: h.tip,
    emoji: h.emoji,
    points: h.points,
  }))
}

function packFromResponse(json) {
  const habits = mapServerHabits(json.habits)
  return {
    date: todayKey(),
    habits,
    insight: json.insight || null,
    intent: json.intent || null,
    notification: json.notification || null,
    adjustment: json.adjustment || null,
  }
}

function vitalityPayload(history, steps, sleepHours) {
  const today = todayKey()
  return {
    completedToday: history?.[today] || [],
    steps: steps ?? undefined,
    sleepHours: sleepHours ?? undefined,
  }
}

/** Fetch today's plan from Asuka (server generates if stale). */
export async function renewAsukaHabits({ force = false } = {}) {
  const local = await loadAsukaHabits()
  if (!force && local.date === todayKey() && local.habits?.length) return local

  try {
    const res = await apiCall('/api/daily-habits')
    if (!res.ok) return local
    const json = await res.json()
    const pack = packFromResponse(json)
    await persistAsukaHabits(pack)
    if (pack.habits.length) {
      await saveDailyGoals({ goals: asukaToGoals(pack.habits), newHabit: null, insight: pack.insight })
    }
    return pack
  } catch (_e) {
    return local
  }
}

/** Retune when sleep/steps change — no habit completed. */
export async function adaptAsukaHabitsFromStats(history, steps, sleepHours) {
  try {
    const res = await apiCall('/api/adapt-habits', {
      method: 'POST',
      body: JSON.stringify(vitalityPayload(history, steps, sleepHours)),
    })
    if (!res.ok) return null
    const json = await res.json()
    const pack = packFromResponse(json)
    await persistAsukaHabits(pack)
    if (pack.habits.length) {
      await saveDailyGoals({ goals: asukaToGoals(pack.habits), insight: pack.insight })
    }
    return pack
  } catch {
    return null
  }
}

/** After completing a habit — Asuka retunes remaining targets (e.g. 2L→2.5L water). */
export async function notifyAsukaHabitComplete(habitId, { history, steps, sleepHours } = {}) {
  try {
    const res = await apiCall('/api/complete-habit', {
      method: 'POST',
      body: JSON.stringify({
        habitId,
        ...vitalityPayload(history, steps, sleepHours),
      }),
    })
    if (!res.ok) return null
    const json = await res.json()
    const pack = packFromResponse(json)
    await persistAsukaHabits(pack)
    if (pack.habits.length) {
      await saveDailyGoals({ goals: asukaToGoals(pack.habits), newHabit: json.newHabit || null, insight: pack.insight })
    }
    return pack
  } catch {
    return null
  }
}

let _adaptTimer = null
export function adaptAsukaSoon(history, steps, sleepHours, ms = 4000) {
  clearTimeout(_adaptTimer)
  _adaptTimer = setTimeout(() => {
    adaptAsukaHabitsFromStats(history, steps, sleepHours).catch(() => {})
  }, ms)
}

export function asukaHabitToRow(h) {
  const accent = getCardColor(h)
  return {
    id: String(h.id),
    label: h.label,
    shortLabel: h.label.split(' ').slice(0, 2).join(' '),
    emoji: h.emoji || '✨',
    description: h.tip || '',
    tip: h.tip || '',
    pts: h.points || 15,
    accent,
    fromAsuka: true,
  }
}

export function buildHabitList(asukaPack, customHabits = []) {
  const asuka = (asukaPack?.habits || []).map(asukaHabitToRow)
  const custom = (customHabits || []).map((c) => ({
    id: c.id,
    label: c.label,
    shortLabel: c.label,
    emoji: c.emoji || '✦',
    description: c.description || '',
    tip: c.description || '',
    pts: 10,
    accent: c.color || getCardColor(c),
    custom: true,
  }))
  const combined = [...asuka, ...custom]
  if (combined.length) return combined
  return HABITS.slice(0, 5).map((h) => ({
    ...h,
    tip: h.science,
    accent: getCardColor(h),
    description: h.science,
  }))
}
