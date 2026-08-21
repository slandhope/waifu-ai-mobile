import { useEffect, useState } from 'react'
import { ActivityIndicator, Modal, StyleSheet, View } from 'react-native'
import { useLiveCamera } from '../context/LiveCameraContext'
import { loadCameraModule } from '../lib/cameraModule'
import LiveCameraFallback from './LiveCameraFallback'

/** Loads expo-camera only when opened — avoids startup crash if native module missing. */
export default function LiveCameraSheet() {
  const { visible } = useLiveCamera()
  const [Inner, setInner] = useState(null)
  const [useFallback, setUseFallback] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!visible) {
      setInner(null)
      setUseFallback(false)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)

    loadCameraModule().then((mod) => {
      if (cancelled) return
      if (!mod) {
        setUseFallback(true)
        setLoading(false)
        return
      }
      import('./LiveCameraSheetInner')
        .then((m) => {
          if (!cancelled) {
            setInner(() => m.default)
            setLoading(false)
          }
        })
        .catch(() => {
          if (!cancelled) {
            setUseFallback(true)
            setLoading(false)
          }
        })
    })

    return () => { cancelled = true }
  }, [visible])

  if (!visible) return null
  if (useFallback) return <LiveCameraFallback />
  if (loading || !Inner) {
    return (
      <Modal visible transparent animationType="fade">
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#6c5ce7" />
        </View>
      </Modal>
    )
  }
  return <Inner />
}

const styles = StyleSheet.create({
  loader: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center' },
})
