import AsyncStorage from '@react-native-async-storage/async-storage'
import { pushExtrasSoon } from './extrasSync'

const CUSTOM_KEY = 'custom-habits-v1'
const NOTES_KEY = 'habit-notes-v1'

export async function loadCustomHabits() {
  try {
    const raw = await AsyncStorage.getItem(CUSTOM_KEY)
    const list = raw ? JSON.parse(raw) : []
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

export async function saveCustomHabits(list) {
  await AsyncStorage.setItem(CUSTOM_KEY, JSON.stringify(list))
  pushExtrasSoon()
}

export async function addCustomHabit({ label, description, color, emoji }) {
  const list = await loadCustomHabits()
  const item = {
    id: `custom-${Date.now()}`,
    label: label.trim(),
    description: (description || '').trim(),
    color: color || '#34B68B',
    emoji: emoji || '✦',
    createdAt: Date.now(),
  }
  const next = [item, ...list]
  await saveCustomHabits(next)
  return item
}

export async function removeCustomHabit(id) {
  const list = await loadCustomHabits()
  const next = list.filter((h) => h.id !== id)
  await saveCustomHabits(next)
  return next
}

export async function loadHabitNotes() {
  try {
    const raw = await AsyncStorage.getItem(NOTES_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

export async function saveHabitNote(habitId, dateKey, note) {
  const all = await loadHabitNotes()
  if (!all[habitId]) all[habitId] = {}
  if (note?.trim()) all[habitId][dateKey] = note.trim()
  else delete all[habitId][dateKey]
  await AsyncStorage.setItem(NOTES_KEY, JSON.stringify(all))
  pushExtrasSoon()
  return all
}

export function getHabitNote(notes, habitId, dateKey) {
  return notes?.[habitId]?.[dateKey] || ''
}
