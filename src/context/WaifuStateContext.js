import AsyncStorage from '@react-native-async-storage/async-storage'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { CHARACTERS } from '../lib/characters'
import {
  applyDecay,
  buildShopCatalog,
  getRelationship,
  performCareAction,
  shopBuy,
  shopEquip,
  syncActiveEquipped,
} from '../lib/waifuCare'
import { loadLocalCare, persistCare, pullAndMergeCare } from '../lib/waifuStateSync'
import { pullAllFromCloud } from '../lib/cloudSync'
import { fetchMe } from '../utils/api'

const WaifuStateContext = createContext(null)

export function WaifuStateProvider({ children }) {
  const [care, setCare] = useState(null)
  const [loaded, setLoaded] = useState(false)
  const pushTimer = useRef(null)
  const careRef = useRef(null)
  careRef.current = care

  const schedulePush = useCallback((next) => {
    clearTimeout(pushTimer.current)
    pushTimer.current = setTimeout(() => {
      persistCare(next).then((saved) => setCare(saved)).catch(() => {})
    }, 3000)
  }, [])

  const updateCare = useCallback((next, { push = true } = {}) => {
    setCare(next)
    if (push) schedulePush(next)
    return next
  }, [schedulePush])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      let local = await loadLocalCare()
      const token = await AsyncStorage.getItem('auth-token')
      if (token) {
        const serverData = await fetchMe()
        if (serverData) await pullAllFromCloud(serverData)
        const result = await pullAndMergeCare(local)
        local = result.care
      }
      if (!cancelled) {
        const next = applyDecay(local)
        next.lastTick = Date.now()
        setCare(next)
        persistCare(next).catch(() => {})
        setLoaded(true)
      }
    })()
    return () => {
      cancelled = true
      clearTimeout(pushTimer.current)
    }
  }, [])

  const careAction = useCallback((action, activeCharacterId) => {
    const prev = careRef.current
    if (!prev) return null
    const { care: next, message, levelInfo } = performCareAction(prev, action)
    syncActiveEquipped(next, activeCharacterId)
    updateCare(next)
    return { message, levelInfo }
  }, [updateCare])

  const buyItem = useCallback((category, id) => {
    const prev = careRef.current
    if (!prev) return { error: 'loading' }
    const r = shopBuy(prev, category, id)
    if (r.success) updateCare(r.care)
    return r
  }, [updateCare])

  const equipItem = useCallback((category, id, characterId, activeCharacterId) => {
    const prev = careRef.current
    if (!prev) return { error: 'loading' }
    const r = shopEquip(prev, category, id, characterId)
    if (r.success) {
      if (characterId === activeCharacterId) syncActiveEquipped(r.care, activeCharacterId)
      updateCare(r.care)
    }
    return r
  }, [updateCare])

  const getCatalog = useCallback((characterId, activeCharacterId) => {
    const c = careRef.current
    if (!c) return null
    return buildShopCatalog(c, characterId, activeCharacterId, CHARACTERS)
  }, [care])

  const relationship = useMemo(() => (care ? getRelationship(care.bondXP || 0) : null), [care])

  const refreshFromCloud = useCallback(async () => {
    const local = careRef.current || (await loadLocalCare())
    const result = await pullAndMergeCare(local)
    await pullChatFromCloud().catch(() => {})
    setCare(applyDecay(result.care))
    return result
  }, [])

  const value = useMemo(() => ({
    care,
    loaded,
    relationship,
    careAction,
    buyItem,
    equipItem,
    getCatalog,
    refreshFromCloud,
    updateCare,
  }), [care, loaded, relationship, careAction, buyItem, equipItem, getCatalog, refreshFromCloud, updateCare])

  return <WaifuStateContext.Provider value={value}>{children}</WaifuStateContext.Provider>
}

export function useWaifuState() {
  const ctx = useContext(WaifuStateContext)
  if (!ctx) throw new Error('useWaifuState must be used within WaifuStateProvider')
  return ctx
}
