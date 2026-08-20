import AsyncStorage from '@react-native-async-storage/async-storage'

const WATCH_KEY = 'market-watchlist-v1'
const HIDDEN_KEY = 'market-hidden-v1'

export async function getWatchlist() {
  try {
    const raw = await AsyncStorage.getItem(WATCH_KEY)
    if (raw) return JSON.parse(raw)
  } catch (_e) {}
  return []
}

export async function getHiddenCoins() {
  try {
    const raw = await AsyncStorage.getItem(HIDDEN_KEY)
    if (raw) return JSON.parse(raw)
  } catch (_e) {}
  return []
}

export async function saveWatchlist(ids) {
  await AsyncStorage.setItem(WATCH_KEY, JSON.stringify(ids))
}

async function saveHidden(ids) {
  await AsyncStorage.setItem(HIDDEN_KEY, JSON.stringify(ids))
}

/** New coins go to the front of the list */
export async function addToWatchlist(coinId) {
  const list = await getWatchlist()
  const next = [coinId, ...list.filter((id) => id !== coinId)]
  await saveWatchlist(next)
  const hidden = (await getHiddenCoins()).filter((id) => id !== coinId)
  await saveHidden(hidden)
  return next
}

export async function removeFromWatchlist(coinId) {
  const next = (await getWatchlist()).filter((id) => id !== coinId)
  await saveWatchlist(next)
  return next
}

export async function clearWatchlist() {
  await saveWatchlist([])
  return []
}

/** Hide a default / top coin from the list (not in your pinned set) */
export async function hideCoin(coinId) {
  const hidden = await getHiddenCoins()
  if (hidden.includes(coinId)) return hidden
  const next = [...hidden, coinId]
  await saveHidden(next)
  await removeFromWatchlist(coinId)
  return next
}

export async function unhideCoin(coinId) {
  const next = (await getHiddenCoins()).filter((id) => id !== coinId)
  await saveHidden(next)
  return next
}

export function sortByWatchOrder(markets, watchIds) {
  const byId = new Map((markets || []).map((m) => [m.id, m]))
  return watchIds.map((id) => byId.get(id)).filter(Boolean)
}
