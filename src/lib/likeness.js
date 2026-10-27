import * as DocumentPicker from 'expo-document-picker'
import * as FileSystem from 'expo-file-system/legacy'
import { apiCall } from '../utils/api'

let cached = null

export function getCachedLikeness() {
  return cached
}

export function replyDelayMs(like = cached) {
  const t = like && like.enabled && like.style && like.style.timing
  if (!t) return 0
  const hour = new Date().getHours()
  const byHour = Array.isArray(t.byHourMs) ? Number(t.byHourMs[hour]) : 0
  return Math.max(400, Math.min(4500, byHour || Number(t.delayMs) || 800))
}

export function splitReplicaBubbles(text, on) {
  if (!text) return []
  if (on) {
    const bubbles = String(text).split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean)
    if (bubbles.length > 1) return bubbles.slice(0, 5)
  }
  return [String(text).trim()].filter(Boolean)
}

async function jsonCall(path, { method = 'GET', body, timeoutMs } = {}) {
  const ac = timeoutMs ? new AbortController() : null
  const t = timeoutMs ? setTimeout(() => ac.abort(), timeoutMs) : null
  try {
    const res = await apiCall(path, {
      method,
      body: body != null ? JSON.stringify(body) : undefined,
      signal: ac ? ac.signal : undefined,
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.message || data.error || `HTTP ${res.status}`)
    return data
  } catch (e) {
    if (e && e.name === 'AbortError') throw new Error('that took too long — try wifi')
    throw e
  } finally {
    if (t) clearTimeout(t)
  }
}

export async function refreshLikeness() {
  const r = await jsonCall('/asuka/likeness')
  cached = r.likeness || null
  return cached
}

export async function setLikeness(patch) {
  const r = await jsonCall('/asuka/likeness/set', { method: 'POST', body: patch })
  cached = r.likeness || cached
  return cached
}

export async function editLikenessMemory(patch) {
  const r = await jsonCall('/asuka/likeness/memory', { method: 'POST', body: patch })
  cached = r.likeness || cached
  return cached
}

export async function clearLikeness() {
  const r = await jsonCall('/asuka/likeness/clear', { method: 'POST', body: {} })
  cached = r.likeness || null
  return cached
}

export async function importLikenessChats(files) {
  return jsonCall('/asuka/likeness/import', { method: 'POST', body: { files }, timeoutMs: 120000 })
}

export async function chooseLikenessSpeaker(speaker) {
  const r = await jsonCall('/asuka/likeness/choose', { method: 'POST', body: { speaker }, timeoutMs: 180000 })
  cached = r.likeness || cached
  return r
}

export async function cloneLikenessVoice(name, samples) {
  return jsonCall('/ai/voice-clone', { method: 'POST', body: { name, samples }, timeoutMs: 120000 })
}

function mimeFor(name = '') {
  const n = String(name).toLowerCase()
  if (n.endsWith('.wav')) return 'audio/wav'
  if (n.endsWith('.m4a') || n.endsWith('.mp4')) return 'audio/mp4'
  return 'audio/mpeg'
}

export async function pickChatFiles() {
  const picked = await DocumentPicker.getDocumentAsync({
    type: ['text/plain', 'text/*', 'public.plain-text', 'public.text', '*/*'],
    copyToCacheDirectory: true,
    multiple: true,
  })
  if (picked.canceled) return { cancelled: true }
  const assets = picked.assets || []
  if (assets.some((a) => /\.zip$/i.test(a.name || a.uri || ''))) {
    throw new Error('Unzip that export and pick the .txt inside — no zip, no media.')
  }
  const files = []
  for (const a of assets) {
    const text = await FileSystem.readAsStringAsync(a.uri, { encoding: 'utf8' })
    files.push({ name: a.name || 'chat.txt', text })
  }
  return { files }
}

export async function pickVoiceClips() {
  const picked = await DocumentPicker.getDocumentAsync({
    type: ['audio/*', 'audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/x-m4a'],
    copyToCacheDirectory: true,
    multiple: true,
  })
  if (picked.canceled) return { cancelled: true }
  const assets = (picked.assets || []).slice(0, 5)
  const samples = []
  for (const a of assets) {
    const info = await FileSystem.getInfoAsync(a.uri)
    if (info.size && info.size < 8000) continue
    if (info.size && info.size > 12 * 1024 * 1024) throw new Error('Each clip must be under 12 MB.')
    const audioBase64 = await FileSystem.readAsStringAsync(a.uri, { encoding: 'base64' })
    samples.push({
      name: a.name || 'sample.mp3',
      mime: a.mimeType || mimeFor(a.name),
      audioBase64,
    })
  }
  if (!samples.length) throw new Error('Need a longer clip — at least a few seconds of clear speech.')
  return { samples }
}
