import { apiCall } from '../utils/api'

export const BUCKET_LABELS = {
  daily: 'Daily RSI',
  main: 'Main scanner',
  scalp: 'Scalp',
  manual: 'Manual / voice',
  other: 'Other',
}

export async function fetchAllocations() {
  try {
    const res = await apiCall('/allocations')
    if (res.status === 401) return { auth: false }
    if (!res.ok) return null
    return res.json()
  } catch (_e) { return null }
}

export async function saveAllocations(alloc) {
  try {
    const res = await apiCall('/allocations', { method: 'PUT', body: JSON.stringify(alloc) })
    if (!res.ok) return { success: false }
    return { success: true, ...(await res.json()) }
  } catch (e) { return { success: false, error: e.message } }
}

export async function fetchBucketUsage() {
  try {
    const res = await apiCall('/allocations/usage')
    if (!res.ok) return null
    return res.json()
  } catch (_e) { return null }
}
