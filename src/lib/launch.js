import AsyncStorage from '@react-native-async-storage/async-storage'
import { GROQ_API_KEY } from '../secrets'
import { apiCall } from '../utils/api'

export const CREATE_MODES = [
  { id: 'website', label: 'Website', desc: 'Landing pages, portfolios & launches' },
  { id: 'resume', label: 'Resume', desc: 'Professional CV exported as PDF' },
]

export const WEBSITE_TYPES = [
  { id: 'coin', label: 'Coin / Token', desc: 'Meme coin or token launch page' },
  { id: 'business', label: 'Business', desc: 'Company or service site' },
  { id: 'portfolio', label: 'Portfolio', desc: 'Personal work showcase' },
  { id: 'event', label: 'Event', desc: 'Event or launch party' },
]

/** @deprecated use WEBSITE_TYPES */
export const SITE_TYPES = WEBSITE_TYPES

const GROQ_MODEL = 'llama-3.1-70b-versatile'

function extractHtml(text) {
  let raw = String(text || '').trim().replace(/```html\n?/gi, '').replace(/```/g, '')
  const ds = raw.search(/<!DOCTYPE|<html/i)
  if (ds > 0) raw = raw.slice(ds)
  return raw.trim()
}

function extractChatText(j) {
  if (!j) return ''
  if (j.html) return j.html
  const block = j.content?.[0]
  if (block?.text) return block.text.trim()
  if (typeof j.content === 'string') return j.content.trim()
  return (j.choices?.[0]?.message?.content || '').trim()
}

function parseJsonLoose(text) {
  try { return JSON.parse(text) } catch (_e) {}
  const m = String(text || '').match(/\{[\s\S]*\}/)
  if (m) try { return JSON.parse(m[0]) } catch (_e2) {}
  return null
}

function networkMsg(e) {
  const m = String(e?.message || e || '')
  if (/network request failed|failed to fetch|network error/i.test(m)) {
    return 'Server unreachable — using backup generator. Redeploy AWS when you can.'
  }
  return m || 'Request failed'
}

async function hasAuth() {
  return !!(await AsyncStorage.getItem('auth-token'))
}

async function chatViaServer(system, user, max_tokens = 2500) {
  const res = await apiCall('/api/chat', {
    method: 'POST',
    body: JSON.stringify({
      system,
      messages: [{ role: 'user', content: user }],
      max_tokens,
      temperature: 0.4,
    }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.message || body.error || `HTTP ${res.status}`)
  return extractChatText(body)
}

async function chatViaGroq(system, user, max_tokens = 2500) {
  if (!GROQ_API_KEY) throw new Error('No Groq key for backup')
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      max_tokens,
      temperature: 0.4,
    }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body?.error?.message || `Groq ${res.status}`)
  return (body.choices?.[0]?.message?.content || '').trim()
}

async function aiText(system, user, max_tokens = 2500) {
  if (await hasAuth()) {
    try { return { text: await chatViaServer(system, user, max_tokens), via: 'server' } } catch (_e) {}
  }
  try { return { text: await chatViaGroq(system, user, max_tokens), via: 'groq' } } catch (_e) {}
  throw new Error('Sign in + online server needed, or check Groq backup key')
}

function buildLocalResumeHtml(form) {
  const name = form.name || 'Your Name'
  const title = form.tagline || 'Professional Title'
  const experience = form.experience || form.customBrief || 'Add your work history and regenerate for a full AI build.'
  const skills = form.skills || 'Skills will appear here'
  const education = form.education || ''
  const contact = form.contact || ''
  const skillTags = skills.split(/[,·|]/).map((s) => s.trim()).filter(Boolean).slice(0, 12)
  const skillHtml = skillTags.length
    ? skillTags.map((s) => `<span class="tag">${s}</span>`).join('')
    : `<span class="tag">${skills.slice(0, 40)}</span>`
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${name} — Resume</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}body{font-family:Georgia,'Times New Roman',serif;background:#fafafa;color:#1a1a1a;line-height:1.65}
.wrap{max-width:760px;margin:0 auto;padding:3rem 1.5rem 4rem}
header{border-bottom:2px solid #1a1a1a;padding-bottom:1.25rem;margin-bottom:2rem}
h1{font-size:clamp(2rem,5vw,2.75rem);font-weight:700;letter-spacing:-.02em}
.role{font-size:1.15rem;color:#555;margin-top:.35rem;font-style:italic}
.contact{margin-top:.75rem;font-size:.95rem;color:#666;font-family:system-ui,sans-serif}
section{margin-bottom:2rem}
h2{font-family:system-ui,sans-serif;font-size:.75rem;text-transform:uppercase;letter-spacing:.14em;color:#888;margin-bottom:.75rem}
.body{white-space:pre-wrap;font-size:1rem;color:#333}
.tags{display:flex;flex-wrap:wrap;gap:.5rem}
.tag{font-family:system-ui,sans-serif;font-size:.85rem;padding:.35rem .75rem;border:1px solid #ddd;border-radius:999px;background:#fff}
footer{text-align:center;font-size:.8rem;color:#aaa;margin-top:3rem;font-family:system-ui,sans-serif}
</style></head><body>
<div class="wrap">
<header><h1>${name}</h1><p class="role">${title}</p>${contact ? `<p class="contact">${contact}</p>` : ''}</header>
<section><h2>Experience</h2><div class="body">${experience}</div></section>
<section><h2>Skills</h2><div class="tags">${skillHtml}</div></section>
${education ? `<section><h2>Education</h2><div class="body">${education}</div></section>` : ''}
<footer>Generated with waifu.ai Create Studio</footer>
</div></body></html>`
}

function buildLocalSiteHtml(form) {
  if (form.siteType === 'resume') return buildLocalResumeHtml(form)

  const name = form.name || 'My Project'
  const tag = form.tagline || 'Built with waifu.ai Create Studio'
  const sym = form.symbol || name.slice(0, 4).toUpperCase()
  const accent = form.siteType === 'coin' ? '#00d4ff' : '#6c5ce7'
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${name}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}body{font-family:system-ui,sans-serif;background:#0a0a12;color:#eee;min-height:100vh}
nav{display:flex;justify-content:space-between;align-items:center;padding:1rem 2rem;border-bottom:1px solid rgba(255,255,255,.08)}
.logo{font-weight:800;font-size:1.2rem;color:${accent}}.hero{text-align:center;padding:4rem 1.5rem;max-width:720px;margin:0 auto}
h1{font-size:clamp(2rem,6vw,3.2rem);margin-bottom:.75rem;background:linear-gradient(90deg,#fff,${accent});-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.tag{font-size:1.15rem;opacity:.75;margin-bottom:2rem;line-height:1.5}
.btn{display:inline-block;padding:.85rem 1.6rem;border-radius:999px;background:${accent};color:#000;font-weight:700;text-decoration:none;margin:.35rem}
section{padding:3rem 1.5rem;max-width:720px;margin:0 auto;opacity:.9;line-height:1.7}
footer{text-align:center;padding:2rem;opacity:.4;font-size:.85rem}
</style></head><body>
<nav><div class="logo">${name}</div><div>${sym}</div></nav>
<section class="hero"><h1>${name}</h1><p class="tag">${tag}</p>
<a class="btn" href="#">Get started</a></section>
<section><p>${form.customBrief || 'Your launch page — regenerate with AI when the server is online for a full custom build.'}</p></section>
<footer>Not financial advice · DYOR</footer></body></html>`
}

function buildLocalMarketing(form) {
  const sym = form.symbol || form.name
  return {
    thread: [
      `Introducing ${form.name} ($${sym}) — ${form.tagline || 'community powered'}`,
      `Why ${form.name}? Real team, real vision. We're building in public.`,
      `How to join: follow, RT, and hop in the TG. Link in bio.`,
    ],
    tgAnnouncement: `🚀 ${form.name} ($${sym}) is live!\n${form.tagline || ''}\nCommunity first. DYOR.`,
    shillReplies: ['This looks clean 👀', 'Aped a bag, vibes are good', 'Chart sending or what'],
    oneLiners: [`${sym} season`, `${form.name} to the moon vibes`, 'Early gang'],
    hashtags: [`#${sym}`, '#crypto', '#memecoin'],
  }
}

export async function generateSite(form) {
  const prompt = form.siteType === 'resume'
    ? `Build a single-page print-ready HTML resume / CV document for PDF export.
Name: ${form.name}
Title: ${form.tagline || ''}
Experience:
${form.experience || form.customBrief || ''}
Skills: ${form.skills || ''}
${form.education ? 'Education:\n' + form.education : ''}
${form.contact ? 'Contact: ' + form.contact : ''}
Professional typography, A4/Letter print layout, no navigation or website chrome, sections for experience/skills/education only. Output ONLY raw HTML from <!DOCTYPE to </html>. No markdown.`
    : `Build a complete single-file HTML ${form.siteType} website.
Name: ${form.name}
${form.symbol ? 'Ticker: $' + form.symbol : ''}
Tagline: ${form.tagline || ''}
${form.customBrief ? 'Notes: ' + form.customBrief : ''}
Dark premium style, responsive, hero + about + CTA. Output ONLY raw HTML from <!DOCTYPE to </html>. No markdown.`

  try {
    const res = await apiCall('/launch/build-site', {
      method: 'POST',
      body: JSON.stringify(form),
    })
    const body = await res.json().catch(() => ({}))
    if (res.ok && body?.success && body.html) return body
  } catch (e) {
    // fall through
  }

  try {
    const { text, via } = await aiText(
      'You are an elite web designer. Output only valid HTML documents, no commentary.',
      prompt,
      4000,
    )
    const html = extractHtml(text)
    if (html.length > 400 && /<\/html>/i.test(html)) {
      return { success: true, html, via, note: via === 'groq' ? 'Generated via Groq backup' : undefined }
    }
  } catch (_e) {}

  const html = buildLocalSiteHtml(form)
  return { success: true, html, via: 'local', note: 'Offline template — redeploy AWS for full AI site' }
}

export async function generateLogo(form) {
  try {
    const res = await apiCall('/launch/generate-art', {
      method: 'POST',
      body: JSON.stringify(form),
    })
    const body = await res.json().catch(() => ({}))
    if (res.ok && body?.success) return body
    if (res.status === 402) return { success: false, error: body.message || 'Need image credits' }
  } catch (_e) {}

  try {
    const prompt = `A clean bold crypto token logo for "${form.name}" ($${form.symbol || form.name}). ${form.tagline || ''}. Circular emblem, vibrant, high contrast.`
    const res = await apiCall('/ai/image', {
      method: 'POST',
      body: JSON.stringify({ prompt }),
    })
    const body = await res.json().catch(() => ({}))
    if (res.ok && body?.imageBase64) {
      return { success: true, imageBase64: body.imageBase64, dataUri: 'data:image/png;base64,' + body.imageBase64 }
    }
    if (res.status === 402) return { success: false, error: body.message || 'Need image credits' }
  } catch (e) {
    return { success: false, error: networkMsg(e) }
  }
  return { success: false, error: 'Logo needs server online + sign in (Gemini credits)' }
}

export async function generateMarketingPack(form) {
  const user = `Create a crypto launch marketing pack for ${form.name} ($${form.symbol || form.name}). Tagline: ${form.tagline || ''}.
Reply ONLY JSON: {"thread":["8 tweets"],"tgAnnouncement":"...","shillReplies":["3"],"oneLiners":["5"],"hashtags":["8"]}`

  try {
    const res = await apiCall('/launch/marketing-pack', {
      method: 'POST',
      body: JSON.stringify(form),
    })
    const body = await res.json().catch(() => ({}))
    if (res.ok && body?.success) return body
  } catch (_e) {}

  try {
    const { text, via } = await aiText(
      'You are a crypto marketing strategist. Reply with JSON only, no markdown.',
      user,
      2000,
    )
    const pack = parseJsonLoose(text)
    if (pack?.thread) return { success: true, pack, via }
  } catch (_e) {}

  return { success: true, pack: buildLocalMarketing(form), via: 'local', note: 'Offline templates' }
}
