import { HABITS, calcScore } from '../constants'
import { loadDailyGoals } from './aiGoalsStore'
import { loadMemoryCache } from './memorySync'
import { loadChatLog } from './chatSync'
import { buildMemoryRecallBlock } from './memoryRetrieval'

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
    memorySnippets.length
      ? `Things you remember about them (RAG recall from full history — use naturally, never say "you told me before"):\n${memorySnippets.join('\n')}`
      : '',
    'If they ask about habits, steps, sleep, streak, or rewards — answer from this data warmly.',
  ].filter(Boolean).join('\n')
}

async function loadMemorySources() {
  const cache = await loadMemoryCache()
  const chatLog = await loadChatLog()
  return {
    chatLog,
    brainMemories: cache.brainMemories || [],
    profileFacts: cache.userProfile?.facts || [],
    episodes: cache.episodes || [],
    longMemory: cache.longMemory,
    patterns: cache.patterns || [],
  }
}

/** Memory for Grok research — identical recall path as Claude chat (no slimmer slice). */
export async function buildGrokMemoryContext(userQuery = '') {
  const sources = await loadMemorySources()
  const block = buildMemoryRecallBlock(sources, userQuery)
  if (!block) return ''
  return 'What you know about this user from past chats (PC + phone):\n' + block
}

export async function buildWaifuContextAsync(base, userQuery = '') {
  const daily = await loadDailyGoals()
  const sources = await loadMemorySources()
  const q = userQuery || base?.lastUserText || ''

  const recall = buildMemoryRecallBlock(sources, q)
  let snippets = recall
    ? recall.split('\n').filter(Boolean).map((line) => (line.startsWith('- ') ? line : `- ${line}`))
    : []

  if (!snippets.length) {
    for (const f of (sources.profileFacts || []).slice(-5)) {
      if (f) snippets.push(`- [knows] ${f}`)
    }
    for (const ep of (sources.episodes || []).slice(-3)) {
      if (ep?.summary) snippets.push(`- [memory] ${ep.summary}`)
    }
    for (const m of (sources.brainMemories || []).slice(-3)) {
      if (m?.text) snippets.push(`- [saved] ${m.text}`)
    }
  }

  return buildWaifuContext({
    ...base,
    coachGoals: daily.goals || [],
    bonusHabit: daily.newHabit,
    memorySnippets: snippets,
  })
}
