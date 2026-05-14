import { GlassView, isGlassEffectAPIAvailable } from 'expo-glass-effect'
import { View } from 'react-native'

export default function GlassCard({ children, style, padding = 16, borderRadius = 20 }) {
  const glassAvailable = isGlassEffectAPIAvailable()
  if(glassAvailable) {
    return (
      <GlassView 
        style={[{ borderRadius, overflow: 'hidden', marginBottom: 16 }, style]} 
        glassEffectStyle='regular' 
        colorScheme='system'
      >
        <View style={{ padding }}>{children}</View>
      </GlassView>
    )
  }
  return (
    <View style={[{ 
      borderRadius, 
      padding, 
      marginBottom: 16, 
      backgroundColor: 'rgba(0,0,0,0.3)', 
      borderWidth: 1, 
      borderColor: 'rgba(255,255,255,0.1)', 
      overflow: 'hidden' 
    }, style]}>
      {children}
    </View>
  )
}
