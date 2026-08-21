import { apiCall } from '../utils/api'
import { detectGrokTask } from './grokResearch'

export async function runGrokResearch(query, { task, context } = {}) {
  const res = await apiCall('/ai/grok-agent', {
    method: 'POST',
    body: JSON.stringify({
      query: String(query).trim(),
      task: task || detectGrokTask(query),
      context: context ? String(context).slice(0, 8000) : '',
    }),
  })
  const j = await res.json().catch(() => ({}))
  if (res.status === 402) {
    const err = new Error(j.message || 'Out of credits for deep research')
    err.code = 'INSUFFICIENT_CREDITS'
    throw err
  }
  if (res.status === 401) {
    const err = new Error('not signed in')
    err.code = 'NOT_SIGNED_IN'
    throw err
  }
  if (!res.ok) throw new Error(j.detail || j.error || 'Research failed')
  const text = (j.text || '').trim()
  if (!text) throw new Error('Empty research response')
  return text
}
