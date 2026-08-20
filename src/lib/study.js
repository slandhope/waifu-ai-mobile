import AsyncStorage from '@react-native-async-storage/async-storage'

const LIB_KEY = 'study-library-v1'
const CARDS_KEY = 'study-flashcards-v1'
const PREFS_KEY = 'study-prefs-v1'

const emptyLib = () => ({ streak: 0, lastStudyDay: null, lessons: [] })
const emptyCards = () => ({ cards: [] })

export async function loadLibrary() {
  try {
    const raw = await AsyncStorage.getItem(LIB_KEY)
    return raw ? JSON.parse(raw) : emptyLib()
  } catch {
    return emptyLib()
  }
}

async function saveLibrary(lib) {
  await AsyncStorage.setItem(LIB_KEY, JSON.stringify(lib))
  import('./studySync').then((m) => m.pushStudyToCloud()).catch(() => {})
}

export async function saveLesson({ topic, steps, source = 'topic' }) {
  const lib = await loadLibrary()
  const entry = {
    id: 'les_' + Date.now(),
    topic,
    steps,
    source,
    date: new Date().toISOString(),
  }
  lib.lessons.unshift(entry)
  lib.lessons = lib.lessons.slice(0, 40)
  await saveLibrary(lib)
  return entry
}

export async function removeLesson(id) {
  const lib = await loadLibrary()
  lib.lessons = lib.lessons.filter((l) => l.id !== id)
  await saveLibrary(lib)
}

export async function getStudyStreak() {
  const lib = await loadLibrary()
  return lib.streak || 0
}

export async function recordLessonFinished(topic) {
  const lib = await loadLibrary()
  const today = new Date().toDateString()
  if (lib.lastStudyDay !== today) {
    const yest = new Date(Date.now() - 864e5).toDateString()
    lib.streak = lib.lastStudyDay === yest ? (lib.streak || 0) + 1 : 1
    lib.lastStudyDay = today
    await saveLibrary(lib)
  }
  return lib.streak || 1
}

export async function loadStudyPrefs() {
  try {
    const raw = await AsyncStorage.getItem(PREFS_KEY)
    return raw ? JSON.parse(raw) : { tutorStyle: 'direct', voiceOn: true, whiteboardOn: true }
  } catch {
    return { tutorStyle: 'direct', voiceOn: true, whiteboardOn: true }
  }
}

export async function saveStudyPrefs(prefs) {
  const cur = await loadStudyPrefs()
  await AsyncStorage.setItem(PREFS_KEY, JSON.stringify({ ...cur, ...prefs }))
}

export async function loadFlashcards() {
  try {
    const raw = await AsyncStorage.getItem(CARDS_KEY)
    return raw ? JSON.parse(raw) : emptyCards()
  } catch {
    return emptyCards()
  }
}

async function saveFlashcards(fc) {
  await AsyncStorage.setItem(CARDS_KEY, JSON.stringify(fc))
  import('./studySync').then((m) => m.pushStudyToCloud()).catch(() => {})
}

export async function cardsDueCount() {
  const fc = await loadFlashcards()
  const due = fc.cards.filter((c) => (c.nextReview || 0) <= Date.now()).length
  return { due, total: fc.cards.length }
}

export async function cardsNext() {
  const fc = await loadFlashcards()
  const i = fc.cards.findIndex((c) => (c.nextReview || 0) <= Date.now())
  if (i < 0) return null
  return { i, card: fc.cards[i] }
}

export async function gradeCard(i, good) {
  const fc = await loadFlashcards()
  const c = fc.cards[i]
  if (!c) return false
  if (good) {
    c.interval = c.interval ? Math.round(c.interval * (c.ease || 2.5)) : 1
    c.nextReview = Date.now() + c.interval * 864e5
  } else {
    c.interval = 0
    c.nextReview = Date.now() + 10 * 60e3
  }
  await saveFlashcards(fc)
  return true
}

export async function addFlashcardsFromLesson(topic, steps) {
  const fc = await loadFlashcards()
  const content = (steps || []).map((s) => (s.say || '') + ' ' + (s.board || '')).join('\n').slice(0, 4000)
  if (!content.trim()) return 0
  const { lessonToCards } = await import('./waifu')
  const cards = await lessonToCards(topic, content)
  for (const c of cards) {
    fc.cards.push({ q: c.q, a: c.a, topic, interval: 0, nextReview: Date.now(), ease: 2.5 })
  }
  await saveFlashcards(fc)
  return cards.length
}

export function normalizeSteps(beats) {
  return (beats || []).map((b) => ({
    board: b.board || '',
    say: b.say || '',
    boardTitle: b.boardTitle || b.title || '',
  }))
}
