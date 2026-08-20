import { apiCall } from '../utils/api'

export const DEFAULT_SNIPER_SETTINGS = {
  slippage: 15,
  tpPct: 100,
  slPct: 30,
  autoSnipeEnabled: false,
  minLiquidityUsd: 15000,
  maxTokenAgeHours: 48,
  priorityFeeGwei: 3,
  antiRugEnabled: true,
  copySnipeEnabled: false,
  copySnipeUsd: 50,
  presets: [25, 50, 100, 250],
}

export async function fetchSnipeState() {
  try {
    const res = await apiCall('/snipes')
    if (res.status === 401) return { auth: false }
    if (!res.ok) return { positions: [], settings: DEFAULT_SNIPER_SETTINGS }
    return res.json()
  } catch (_e) {
    return { positions: [], settings: DEFAULT_SNIPER_SETTINGS }
  }
}

export async function saveSnipeSettings(settings) {
  try {
    const res = await apiCall('/snipes/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    })
    return res.json()
  } catch (e) {
    return { success: false, error: e.message }
  }
}

export async function addWatchlist(ca, usd = 50, label = '') {
  const res = await apiCall('/snipes/watchlist', {
    method: 'POST',
    body: JSON.stringify({ ca, usd, label }),
  })
  return res.json()
}

export async function removeWatchlist(id) {
  const res = await apiCall(`/snipes/watchlist/${id}`, { method: 'DELETE' })
  return res.json()
}

export async function addCopyWallet(address, chain = 'bsc', label = 'Whale') {
  const res = await apiCall('/snipes/copy-wallets', {
    method: 'POST',
    body: JSON.stringify({ address, chain, label }),
  })
  return res.json()
}

export async function removeCopyWallet(id) {
  const res = await apiCall(`/snipes/copy-wallets/${id}`, { method: 'DELETE' })
  return res.json()
}

export async function addLimitOrder({ ca, targetPrice, usd = 50, side = 'buy' }) {
  const res = await apiCall('/snipes/limit-orders', {
    method: 'POST',
    body: JSON.stringify({ ca, targetPrice, usd, side }),
  })
  return res.json()
}

export async function removeLimitOrder(id) {
  const res = await apiCall(`/snipes/limit-orders/${id}`, { method: 'DELETE' })
  return res.json()
}

export async function runAutomation() {
  try {
    const res = await apiCall('/snipes/automation/run', { method: 'POST', body: '{}' })
    return res.json()
  } catch (e) {
    return { success: false, error: e.message }
  }
}
