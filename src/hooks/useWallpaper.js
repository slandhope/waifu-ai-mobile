import AsyncStorage from '@react-native-async-storage/async-storage'
import { useEffect, useState } from 'react'
import { WALLPAPERS } from '../constants/wallpapers'

export function useWallpaper() {
  const [wallpaperId, setWallpaperId] = useState('none')

  useEffect(() => {
    AsyncStorage.getItem('wallpaper-id').then(val => {
      if(val) setWallpaperId(val)
    })
  }, [])

  const setWallpaper = async (id) => {
    setWallpaperId(id)
    await AsyncStorage.setItem('wallpaper-id', id)
  }

  const currentWallpaper = WALLPAPERS.find(w => w.id === wallpaperId) || WALLPAPERS[0]

  return { wallpaperId, currentWallpaper, setWallpaper }
}