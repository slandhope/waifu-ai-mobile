import AsyncStorage from '@react-native-async-storage/async-storage'
import { apiCall } from '../utils/api'

const CHAT_KEY = 'waifu-chat-log-v1'
const CHAT_CAP = 5000
const SYNC_WIRE_CAP = 800

function mergeChatLogs(a, b) {
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
  pushChatSoon()
  return trimmed
}

export async function appendChatMessage(role, text) {
  if (!text) return await loadChatLog()
  const log = await loadChatLog()
  log.push(toPcEntry(role, text))
  const trimmed = log.length > CHAT_CAP ? log.slice(-CHAT_CAP) : log
  await saveChatLog(trimmed)
  pushChatSoon()
  return trimmed
}

async function pushChatToCloud() {
  try {
    const token = await AsyncStorage.getItem('auth-token')
    if (!token) return false

    const res = await apiCall('/state')
    if (res.status === 401) return false
    if (!res.ok) return false

    const cloud = await res.json()
    const cloudMem = cloud?.memory || {}
    const cloudSync = cloudMem.__sync || {}
    const localChat = await loadChatLog()
    const mergedChat = mergeChatLogs(localChat, cloudSync.chatLog || [])

    if (mergedChat.length !== localChat.length) {
      await saveChatLog(mergedChat)
    }

    const newMemory = {
      ...cloudMem,
      __sync: {
        ...cloudSync,
        v: 2,
        chatLog: mergedChat.slice(-SYNC_WIRE_CAP),
      },
    }

    const patch = await apiCall('/state', {
      method: 'PATCH',
      body: JSON.stringify({
        memory: newMemory,
        updatedAt: Math.max(Date.now(), cloud.updatedAt || 0),
      }),
    })
    return patch.ok
  } catch (e) {
    console.log('[chatSync] push skipped:', e.message)
    return false
  }
}

export async function pullChatFromCloud() {
  try {
    const token = await AsyncStorage.getItem('auth-token')
    if (!token) return null

    const res = await apiCall('/state')
    if (res.status === 401 || !res.ok) return null

    const cloud = await res.json()
    const cloudChat = cloud?.memory?.__sync?.chatLog || []
    if (!cloudChat.length) return await loadChatLog()

    const localChat = await loadChatLog()
    const merged = mergeChatLogs(localChat, cloudChat)
    await saveChatLog(merged)

    if (merged.length > localChat.length) {
      pushChatToCloud().catch(() => {})
    }
    return merged
  } catch (e) {
    console.log('[chatSync] pull skipped:', e.message)
    return null
  }
}

let _pushTimer = null
export function pushChatSoon(ms = 2000) {
  clearTimeout(_pushTimer)
  _pushTimer = setTimeout(() => { pushChatToCloud().catch(() => {}) }, ms)
}

export async function getApiHistoryForReply(limit = 20) {
  const log = await loadChatLog()
  return toApiHistory(log, limit)
}
