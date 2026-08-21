/** Query-based memory recall — same scoring as PC memory-sync.js (Hakko-style RAG-lite). */

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'you', 'are', 'was', 'what', 'how', 'can', 'this', 'that', 'with', 'have', 'from',
  'your', 'about', 'just', 'like', 'when', 'will', 'been', 'they', 'them', 'some', 'into', 'also', 'than',
  'then', 'very', 'really', 'okay', 'yeah', 'but', 'not', 'all', 'any', 'her', 'his', 'she', 'him',
])

function tokenize(text) {
  return String(text || '').toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w))
}

function scoreText(text, queryTokens) {
  const tokens = tokenize(text)
  if (!tokens.length) return 0
  if (!queryTokens.length) return 0.01
  let score = 0
  const set = new Set(tokens)
  for (const q of queryTokens) {
    if (set.has(q)) score += 2
    else if (tokens.some((t) => t.includes(q) || q.includes(t))) score += 1
  }
  return score / Math.sqrt(tokens.length)
}

export function retrieveRelevantMemories(sources, query, opts = {}) {
  const limit = opts.limit || 40
  const minScore = opts.minScore ?? 0.25
  const queryTokens = tokenize(query)
  const items = []

  for (const m of sources.chatLog || []) {
    if (!m?.text) continue
    const who = m.role === 'user' ? 'User' : 'Asuka'
    const dev = m.device && m.device !== 'pc' ? ` [${m.device}]` : ''
    items.push({
      text: `${who}${dev}: ${m.text}`,
      ts: m.ts || 0,
      score: scoreText(m.text, queryTokens) + (m.role === 'user' ? 0.4 : 0),
    })
  }
  for (const m of sources.brainMemories || []) {
    if (!m?.text) continue
    items.push({ text: `[saved] ${m.text}`, ts: m.timestamp || 0, score: scoreText(m.text, queryTokens) + 1.2 })
  }
  for (const f of sources.profileFacts || []) {
    items.push({ text: `[knows] ${f}`, ts: 0, score: scoreText(f, queryTokens) + 1.5 })
  }
  for (const ep of sources.episodes || []) {
    if (!ep?.summary) continue
    items.push({
      text: `[past chat ${ep.date || ''}] ${ep.summary}`,
      ts: ep.ts || ep.timestamp || 0,
      score: scoreText(ep.summary, queryTokens) + 2,
    })
  }
  for (const tier of ['corefacts', 'longterm', 'medium', 'fresh']) {
    const arr = tier === 'corefacts'
      ? (sources.longMemory?.corefacts || []).map((f) => ({ summary: f.fact || f, timestamp: f.timestamp }))
      : (sources.longMemory?.[tier] || [])
    for (const m of arr) {
      const s = m.summary || m.fact || m
      if (!s) continue
      items.push({ text: `[${tier}] ${s}`, ts: m.timestamp || 0, score: scoreText(String(s), queryTokens) + 1 })
    }
  }

  if (!queryTokens.length) {
    return items.sort((a, b) => (b.ts || 0) - (a.ts || 0)).slice(0, limit)
  }
  return items
    .filter((i) => i.score >= minScore)
    .sort((a, b) => b.score - a.score || (b.ts || 0) - (a.ts || 0))
    .slice(0, limit)
}
