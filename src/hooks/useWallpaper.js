import AsyncStorage from '@react-native-async-storage/async-storage'
import { useEffect, useState } from 'react'
import { DeviceEventEmitter } from 'react-native'
import { WALLPAPERS } from '../constants/wallpapers'
import { pushExtrasSoon, SYNC_EXTRAS_APPLIED } from '../lib/extrasSync'

export function useWallpaper() {
  const [wallpaperId, setWallpaperId] = useState('default')

  useEffect(() => {
    AsyncStorage.getItem('wallpaper-id').then(val => {
      if (val) setWallpaperId(val)
    })
    const sub = DeviceEventEmitter.addListener(SYNC_EXTRAS_APPLIED, () => {
      AsyncStorage.getItem('wallpaper-id').then(val => {
        if (val) setWallpaperId(val)
      })
    })
    return () => sub.remove()
  }, [])

  const setWallpaper = async (id) => {
    setWallpaperId(id)
    await AsyncStorage.setItem('wallpaper-id', id)
    pushExtrasSoon()
  }

  const currentWallpaper = WALLPAPERS.find(w => w.id === wallpaperId) || WALLPAPERS[0]

  return { wallpaperId, currentWallpaper, setWallpaper }
}