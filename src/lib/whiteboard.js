import { apiCall } from '../utils/api'

export async function teachOnWhiteboard(topic) {
  try {
    const res = await apiCall('/whiteboard/teach', {
      method: 'POST',
      body: JSON.stringify({ topic }),
    })
    const body = await res.json()
    if (!res.ok) return { success: false, error: body.error || `HTTP ${res.status}` }
    return body
  } catch (e) {
    return { success: false, error: e.message || 'Whiteboard unavailable' }
  }
}
