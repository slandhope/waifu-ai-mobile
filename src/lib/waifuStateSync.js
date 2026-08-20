import AsyncStorage from '@react-native-async-storage/async-storage'
import {
  applyDecay,
  careToCloudPayload,
  defaultCareState,
  mergeCloudIntoCare,
} from './waifuCare'
import { apiCall } from '../utils/api'

const STORAGE_KEY = 'waifu-care-v1'

export async function loadLocalCare() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY)
    if (raw) return applyDecay({ ...defaultCareState(), ...JSON.parse(raw) })
  } catch (_e) {}
  return defaultCareState()
}

export async function saveLocalCare(care) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(care))
}

export function careToState(care) {
  return careToCloudPayload(care)
}

export async function fetchCloudState() {
  const res = await apiCall('/state')
  if (res.status === 401) return null
  if (!res.ok) throw new Error(`state fetch failed (${res.status})`)
  return res.json()
}

export async function pushCloudState(care) {
  const body = careToState(care)
  const res = await apiCall('/state', { method: 'PUT', body: JSON.stringify(body) })
  if (res.status === 401) return { ok: false, auth: false }
  if (res.status === 409) {
    const data = await res.json()
    if (data?.server) {
      const merged = mergeCloudIntoCare(care, data.server)
      const retry = await apiCall('/state', { method: 'PUT', body: JSON.stringify(careToState(merged)) })
      if (retry.ok) return { ok: true, care: merged, merged: true }
    }
    return { ok: false, stale: true }
  }
  if (!res.ok) throw new Error(`state push failed (${res.status})`)
  return { ok: true, care }
}

export async function pullAndMergeCare(localCare) {
  try {
    const cloud = await fetchCloudState()
    if (!cloud) return { care: localCare, synced: false }
    const localTs = localCare.lastTick || 0
    const cloudTs = cloud.updatedAt || 0
    if (cloudTs >= localTs) {
      const merged = mergeCloudIntoCare(localCare, cloud)
      await saveLocalCare(merged)
      return { care: merged, synced: true, source: 'cloud' }
    }
    const push = await pushCloudState(localCare)
    if (push.care) await saveLocalCare(push.care)
    return { care: push.care || localCare, synced: push.ok, source: 'local' }
  } catch (e) {
    console.log('[waifuStateSync] pull skipped:', e.message)
    return { care: localCare, synced: false }
  }
}

export async function persistCare(care, push = true) {
  await saveLocalCare(care)
  if (!push) return care
  try {
    const result = await pushCloudState(care)
    if (result.care) {
      await saveLocalCare(result.care)
      return result.care
    }
  } catch (e) {
    console.log('[waifuStateSync] push skipped:', e.message)
  }
  return care
}
