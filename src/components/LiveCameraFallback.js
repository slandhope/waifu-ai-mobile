import { Feather } from '@expo/vector-icons'
import { Audio } from 'expo-av'
import { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useLiveCamera } from '../context/LiveCameraContext'
import { snapCameraBase64 } from '../lib/cameraSnap'
import { analyzeGymForm, analyzeLiveFrame, analyzeStudyFrame } from '../lib/liveVision'
import { synthesize } from '../lib/waifu'

const MODE_LABELS = { home: 'Camera Look', study: 'Camera Study', gym: 'Form Check' }

/** System camera (ImagePicker) when expo-camera native module is unavailable. */
export default function LiveCameraFallback() {
  const insets = useSafeAreaInsets()
  const { visible, config, closeLiveCamera } = useLiveCamera()
  const { mode = 'home', onStudyBeats, onGymFeedback, onHomeReply, exerciseName } = config
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [reply, setReply] = useState('')

  const handleClose = useCallback(() => {
    setReply('')
    setStatus('')
    closeLiveCamera()
  }, [closeLiveCamera])

  useEffect(() => {
    if (!visible) {
      setReply('')
      setStatus('')
    }
  }, [visible])

  async function speak(text) {
    try {
      const audio = await synthesize(text)
      const { sound } = await Audio.Sound.createAsync({ uri: audio })
      await sound.playAsync()
    } catch (_e) {}
  }

  async function takePhotoAndAnalyze() {
    setBusy(true)
    setStatus('Opening camera…')
    try {
      const shot = await snapCameraBase64()
      if (!shot?.base64) {
        setStatus('Cancelled')
        return
      }
      setStatus('Asuka is looking…')

      if (mode === 'study') {
        const beats = await analyzeStudyFrame(shot.base64, shot.mediaType)
        onStudyBeats?.(beats)
        handleClose()
        return
      }

      if (mode === 'gym') {
        const text = await analyzeGymForm(shot.base64, { exerciseName, mediaType: shot.mediaType })
        setReply(text)
        onGymFeedback?.(text)
        await speak(text)
        setStatus('Done')
        return
      }

      const text = await analyzeLiveFrame(shot.base64, { context: 'general', mediaType: shot.mediaType })
      setReply(text)
      onHomeReply?.(text)
      await speak(text)
      setStatus('Done')
    } catch (e) {
      setStatus(e?.message || 'Camera failed')
    } finally {
      setBusy(false)
    }
  }

  if (!visible) return null

  return (
    <Modal visible animationType="slide" onRequestClose={handleClose}>
      <View style={[styles.wrap, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
        <TouchableOpacity style={styles.close} onPress={handleClose}>
          <Feather name="x" size={22} color="#1a1a1a" />
        </TouchableOpacity>

        <Text style={styles.title}>{MODE_LABELS[mode] || 'Camera'}</Text>
        <Text style={styles.sub}>
          Live preview needs an app update. For now, tap below to open the system camera — Asuka still reads your photo.
        </Text>

        {!!status && <Text style={styles.status}>{status}</Text>}
        {!!reply && <View style={styles.replyBox}><Text style={styles.reply}>{reply}</Text></View>}

        <TouchableOpacity style={styles.btn} onPress={takePhotoAndAnalyze} disabled={busy}>
          {busy
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnText}>📷 Take photo for Asuka</Text>
          }
        </TouchableOpacity>

        <Text style={styles.hint}>
          Tip: update Expo Go from the App Store, or run a dev build with expo-camera linked for full Live / Gemini mode.
        </Text>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#eef4ff', paddingHorizontal: 24 },
  close: {
    alignSelf: 'flex-start', width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.7)', alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 24, fontWeight: '800', color: '#1a1a1a', marginTop: 20 },
  sub: { fontSize: 15, color: 'rgba(0,0,0,0.55)', lineHeight: 22, marginTop: 10 },
  status: { fontSize: 14, color: '#6c5ce7', fontWeight: '600', marginTop: 16 },
  replyBox: {
    backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: 16, padding: 16, marginTop: 16,
  },
  reply: { fontSize: 15, lineHeight: 22, color: '#1a1a1a' },
  btn: {
    marginTop: 28, backgroundColor: '#1a1a1a', borderRadius: 18,
    paddingVertical: 16, alignItems: 'center',
  },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  hint: { fontSize: 12, color: 'rgba(0,0,0,0.4)', lineHeight: 18, marginTop: 20, textAlign: 'center' },
})
