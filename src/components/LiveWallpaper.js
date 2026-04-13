import { ResizeMode, Video } from 'expo-av'
import { useRef } from 'react'
import { Dimensions, StyleSheet, View } from 'react-native'

const { width, height } = Dimensions.get('window')

export default function LiveWallpaper({ uri }) {
  const video = useRef(null)

  if(!uri) return null

  return (
    <View style={styles.container} pointerEvents='none'>
      <Video
        ref={video}
        source={{ uri }}
        style={styles.video}
        resizeMode={ResizeMode.COVER}
        isLooping
        isMuted
        shouldPlay
        onLoad={() => console.log('wallpaper loaded!')}
        onError={(e) => console.log('wallpaper error:', e)}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    width,
    height,
    zIndex: 0,
  },
  video: {
    width,
    height,
  },
})