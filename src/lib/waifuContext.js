import { HABITS, calcScore } from '../constants'
import { loadDailyGoals } from './aiGoalsStore'

export function buildWaifuContext({
  todayHabits = [],
  streak = 0,
  steps = 0,
  sleepHours = 0,
  activeMinutes = 0,
  connected = false,
  coins = 0,
  coachGoals = [],
  bonusHabit = null,
}) {
  const score = calcScore(todayHabits)
  const done = HABITS.filter((h) => todayHabits.includes(h.id)).map((h) => h.shortLabel)
  const left = HABITS.filter((h) => !todayHabits.includes(h.id)).map((h) => h.shortLabel)
  const focus = coachGoals
    .slice(0, 4)
    .map((g) => `${g.habitId || g.id}: ${g.target || g.tip || ''}`)
    .filter(Boolean)
    .join('; ')

  return [
    'You know the user\'s real wellness data. Use it naturally when relevant — don\'t dump stats unprompted.',
    `Today: wellness score ${score}/100, ${streak}-day streak.`,
    `Habits done: ${done.join(', ') || 'none yet'}. Still open: ${left.join(', ') || 'all complete'}.`,
    connected
      ? `Fitness: ${steps.toLocaleString()} steps, ${sleepHours.toFixed(1)}h sleep, ${activeMinutes}min active.`
      : 'Fitness: not connected — they can link Apple Health in Settings → Connect Fitness.',
    `Shop coins: ${coins} (complete habits in the Habits panel to earn more).`,
    focus ? `Coach focus today: ${focus}.` : '',
    bonusHabit ? `Bonus habit from coach: ${bonusHabit.label} — ${bonusHabit.tip || ''}.` : '',
    'If they ask about habits, steps, sleep, streak, or rewards — answer from this data warmly.',
  ].filter(Boolean).join('\n')
}

export async function buildWaifuContextAsync(base) {
  const daily = await loadDailyGoals()
  return buildWaifuContext({
    ...base,
    coachGoals: daily.goals || [],
    bonusHabit: daily.newHabit,
  })
}
