import { StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { isExpoGo } from '../utils/isExpoGo'
import WallpaperBackground from './WallpaperBackground'

export default function TabScreenShell({ wallpaper, children, edges = ['top'] }) {
  const insets = useSafeAreaInsets()
  const wp = wallpaper?.currentWallpaper ?? wallpaper
  const list = Array.isArray(edges) ? edges : []
  const pad = {
    paddingTop: list.includes('top') ? insets.top : 0,
    paddingBottom: list.includes('bottom') ? insets.bottom : 0,
    paddingLeft: list.includes('left') ? insets.left : 0,
    paddingRight: list.includes('right') ? insets.right : 0,
  }
  // Expo Go: Image wallpaper covers later children in the same tree.
  // Wallpaper is painted by ExpoGoTabs; this shell is chrome only.
  if (isExpoGo()) {
    return (
      <View style={[styles.safe, pad]} collapsable={false}>
        {children}
      </View>
    )
  }
  return (
    <WallpaperBackground wallpaper={wp} style={styles.wrap}>
      <View style={[styles.safe, pad]} collapsable={false}>
        {children}
      </View>
    </WallpaperBackground>
  )
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  safe: { flex: 1, width: '100%' },
})
