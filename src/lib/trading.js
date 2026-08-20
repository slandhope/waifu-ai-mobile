import AsyncStorage from '@react-native-async-storage/async-storage'
import { apiCall } from '../utils/api'

const MARKETS_CACHE_KEY = 'markets-cache-v1'
const CACHE_MS = 3 * 60 * 1000

const COIN_META = {
  bitcoin: { symbol: 'BTC', name: 'Bitcoin', image: 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png' },
  ethereum: { symbol: 'ETH', name: 'Ethereum', image: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png' },
  solana: { symbol: 'SOL', name: 'Solana', image: 'https://assets.coingecko.com/coins/images/4128/small/solana.png' },
  binancecoin: { symbol: 'BNB', name: 'BNB', image: 'https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png' },
  ripple: { symbol: 'XRP', name: 'XRP', image: 'https://assets.coingecko.com/coins/images/44/small/xrp-symbol-white-128.png' },
  dogecoin: { symbol: 'DOGE', name: 'Dogecoin', image: 'https://assets.coingecko.com/coins/images/5/small/dogecoin.png' },
  cardano: { symbol: 'ADA', name: 'Cardano', image: 'https://assets.coingecko.com/coins/images/975/small/cardano.png' },
  'avalanche-2': { symbol: 'AVAX', name: 'Avalanche', image: 'https://assets.coingecko.com/coins/images/12559/small/Avalanche_Circle_RedWhite_Trans.png' },
  chainlink: { symbol: 'LINK', name: 'Chainlink', image: 'https://assets.coingecko.com/coins/images/877/small/chainlink-new-logo.png' },
  polkadot: { symbol: 'DOT', name: 'Polkadot', image: 'https://assets.coingecko.com/coins/images/12171/small/polkadot.png' },
}

async function loadMarketsCache() {
  try {
    const raw = await AsyncStorage.getItem(MARKETS_CACHE_KEY)
    if (!raw) return null
    const { data, ts } = JSON.parse(raw)
    if (Date.now() - ts < CACHE_MS && Array.isArray(data) && data.length) return data
  } catch (_e) {}
  return null
}

async function saveMarketsCache(data) {
  try {
    await AsyncStorage.setItem(MARKETS_CACHE_KEY, JSON.stringify({ data, ts: Date.now() }))
  } catch (_e) {}
}

async function fetchMarketsBinance(ids) {
  const unique = [...new Set(ids)].filter((id) => COIN_META[id])
  const pairs = unique.map((id) => COIN_META[id].symbol + 'USDT')
  if (!pairs.length) return []
  try {
    const url = 'https://api.binance.com/api/v3/ticker/24hr?symbols=' + encodeURIComponent(JSON.stringify(pairs))
    const res = await fetch(url)
    const tickers = await res.json()
    if (!Array.isArray(tickers)) return []
    const bySym = Object.fromEntries(tickers.map((t) => [t.symbol, t]))
    return unique.map((id) => {
      const meta = COIN_META[id]
      const t = bySym[meta.symbol + 'USDT']
      if (!t) return null
      return {
        id,
        symbol: meta.symbol.toLowerCase(),
        name: meta.name,
        image: meta.image,
        current_price: parseFloat(t.lastPrice),
        price_change_percentage_24h: parseFloat(t.priceChangePercent),
      }
    }).filter(Boolean)
  } catch (_e) {
    return []
  }
}

export async function fetchTradingStats() {
  try {
    const res = await apiCall('/stats')
    if (res.status === 401) return { auth: false }
    if (!res.ok) return null
    return { auth: true, ...(await res.json()) }
  } catch (_e) {
    return null
  }
}

export async function fetchTrades() {
  try {
    const res = await apiCall('/trades')
    if (res.status === 401) return { auth: false }
    if (!res.ok) return null
    return { auth: true, ...(await res.json()) }
  } catch (_e) {
    return null
  }
}

export async function fetchSignals() {
  try {
    const res = await apiCall('/signals')
    if (res.status === 401) return { auth: false }
    if (!res.ok) return null
    return { auth: true, ...(await res.json()) }
  } catch (_e) {
    return null
  }
}

export function fmtUsd(n) {
  if (n == null || Number.isNaN(n)) return '—'
  const v = Number(n)
  if (Math.abs(v) >= 1_000_000) return '$' + (v / 1_000_000).toFixed(2) + 'M'
  if (Math.abs(v) >= 1000) return '$' + v.toLocaleString('en-US', { maximumFractionDigits: 0 })
  if (Math.abs(v) >= 1) return '$' + v.toFixed(2)
  return '$' + v.toFixed(4)
}

export function tierColor(tier) {
  const t = String(tier || '').toLowerCase()
  if (t.includes('power buy')) return '#22c55e'
  if (t === 'buy') return '#34d399'
  if (t.includes('power sell')) return '#ef4444'
  if (t === 'sell') return '#fb7185'
  return 'rgba(0,0,0,0.45)'
}

export function isOpenTrade(t) {
  return t?.status === 'open' || (!t?.closed && !['win', 'loss', 'closed'].includes(t?.status))
}

export async function fetchCallerSignals() {
  try {
    const res = await apiCall('/signals/callers')
    if (res.status === 401) return { auth: false }
    if (res.status === 404) return { auth: true, signals: [], callerStats: {} }
    if (!res.ok) return null
    return { auth: true, ...(await res.json()) }
  } catch (_e) {
    return null
  }
}

export async function closeTrade(tradeId) {
  const res = await apiCall(`/trades/${encodeURIComponent(tradeId)}/close`, { method: 'POST' })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) return { success: false, error: body.error || `HTTP ${res.status}` }
  return body
}

export async function editTrade(tradeId, action, value) {
  const res = await apiCall(`/trades/${encodeURIComponent(tradeId)}`, {
    method: 'PATCH',
    body: JSON.stringify({ action, value }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) return { success: false, error: body.error || `HTTP ${res.status}` }
  return body
}

export function enrichOpenTrades(open, markets) {
  const symMap = {}
  for (const m of markets || []) {
    symMap[(m.symbol || '').toUpperCase()] = m.current_price
  }
  const coinMap = {
    BTC: 'bitcoin', ETH: 'ethereum', SOL: 'solana', BNB: 'binancecoin',
    XRP: 'ripple', DOGE: 'dogecoin', ADA: 'cardano', AVAX: 'avalanche-2',
    LINK: 'chainlink', DOT: 'polkadot',
  }
  return open.map((t) => {
    if (t.unrealizedPnl != null) return t
    const sym = (t.coin || '').toUpperCase()
    let px = symMap[sym]
    if (!px) {
      const id = coinMap[sym]
      const m = markets?.find((x) => x.id === id)
      px = m?.current_price
    }
    if (!px || !t.entry) return t
    const lev = t.leverage || 1
    const diff = t.direction === 'short' ? t.entry - px : px - t.entry
    const unrealizedPnl = (t.size || 0) * (diff / t.entry) * lev
    return { ...t, currentPrice: px, unrealizedPnl: parseFloat(unrealizedPnl.toFixed(2)) }
  })
}

export function summarizeTrades(data, markets) {
  const trades = data?.trades || []
  let open = trades.filter(isOpenTrade)
  open = enrichOpenTrades(open, markets)
  const closed = trades.filter((t) => !isOpenTrade(t))
  const wins = closed.filter((t) => (t.pnl || 0) > 0).length
  const totalPnl = closed.reduce((s, t) => s + (t.pnl || 0), 0)
  const unrealized = open.reduce((s, t) => s + (t.unrealizedPnl ?? t.pnl ?? 0), 0)
  return {
    open,
    closed: closed.slice(0, 15),
    wins,
    losses: closed.length - wins,
    winRate: closed.length ? Math.round((wins / closed.length) * 100) : 0,
    totalPnl,
    unrealized,
  }
}

const MARKET_IDS = ['bitcoin', 'ethereum', 'solana', 'binancecoin', 'ripple', 'dogecoin', 'cardano', 'avalanche-2', 'chainlink', 'polkadot']

/** Always show these on Overview (BTC, ETH, SOL, …) */
export const SNAPSHOT_IDS = ['bitcoin', 'ethereum', 'solana', 'binancecoin', 'ripple']

export function pickMarketSnapshot(markets, watchIds = [], hiddenIds = []) {
  const list = Array.isArray(markets) ? markets : []
  const hidden = new Set(hiddenIds || [])
  const byId = new Map(list.map((m) => [m.id, m]))
  const pinned = watchIds.map((id) => byId.get(id)).filter(Boolean)
  const picked = SNAPSHOT_IDS
    .map((id) => byId.get(id))
    .filter((m) => m && !watchIds.includes(m.id) && !hidden.has(m.id))
  const combined = [...pinned, ...picked]
  if (combined.length >= 1) return combined.slice(0, 5)
  return list.filter((m) => !hidden.has(m.id)).slice(0, 5)
}

export async function fetchMarkets(extraIds = []) {
  const ids = [...new Set([...MARKET_IDS, ...(extraIds || [])])]
  const cached = await loadMarketsCache()

  try {
    const res = await apiCall('/markets?ids=' + encodeURIComponent(ids.join(',')))
    if (res.ok) {
      const body = await res.json()
      if (Array.isArray(body?.markets) && body.markets.length) {
        await saveMarketsCache(body.markets)
        return body.markets
      }
    }
  } catch (_e) {}

  const binance = await fetchMarketsBinance(ids)
  if (binance.length) {
    await saveMarketsCache(binance)
    return binance
  }

  if (cached) return cached
  return []
}

export async function searchCoins(query) {
  const q = String(query || '').trim()
  if (!q) return []
  try {
    const res = await apiCall('/markets/search?q=' + encodeURIComponent(q))
    if (res.ok) {
      const body = await res.json()
      if (Array.isArray(body?.coins)) return body.coins
    }
  } catch (_e) {}
  try {
    const res = await fetch(`https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(q)}`)
    const j = await res.json()
    return (j.coins || []).slice(0, 10).map((c) => ({
      id: c.id,
      symbol: c.symbol,
      name: c.name,
      thumb: c.thumb,
    }))
  } catch (_e) {
    return []
  }
}
