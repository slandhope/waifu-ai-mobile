import { Image, StyleSheet, View } from 'react-native'
import PastelBackground from './PastelBackground'

const LOCAL_WALLPAPER = require('../../assets/wallpaper.png')

export default function WallpaperBackground({ wallpaper, children, style }) {
  const wp = wallpaper || { id: 'none' }
  const showImage = wp.id !== 'none' && (wp.isLocal || wp.uri)

  if (!showImage) {
    return (
      <PastelBackground style={style}>
        {children}
      </PastelBackground>
    )
  }

  return (
    <View style={[styles.wrap, style]}>
      <Image
        source={wp.isLocal ? LOCAL_WALLPAPER : { uri: wp.uri }}
        style={StyleSheet.absoluteFillObject}
        resizeMode="cover"
      />
      <View style={styles.scrim} pointerEvents="none" />
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.28)',
  },
})
