import AsyncStorage from '@react-native-async-storage/async-storage'
import { DeviceEventEmitter } from 'react-native'
import { localDateKey } from '../constants'
import { apiCall } from '../utils/api'
import { loadSessions, summarizeSessionsForAsuka } from './gymStore'
import { pushExtrasSoon } from './extrasSync'

const PLAN_KEY = 'gym-plan-v1'
export const GYM_PLAN_UPDATED = 'gym-plan-updated'

export async function loadCachedPlan() {
  try {
    const raw = await AsyncStorage.getItem(PLAN_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

async function cachePlan(plan) {
  await AsyncStorage.setItem(PLAN_KEY, JSON.stringify(plan))
  DeviceEventEmitter.emit(GYM_PLAN_UPDATED, plan)
  pushExtrasSoon()
  return plan
}

/** Asuka builds today's workout from your history + sleep/steps. */
export async function fetchGymPlan({ sleepHours, steps, force = false } = {}) {
  const cached = await loadCachedPlan()
  if (!force && cached?.date === localDateKey() && cached?.exercises?.length) {
    return cached
  }

  const sessions = await loadSessions()
  const recentSessions = summarizeSessionsForAsuka(sessions, 6)

  try {
    const res = await apiCall('/api/gym-plan', {
      method: 'POST',
      body: JSON.stringify({ recentSessions, sleepHours, steps }),
    })
    if (!res.ok) return cached || defaultPlan()
    const json = await res.json()
    const plan = {
      date: localDateKey(),
      split: json.split || 'Full Body',
      insight: json.insight || '',
      adjustment: json.adjustment || '',
      exercises: (json.exercises || []).map((e) => ({
        name: e.name || 'Exercise',
        targetSets: e.targetSets || e.sets || 3,
        targetReps: e.targetReps || e.reps || '8-10',
        suggestedWeight: e.suggestedWeight || e.weight || '',
        tip: e.tip || '',
      })),
    }
    return cachePlan(plan)
  } catch {
    return cached || defaultPlan()
  }
}

function defaultPlan() {
  return {
    date: localDateKey(),
    split: 'Starter workout',
    insight: 'Log your sets — Asuka will personalize next time you are signed in.',
    exercises: [
      { name: 'Squat', targetSets: 3, targetReps: '8-10', suggestedWeight: '', tip: 'Warm up first' },
      { name: 'Bench Press', targetSets: 3, targetReps: '8-10', suggestedWeight: '', tip: 'Control the descent' },
      { name: 'Row', targetSets: 3, targetReps: '10-12', suggestedWeight: '', tip: 'Squeeze at the top' },
    ],
  }
}

export async function applyCachedPlanFromExtras(extras) {
  if (extras?.gymPlan?.date === localDateKey()) {
    await AsyncStorage.setItem(PLAN_KEY, JSON.stringify(extras.gymPlan))
  }
  if (extras?.gymSessions?.length) {
    await AsyncStorage.setItem('gym-sessions-v1', JSON.stringify(extras.gymSessions))
  }
}
