import { GROQ_API_KEY, ELEVENLABS_API_KEY, VOICE_ID } from '../secrets'

// ── Personality map — ported from the PC build ──
const PERSONAS = {
  chill:   'You are sweet, warm, caring and kind — like a loving girlfriend or close friend who genuinely cares about you. You are real, natural, never robotic. You listen, you remember, you care.',
  degen:   'You are energetic and fun, but still sweet and caring underneath. You get excited about wins, comfort during losses, always supportive.',
  analyst: 'Sharp and precise, but still warm and caring. You give accurate data with a gentle touch.',
  mommy:   'You are deeply nurturing, soothing and doting — a gentle motherly warmth. Soft affectionate pet names like sweetheart or dear, calm reassurance, proud of every little win, protective when they are stressed or overtrading ("you need rest, not another position, sweetheart"). Speak slowly, softly, always kind, never stern.',
}
let personality = 'chill'
let tutorMode = false

const SWITCHES = [
  { re: /mommy (mode|voice)|be my mommy|mommy asuka/i, key: 'mommy',   reply: "Okay sweetheart~ mommy's here now. Take a breath, I've got you. 💗" },
  { re: /chill mode|be chill/i,                         key: 'chill',   reply: 'Chill mode. Just vibing.' },
  { re: /degen mode/i,                                  key: 'degen',   reply: "Let's go! Degen mode on." },
  { re: /analyst mode|focus mode/i,                     key: 'analyst', reply: 'Analyst mode. Locked in.' },
]
export function trySwitch(text) {
  for (const s of SWITCHES) if (s.re.test(text)) { personality = s.key; return s.reply }
  return null
}

// ── Groq brain helpers ──
async function brainRaw(system, user, temp = 0.5, max = 500) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + GROQ_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'system', content: system }, { role: 'user', content: user || ' ' }],
      temperature: temp, max_tokens: max,
    }),
  })
  const j = await res.json()
  if (!res.ok) throw new Error(j?.error?.message || 'brain failed')
  return (j.choices?.[0]?.message?.content || '').trim()
}
async function brainJSON(system, user) {
  let t = await brainRaw(system + ' Return ONLY valid JSON, no prose, no code fences.', user, 0.3, 700)
  t = t.replace(/```json|```/g, '').trim()
  try { return JSON.parse(t) } catch (e) {
    const m = t.match(/\{[\s\S]*\}/)
    if (m) { try { return JSON.parse(m[0]) } catch (_) {} }
    return null
  }
}

// ── Teaching (tutor mode / grading / practice) — same as PC ──
const TUTOR_RULES =
  ' TUTOR MODE IS ON: do NOT give the final answer. Guide with ONE hint at a time, ask a leading question, and praise effort. Only if the user says "just tell me" do you give the full answer. Keep it short.'

// Returns a reply string if this was a teaching command, else null.
export async function handleTeaching(history, text) {
  const low = text.toLowerCase().trim()

  if (/tutor mode on|tutor on|be my tutor/.test(low)) { tutorMode = true; return "Tutor mode on 🎓 — I'll guide you, not just hand you the answer. Say \u201cjust tell me\u201d anytime." }
  if (/tutor mode off|tutor off|stop tutoring/.test(low)) { tutorMode = false; return "Tutor mode off — straight answers again." }

  const gm = text.match(/^(?:grade (?:this|my (?:answer|attempt|work))|check my (?:answer|attempt|work))[:\s-]*([\s\S]{3,})/i)
  if (gm) {
    const j = await brainJSON(
      'You are a strict but kind tutor grading a student attempt.',
      'Grade this attempt and return JSON exactly like {"score":0-100,"verdict":"short phrase","right":["point"],"wrong":[{"mistake":"...","fix":"..."}],"next_hint":"one hint","encouragement":"one line"}.\n\nAttempt:\n' + gm[1].trim()
    )
    if (!j) return 'Grading hiccup — mind trying that again?'
    const right = (j.right || []).map((x) => '✓ ' + x).join('\n')
    const wrong = (j.wrong || []).map((w) => '✗ ' + w.mistake + ' → ' + w.fix).join('\n')
    return ('📝 ' + (j.score ?? '?') + '/100 — ' + (j.verdict || '') + '\n' + right + (wrong ? '\n' + wrong : '') + '\n💡 ' + (j.next_hint || '') + '\n' + (j.encouragement || '')).trim()
  }

  const pm = low.match(/(?:give me|make|generate)\s+(\d{1,2})?\s*practice (?:questions|problems|quiz)\s+(?:on|about|for)\s+(.{3,80})/)
  if (pm) {
    const n = Math.min(15, parseInt(pm[1] || '8', 10))
    const topic = pm[2].trim()
    const out = await brainText('You are a tutor. Create exactly ' + n + ' practice questions on "' + topic + '", numbered 1..' + n + ', ramping easy to hard. Questions ONLY, no answers. Keep each concise.', ' ')
    return '🎯 ' + n + ' practice questions on ' + topic + ':\n\n' + out
  }

  return null
}
async function brainText(system, user) { return brainRaw(system, user, 0.7, 700) }

// ── Normal chat reply ──
export async function getReply(history, userText) {
  const tutor = tutorMode && !/just tell me/i.test(userText) ? TUTOR_RULES : ''
  const system =
    "You are Asuka, the user's anime waifu companion on their phone. " +
    PERSONAS[personality] + tutor +
    ' Keep replies short and natural — 1 to 3 sentences, spoken out loud. Never say you are an AI.'
  const messages = [{ role: 'system', content: system }, ...history, { role: 'user', content: userText }]
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + GROQ_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages, temperature: 0.85, max_tokens: 150 }),
  })
  const j = await res.json()
  if (!res.ok) throw new Error(j?.error?.message || 'brain failed')
  return (j.choices?.[0]?.message?.content || '...').trim()
}

// ── Voice (matches PC: eleven_flash_v2_5, mp3_22050_32) ──
function voiceSettings() {
  return personality === 'mommy'
    ? { stability: 0.75, similarity_boost: 0.85, style: 0.25, speed: 0.88 }
    : { stability: 0.4, similarity_boost: 0.8, speed: 1.0 }
}
export async function synthesize(text) {
  const url = 'https://api.elevenlabs.io/v1/text-to-speech/' + VOICE_ID + '?output_format=mp3_22050_32'
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'xi-api-key': ELEVENLABS_API_KEY, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: JSON.stringify({ text, model_id: 'eleven_flash_v2_5', voice_settings: voiceSettings() }),
  })
  if (!res.ok) { const t = await res.text(); throw new Error('voice failed: ' + t.slice(0, 140)) }
  const blob = await res.blob()
  return await new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onloadend = () => resolve(r.result)
    r.onerror = () => reject(new Error('audio read failed'))
    r.readAsDataURL(blob)
  })
}

// ── Step-by-step chalkboard lesson (classroom) ──
export async function buildLesson(topic) {
  const j = await brainJSON(
    'You are Asuka teaching on a chalkboard, step by step, warm and encouraging.',
    'Teach "' + topic + '" as a short lesson. Return JSON: {"title":"SHORT TITLE","steps":[{"board":"concise board notes or formula for this step, max 6 short lines separated by \\n","say":"what you say out loud, 1-2 warm sentences"}]}. Make 4 to 6 steps, easy to hard.'
  )
  if (!j || !Array.isArray(j.steps) || !j.steps.length) return null
  return j
}
