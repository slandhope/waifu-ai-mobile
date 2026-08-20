import AsyncStorage from '@react-native-async-storage/async-storage'

const CHAT_KEY = 'waifu-chat-log-v1'
const CHAT_CAP = 5000

export function mergeChatLogs(a, b) {
  const map = new Map()
  for (const m of [...(a || []), ...(b || [])]) {
    if (!m?.text) continue
    const key = m.id || `${m.ts || 0}:${m.role}:${String(m.text).slice(0, 48)}`
    const prev = map.get(key)
    if (!prev || (m.ts || 0) >= (prev.ts || 0)) map.set(key, m)
  }
  return [...map.values()].sort((x, y) => (x.ts || 0) - (y.ts || 0)).slice(-CHAT_CAP)
}

export function toPcEntry(role, text) {
  const ts = Date.now()
  return {
    id: `${ts}-${Math.random().toString(36).slice(2, 8)}`,
    role: role === 'user' ? 'user' : 'asuka',
    text: String(text),
    ts,
    device: 'phone',
    time: new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  }
}

export function toApiHistory(pcLog, limit = 20) {
  return (pcLog || [])
    .filter((m) => m?.text)
    .slice(-limit)
    .map((m) => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.text,
    }))
}

export async function loadChatLog() {
  try {
    const raw = await AsyncStorage.getItem(CHAT_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

async function saveChatLog(log) {
  await AsyncStorage.setItem(CHAT_KEY, JSON.stringify(log))
}

export async function appendChatExchange(userText, assistantText) {
  const log = await loadChatLog()
  if (userText) log.push(toPcEntry('user', userText))
  if (assistantText) log.push(toPcEntry('asuka', assistantText))
  const trimmed = log.length > CHAT_CAP ? log.slice(-CHAT_CAP) : log
  await saveChatLog(trimmed)
  import('./memorySync').then((m) => m.pushMemorySoon()).catch(() => {})
  return trimmed
}

export async function appendChatMessage(role, text) {
  if (!text) return await loadChatLog()
  const log = await loadChatLog()
  log.push(toPcEntry(role, text))
  const trimmed = log.length > CHAT_CAP ? log.slice(-CHAT_CAP) : log
  await saveChatLog(trimmed)
  import('./memorySync').then((m) => m.pushMemorySoon()).catch(() => {})
  return trimmed
}

export async function pullChatFromCloud() {
  const { pullMemoryFromCloud } = await import('./memorySync')
  return pullMemoryFromCloud()
}

let _pushTimer = null
export function pushChatSoon(ms = 2000) {
  clearTimeout(_pushTimer)
  _pushTimer = setTimeout(() => {
    import('./memorySync').then((m) => m.pushMemoryToCloud()).catch(() => {})
  }, ms)
}

export async function getApiHistoryForReply(limit = 20) {
  const log = await loadChatLog()
  return toApiHistory(log, limit)
}
