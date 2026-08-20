import { calcScore, HABITS, localDateKey, MILESTONES } from '../constants'

export function getDaysHistory(history, count, offset = 0) {
  return Array.from({ length: count }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (i + offset))
    return history?.[localDateKey(d)] || []
  })
}

export function getScoreSeries(history, days = 7) {
  return Array.from({ length: days }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (days - 1 - i))
    return calcScore(history?.[localDateKey(d)] || [])
  })
}

export function getDayLabels(days = 7) {
  return Array.from({ length: days }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (days - 1 - i))
    return d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()
  })
}

export function weekOverWeekChange(history, metric = 'count') {
  const last7 = getDaysHistory(history, 7, 0)
  const prev7 = getDaysHistory(history, 7, 7)
  const sum = (days) =>
    days.reduce((a, h) => a + (metric === 'score' ? calcScore(h) : h.length), 0)
  const thisW = sum(last7)
  const lastW = sum(prev7)
  return {
    thisW,
    lastW,
    pct: lastW > 0 ? Math.round(((thisW - lastW) / lastW) * 100) : 0,
  }
}

export function getStepsSeries(stepsHistory, days = 7) {
  return Array.from({ length: days }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (days - 1 - i))
    return stepsHistory?.[localDateKey(d)] || 0
  })
}

export function buildLocalInsight(history, streak = 0) {
  const { pct } = weekOverWeekChange(history, 'score')
  if (streak >= 30) return `Incredible ${streak}-day streak. You're building real momentum.`
  if (streak >= 7) return `${streak} days strong — keep showing up for yourself.`
  if (pct > 10) return `You're up ${pct}% on wellness score vs last week. Nice work.`
  if (pct < -10) return `A quieter week than last — one small habit today can turn it around.`
  return 'Small consistent habits compound. Focus on what you can do today.'
}

export const AWARD_DEFS = [
  { id: 'streak_3', icon: 'medal-outline', label: '3-Day Streak', color: '#C0C0C0', check: ({ streak }) => streak >= 3 },
  { id: 'streak_7', icon: 'medal', label: '7-Day Streak', color: '#FFD700', check: ({ streak }) => streak >= 7 },
  { id: 'streak_14', icon: 'medal', label: '14-Day Streak', color: '#f59e0b', check: ({ streak }) => streak >= 14 },
  { id: 'streak_30', icon: 'fire', label: '30-Day Streak', color: '#ff3b30', check: ({ streak }) => streak >= 30 },
  { id: 'steps_5k', icon: 'weather-sunset', label: '5K Steps', color: '#4fbaff', check: ({ steps }) => steps >= 5000 },
  { id: 'steps_10k', icon: 'walk', label: '10K Steps', color: '#34d399', check: ({ steps }) => steps >= 10000 },
  { id: 'perfect_day', icon: 'star', label: 'Perfect Day', color: '#f6ad55', check: ({ todayHabits }) => todayHabits.length >= HABITS.length },
  { id: 'hydration', icon: 'water', label: 'Hydration Hero', color: '#60a5fa', check: ({ todayHabits }) => todayHabits.includes('hydration') },
  { id: 'sleep', icon: 'moon-waning-crescent', label: 'Well Rested', color: '#a78bfa', check: ({ todayHabits, sleepHours }) => todayHabits.includes('sleep') || sleepHours >= 7 },
]

export function getEarnedAwards(ctx) {
  return AWARD_DEFS.filter((a) => a.check(ctx))
}

export function getMilestoneProgress(streak) {
  const next = MILESTONES.find((m) => m > streak) || MILESTONES[MILESTONES.length - 1]
  const prev = MILESTONES.filter((m) => m <= streak).pop() || 0
  return { next, prev, progress: next > prev ? streak - prev : streak, total: next - prev }
}
