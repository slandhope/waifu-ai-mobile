import { Component } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import AsukaLive2D from '../components/AsukaLive2D'
import TabScreenShell from '../components/TabScreenShell'
import { useLive2D } from '../context/Live2DContext'

class HomeErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { err: null }
  }

  static getDerivedStateFromError(err) {
    return { err }
  }

  componentDidCatch(err, info) {
    console.log('[Home] render error', err, info?.componentStack)
  }

  render() {
    if (this.state.err) {
      return (
        <View style={styles.errWrap}>
          <Text style={styles.errTitle}>Home hit an error</Text>
          <Text style={styles.errText}>{String(this.state.err?.message || this.state.err)}</Text>
        </View>
      )
    }
    return this.props.children
  }
}

export default function HomeScreen({ wallpaper }) {
  const { live2dRef } = useLive2D()
  console.log('[Home] render stage')
  return (
    <View style={styles.root} collapsable={false}>
      <TabScreenShell wallpaper={wallpaper}>
        <View style={{ flex: 1 }} />
      </TabScreenShell>
      <View style={styles.live2dFrame} collapsable={false}>
        <HomeErrorBoundary>
          <AsukaLive2D ref={live2dRef} />
        </HomeErrorBoundary>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  live2dFrame: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 132,
    bottom: 148,
    overflow: 'hidden',
    borderRadius: 8,
    opacity: 0.99,
  },
  errWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: 'rgba(255,255,255,0.88)' },
  errTitle: { fontSize: 18, fontWeight: '700', color: '#1a1a1a', marginBottom: 8 },
  errText: { fontSize: 13, color: 'rgba(0,0,0,0.55)', textAlign: 'center' },
})
