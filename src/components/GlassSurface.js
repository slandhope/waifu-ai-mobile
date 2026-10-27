import { StyleSheet, View } from 'react-native'
import { canUseNativeGlass } from '../lib/glass'

export default function GlassSurface({ children, style, borderRadius = 24, intensity: _intensity = 40 }) {
  const fallback = [
    styles.base,
    styles.fallback,
    { borderRadius, overflow: 'hidden' },
    style,
  ]

  // Expo Go 58 Liquid Glass / BlurView paints a full-screen transparent
  // overlay that hides Home chrome (greeting, dock, tabs). Solid fill only.
  if (canUseNativeGlass()) {
    try {
      const { GlassView } = require('expo-glass-effect')
      return (
        <GlassView
          style={[styles.base, { borderRadius, overflow: 'hidden' }, style]}
          glassEffectStyle="regular"
          colorScheme="light"
        >
          {children}
        </GlassView>
      )
    } catch (_e) {
      // missing native module
    }
  }

  return <View style={fallback}>{children}</View>
}

const styles = StyleSheet.create({
  base: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.55)',
    shadowColor: '#8b9dc3',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 4,
  },
  fallback: {
    backgroundColor: 'rgba(255,255,255,0.88)',
  },
})
