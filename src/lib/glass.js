import { isExpoGo } from '../utils/isExpoGo'

export function canUseNativeGlass() {
  if (isExpoGo()) return false
  try {
    const { isGlassEffectAPIAvailable } = require('expo-glass-effect')
    return !!isGlassEffectAPIAvailable()
  } catch (_e) {
    return false
  }
}
