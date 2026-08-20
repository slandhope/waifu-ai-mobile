import { LinearGradient } from 'expo-linear-gradient'
import { StyleSheet, View } from 'react-native'

export default function PastelBackground({ children, style }) {
  return (
    <View style={[styles.wrap, style]}>
      <LinearGradient
        colors={['#dceeff', '#f5f0ff', '#fff4e8', '#e8f4ff']}
        locations={[0, 0.35, 0.65, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={styles.bloomPink} />
      <View style={styles.bloomBlue} />
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  bloomPink: {
    position: 'absolute',
    top: '18%',
    right: '-10%',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(255, 182, 193, 0.35)',
  },
  bloomBlue: {
    position: 'absolute',
    bottom: '22%',
    left: '-8%',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(173, 216, 255, 0.4)',
  },
})
