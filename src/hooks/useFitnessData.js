import AsyncStorage from '@react-native-async-storage/async-storage'
import { useCallback, useEffect, useState } from 'react'
import { Alert, DeviceEventEmitter, Platform } from 'react-native'
import { localDateKey } from '../constants'
import { pushExtrasSoon, SYNC_EXTRAS_APPLIED } from '../lib/extrasSync'
import { adaptAsukaSoon } from '../lib/asukaHabits'
import { apiCall } from '../utils/api'
import { isExpoGo } from '../utils/isExpoGo'

const STEPS_HISTORY_KEY = 'fitness-steps-history-v1'

async function loadStepsHistory() {
  try {
    const raw = await AsyncStorage.getItem(STEPS_HISTORY_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

async function saveStepsHistory(stepCount) {
  try {
    const key = localDateKey()
    const hist = await loadStepsHistory()
    hist[key] = stepCount
    const keys = Object.keys(hist).sort()
    if (keys.length > 90) keys.slice(0, keys.length - 90).forEach((k) => delete hist[k])
    await AsyncStorage.setItem(STEPS_HISTORY_KEY, JSON.stringify(hist))
    pushExtrasSoon()
    return hist
  } catch {
    return {}
  }
}

export function useFitnessData(toggleHabit, todayHabits) {
  const [connected, setConnected] = useState(false)
  const [steps, setSteps] = useState(0)
  const [sleepHours, setSleepHours] = useState(0)
  const [activeMinutes, setActiveMinutes] = useState(0)
  const [stepsHistory, setStepsHistory] = useState({})

  const syncToServer = useCallback(async (stepCount, sleep) => {
    try {
      const userId = await AsyncStorage.getItem('user-id')
      if (!userId) return
      await apiCall('/api/sync', {
        method: 'POST',
        body: JSON.stringify({
          userId,
          steps: stepCount,
          sleepHours: sleep,
        }),
      })
      console.log('fitness synced to server:', stepCount, 'steps')
    } catch (e) {
      console.log('fitness sync failed:', e.message)
    }
  }, [])

  const fetchData = useCallback(async () => {
    if (Platform.OS !== 'ios' || isExpoGo()) return

    try {
      const { fetchAppleHealthData } = await import('../lib/fitnessHealthKit')
      const data = await fetchAppleHealthData({ todayHabits, toggleHabit })
      setSteps(data.steps)
      setSleepHours(data.sleepHours)
      setActiveMinutes(data.activeMinutes)
      const hist = await saveStepsHistory(data.steps)
      setStepsHistory(hist)
      await syncToServer(data.steps, data.sleepHours)
      AsyncStorage.getItem('auth-token').then((token) => {
        if (!token) return
        AsyncStorage.getItem('clarity-data-v1').then((raw) => {
          const hist = raw ? JSON.parse(raw).history || {} : {}
          adaptAsukaSoon(hist, data.steps, data.sleepHours)
        })
      })
    } catch (e) {
      console.log('fetch error:', e.message)
    }
  }, [syncToServer, todayHabits, toggleHabit])

  useEffect(() => {
    loadStepsHistory().then(setStepsHistory)
    const sub = DeviceEventEmitter.addListener(SYNC_EXTRAS_APPLIED, () => {
      loadStepsHistory().then(setStepsHistory)
    })
    AsyncStorage.getItem('health-connected').then(val => {
      if (val === 'true') {
        setConnected(true)
        fetchData()
      }
    })
    return () => sub.remove()
  }, [fetchData])

  useEffect(() => {
    if (connected) fetchData()
  }, [connected, fetchData])

  const connectFitness = async () => {
    if (isExpoGo()) {
      Alert.alert(
        'Development build required',
        'Apple Health needs a custom dev build. Run `npx expo run:ios` instead of Expo Go.'
      )
      return
    }

    if (Platform.OS !== 'ios') {
      Alert.alert('Not supported', 'Apple Health is only available on iOS')
      return
    }

    try {
      const { connectAppleHealth } = await import('../lib/fitnessHealthKit')
      const ok = await connectAppleHealth()
      if (ok) {
        await AsyncStorage.setItem('health-connected', 'true')
        setConnected(true)
      }
    } catch (e) {
      console.log('health error:', e.message)
      Alert.alert('Error', e.message)
    }
  }

  return { connected, steps, sleepHours, activeMinutes, stepsHistory, connectFitness, fetchData }
}
