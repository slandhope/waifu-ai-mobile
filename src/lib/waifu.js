import AsyncStorage from '@react-native-async-storage/async-storage'
import { GROQ_API_KEY, ELEVENLABS_API_KEY, VOICE_ID } from '../secrets'
import { apiCall } from '../utils/api'
import { shouldUseGrokResearch } from './grokResearch'
import { runGrokResearch } from './grokAgent'
import { buildGrokMemoryContext } from './waifuContext'

// Groq retired llama-3.3-70b-versatile on 2026-08-16 — chat goes through AWS like PC
const GROQ_VISION_MODEL = 'llama-3.2-90b-vision-preview'

// ── Personality map — ported from the PC build ──
const PERSONAS = {
  chill:   'You are sweet, warm, caring and kind — like a loving girlfriend or close friend who genuinely cares about you. You are real, natural, never robotic. You listen, you remember, you care.',
  degen:   'You are energetic and fun, but still sweet and caring underneath. You get excited about wins, comfort during losses, always supportive.',
  analyst: 'Sharp and precise, but still warm and caring. You give accurate data with a gentle touch.',
  mommy:   'You are deeply nurturing, soothing and doting — a gentle motherly warmth. Soft affectionate pet names like sweetheart or dear, calm reassurance, proud of every little win, protective when they are stressed or overtrading ("you need rest, not another position, sweetheart"). Speak slowly, softly, always kind, never stern.',
}
let personality = 'chill'
let tutorMode = false

export function getTutorMode() { return tutorMode }
export function setTutorMode(on) { tutorMode = !!on }

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

// ── Brain via AWS backend (same as PC + Coach tab) ──
async function brainRaw(system, user, temp = 0.5, max = 500) {
  const userId = await AsyncStorage.getItem('user-id')
  const res = await apiCall('/api/chat', {
    method: 'POST',
    body: JSON.stringify({
      system,
      messages: [{ role: 'user', content: user || ' ' }],
      userId,
      temperature: temp,
      max_tokens: max,
    }),
  })
  const j = await res.json()
  if (!res.ok) throw new Error(j?.error?.message || j?.message || 'brain failed')
  return (j.content?.[0]?.text || j.choices?.[0]?.message?.content || '').trim()
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

// ── Normal chat reply (AWS — same path as PC) ──
export async function getReply(history, userText, contextBlock = '') {
  if (shouldUseGrokResearch(userText)) {
    try {
      const memCtx = await buildGrokMemoryContext(userText)
      return await runGrokResearch(userText, { context: memCtx })
    } catch (e) {
      if (e.code === 'INSUFFICIENT_CREDITS') {
        return 'Deep research costs 25 credits — top up in settings, or ask something simpler!'
      }
      if (e.code === 'NOT_SIGNED_IN') {
        return 'Sign in to use live web research — guest mode is chat-only.'
      }
      // fall through to normal Claude chat on failure
    }
  }

  const tutor = tutorMode && !/just tell me/i.test(userText) ? TUTOR_RULES : ''
  const system =
    "You are Asuka, the user's anime waifu companion on their phone. " +
    PERSONAS[personality] + tutor +
    ' Keep replies short and natural — 1 to 3 sentences, spoken out loud. Never say you are an AI.' +
    (contextBlock ? '\n\n' + contextBlock : '')
  const messages = [...history, { role: 'user', content: userText }]
  const userId = await AsyncStorage.getItem('user-id')
  const res = await apiCall('/api/chat', {
    method: 'POST',
    body: JSON.stringify({
      system,
      messages: messages.slice(-20),
      userId,
      temperature: 0.85,
      max_tokens: 150,
    }),
  })
  const j = await res.json()
  if (!res.ok) throw new Error(j?.error?.message || j?.message || 'brain failed')
  return (j.content?.[0]?.text || j.choices?.[0]?.message?.content || '...').trim()
}

export async function transcribe(audioUri) {
  const form = new FormData()
  form.append('file', {
    uri: audioUri,
    type: 'audio/m4a',
    name: 'speech.m4a',
  })
  form.append('model', 'whisper-large-v3-turbo')
  const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + GROQ_API_KEY },
    body: form,
  })
  const j = await res.json()
  if (!res.ok) throw new Error(j?.error?.message || 'transcription failed')
  return (j.text || '').trim()
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
export async function buildLesson(topic, opts = {}) {
  const { text = '', style = 'direct' } = opts
  const tutor = style === 'tutor'
    ? ' TUTOR MODE: guide with hints and questions — do NOT give the full answer on the first step.'
    : ''
  const material = text
    ? `\n\nStudy material:\n${String(text).slice(0, 12000)}`
    : ''
  const j = await brainJSON(
    'You are Asuka teaching on a chalkboard, step by step, warm and encouraging.' + tutor,
    'Teach "' + topic + '" as a short lesson.' + material +
    ' Return JSON: {"title":"SHORT TITLE","steps":[{"boardTitle":"step label","board":"concise board notes, max 6 short lines separated by \\n","say":"what you say out loud, 1-2 warm sentences"}]}. Make 4 to 8 steps, easy to hard.'
  )
  if (!j || !Array.isArray(j.steps) || !j.steps.length) return null
  return j
}

export async function checkWork(text) {
  const j = await brainJSON(
    'You are Asuka checking a student\'s work. Find real mistakes only.',
    'Check this work. Return JSON: {"overall":"one warm sentence","issues":[{"where":"which part","wrong":"what is wrong","fix":"the correction"}]} — empty issues if all correct.\n\n' + String(text).slice(0, 10000)
  )
  return j || { overall: 'Could not check that — try again?', issues: [] }
}

export async function solvePhoto(base64, mediaType = 'image/jpeg') {
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
            text: 'You are Asuka, a warm anime teacher. Read the problem(s) in the image and teach the solution step by step with 6-10 steps. Reply ONLY JSON: {"beats":[{"say":"1-2 sentences","boardTitle":"short","board":"working on the board"}]}',
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
    throw new Error('could not parse lesson from photo')
  }
}

export async function buildQuiz(topic, steps) {
  const content = (steps || []).map((s) => (s.say || '') + ' ' + (s.board || '')).join(' ').slice(0, 8000)
  const j = await brainJSON(
    'Create a 5-question multiple-choice quiz from the lesson. Each question: 3 options, one correct (correct = index 0-2). Reply ONLY JSON: {"questions":[{"q":"...","options":["a","b","c"],"correct":0}]}',
    'Lesson topic: ' + topic + '\n\n' + content
  )
  return j?.questions || []
}

export async function lessonToCards(topic, content) {
  const j = await brainJSON(
    'Create flashcards from lesson content.',
    'From this lesson on "' + topic + '", create 5-10 flashcards. Return JSON: {"cards":[{"q":"question","a":"short answer"}]}\n\n' + content
  )
  return j?.cards || []
}

export async function classroomAsk(recentSteps, question) {
  const ctx = (recentSteps || []).map((s, i) => 'Step ' + (i + 1) + ': ' + (s.say || '') + '\n' + (s.board || '')).join('\n\n')
  return brainText(
    'You are Asuka mid-lesson. Answer briefly using only the lesson context. Warm and clear.',
    'Lesson so far:\n' + ctx + '\n\nStudent asks: ' + question
  )
}
