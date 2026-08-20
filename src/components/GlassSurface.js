import { BlurView } from 'expo-blur'
import { GlassView, isGlassEffectAPIAvailable } from 'expo-glass-effect'
import { Platform, StyleSheet, View } from 'react-native'

export default function GlassSurface({ children, style, borderRadius = 24, intensity = 40 }) {
  const glassAvailable = isGlassEffectAPIAvailable()

  if (glassAvailable) {
    return (
      <GlassView
        style={[styles.base, { borderRadius, overflow: 'hidden' }, style]}
        glassEffectStyle="regular"
        colorScheme="light"
      >
        {children}
      </GlassView>
    )
  }

  if (Platform.OS === 'ios') {
    return (
      <BlurView intensity={intensity} tint="light" style={[styles.base, styles.fallback, { borderRadius, overflow: 'hidden' }, style]}>
        {children}
      </BlurView>
    )
  }

  return (
    <View style={[styles.base, styles.fallback, { borderRadius, overflow: 'hidden' }, style]}>
      {children}
    </View>
  )
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
    backgroundColor: 'rgba(255,255,255,0.42)',
  },
})
