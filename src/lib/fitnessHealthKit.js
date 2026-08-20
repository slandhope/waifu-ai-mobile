import {
  isHealthDataAvailable,
  queryCategorySamples,
  queryQuantitySamples,
  queryStatisticsForQuantity,
  requestAuthorization,
} from '@kingstinct/react-native-healthkit'
import { Alert } from 'react-native'

function dayRange(startDate, endDate) {
  return {
    filter: { date: { startDate, endDate } },
    limit: 0,
  }
}

function sumSamples(samples) {
  if (!samples?.length) return 0
  return Math.round(
    samples.reduce((total, sample) => total + (Number(sample.quantity) || 0), 0)
  )
}

export async function connectAppleHealth() {
  const available = await isHealthDataAvailable()
  if (!available) {
    Alert.alert('Not available', 'Apple Health is not available on this device')
    return false
  }

  await requestAuthorization({
    toRead: [
      'HKQuantityTypeIdentifierStepCount',
      'HKQuantityTypeIdentifierActiveEnergyBurned',
      'HKQuantityTypeIdentifierHeartRate',
      'HKCategoryTypeIdentifierSleepAnalysis',
    ],
  })

  Alert.alert('✅ Connected!', 'Apple Health connected successfully!')
  return true
}

export async function fetchAppleHealthData({ todayHabits, toggleHabit }) {
  const now = new Date()
  const startOfDay = new Date(now)
  startOfDay.setHours(0, 0, 0, 0)
  const range = dayRange(startOfDay, now)

  let totalSteps = 0
  try {
    const stepStats = await queryStatisticsForQuantity(
      'HKQuantityTypeIdentifierStepCount',
      ['cumulativeSum'],
      { ...range, unit: 'count' }
    )
    totalSteps = Math.round(stepStats.sumQuantity?.quantity ?? 0)
  } catch (_statsErr) {
    const stepSamples = await queryQuantitySamples(
      'HKQuantityTypeIdentifierStepCount',
      { ...range, unit: 'count' }
    )
    totalSteps = sumSamples(stepSamples)
  }

  if (totalSteps > 8000 && !todayHabits?.includes('exercise')) {
    toggleHabit?.('exercise')
  }

  try {
    const hrStats = await queryStatisticsForQuantity(
      'HKQuantityTypeIdentifierHeartRate',
      ['mostRecent'],
      { ...range, unit: 'count/min' }
    )
    const hr = hrStats.mostRecentQuantity?.quantity
    if (hr != null) console.log('Heart rate:', Math.round(hr))
  } catch (_e) { /* no recent heart rate */ }

  let activeMinutes = 0
  try {
    const energyStats = await queryStatisticsForQuantity(
      'HKQuantityTypeIdentifierActiveEnergyBurned',
      ['cumulativeSum'],
      { ...range, unit: 'kcal' }
    )
    const totalCalories = Math.round(energyStats.sumQuantity?.quantity ?? 0)
    if (totalCalories > 0) activeMinutes = Math.round(totalCalories / 10)
  } catch (_e) { /* no energy data */ }

  const sleepStart = new Date()
  sleepStart.setDate(sleepStart.getDate() - 1)
  sleepStart.setHours(18, 0, 0, 0)

  const sleepSamples = await queryCategorySamples(
    'HKCategoryTypeIdentifierSleepAnalysis',
    dayRange(sleepStart, now)
  )

  let totalSleepMs = 0
  if (sleepSamples?.length > 0) {
    sleepSamples.forEach(sample => {
      if (sample.value === 1) {
        const start = new Date(sample.startDate).getTime()
        const end = new Date(sample.endDate).getTime()
        totalSleepMs += (end - start)
      }
    })
  }
  const sleepHours = parseFloat((totalSleepMs / (1000 * 60 * 60)).toFixed(1))

  if (sleepHours >= 7 && !todayHabits?.includes('sleep')) {
    toggleHabit?.('sleep')
  }

  return { steps: totalSteps, sleepHours, activeMinutes }
}
