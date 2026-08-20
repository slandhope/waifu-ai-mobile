import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Notifications from 'expo-notifications'
import { useEffect, useRef } from 'react'
import { fetchCallerSignals, fetchTrades, isOpenTrade } from '../lib/trading'
import { getAlertSettings, pushAlertHistory } from '../lib/tradingAlerts'
import { askPermission } from './useNotifications'

const LAST_SIGNAL_KEY = 'trading-last-signal-ts'
const OPEN_IDS_KEY = 'trading-open-ids'

async function notifyNow(title, body) {
  try {
    await Notifications.scheduleNotificationAsync({
      content: { title, body, sound: true },
      trigger: { seconds: 1 },
    })
  } catch (_e) {}
}

async function alertUser(title, body) {
  await notifyNow(title, body)
  await pushAlertHistory({ title, body })
}

export function useTradingAlerts(enabled = true) {
  const booted = useRef(false)

  useEffect(() => {
    if (!enabled) return undefined

    let cancelled = false

    async function poll() {
      const token = await AsyncStorage.getItem('auth-token')
      if (!token || cancelled) return

      const settings = await getAlertSettings()
      if (!settings.enabled) return

      const [callerRes, tradesRes] = await Promise.all([
        settings.callerSignals ? fetchCallerSignals() : Promise.resolve(null),
        settings.tradeEvents ? fetchTrades() : Promise.resolve(null),
      ])
      if (cancelled || callerRes?.auth === false) return

      if (settings.callerSignals && callerRes) {
        const signals = callerRes?.signals || []
        const lastTs = parseInt(await AsyncStorage.getItem(LAST_SIGNAL_KEY) || '0', 10)
        let maxTs = lastTs

        if (booted.current) {
          for (const s of signals) {
            const ts = s.timestamp || 0
            if (ts > lastTs) {
              await alertUser(
                `📡 @${s.caller || 'caller'}`,
                `${(s.direction || '').toUpperCase()} ${s.coin} · Entry ${s.entry ?? '—'} · ${s.confidence ?? '?'}%`
              )
            }
            if (ts > maxTs) maxTs = ts
          }
        } else {
          for (const s of signals) {
            const ts = s.timestamp || 0
            if (ts > maxTs) maxTs = ts
          }
        }

        if (maxTs > lastTs) await AsyncStorage.setItem(LAST_SIGNAL_KEY, String(maxTs))
      }

      if (settings.tradeEvents && tradesRes?.auth !== false && tradesRes?.trades) {
        const openIds = tradesRes.trades.filter(isOpenTrade).map((t) => t.id).filter(Boolean)
        const prevRaw = await AsyncStorage.getItem(OPEN_IDS_KEY)
        const prev = prevRaw ? JSON.parse(prevRaw) : []

        if (booted.current) {
          const prevSet = new Set(prev)
          const openSet = new Set(openIds)
          for (const t of tradesRes.trades) {
            if (isOpenTrade(t) && !prevSet.has(t.id)) {
              await alertUser(
                '📝 Paper trade opened',
                `${(t.direction || '').toUpperCase()} ${t.coin} · ${t.caller || 'Scanner'}`
              )
            }
          }
          for (const id of prev) {
            if (!openSet.has(id)) {
              const closed = tradesRes.trades.find((t) => t.id === id && !isOpenTrade(t))
              if (closed) {
                const win = (closed.pnl || 0) >= 0
                await alertUser(
                  `${win ? '✅' : '❌'} ${closed.coin} closed`,
                  `P&L ${win ? '+' : ''}$${Math.abs(closed.pnl || 0).toFixed(2)} · ${closed.closeReason || ''}`
                )
              }
            }
          }
        }

        await AsyncStorage.setItem(OPEN_IDS_KEY, JSON.stringify(openIds))
      }

      booted.current = true
    }

    askPermission()
    poll()
    const id = setInterval(poll, 25000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [enabled])
}
