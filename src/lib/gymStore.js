import AsyncStorage from '@react-native-async-storage/async-storage'
import { localDateKey } from '../constants'
import { pushExtrasSoon } from './extrasSync'

const SESSIONS_KEY = 'gym-sessions-v1'
const DRAFT_KEY = 'gym-workout-draft-v1'
const MAX_SESSIONS = 60

export function newSet(reps = '', weight = '') {
  return { id: `s-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`, reps: String(reps), weight: String(weight), done: false }
}

export function newExercise(fromPlan = {}) {
  return {
    id: `ex-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    name: fromPlan.name || '',
    targetSets: fromPlan.targetSets || 3,
    targetReps: fromPlan.targetReps || '8-10',
    suggestedWeight: fromPlan.suggestedWeight || '',
    tip: fromPlan.tip || '',
    sets: [newSet(fromPlan.targetReps?.split('-')[0] || '', fromPlan.suggestedWeight || '')],
  }
}

export function sessionFromPlan(plan) {
  const date = localDateKey()
  return {
    id: `gym-${Date.now()}`,
    date,
    split: plan?.split || 'Workout',
    note: '',
    asukaInsight: plan?.insight || '',
    exercises: (plan?.exercises || []).map((e) => newExercise(e)),
    startedAt: Date.now(),
    completedAt: null,
  }
}

export async function loadSessions() {
  try {
    const raw = await AsyncStorage.getItem(SESSIONS_KEY)
    const list = raw ? JSON.parse(raw) : []
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

export async function saveSessions(list) {
  const trimmed = (list || []).slice(0, MAX_SESSIONS)
  await AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(trimmed))
  pushExtrasSoon()
  return trimmed
}

export async function saveSession(session) {
  const list = await loadSessions()
  const idx = list.findIndex((s) => s.id === session.id)
  const next = idx >= 0 ? [...list] : [session, ...list]
  if (idx >= 0) next[idx] = session
  else next.unshift(session)
  return saveSessions(next)
}

export async function getSession(id) {
  const list = await loadSessions()
  return list.find((s) => s.id === id) || null
}

export async function loadDraft() {
  try {
    const raw = await AsyncStorage.getItem(DRAFT_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export async function saveDraft(session) {
  if (!session) {
    await AsyncStorage.removeItem(DRAFT_KEY)
    return null
  }
  await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(session))
  return session
}

export async function clearDraft() {
  await AsyncStorage.removeItem(DRAFT_KEY)
}

export function summarizeSessionsForAsuka(sessions, limit = 5) {
  return (sessions || []).slice(0, limit).map((s) => ({
    date: s.date,
    split: s.split,
    exercises: (s.exercises || []).map((e) => ({
      name: e.name,
      sets: (e.sets || []).filter((set) => set.done).map((set) => ({
        reps: set.reps,
        weight: set.weight,
      })),
    })),
  }))
}

export function formatSessionSummary(session) {
  const done = (session.exercises || []).reduce(
    (n, e) => n + (e.sets || []).filter((s) => s.done).length,
    0
  )
  return `${session.split || 'Workout'} · ${done} sets logged`
}
