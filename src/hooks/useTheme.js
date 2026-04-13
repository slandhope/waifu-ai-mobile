import AsyncStorage from '@react-native-async-storage/async-storage'
import { createContext, useContext, useEffect, useState } from 'react'
import { ACCENT_COLORS } from '../constants'

export const ThemeContext = createContext(null)

// daytime = 6am to 8pm
const isDay = () => {
  const hour = new Date().getHours()
  return hour >= 6 && hour < 20
}

export function useThemeProvider() {
  const [accentKey, setAccentKey] = useState('purple_dark')
  const [autoMode, setAutoMode] = useState(false)

  useEffect(() => {
    AsyncStorage.getItem('accent-color').then(val => {
      if(val && ACCENT_COLORS[val]) {
        setAccentKey(val)
      } else {
        // first load - set based on time of day
        const defaultKey = isDay() ? 'purple_light' : 'purple_dark'
        setAccentKey(defaultKey)
      }
    })
    AsyncStorage.getItem('auto-mode').then(val => {
      if(val === 'true') setAutoMode(true)
    })
  }, [])

  // auto mode - check time every minute
  useEffect(() => {
    if(!autoMode) return
    const interval = setInterval(() => {
      const colorName = accentKey.replace('_dark', '').replace('_light', '')
      const newKey = isDay() ? `${colorName}_light` : `${colorName}_dark`
      setAccentKey(newKey)
    }, 60000)
    return () => clearInterval(interval)
  }, [autoMode, accentKey])

  const setAccent = async (key) => {
    setAccentKey(key)
    await AsyncStorage.setItem('accent-color', key)
  }

  const toggleTheme = async () => {
    const isCurrentDark = accentKey.endsWith('_dark')
    const colorName = accentKey.replace('_dark', '').replace('_light', '')

    if(!autoMode && isCurrentDark) {
      // dark → light
      const newKey = `${colorName}_light`
      await setAccent(newKey)
    } else if(!autoMode && !isCurrentDark) {
      // light → auto
      setAutoMode(true)
      await AsyncStorage.setItem('auto-mode', 'true')
      const newKey = isDay() ? `${colorName}_light` : `${colorName}_dark`
      await setAccent(newKey)
    } else {
      // auto → dark
      setAutoMode(false)
      await AsyncStorage.setItem('auto-mode', 'false')
      const newKey = `${colorName}_dark`
      await setAccent(newKey)
    }
  }

  const accent = ACCENT_COLORS[accentKey] || ACCENT_COLORS.purple_dark
  const isDark = accent.isDark

  const colors = {
    bg: accent.bg,
    surface: accent.surface,
    surfaceAlt: accent.surfaceAlt,
    border: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
    text: isDark ? '#ffffff' : '#000000',
    textMuted: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)',
    textFaint: isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)',
    purple: accent.primary,
    purpleDark: accent.primary,
    pink: accent.light,
    flame: '#ff8c42',
  }

  const modeLabel = autoMode ? '🌓 auto' : isDark ? '🌙 dark' : '☀️ light'

  return { isDark, toggleTheme, colors, accent, accentKey, setAccent, autoMode, modeLabel }
}

export function useTheme() {
  return useContext(ThemeContext)
}