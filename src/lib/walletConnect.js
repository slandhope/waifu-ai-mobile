import AsyncStorage from '@react-native-async-storage/async-storage'
import { Linking } from 'react-native'
import SignClient from '@walletconnect/sign-client'

const SESSION_KEY = 'wc-session-v1'
const CHAINS = ['eip155:1', 'eip155:56', 'eip155:137', 'eip155:8453', 'eip155:42161']
const METHODS = [
  'eth_sendTransaction',
  'eth_signTransaction',
  'personal_sign',
  'eth_signTypedData',
  'eth_signTypedData_v4',
]
const EVENTS = ['chainChanged', 'accountsChanged']

let client = null
let connectPromise = null

function projectId() {
  try {
    const s = require('../secrets')
    return (s.WALLETCONNECT_PROJECT_ID || s.REOWN_PROJECT_ID || '').trim()
  } catch (_e) {
    return ''
  }
}

function parseAccount(caip) {
  const parts = String(caip || '').split(':')
  if (parts.length < 3) return null
  return { chainId: `${parts[0]}:${parts[1]}`, address: parts.slice(2).join(':') }
}

export function sessionSnapshot(session) {
  if (!session) return null
  const accounts = session.namespaces?.eip155?.accounts || []
  const first = parseAccount(accounts[0])
  return {
    topic: session.topic,
    address: first?.address || null,
    chainId: first?.chainId || null,
    accounts,
    peer: session.peer?.metadata?.name || 'Wallet',
    expiry: session.expiry,
    type: 'evm',
    mode: 'walletconnect',
  }
}

async function persistSession(session) {
  const snap = sessionSnapshot(session)
  if (snap) await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(snap))
}

export async function loadPersistedWallet() {
  try {
    const raw = await AsyncStorage.getItem(SESSION_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch (_e) {
    return null
  }
}

async function ensureClient() {
  const pid = projectId()
  if (!pid) {
    const err = new Error('Add WALLETCONNECT_PROJECT_ID to src/secrets.js (free at cloud.reown.com)')
    err.code = 'missing_project_id'
    throw err
  }
  if (client) return client
  client = await SignClient.init({
    projectId: pid,
    metadata: {
      name: 'waifu.ai',
      description: 'Sniper & trading companion',
      url: 'https://waifu.ai',
      icons: ['https://avatars.githubusercontent.com/u/37784886'],
    },
  })
  client.on('session_delete', () => AsyncStorage.removeItem(SESSION_KEY))
  client.on('session_expire', () => AsyncStorage.removeItem(SESSION_KEY))
  return client
}

export function getLiveSession() {
  if (!client) return null
  const sessions = client.session.getAll()
  return sessions?.length ? sessions[sessions.length - 1] : null
}

export async function getWalletStatus() {
  try {
    await ensureClient()
    const session = getLiveSession()
    if (session) {
      const snap = sessionSnapshot(session)
      if (snap?.address) {
        await persistSession(session)
        return { live: true, ...snap }
      }
    }
    const persisted = await loadPersistedWallet()
    if (persisted?.address) return { live: false, stale: true, ...persisted }
    return { live: false, address: null }
  } catch (e) {
    return { live: false, error: e.message, code: e.code }
  }
}

function deepLinkFor(provider, uri) {
  const enc = encodeURIComponent(uri)
  if (provider === 'trust') return `https://link.trustwallet.com/wc?uri=${enc}`
  return `https://metamask.app.link/wc?uri=${enc}`
}

export async function connectWallet(provider = 'metamask') {
  const c = await ensureClient()
  if (connectPromise) return connectPromise

  connectPromise = (async () => {
    try {
      const { uri, approval } = await c.connect({
        optionalNamespaces: {
          eip155: { methods: METHODS, chains: CHAINS, events: EVENTS },
        },
      })
      if (!uri) throw new Error('WalletConnect did not return a pairing URI')
      await Linking.openURL(deepLinkFor(provider, uri))
      const session = await approval()
      await persistSession(session)
      return { ok: true, ...sessionSnapshot(session) }
    } finally {
      connectPromise = null
    }
  })()

  return connectPromise
}

export async function disconnectWallet() {
  try {
    const c = client || (await ensureClient())
    const session = getLiveSession()
    if (session?.topic) {
      await c.disconnect({
        topic: session.topic,
        reason: { code: 6000, message: 'User disconnected' },
      })
    }
  } catch (_e) {}
  await AsyncStorage.removeItem(SESSION_KEY)
  return { ok: true }
}

export async function sendTransaction({ to, data, value, chainId, from }) {
  const c = await ensureClient()
  const session = getLiveSession()
  if (!session?.topic) throw new Error('Wallet not connected — connect on Overview first')
  const snap = sessionSnapshot(session)
  const chain = chainId || snap.chainId || 'eip155:56'
  const tx = {
    from: from || snap.address,
    to,
    data: data || '0x',
    value: value || '0x0',
  }
  return c.request({
    topic: session.topic,
    chainId: chain,
    request: { method: 'eth_sendTransaction', params: [tx] },
  })
}

export function chainIdToEip155(num) {
  return `eip155:${num}`
}

export function dexChainToEip155(chain) {
  const map = {
    bsc: 'eip155:56',
    ethereum: 'eip155:1',
    eth: 'eip155:1',
    polygon: 'eip155:137',
    base: 'eip155:8453',
    arbitrum: 'eip155:42161',
  }
  return map[String(chain || '').toLowerCase()] || null
}

export function hasWalletConnectProjectId() {
  return !!projectId()
}
