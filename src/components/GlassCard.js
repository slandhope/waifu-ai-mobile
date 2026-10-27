import { View } from 'react-native'
import { canUseNativeGlass } from '../lib/glass'
// Expo Go: never use GlassView / BlurView — they paint a transparent overlay.

export default function GlassCard({ children, style, padding = 16, borderRadius = 20 }) {
  if (canUseNativeGlass()) {
    try {
      const { GlassView } = require('expo-glass-effect')
      return (
        <GlassView
          style={[{ borderRadius, overflow: 'hidden', marginBottom: 16 }, style]}
          glassEffectStyle="regular"
          colorScheme="system"
        >
          <View style={{ padding }}>{children}</View>
        </GlassView>
      )
    } catch (_e) {}
  }
  return (
    <View style={[{
      borderRadius,
      padding,
      marginBottom: 16,
      backgroundColor: 'rgba(255,255,255,0.72)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.55)',
      overflow: 'hidden',
    }, style]}>
      {children}
    </View>
  )
}
