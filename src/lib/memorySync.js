import AsyncStorage from '@react-native-async-storage/async-storage'
import { apiCall } from '../utils/api'

const CHAT_KEY = 'waifu-chat-log-v1'
const CHAT_CAP = 5000
const SYNC_WIRE_CAP = 800
const MEMORY_CACHE_KEY = 'asuka-memory-cache-v1'

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

function mergeArraysByKey(a, b, keyFn, cap = 200) {
  const map = new Map()
  for (const item of [...(a || []), ...(b || [])]) {
    if (!item) continue
    const key = keyFn(item)
    const prev = map.get(key)
    const ts = item.timestamp || item.ts || 0
    const prevTs = prev?.timestamp || prev?.ts || 0
    if (!prev || ts >= prevTs) map.set(key, item)
  }
  return [...map.values()].sort((x, y) => (x.timestamp || x.ts || 0) - (y.timestamp || y.ts || 0)).slice(-cap)
}

function mergeLongMemory(a, b) {
  if (!a) return b || { fresh: [], medium: [], longterm: [], corefacts: [], lastCompressed: null }
  if (!b) return a
  const keyFn = (m) => `${m.timestamp || 0}:${String(m.summary || m.fact || '').slice(0, 40)}`
  return {
    fresh: mergeArraysByKey(a.fresh, b.fresh, keyFn, 100),
    medium: mergeArraysByKey(a.medium, b.medium, keyFn, 100),
    longterm: mergeArraysByKey(a.longterm, b.longterm, keyFn, 100),
    corefacts: mergeArraysByKey(a.corefacts, b.corefacts, (f) => String(f.fact || f).slice(0, 80), 100),
    lastCompressed: Math.max(a.lastCompressed || 0, b.lastCompressed || 0) || null,
  }
}

function mergeSyncBundles(local, cloud) {
  if (!local) return cloud
  if (!cloud) return local
  return {
    v: 2,
    chatLog: mergeChatLogs(local.chatLog, cloud.chatLog),
    longMemory: mergeLongMemory(local.longMemory, cloud.longMemory),
    brainMemories: mergeArraysByKey(local.brainMemories, cloud.brainMemories, (m) => m.id || `${m.timestamp}:${String(m.text).slice(0, 40)}`, 200),
    patterns: mergeArraysByKey(local.patterns, cloud.patterns, (p) => `${p.timestamp || 0}:${p.pattern}`, 100),
    journal: mergeArraysByKey(local.journal, cloud.journal, (e) => e.id || `${e.timestamp || e.ts || 0}:${String(e.text || e.entry || '').slice(0, 40)}`, 200),
    voiceJournal: mergeArraysByKey(local.voiceJournal, cloud.voiceJournal, (e) => e.id || `${e.timestamp || e.ts || 0}:${String(e.text || '').slice(0, 40)}`, 100),
    notes: mergeArraysByKey(local.notes, cloud.notes, (n) => `${n.timestamp}:${String(n.text).slice(0, 40)}`, 100),
    userProfile: {
      facts: [...new Set([...(local.userProfile?.facts || []), ...(cloud.userProfile?.facts || [])])].slice(-200),
    },
    episodes: mergeArraysByKey(local.episodes, cloud.episodes, (e) => e.id || `${e.ts || e.timestamp || 0}:${String(e.summary).slice(0, 40)}`, 80),
  }
}

export async function loadMemoryCache() {
  try {
    const raw = await AsyncStorage.getItem(MEMORY_CACHE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

async function saveMemoryCache(cache) {
  await AsyncStorage.setItem(MEMORY_CACHE_KEY, JSON.stringify(cache))
}

async function loadChatLogLocal() {
  try {
    const raw = await AsyncStorage.getItem(CHAT_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

async function buildLocalSyncBundle() {
  const chatLog = await loadChatLogLocal()
  const cache = await loadMemoryCache()
  return {
    v: 2,
    chatLog: chatLog.slice(-SYNC_WIRE_CAP),
    longMemory: cache.longMemory || null,
    brainMemories: cache.brainMemories || [],
    patterns: cache.patterns || [],
    journal: cache.journal || [],
    voiceJournal: cache.voiceJournal || [],
    notes: cache.notes || [],
    userProfile: cache.userProfile || { facts: [] },
    episodes: cache.episodes || [],
  }
}

export async function pullMemoryFromCloud() {
  try {
    const token = await AsyncStorage.getItem('auth-token')
    if (!token) return null

    const res = await apiCall('/state')
    if (res.status === 401 || !res.ok) return null

    const cloud = await res.json()
    const cloudSync = cloud?.memory?.__sync || {}
    const localBundle = await buildLocalSyncBundle()
    const merged = mergeSyncBundles(localBundle, cloudSync)

    const mergedChat = mergeChatLogs(localBundle.chatLog, cloudSync.chatLog || [])
    await AsyncStorage.setItem('waifu-chat-log-v1', JSON.stringify(mergedChat))

    await saveMemoryCache({
      longMemory: merged.longMemory,
      brainMemories: merged.brainMemories,
      patterns: merged.patterns,
      journal: merged.journal,
      voiceJournal: merged.voiceJournal,
      notes: merged.notes,
      userProfile: merged.userProfile,
      episodes: merged.episodes,
      updatedAt: Date.now(),
    })

    if (JSON.stringify(merged) !== JSON.stringify(localBundle)) {
      pushMemoryToCloud(merged).catch(() => {})
    }
    return merged
  } catch (e) {
    console.log('[memorySync] pull skipped:', e.message)
    return null
  }
}

export async function pushMemoryToCloud(mergedBundle) {
  try {
    const token = await AsyncStorage.getItem('auth-token')
    if (!token) return false

    const res = await apiCall('/state')
    if (res.status === 401) return false
    let cloudMem = {}
    let serverUpdatedAt = 0
    if (res.ok) {
      const state = await res.json()
      cloudMem = state?.memory || {}
      serverUpdatedAt = state?.updatedAt || 0
    }

    const bundle = mergedBundle || await buildLocalSyncBundle()
    const wire = {
      ...bundle,
      chatLog: (bundle.chatLog || []).slice(-SYNC_WIRE_CAP),
    }

    const newMemory = {
      ...cloudMem,
      __sync: wire,
    }

    const patch = await apiCall('/state', {
      method: 'PATCH',
      body: JSON.stringify({
        memory: newMemory,
        updatedAt: Math.max(Date.now(), serverUpdatedAt),
      }),
    })
    return patch.ok
  } catch (e) {
    console.log('[memorySync] push skipped:', e.message)
    return false
  }
}

let _memTimer = null
export function pushMemorySoon(ms = 2500) {
  clearTimeout(_memTimer)
  _memTimer = setTimeout(() => { pushMemoryToCloud().catch(() => {}) }, ms)
}
