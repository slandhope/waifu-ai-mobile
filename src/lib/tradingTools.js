import { apiCall } from '../utils/api'

export async function runWhatIf(form) {
  try {
    const res = await apiCall('/trading/what-if', { method: 'POST', body: JSON.stringify(form) })
    return res.json()
  } catch (e) { return { success: false, error: e.message } }
}

export async function runLiqGuard(form) {
  try {
    const res = await apiCall('/trading/liq-guard', { method: 'POST', body: JSON.stringify(form) })
    return res.json()
  } catch (e) { return null }
}

export async function runPositionDoctor(form) {
  try {
    const res = await apiCall('/trading/position-doctor', { method: 'POST', body: JSON.stringify(form) })
    return res.json()
  } catch (e) { return { success: false, error: e.message } }
}
