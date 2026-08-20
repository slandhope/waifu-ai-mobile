import AsyncStorage from '@react-native-async-storage/async-storage'
import { apiCall } from '../utils/api'

const LIB_KEY = 'study-library-v1'
const CARDS_KEY = 'study-flashcards-v1'

function lessonTs(l) {
  if (l.ts) return l.ts
  if (l.date) return new Date(l.date).getTime()
  return 0
}

function normalizeLesson(l) {
  const steps = l.steps || l.beats || []
  const ts = lessonTs(l)
  return {
    id: l.id || `les_${ts}`,
    topic: l.topic || l.title || 'Untitled',
    steps,
    beats: steps,
    source: Array.isArray(l.source) ? l.source : (l.source ? [l.source] : []),
    date: l.date || (ts ? new Date(ts).toISOString() : new Date().toISOString()),
    ts: ts || Date.now(),
    beatCount: l.beatCount ?? steps.length,
  }
}

function normalizeCard(c) {
  return {
    id: c.id || `${c.q}|${c.a}`,
    q: c.q,
    a: c.a,
    topic: c.topic || c.book || '',
    interval: c.interval || 0,
    nextReview: c.nextReview ?? c.due ?? Date.now(),
    ease: c.ease || 2.5,
  }
}

export function mergeStudyLibraries(local, remote) {
  const byId = new Map()
  for (const l of [...(local?.lessons || []), ...(remote?.lessons || [])]) {
    const n = normalizeLesson(l)
    const prev = byId.get(n.id)
    if (!prev || lessonTs(n) >= lessonTs(prev)) byId.set(n.id, n)
  }
  const lessons = [...byId.values()]
    .sort((a, b) => lessonTs(b) - lessonTs(a))
    .slice(0, 80)
    .map(({ beats, beatCount, ...rest }) => rest)

  let streak = Math.max(local?.streak || 0, remote?.streak || 0)
  let lastStudyDay = local?.lastStudyDay || remote?.lastStudyDay || null
  if (remote?.lastStudyDay && local?.lastStudyDay) {
    if (new Date(remote.lastStudyDay) > new Date(local.lastStudyDay)) {
      lastStudyDay = remote.lastStudyDay
      streak = remote.streak || streak
    }
  }

  return { streak, lastStudyDay, lessons, updatedAt: Date.now() }
}

export function mergeFlashcards(local, remote) {
  const byKey = new Map()
  for (const c of [...(local?.cards || []), ...(remote?.cards || [])]) {
    const n = normalizeCard(c)
    const key = n.id
    const prev = byKey.get(key)
    if (!prev || (n.nextReview || 0) >= (prev.nextReview || 0)) byKey.set(key, n)
  }
  const cards = [...byKey.values()].slice(-300)
  return { cards, updatedAt: Date.now() }
}

async function fetchCloudLessons() {
  const res = await apiCall('/state')
  if (res.status === 401 || !res.ok) return null
  const state = await res.json()
  return state?.lessons || {}
}

async function pushCloudLessons(lessonsPatch, localUpdatedAt) {
  const res = await apiCall('/state')
  if (res.status === 401) return { ok: false, auth: false }
  let cur = {}
  let serverUpdatedAt = 0
  if (res.ok) {
    const state = await res.json()
    cur = state?.lessons || {}
    serverUpdatedAt = state?.updatedAt || 0
  }
  const mergedLessons = {
    ...cur,
    ...lessonsPatch,
    updatedAt: Math.max(localUpdatedAt || 0, cur.updatedAt || 0, Date.now()),
  }
  const patch = await apiCall('/state', {
    method: 'PATCH',
    body: JSON.stringify({
      lessons: mergedLessons,
      updatedAt: Math.max(localUpdatedAt || 0, serverUpdatedAt, Date.now()),
    }),
  })
  if (patch.status === 409) {
    const data = await patch.json()
    return { ok: false, stale: true, serverLessons: data?.server?.lessons || {} }
  }
  return { ok: patch.ok }
}

export async function pullStudyFromCloud() {
  try {
    const token = await AsyncStorage.getItem('auth-token')
    if (!token) return false

    const cloud = await fetchCloudLessons()
    if (!cloud) return false

    const libRaw = await AsyncStorage.getItem(LIB_KEY)
    const localLib = libRaw ? JSON.parse(libRaw) : { streak: 0, lastStudyDay: null, lessons: [] }
    const cardsRaw = await AsyncStorage.getItem(CARDS_KEY)
    const localCards = cardsRaw ? JSON.parse(cardsRaw) : { cards: [] }

    const remoteLib = cloud.studyLibrary || { lessons: cloud.lessons || [] }
    const remoteCards = cloud.flashcards || { cards: [] }

    const mergedLib = mergeStudyLibraries(localLib, remoteLib)
    const mergedCards = mergeFlashcards(localCards, remoteCards)

    await AsyncStorage.setItem(LIB_KEY, JSON.stringify(mergedLib))
    await AsyncStorage.setItem(CARDS_KEY, JSON.stringify(mergedCards))

    if ((cloud.updatedAt || 0) < (mergedLib.updatedAt || 0)) {
      await pushStudyToCloud()
    }
    return true
  } catch (e) {
    console.log('[studySync] pull skipped:', e.message)
    return false
  }
}

export async function pushStudyToCloud() {
  try {
    const token = await AsyncStorage.getItem('auth-token')
    if (!token) return false

    const libRaw = await AsyncStorage.getItem(LIB_KEY)
    const localLib = libRaw ? JSON.parse(libRaw) : { streak: 0, lastStudyDay: null, lessons: [] }
    const cardsRaw = await AsyncStorage.getItem(CARDS_KEY)
    const localCards = cardsRaw ? JSON.parse(cardsRaw) : { cards: [] }

    const studyLibrary = {
      streak: localLib.streak || 0,
      lastStudyDay: localLib.lastStudyDay || null,
      lessons: (localLib.lessons || []).map(normalizeLesson),
      updatedAt: Date.now(),
    }
    const flashcards = {
      cards: (localCards.cards || []).map(normalizeCard),
      updatedAt: Date.now(),
    }

    const result = await pushCloudLessons({ studyLibrary, flashcards }, studyLibrary.updatedAt)
    if (result.stale && result.serverLessons) {
      const mergedLib = mergeStudyLibraries(localLib, result.serverLessons.studyLibrary || {})
      const mergedCards = mergeFlashcards(localCards, result.serverLessons.flashcards || {})
      await AsyncStorage.setItem(LIB_KEY, JSON.stringify(mergedLib))
      await AsyncStorage.setItem(CARDS_KEY, JSON.stringify(mergedCards))
      await pushCloudLessons({
        studyLibrary: {
          streak: mergedLib.streak,
          lastStudyDay: mergedLib.lastStudyDay,
          lessons: mergedLib.lessons.map(normalizeLesson),
          updatedAt: Date.now(),
        },
        flashcards: {
          cards: mergedCards.cards.map(normalizeCard),
          updatedAt: Date.now(),
        },
      }, Date.now())
    }
    return result.ok !== false
  } catch (e) {
    console.log('[studySync] push skipped:', e.message)
    return false
  }
}
