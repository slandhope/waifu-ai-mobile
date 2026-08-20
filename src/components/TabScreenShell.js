import { StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import WallpaperBackground from './WallpaperBackground'

export default function TabScreenShell({ wallpaper, children, edges = ['top'] }) {
  const wp = wallpaper?.currentWallpaper ?? wallpaper
  return (
    <WallpaperBackground wallpaper={wp}>
      <SafeAreaView style={styles.safe} edges={edges}>
        {children}
      </SafeAreaView>
    </WallpaperBackground>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
})
