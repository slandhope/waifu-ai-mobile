import AsyncStorage from '@react-native-async-storage/async-storage'
import { Linking } from 'react-native'
import { apiCall } from '../utils/api'

const WALLETS_KEY = 'tracked-wallets-v1'

export async function getTrackedWallets() {
  try {
    const raw = await AsyncStorage.getItem(WALLETS_KEY)
    if (raw) return JSON.parse(raw)
  } catch (_e) {}
  return []
}

export async function addTrackedWallet({ address, chain, label, walletType }) {
  const list = await getTrackedWallets()
  const addr = address.trim()
  if (list.some((w) => w.address.toLowerCase() === addr.toLowerCase() && w.chain === chain)) {
    return { error: 'Already tracking this wallet' }
  }
  const entry = {
    id: Date.now().toString(),
    address: addr,
    chain: chain || (addr.startsWith('0x') ? 'bsc' : 'sol'),
    label: label || 'My wallet',
    walletType: walletType || 'other',
    addedAt: Date.now(),
  }
  list.unshift(entry)
  await AsyncStorage.setItem(WALLETS_KEY, JSON.stringify(list))
  return { success: true, wallet: entry }
}

export async function removeTrackedWallet(id) {
  const list = (await getTrackedWallets()).filter((w) => w.id !== id)
  await AsyncStorage.setItem(WALLETS_KEY, JSON.stringify(list))
  return list
}

export async function fetchWalletPortfolio(chain, address) {
  try {
    const res = await apiCall(`/wallet/${chain}/${encodeURIComponent(address)}`)
    if (res.status === 404) return { unavailable: true }
    if (!res.ok) return null
    return res.json()
  } catch (_e) {
    return null
  }
}

export function detectChain(address) {
  const a = address.trim()
  if (/^0x[a-fA-F0-9]{40}$/.test(a)) return 'bsc'
  if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(a)) return 'sol'
  return null
}

export function openWalletApp(provider = 'metamask') {
  const url = provider === 'trust'
    ? 'https://link.trustwallet.com/open_url?coin_id=60&url=https%3A%2F%2Fwaifu.ai'
    : 'https://metamask.app.link/dapp/waifu.ai'
  Linking.openURL(url).catch(() => {})
}
