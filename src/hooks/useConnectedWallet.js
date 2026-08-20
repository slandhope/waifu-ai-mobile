import AsyncStorage from '@react-native-async-storage/async-storage'
import { useCallback, useEffect, useState } from 'react'
import {
  connectWallet,
  disconnectWallet,
  getWalletStatus,
  loadPersistedWallet,
} from '../lib/walletConnect'

const SOL_WALLET_KEY = 'connected-sol-wallet-v1'

export async function loadSolanaWallet() {
  try {
    const raw = await AsyncStorage.getItem(SOL_WALLET_KEY)
    return raw ? JSON.parse(raw) : null
  } catch (_e) {
    return null
  }
}

export async function saveSolanaWallet(address, label = 'Phantom') {
  const entry = {
    address: address.trim(),
    type: 'solana',
    mode: 'phantom',
    peer: label,
    chainId: 'solana:mainnet',
  }
  await AsyncStorage.setItem(SOL_WALLET_KEY, JSON.stringify(entry))
  return entry
}

export async function clearSolanaWallet() {
  await AsyncStorage.removeItem(SOL_WALLET_KEY)
}

export function useConnectedWallet() {
  const [wallet, setWallet] = useState(null)
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    setLoading(true)
    setError('')
    const [evm, sol] = await Promise.all([getWalletStatus(), loadSolanaWallet()])
    if (evm?.address && evm.live !== false) {
      setWallet(evm)
    } else if (sol?.address) {
      setWallet({ ...sol, live: true })
    } else if (evm?.address) {
      setWallet(evm)
    } else {
      setWallet(null)
      if (evm?.code === 'missing_project_id') setError(evm.error)
    }
    setLoading(false)
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const connectEvm = useCallback(async (provider = 'metamask') => {
    setConnecting(true)
    setError('')
    try {
      const r = await connectWallet(provider)
      if (!r.ok) throw new Error(r.error || 'Connection failed')
      setWallet({ ...r, live: true })
      return r
    } catch (e) {
      setError(e.message || 'Connection failed')
      throw e
    } finally {
      setConnecting(false)
    }
  }, [])

  const connectSol = useCallback(async (address) => {
    setError('')
    const entry = await saveSolanaWallet(address)
    setWallet({ ...entry, live: true })
    return entry
  }, [])

  const disconnect = useCallback(async () => {
    if (wallet?.type === 'solana') {
      await clearSolanaWallet()
    } else {
      await disconnectWallet()
    }
    setWallet(null)
  }, [wallet])

  return {
    wallet,
    loading,
    connecting,
    error,
    refresh,
    connectEvm,
    connectSol,
    disconnect,
    isEvm: wallet?.type === 'evm' || wallet?.mode === 'walletconnect',
    isSolana: wallet?.type === 'solana',
    address: wallet?.address || null,
  }
}

export { loadPersistedWallet }
