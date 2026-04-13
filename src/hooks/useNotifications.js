import * as Device from 'expo-device'
import * as Notifications from 'expo-notifications'
import { useEffect } from 'react'
import { Platform } from 'react-native'

// makes sure notifications show even when app is open
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
})

export async function askPermission() {
  // only works on real devices not simulator
  if(!Device.isDevice) {
    console.log('notifications only work on real device')
    return false
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync()
  let finalStatus = existingStatus

  if(existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync()
    finalStatus = status
  }

  if(finalStatus !== 'granted') {
    console.log('permission not granted')
    return false
  }

  if(Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    })
  }

  return true
}

// schedule daily reminder at a specific hour
export async function scheduleDailyReminder(hour = 20, minute = 0) {
  // cancel old ones first
  await Notifications.cancelAllScheduledNotificationsAsync()

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Time to check in 🧠',
      body: "Don't break your streak! Log today's habits.",
      sound: true,
    },
    trigger: {
      hour,
      minute,
      repeats: true,
    },
  })

  console.log('daily reminder set for', hour + ':' + minute)
}

// sends a notification when streak is about to break
export async function sendStreakWarning(streak) {
  if(streak < 1) return

  await Notifications.scheduleNotificationAsync({
    content: {
      title: `Don't lose your ${streak} day streak! 🔥`,
      body: 'You still have time to check in today.',
      sound: true,
    },
    trigger: {
      seconds: 2, // sends pretty much immediately
    },
  })
}

// sad notification after missing days
export async function sendMissedDayNotification(missed) {
  let msg = ''

  if(missed === 1) {
    msg = 'Your clarity logo is getting sad 😕 come back!'
  } else if(missed === 2) {
    msg = 'Your logo is crying 😢 please check in today'
  } else {
    msg = 'Your logo is broken 💔 we miss you'
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Clarity misses you...',
      body: msg,
      sound: true,
    },
    trigger: {
      seconds: 2,
    },
  })
}

export function useNotifications(missed, streak) {
  useEffect(() => {
    // slight delay so app loads first
    setTimeout(() => {
      askPermission()
      scheduleDailyReminder(20, 0)
    }, 1000)
  }, [])
}