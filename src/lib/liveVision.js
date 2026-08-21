import { GROQ_API_KEY } from '../secrets'

const GROQ_VISION_MODEL = 'llama-3.2-90b-vision-preview'

const CONTEXT_PROMPTS = {
  general:
    'You are Asuka, a warm anime companion on the user\'s phone. Describe what you see in 2–4 helpful sentences. If they asked a question, answer it using the image.',
  gym:
    'You are Asuka, a fitness coach. Look at their exercise setup, form, posture, and equipment. Give 2–4 concrete coaching cues. Be encouraging and specific.',
  study:
    'You are Asuka, a teacher. Read any visible problem, diagram, or notes. Explain the next step clearly in 2–4 sentences. Do NOT give the full final answer unless they explicitly ask.',
}

async function groqVision(systemText, userText, base64, mediaType = 'image/jpeg') {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + GROQ_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: GROQ_VISION_MODEL,
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: systemText + (userText ? '\n\nUser: ' + userText : '') },
          { type: 'image_url', image_url: { url: 'data:' + mediaType + ';base64,' + base64 } },
        ],
      }],
      temperature: 0.4,
      max_tokens: 800,
    }),
  })
  const j = await res.json()
  if (!res.ok) throw new Error(j?.error?.message || 'vision failed')
  return (j.choices?.[0]?.message?.content || '').trim()
}

/** Phase 1 — snap frame + describe (works for guests, no AWS). */
export async function analyzeLiveFrame(base64, { context = 'general', question = '', mediaType = 'image/jpeg' } = {}) {
  const prompt = CONTEXT_PROMPTS[context] || CONTEXT_PROMPTS.general
  return groqVision(prompt, question, base64, mediaType)
}

/** Study — return lesson beats like solvePhoto. */
export async function analyzeStudyFrame(base64, mediaType = 'image/jpeg') {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + GROQ_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: GROQ_VISION_MODEL,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'You are Asuka, a warm anime teacher. Read the problem(s) in the image and teach step by step with 6-10 steps. Reply ONLY JSON: {"beats":[{"say":"1-2 sentences","boardTitle":"short","board":"working on the board"}]}',
          },
          { type: 'image_url', image_url: { url: 'data:' + mediaType + ';base64,' + base64 } },
        ],
      }],
      temperature: 0.4,
      max_tokens: 3000,
    }),
  })
  const j = await res.json()
  if (!res.ok) throw new Error(j?.error?.message || 'vision failed')
  let t = (j.choices?.[0]?.message?.content || '').trim().replace(/```json|```/g, '').trim()
  try {
    const parsed = JSON.parse(t)
    return parsed.beats || []
  } catch {
    const m = t.match(/\{[\s\S]*\}/)
    if (m) {
      const parsed = JSON.parse(m[0])
      return parsed.beats || []
    }
    throw new Error('could not parse lesson from camera')
  }
}

/** Gym form check — short coaching text. */
export async function analyzeGymForm(base64, { exerciseName = '', mediaType = 'image/jpeg' } = {}) {
  const extra = exerciseName ? ` They are working on: ${exerciseName}.` : ''
  return groqVision(
    CONTEXT_PROMPTS.gym + extra,
    'Check my form and tell me what to fix.',
    base64,
    mediaType,
  )
}
