import {
  isHealthDataAvailable,
  queryCategorySamples,
  queryQuantitySamples,
  requestAuthorization,
} from '@kingstinct/react-native-healthkit'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useEffect, useState } from 'react'
import { Alert, Platform } from 'react-native'
import { apiCall } from '../utils/api'

export function useFitnessData(toggleHabit, todayHabits) {
  const [connected, setConnected] = useState(false)
  const [steps, setSteps] = useState(0)
  const [sleepHours, setSleepHours] = useState(0)
  const [activeMinutes, setActiveMinutes] = useState(0)

  useEffect(() => {
    AsyncStorage.getItem('health-connected').then(val => {
      if(val === 'true') {
        setConnected(true)
        fetchData()
      }
    })
  }, [])

  useEffect(() => {
    if(connected) fetchData()
  }, [connected])

  const syncToServer = async (stepCount, sleep) => {
    try {
      const userId = await AsyncStorage.getItem('user-id')
      if(!userId) return
      await apiCall('/api/sync', {
        method: 'POST',
        body: JSON.stringify({
          userId,
          steps: stepCount,
          sleepHours: sleep
        })
      })
      console.log('fitness synced to server:', stepCount, 'steps')
    } catch(e) {
      console.log('fitness sync failed:', e.message)
    }
  }

  const connectFitness = async () => {
    if(Platform.OS !== 'ios') {
      Alert.alert('Not supported', 'Apple Health is only available on iOS')
      return
    }

    try {
      const available = await isHealthDataAvailable()
      if(!available) {
        Alert.alert('Not available', 'Apple Health is not available on this device')
        return
      }

      await requestAuthorization({
        toRead: [
          'HKQuantityTypeIdentifierStepCount',
          'HKQuantityTypeIdentifierActiveEnergyBurned',
          'HKQuantityTypeIdentifierHeartRate',
          'HKCategoryTypeIdentifierSleepAnalysis',
        ]
      })

      await AsyncStorage.setItem('health-connected', 'true')
      setConnected(true)
      Alert.alert('✅ Connected!', 'Apple Health connected successfully!')

    } catch(e) {
      console.log('health error:', e.message)
      Alert.alert('Error', e.message)
    }
  }

  const fetchData = async () => {
    try {
      // ─── STEPS: get TODAY's total ──────────────────────
      const now = new Date()
      const startOfDay = new Date(now)
      startOfDay.setHours(0, 0, 0, 0)

      const stepSamples = await queryQuantitySamples(
        'HKQuantityTypeIdentifierStepCount',
        {
          from: startOfDay,
          to: now,
          unit: 'count'
        }
      )

      let totalSteps = 0
      if(stepSamples && stepSamples.length > 0) {
        totalSteps = Math.round(
          stepSamples.reduce((sum, s) => sum + s.quantity, 0)
        )
      }
      setSteps(totalSteps)

      if(totalSteps > 8000 && !todayHabits?.includes('exercise')) {
        toggleHabit?.('exercise')
        Alert.alert('🎉 Auto-checked!', 'Exercise habit checked — 8,000 steps!')
      }

      // ─── HEART RATE ───────────────────────────────────
      const hrSamples = await queryQuantitySamples(
        'HKQuantityTypeIdentifierHeartRate',
        { from: startOfDay, to: now, unit: 'count/min' }
      )
      if(hrSamples && hrSamples.length > 0) {
        const latest = hrSamples[hrSamples.length - 1]
        console.log('Heart rate:', Math.round(latest.quantity))
      }

      // ─── ACTIVE ENERGY ────────────────────────────────
      const energySamples = await queryQuantitySamples(
        'HKQuantityTypeIdentifierActiveEnergyBurned',
        { from: startOfDay, to: now, unit: 'kcal' }
      )
      let totalCalories = 0
      if(energySamples && energySamples.length > 0) {
        totalCalories = Math.round(
          energySamples.reduce((sum, s) => sum + s.quantity, 0)
        )
        setActiveMinutes(Math.round(totalCalories / 10))
      }

      // ─── SLEEP: last night ────────────────────────────
      const sleepStart = new Date()
      sleepStart.setDate(sleepStart.getDate() - 1)
      sleepStart.setHours(18, 0, 0, 0)

      const sleepSamples = await queryCategorySamples(
        'HKCategoryTypeIdentifierSleepAnalysis',
        { from: sleepStart, to: now }
      )

      let totalSleepMs = 0
      if(sleepSamples && sleepSamples.length > 0) {
        sleepSamples.forEach(sample => {
          // valuex 0 = in bed, 1 = asleep, 2 = awake
          if(sample.value === 1 || sample.value === 2) {
            const start = new Date(sample.startDate).getTime()
            const end = new Date(sample.endDate).getTime()
            totalSleepMs += (end - start)
          }
        })
      }
      const sleepHoursTotal = parseFloat((totalSleepMs / (1000 * 60 * 60)).toFixed(1))
      setSleepHours(sleepHoursTotal)

      if(sleepHoursTotal >= 7 && !todayHabits?.includes('sleep')) {
        toggleHabit?.('sleep')
      }

      // ─── SYNC TO SERVER ───────────────────────────────
      await syncToServer(totalSteps, sleepHoursTotal)

    } catch(e) {
      console.log('fetch error:', e.message)
    }
  }

  return { connected, steps, sleepHours, activeMinutes, connectFitness, fetchData }
}