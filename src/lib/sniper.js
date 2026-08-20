import { Linking } from 'react-native'
import { apiCall } from '../utils/api'
import { dexChainToEip155, sendTransaction } from './walletConnect'

export async function analyzeToken(ca) {
  try {
    const res = await apiCall('/snipes/analyze', { method: 'POST', body: JSON.stringify({ ca }) })
    return res.json()
  } catch (_e) { return { found: false } }
}

export async function fetchSnipes() {
  try {
    const res = await apiCall('/snipes')
    if (res.status === 401) return { auth: false, positions: [] }
    if (!res.ok) return { positions: [] }
    return res.json()
  } catch (_e) { return { positions: [] } }
}

export async function snipeBuy(ca, usd = 50, opts = {}) {
  try {
    const body = { ca, usd, mode: opts.mode || 'paper', walletAddress: opts.walletAddress, txHash: opts.txHash }
    const res = await apiCall('/snipes/buy', { method: 'POST', body: JSON.stringify(body) })
    return res.json()
  } catch (e) { return { success: false, error: e.message } }
}

export async function snipeSell(id, opts = {}) {
  try {
    const res = await apiCall(`/snipes/${id}/sell`, {
      method: 'POST',
      body: JSON.stringify({ mode: opts.mode, txHash: opts.txHash, walletAddress: opts.walletAddress }),
    })
    return res.json()
  } catch (e) { return { success: false, error: e.message } }
}

export async function buildLiveBuyTx(ca, usd, walletAddress, slippage = 15) {
  try {
    const res = await apiCall('/snipes/build-buy-tx', {
      method: 'POST',
      body: JSON.stringify({ ca, usd, walletAddress, slippage }),
    })
    return res.json()
  } catch (e) {
    return { success: false, error: e.message || 'Server unreachable — redeploy AWS with live sniper endpoints' }
  }
}

export async function buildLiveSellTx(id, walletAddress) {
  try {
    const res = await apiCall(`/snipes/${id}/build-sell-tx`, {
      method: 'POST',
      body: JSON.stringify({ walletAddress }),
    })
    return res.json()
  } catch (e) {
    return { success: false, error: e.message || 'Server unreachable' }
  }
}

export async function executeLiveBuy(ca, usd, wallet, slippage = 15) {
  if (!wallet?.address) return { success: false, error: 'Connect wallet on Overview first' }

  if (wallet.type === 'solana') {
    const built = await buildLiveBuyTx(ca, usd, wallet.address, slippage)
    if (!built?.success) return built
    if (built.kind === 'solana' && built.phantomUrl) {
      await Linking.openURL(built.phantomUrl)
      return {
        success: true,
        pending: true,
        note: 'Approve swap in Phantom — position records when you return',
        ...built,
      }
    }
    return { success: false, error: built.error || 'Solana route failed' }
  }

  const built = await buildLiveBuyTx(ca, usd, wallet.address, slippage)
  if (!built?.success || !built.tx) return built

  try {
    const txHash = await sendTransaction({
      to: built.tx.to,
      data: built.tx.data,
      value: built.tx.value,
      chainId: built.eip155 || dexChainToEip155(built.chain),
      from: wallet.address,
    })
    const recorded = await snipeBuy(ca, usd, {
      mode: 'live',
      walletAddress: wallet.address,
      txHash,
    })
    return { ...recorded, txHash, note: 'Live snipe sent on-chain' }
  } catch (e) {
    return { success: false, error: e.message || 'Transaction rejected' }
  }
}

export async function executeLiveSell(position, wallet) {
  if (!wallet?.address) return { success: false, error: 'Connect wallet first' }

  if (wallet.type === 'solana') {
    const built = await buildLiveSellTx(position.id, wallet.address)
    if (built?.phantomUrl) {
      await Linking.openURL(built.phantomUrl)
      return { success: true, pending: true, note: 'Approve sell in Phantom' }
    }
    return { success: false, error: built?.error || 'Solana sell failed' }
  }

  const built = await buildLiveSellTx(position.id, wallet.address)
  if (!built?.success || !built.tx) return built

  try {
    const txHash = await sendTransaction({
      to: built.tx.to,
      data: built.tx.data,
      value: built.tx.value,
      chainId: built.eip155,
      from: wallet.address,
    })
    return snipeSell(position.id, { mode: 'live', txHash, walletAddress: wallet.address })
  } catch (e) {
    return { success: false, error: e.message || 'Sell rejected' }
  }
}

export function walletMatchesToken(wallet, tokenChain) {
  if (!wallet?.address || !tokenChain) return false
  const c = String(tokenChain).toLowerCase()
  if (wallet.type === 'solana') return c === 'solana' || c === 'sol'
  const eip = dexChainToEip155(c)
  if (!eip) return false
  if (wallet.chainId) return wallet.chainId === eip
  return true
}
