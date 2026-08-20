import AsyncStorage from '@react-native-async-storage/async-storage'
import { DeviceEventEmitter } from 'react-native'
import { apiCall } from '../utils/api'

export const SYNC_EXTRAS_APPLIED = 'sync-extras-applied'

const STEPS_KEY = 'fitness-steps-history-v1'
const RESUME_KEY = 'create-studio-resume-v1'
const WEBSITE_KEY = 'create-studio-website-draft-v1'
const HISTORY_KEY = 'create-studio-history-v1'
const REWARD_KEY = 'habit-rewards-day-v1'
const ALERT_SETTINGS_KEY = 'training-alert-settings-v1'
const ALERT_HISTORY_KEY = 'trading-alert-history-v1'
const CLARITY_KEY = 'clarity-data-v1'

function safeUri(uri) {
  if (!uri || typeof uri !== 'string') return null
  if (uri.startsWith('https://')) return uri
  return null
}

function mergeStepsHistory(a, b) {
  const out = { ...(a || {}) }
  for (const [day, n] of Object.entries(b || {})) {
    out[day] = Math.max(out[day] || 0, Number(n) || 0)
  }
  const keys = Object.keys(out).sort()
  if (keys.length > 90) keys.slice(0, keys.length - 90).forEach((k) => delete out[k])
  return out
}

function mergeById(a, b, cap = 50) {
  const map = new Map()
  for (const item of [...(a || []), ...(b || [])]) {
    if (!item) continue
    const id = item.id || `${item.ts || item.createdAt || 0}:${JSON.stringify(item).slice(0, 40)}`
    const prev = map.get(id)
    const ts = item.ts || item.createdAt || item.updatedAt || 0
    const prevTs = prev?.ts || prev?.createdAt || prev?.updatedAt || 0
    if (!prev || ts >= prevTs) map.set(id, item)
  }
  return [...map.values()].sort((x, y) => (y.ts || y.createdAt || 0) - (x.ts || x.createdAt || 0)).slice(0, cap)
}

function mergeCoachChat(a, b) {
  const map = new Map()
  for (const m of [...(a || []), ...(b || [])]) {
    if (!m) continue
    const text = m.content || m.text || ''
    const key = m.id || `${m.ts || 0}:${m.role}:${String(text).slice(0, 48)}`
    const prev = map.get(key)
    if (!prev || (m.ts || 0) >= (prev.ts || 0)) map.set(key, m)
  }
  return [...map.values()].sort((x, y) => (x.ts || 0) - (y.ts || 0)).slice(-200)
}

function mergeCreateStudio(local, remote) {
  local = local || {}
  remote = remote || {}
  const pickDraft = (l, r) => {
    if (!l) return r || null
    if (!r) return l
    return (r.updatedAt || 0) >= (l.updatedAt || 0) ? r : l
  }
  return {
    resumeProfile: pickDraft(local.resumeProfile, remote.resumeProfile),
    websiteDraft: pickDraft(local.websiteDraft, remote.websiteDraft),
    history: mergeById(local.history, remote.history, 12),
    updatedAt: Math.max(local.updatedAt || 0, remote.updatedAt || 0),
  }
}

function mergeUserPrefs(local, remote) {
  local = local || {}
  remote = remote || {}
  const useRemote = (remote.updatedAt || 0) >= (local.updatedAt || 0)
  const base = useRemote ? { ...local, ...remote } : { ...remote, ...local }
  return { ...base, updatedAt: Math.max(local.updatedAt || 0, remote.updatedAt || 0) }
}

function mergeHabitRewards(local, remote) {
  if (!local) return remote || null
  if (!remote) return local
  if (local.date !== remote.date) {
    const today = new Date().toISOString().split('T')[0]
    if (local.date === today) return local
    if (remote.date === today) return remote
    return local
  }
  return {
    date: local.date,
    habitIds: [...new Set([...(local.habitIds || []), ...(remote.habitIds || [])])],
    perfectDay: !!(local.perfectDay || remote.perfectDay),
    milestones: [...new Set([...(local.milestones || []), ...(remote.milestones || [])])],
  }
}

export function mergeSyncExtras(local, remote) {
  local = local || {}
  remote = remote || {}
  return {
    stepsHistory: mergeStepsHistory(local.stepsHistory, remote.stepsHistory),
    createStudio: mergeCreateStudio(local.createStudio, remote.createStudio),
    userPrefs: mergeUserPrefs(local.userPrefs, remote.userPrefs),
    coachChat: mergeCoachChat(local.coachChat, remote.coachChat),
    habitRewards: mergeHabitRewards(local.habitRewards, remote.habitRewards),
    tradingAlerts: {
      settings: { ...(remote.tradingAlerts?.settings || {}), ...(local.tradingAlerts?.settings || {}) },
      history: mergeById(local.tradingAlerts?.history, remote.tradingAlerts?.history, 50),
    },
    weeklyInsight: remote.weeklyInsight || local.weeklyInsight || null,
    updatedAt: Math.max(local.updatedAt || 0, remote.updatedAt || 0, Date.now()),
  }
}

export async function collectLocalExtras(coachChatOverride) {
  const [
    stepsRaw, resumeRaw, webRaw, histRaw, rewardRaw,
    alertSetRaw, alertHistRaw, clarityRaw,
    wallpaperId, avatarType, animalAvatar, avatarUri, googlePhoto,
  ] = await AsyncStorage.multiGet([
    STEPS_KEY, RESUME_KEY, WEBSITE_KEY, HISTORY_KEY, REWARD_KEY,
    ALERT_SETTINGS_KEY, ALERT_HISTORY_KEY, CLARITY_KEY,
    'wallpaper-id', 'avatar-type', 'animal-avatar', 'avatar-uri', 'google-photo',
  ])

  let coachChat = coachChatOverride
  if (!coachChat) {
    try {
      const cc = await AsyncStorage.getItem('coach-chat-v1')
      coachChat = cc ? JSON.parse(cc) : []
    } catch { coachChat = [] }
  }

  let weeklyInsight = null
  try {
    if (clarityRaw[1]) weeklyInsight = JSON.parse(clarityRaw[1]).weeklyInsight || null
  } catch {}

  return {
    stepsHistory: stepsRaw[1] ? JSON.parse(stepsRaw[1]) : {},
    createStudio: {
      resumeProfile: resumeRaw[1] ? JSON.parse(resumeRaw[1]) : null,
      websiteDraft: webRaw[1] ? JSON.parse(webRaw[1]) : null,
      history: histRaw[1] ? JSON.parse(histRaw[1]) : [],
      updatedAt: Date.now(),
    },
    userPrefs: {
      wallpaperId: wallpaperId[1] || 'default',
      avatarType: avatarType[1] || 'animal',
      animalAvatar: animalAvatar[1] || '🦊',
      avatarUri: safeUri(avatarUri[1]),
      googlePhoto: safeUri(googlePhoto[1]),
      updatedAt: Date.now(),
    },
    coachChat: coachChat || [],
    habitRewards: rewardRaw[1] ? JSON.parse(rewardRaw[1]) : null,
    tradingAlerts: {
      settings: alertSetRaw[1] ? JSON.parse(alertSetRaw[1]) : null,
      history: alertHistRaw[1] ? JSON.parse(alertHistRaw[1]) : [],
    },
    weeklyInsight,
    updatedAt: Date.now(),
  }
}

export async function applyLocalExtras(extras) {
  if (!extras) return
  const ops = []

  if (extras.stepsHistory) {
    ops.push([STEPS_KEY, JSON.stringify(extras.stepsHistory)])
  }
  if (extras.createStudio) {
    const cs = extras.createStudio
    if (cs.resumeProfile) ops.push([RESUME_KEY, JSON.stringify(cs.resumeProfile)])
    if (cs.websiteDraft) ops.push([WEBSITE_KEY, JSON.stringify(cs.websiteDraft)])
    if (cs.history) ops.push([HISTORY_KEY, JSON.stringify(cs.history)])
  }
  if (extras.userPrefs) {
    const p = extras.userPrefs
    if (p.wallpaperId) ops.push(['wallpaper-id', p.wallpaperId])
    if (p.avatarType) ops.push(['avatar-type', p.avatarType])
    if (p.animalAvatar) ops.push(['animal-avatar', p.animalAvatar])
    if (p.avatarUri) ops.push(['avatar-uri', p.avatarUri])
    if (p.googlePhoto) ops.push(['google-photo', p.googlePhoto])
  }
  if (extras.coachChat?.length) {
    ops.push(['coach-chat-v1', JSON.stringify(extras.coachChat)])
  }
  if (extras.habitRewards) {
    ops.push([REWARD_KEY, JSON.stringify(extras.habitRewards)])
  }
  if (extras.tradingAlerts) {
    if (extras.tradingAlerts.settings) {
      ops.push(['trading-alert-settings-v1', JSON.stringify(extras.tradingAlerts.settings)])
    }
    if (extras.tradingAlerts.history) {
      ops.push(['trading-alert-history-v1', JSON.stringify(extras.tradingAlerts.history)])
    }
  }
  if (extras.weeklyInsight != null) {
    try {
      const raw = await AsyncStorage.getItem(CLARITY_KEY)
      const data = raw ? JSON.parse(raw) : {}
      data.weeklyInsight = extras.weeklyInsight
      ops.push([CLARITY_KEY, JSON.stringify(data)])
    } catch {}
  }
  if (ops.length) await AsyncStorage.multiSet(ops)
  DeviceEventEmitter.emit(SYNC_EXTRAS_APPLIED, extras)
}

export async function pullExtrasFromServer(serverData) {
  if (!serverData?.syncExtras) return null
  const local = await collectLocalExtras()
  const merged = mergeSyncExtras(local, serverData.syncExtras)
  await applyLocalExtras(merged)
  return merged
}

export async function pushExtrasToCloud(extrasPayload) {
  try {
    const token = await AsyncStorage.getItem('auth-token')
    if (!token) return false
    const payload = extrasPayload || await collectLocalExtras()
    const res = await apiCall('/api/sync', {
      method: 'POST',
      body: JSON.stringify({ syncExtras: payload }),
    })
    return res.ok
  } catch (e) {
    console.log('[extrasSync] push skipped:', e.message)
    return false
  }
}

let _timer = null
export function pushExtrasSoon(ms = 2500) {
  clearTimeout(_timer)
  _timer = setTimeout(() => { pushExtrasToCloud().catch(() => {}) }, ms)
}
