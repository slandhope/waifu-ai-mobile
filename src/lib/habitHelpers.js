import { HABITS, localDateKey, todayKey } from '../constants'

export const HABIT_FORM_TARGET = 66
export const HUMP_AT = 33

export const CARD_COLORS = {
  sleep: '#7B6FE8',
  exercise: '#E88252',
  hydration: '#3D9BE9',
  meditation: '#34B68B',
  nutrition: '#F09852',
  breathwork: '#48BFB8',
  screens: '#E06B6B',
}

const CARD_PALETTE = ['#34B68B', '#E88252', '#7B6FE8', '#3D9BE9', '#F09852', '#48BFB8', '#E06B6B']

export function getCardColor(habit) {
  if (habit?.cardColor) return habit.cardColor
  if (habit?.id && CARD_COLORS[habit.id]) return CARD_COLORS[habit.id]
  if (habit?.color && habit.color.startsWith('#') && habit.color.length >= 7) return habit.color
  const idx = Math.abs(String(habit?.id || habit?.label || '').split('').reduce((s, c) => s + c.charCodeAt(0), 0)) % CARD_PALETTE.length
  return CARD_PALETTE[idx]
}

export function darken(hex, amount = 0.55) {
  const n = hex.replace('#', '')
  if (n.length !== 6) return '#1a1a1a'
  const r = Math.round(parseInt(n.slice(0, 2), 16) * (1 - amount))
  const g = Math.round(parseInt(n.slice(2, 4), 16) * (1 - amount))
  const b = Math.round(parseInt(n.slice(4, 6), 16) * (1 - amount))
  return `#${[r, g, b].map((v) => Math.max(0, v).toString(16).padStart(2, '0')).join('')}`
}

export function habitCompletedOn(history, habitId, dateKey) {
  return (history?.[dateKey] || []).includes(habitId)
}

export function calcHabitStreak(history, habitId) {
  let s = 0
  const d = new Date()
  while (true) {
    const key = localDateKey(d)
    if (habitCompletedOn(history, habitId, key)) {
      s++
      d.setDate(d.getDate() - 1)
    } else break
  }
  return s
}

export function calcHabitReps(history, habitId) {
  return Object.values(history || {}).filter((arr) => arr.includes(habitId)).length
}

export function calcHabitCompletionRate(history, habitId, days = 30) {
  let done = 0
  const d = new Date()
  for (let i = 0; i < days; i++) {
    const key = localDateKey(d)
    if (habitCompletedOn(history, habitId, key)) done++
    d.setDate(d.getDate() - 1)
  }
  return Math.round((done / days) * 100)
}

export function habitWeekOverWeek(history, habitId) {
  const now = new Date()
  let thisW = 0
  let lastW = 0
  for (let i = 0; i < 7; i++) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    if (habitCompletedOn(history, habitId, localDateKey(d))) thisW++
  }
  for (let i = 7; i < 14; i++) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    if (habitCompletedOn(history, habitId, localDateKey(d))) lastW++
  }
  const thisPct = Math.round((thisW / 7) * 100)
  const lastPct = Math.round((lastW / 7) * 100)
  let delta = 0
  if (lastPct === 0) delta = thisPct > 0 ? 100 : 0
  else delta = Math.round(((thisPct - lastPct) / lastPct) * 1000) / 10
  return { thisPct, lastPct, delta }
}

export function getLast7DaysView(history, habitId) {
  const today = todayKey()
  const days = []
  const d = new Date()
  d.setDate(d.getDate() - 6)
  for (let i = 0; i < 7; i++) {
    const key = localDateKey(d)
    const dt = new Date(d)
    days.push({
      dateKey: key,
      isToday: key === today,
      label: key === today ? 'Today' : dt.toLocaleDateString('en-US', { weekday: 'narrow' }),
      done: habitCompletedOn(history, habitId, key),
    })
    d.setDate(d.getDate() + 1)
  }
  return days
}

/** Read-only history strip — past + today only, no future. */
export function getDateStrip(history, habitId, pastDays = 6) {
  return getLast7DaysView(history, habitId)
}

/** @deprecated use getDateStrip */
export function getWeekPills(history, habitId, count = 4) {
  return getDateStrip(history, habitId, count - 1)
}

export function habitProgress(reps) {
  const target = HABIT_FORM_TARGET
  const pct = Math.min(reps / target, 1)
  const formed = reps >= target
  const label = formed
    ? `Locked in · ${reps} days`
    : `Consistency · ${reps}/${target} days`
  return { reps, target, pct, formed, label }
}

/** @deprecated use habitProgress */
export function humpProgress(reps) {
  const p = habitProgress(reps)
  return { ...p, overHump: reps >= HUMP_AT, status: p.label, humpPct: HUMP_AT / HABIT_FORM_TARGET }
}

export function getHeatmapWeeks(history, habitId, weekCount = 22) {
  const today = new Date()
  today.setHours(12, 0, 0, 0)
  const dayOfWeek = today.getDay()
  const endSunday = new Date(today)
  endSunday.setDate(today.getDate() + (6 - dayOfWeek))

  const weeks = []
  const start = new Date(endSunday)
  start.setDate(start.getDate() - weekCount * 7 + 6)

  let cursor = new Date(start)
  while (cursor <= endSunday) {
    const week = []
    for (let i = 0; i < 7; i++) {
      const key = localDateKey(cursor)
      week.push({
        dateKey: key,
        done: habitCompletedOn(history, habitId, key),
        future: key > todayKey(),
        date: new Date(cursor),
      })
      cursor.setDate(cursor.getDate() + 1)
    }
    weeks.push(week)
  }
  return weeks
}

export function getHeatmapMonthLabels(weeks) {
  const labels = []
  let lastMonth = -1
  weeks.forEach((week, wi) => {
    const mid = week[3]?.date || week[0]?.date
    if (!mid) return
    const m = mid.getMonth()
    if (m !== lastMonth) {
      labels.push({
        weekIndex: wi,
        label: mid.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
      })
      lastMonth = m
    }
  })
  return labels
}

export function buildDisplayHabits(customHabits = [], bonusHabit = null) {
  const custom = (customHabits || []).map((c) => ({
    id: c.id,
    label: c.label,
    shortLabel: c.label,
    description: c.description || '',
    emoji: c.emoji || '✦',
    color: c.color || getCardColor(c),
    cardColor: c.color || getCardColor(c),
    pts: 10,
    science: c.description || '',
    custom: true,
  }))
  const bonus = bonusHabit
    ? [{
        id: bonusHabit.id,
        label: bonusHabit.label,
        shortLabel: bonusHabit.label,
        description: bonusHabit.tip || '',
        emoji: bonusHabit.emoji || '⭐',
        color: '#6c5ce7',
        cardColor: '#6c5ce7',
        pts: bonusHabit.points || 10,
        science: bonusHabit.tip || '',
        custom: false,
      }]
    : []
  const core = HABITS.map((h) => ({
    ...h,
    description: h.science,
    cardColor: getCardColor(h),
  }))
  return [...custom, ...bonus, ...core]
}

export function formatHabitsHeaderDate() {
  return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}
