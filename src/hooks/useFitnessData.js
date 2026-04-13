import { useEffect, useState } from 'react'
import { Alert, Platform } from 'react-native'

// this hook will be fully active in development build
// for now it returns mock data in Expo Go

export function useFitnessData(toggleHabit, todayHabits) {
  const [connected, setConnected] = useState(false)
  const [steps, setSteps] = useState(0)
  const [sleepHours, setSleepHours] = useState(0)
  const [activeMinutes, setActiveMinutes] = useState(0)
  const [isExpoGo, setIsExpoGo] = useState(true)

  useEffect(() => {
    // check if we're in Expo Go or real build
    try {
      if(Platform.OS === 'ios') {
        const AppleHealthKit = require('react-native-health').default
        if(AppleHealthKit) setIsExpoGo(false)
      } else {
        const GoogleFit = require('react-native-google-fit').default
        if(GoogleFit) setIsExpoGo(false)
      }
    } catch(e) {
      setIsExpoGo(true)
    }
  }, [])

  const connectFitness = async () => {
    if(isExpoGo) {
      Alert.alert(
        'Coming Soon',
        'Fitness integration will be fully active when the app is published. For now you can manually track your habits.',
        [{ text: 'OK' }]
      )
      return
    }

    if(Platform.OS === 'ios') {
      await connectAppleHealth()
    } else {
      await connectGoogleFit()
    }
  }

  const connectAppleHealth = async () => {
    try {
      const AppleHealthKit = require('react-native-health').default
      const permissions = {
        permissions: {
          read: [
            AppleHealthKit.Constants.Permissions.Steps,
            AppleHealthKit.Constants.Permissions.SleepAnalysis,
            AppleHealthKit.Constants.Permissions.ActiveEnergyBurned,
            AppleHealthKit.Constants.Permissions.Workout,
          ]
        }
      }
      AppleHealthKit.initHealthKit(permissions, async (err) => {
        if(err) {
          Alert.alert('Error', 'Could not connect to Apple Health')
          return
        }
        setConnected(true)
        await fetchAppleHealthData(AppleHealthKit)
      })
    } catch(e) {
      console.log('Apple Health error:', e.message)
    }
  }

  const fetchAppleHealthData = async (AppleHealthKit) => {
    const today = new Date()
    const startOfDay = new Date(today.setHours(0,0,0,0)).toISOString()

    // get steps
    AppleHealthKit.getStepCount({ startDate: startOfDay }, (err, result) => {
      if(!err && result) {
        setSteps(result.value || 0)
        // auto check exercise if steps > 8000
        if(result.value > 8000 && !todayHabits.includes('exercise')) {
          toggleHabit('exercise')
        }
      }
    })

    // get sleep
    AppleHealthKit.getSleepSamples({ startDate: startOfDay }, (err, result) => {
      if(!err && result && result.length > 0) {
        const totalSleep = result.reduce((acc, s) => {
          const duration = (new Date(s.endDate) - new Date(s.startDate)) / 3600000
          return acc + duration
        }, 0)
        setSleepHours(Math.round(totalSleep * 10) / 10)
        // auto check sleep if > 7 hours
        if(totalSleep >= 7 && !todayHabits.includes('sleep')) {
          toggleHabit('sleep')
        }
      }
    })

    // get workouts
    AppleHealthKit.getSamples({
      startDate: startOfDay,
      type: 'Workout'
    }, (err, result) => {
      if(!err && result && result.length > 0) {
        const totalMinutes = result.reduce((acc, w) => {
          const duration = (new Date(w.endDate) - new Date(w.startDate)) / 60000
          return acc + duration
        }, 0)
        setActiveMinutes(Math.round(totalMinutes))
        // auto check exercise if workout > 30 mins
        if(totalMinutes >= 30 && !todayHabits.includes('exercise')) {
          toggleHabit('exercise')
        }
      }
    })
  }

  const connectGoogleFit = async () => {
    try {
      const GoogleFit = require('react-native-google-fit').default
      const options = {
        scopes: [
          GoogleFit.Scopes.FITNESS_ACTIVITY_READ,
          GoogleFit.Scopes.FITNESS_BODY_READ,
          GoogleFit.Scopes.FITNESS_SLEEP_READ,
        ]
      }
      GoogleFit.authorize(options).then(result => {
        if(result.success) {
          setConnected(true)
          fetchGoogleFitData(GoogleFit)
        }
      })
    } catch(e) {
      console.log('Google Fit error:', e.message)
    }
  }

  const fetchGoogleFitData = async (GoogleFit) => {
    const today = new Date()
    const startDate = new Date(today.setHours(0,0,0,0)).toISOString()
    const endDate = new Date().toISOString()

    // get steps
    GoogleFit.getDailyStepCountSamples({ startDate, endDate }).then(result => {
      const steps = result?.[0]?.steps?.[0]?.value || 0
      setSteps(steps)
      if(steps > 8000 && !todayHabits.includes('exercise')) {
        toggleHabit('exercise')
      }
    })

    // get sleep
    GoogleFit.getSleepSamples({ startDate, endDate }).then(result => {
      const totalSleep = result?.reduce((acc, s) => {
        const duration = (new Date(s.endDate) - new Date(s.startDate)) / 3600000
        return acc + duration
      }, 0) || 0
      setSleepHours(Math.round(totalSleep * 10) / 10)
      if(totalSleep >= 7 && !todayHabits.includes('sleep')) {
        toggleHabit('sleep')
      }
    })
  }

  return {
    connected,
    steps,
    sleepHours,
    activeMinutes,
    isExpoGo,
    connectFitness,
  }
}