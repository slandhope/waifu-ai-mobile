import { useVideoPlayer, VideoView } from 'expo-video'
import { Dimensions, StyleSheet, View } from 'react-native'

const { width, height } = Dimensions.get('window')

export default function LiveWallpaper({ uri }) {
  const player = useVideoPlayer(uri ? { uri } : null, (p) => {
    p.loop = true
    p.muted = true
    if (uri) p.play()
  })

  if (!uri) return null

  return (
    <View style={styles.container} pointerEvents="none">
      <VideoView
        player={player}
        style={styles.video}
        contentFit="cover"
        nativeControls={false}
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
