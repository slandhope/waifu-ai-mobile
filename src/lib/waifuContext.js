import { HABITS, calcScore } from '../constants'
import { loadDailyGoals } from './aiGoalsStore'
import { loadMemoryCache } from './memorySync'

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
  memorySnippets = [],
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
    memorySnippets.length ? `Things you remember about them:\n${memorySnippets.join('\n')}` : '',
    'If they ask about habits, steps, sleep, streak, or rewards — answer from this data warmly.',
  ].filter(Boolean).join('\n')
}

export async function buildWaifuContextAsync(base) {
  const daily = await loadDailyGoals()
  const cache = await loadMemoryCache()
  const snippets = []
  for (const f of (cache.userProfile?.facts || []).slice(-5)) {
    if (f) snippets.push(`- ${f}`)
  }
  for (const ep of (cache.episodes || []).slice(-3)) {
    if (ep?.summary) snippets.push(`- [memory] ${ep.summary}`)
  }
  for (const m of (cache.brainMemories || []).slice(-3)) {
    if (m?.text) snippets.push(`- [saved] ${m.text}`)
  }
  return buildWaifuContext({
    ...base,
    coachGoals: daily.goals || [],
    bonusHabit: daily.newHabit,
    memorySnippets: snippets,
  })
}
