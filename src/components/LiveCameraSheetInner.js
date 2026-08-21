import { Feather } from '@expo/vector-icons'
import { Audio } from 'expo-av'
import { CameraView, useCameraPermissions } from 'expo-camera'
import * as Haptics from 'expo-haptics'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useLiveCamera } from '../context/LiveCameraContext'
import { GeminiLiveSession } from '../lib/geminiLive'
import { analyzeGymForm, analyzeLiveFrame, analyzeStudyFrame } from '../lib/liveVision'
import { synthesize, transcribe } from '../lib/waifu'

const MODE_LABELS = {
  home: 'Live Look',
  study: 'Live Study',
  gym: 'Form Check',
}

const FRAME_MS = 3000

export default function LiveCameraSheetInner() {
  const insets = useSafeAreaInsets()
  const { visible, config, closeLiveCamera } = useLiveCamera()
  const { mode = 'home', onStudyBeats, onGymFeedback, onHomeReply, exerciseName } = config

  const cameraRef = useRef(null)
  const geminiRef = useRef(null)
  const frameTimerRef = useRef(null)
  const recordingRef = useRef(false)
  const recRef = useRef(null)

  const [permission, requestPermission] = useCameraPermissions()
  const [facing, setFacing] = useState('back')
  const [cameraReady, setCameraReady] = useState(false)
  const [liveOn, setLiveOn] = useState(false)
  const [liveEngine, setLiveEngine] = useState(null) // 'gemini' | 'vision'
  const [status, setStatus] = useState('')
  const [reply, setReply] = useState('')
  const [busy, setBusy] = useState(false)
  const [question, setQuestion] = useState('')
  const [recording, setRecording] = useState(false)

  const visionContext = mode === 'gym' ? 'gym' : mode === 'study' ? 'study' : 'general'

  const captureBase64 = useCallback(async () => {
    if (!cameraRef.current || !cameraReady) return null
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.45,
        base64: true,
        skipProcessing: true,
      })
      return photo?.base64 || null
    } catch {
      return null
    }
  }, [cameraReady])

  const stopLive = useCallback(() => {
    setLiveOn(false)
    setLiveEngine(null)
    if (frameTimerRef.current) {
      clearInterval(frameTimerRef.current)
      frameTimerRef.current = null
    }
    geminiRef.current?.disconnect()
    geminiRef.current = null
    setStatus('')
  }, [])

  const handleClose = useCallback(() => {
    stopLive()
    setReply('')
    setQuestion('')
    closeLiveCamera()
  }, [closeLiveCamera, stopLive])

  useEffect(() => {
    if (!visible) stopLive()
    return () => stopLive()
  }, [visible, stopLive])

  async function speak(text) {
    try {
      const audio = await synthesize(text)
      const { sound } = await Audio.Sound.createAsync({ uri: audio })
      await sound.playAsync()
    } catch (_e) {}
  }

  async function runVisionAsk(userQuestion = '') {
    setBusy(true)
    setStatus('Looking…')
    try {
      const frame = await captureBase64()
      if (!frame) throw new Error('Could not capture frame')

      if (mode === 'study') {
        const beats = await analyzeStudyFrame(frame)
        setStatus('Got it — starting lesson')
        onStudyBeats?.(beats)
        handleClose()
        return
      }

      if (mode === 'gym') {
        const text = await analyzeGymForm(frame, { exerciseName })
        setReply(text)
        setStatus('Form check')
        onGymFeedback?.(text)
        await speak(text)
        return
      }

      const text = await analyzeLiveFrame(frame, {
        context: visionContext,
        question: userQuestion || question,
      })
      setReply(text)
      setStatus('Asuka sees you')
      onHomeReply?.(text)
      await speak(text)
    } catch (e) {
      setStatus(e?.message || 'Vision failed')
    } finally {
      setBusy(false)
    }
  }

  async function startLive() {
    if (liveOn || busy) return
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    setBusy(true)
    setStatus('Starting live…')

    const session = new GeminiLiveSession({
      onStatus: setStatus,
      onReply: async (text) => {
        setReply(text)
        onHomeReply?.(text)
        await speak(text)
        setBusy(false)
      },
      onError: () => {},
    })

    try {
      await session.connect('You are Asuka on waifu.ai mobile. The user is showing you their camera. Be warm and brief.')
      geminiRef.current = session
      setLiveEngine('gemini')
      setLiveOn(true)
      setStatus('● GEMINI LIVE')

      frameTimerRef.current = setInterval(async () => {
        const frame = await captureBase64()
        if (frame) session.sendVideoFrame(frame)
      }, FRAME_MS)

      const first = await captureBase64()
      if (first) session.sendText('Hi Asuka — you can see me now. Say a brief friendly greeting about what you notice.', first)
    } catch (e) {
      geminiRef.current?.disconnect()
      geminiRef.current = null
      setLiveEngine('vision')
      setLiveOn(true)
      setStatus('● LIVE LOOK (vision)')

      frameTimerRef.current = setInterval(async () => {
        if (busy) return
      }, FRAME_MS)

      setStatus('Live Look on — tap Ask or hold mic (sign in for Gemini Live)')
    } finally {
      setBusy(false)
    }
  }

  async function sendLiveText(text) {
    const msg = (text || question).trim()
    if (!msg) return
    setQuestion('')
    setBusy(true)
    setReply('…')

    if (liveEngine === 'gemini' && geminiRef.current?.ready) {
      const frame = await captureBase64()
      geminiRef.current.sendText(msg, frame)
      setStatus('Asuka is thinking…')
      return
    }

    await runVisionAsk(msg)
  }

  async function startRecording() {
    if (busy || recordingRef.current) return
    try {
      const perm = await Audio.requestPermissionsAsync()
      if (!perm.granted) {
        setStatus('Mic permission needed')
        return
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true })
      const rec = new Audio.Recording()
      await rec.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY)
      await rec.startAsync()
      recRef.current = rec
      recordingRef.current = true
      setRecording(true)
    } catch (e) {
      setStatus(e?.message || 'Mic failed')
    }
  }

  async function stopRecording() {
    if (!recordingRef.current || !recRef.current) return
    recordingRef.current = false
    setRecording(false)
    const rec = recRef.current
    recRef.current = null
    setBusy(true)
    try {
      await rec.stopAndUnloadAsync()
      const uri = rec.getURI()
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true })
      if (!uri) throw new Error('no recording')
      const text = await transcribe(uri)
      if (!text) {
        setStatus("Didn't catch that")
        return
      }
      await sendLiveText(text)
    } catch (e) {
      setStatus(e?.message || 'Voice failed')
    } finally {
      setBusy(false)
    }
  }

  if (!visible) return null

  if (!permission?.granted) {
    return (
      <Modal visible animationType="slide" onRequestClose={handleClose}>
        <View style={[styles.permWrap, { paddingTop: insets.top + 40 }]}>
          <Text style={styles.permTitle}>Camera access</Text>
          <Text style={styles.permSub}>Asuka needs the camera for live look, study, and gym form checks.</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={requestPermission}>
            <Text style={styles.primaryBtnText}>Allow camera</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.ghostBtn} onPress={handleClose}>
            <Text style={styles.ghostBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    )
  }

  return (
    <Modal visible animationType="slide" onRequestClose={handleClose}>
      <View style={styles.root}>
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing={facing}
          onCameraReady={() => setCameraReady(true)}
        />

        <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity style={styles.roundBtn} onPress={handleClose}>
            <Feather name="x" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={styles.topCenter}>
            <Text style={styles.modeTitle}>{MODE_LABELS[mode] || 'Live'}</Text>
            {!!status && <Text style={styles.statusLine}>{status}</Text>}
          </View>
          <TouchableOpacity
            style={styles.roundBtn}
            onPress={() => setFacing((f) => (f === 'back' ? 'front' : 'back'))}
          >
            <Feather name="refresh-cw" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {liveOn && (
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>{liveEngine === 'gemini' ? 'GEMINI LIVE' : 'LIVE LOOK'}</Text>
          </View>
        )}

        {!!reply && (
          <View style={styles.replyBubble}>
            <Text style={styles.replyText}>{reply}</Text>
          </View>
        )}

        <View style={[styles.bottom, { paddingBottom: insets.bottom + 16 }]}>
          {mode === 'home' && (
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                value={question}
                onChangeText={setQuestion}
                placeholder="Ask about what you show her…"
                placeholderTextColor="rgba(255,255,255,0.5)"
                onSubmitEditing={() => sendLiveText()}
              />
              <TouchableOpacity style={styles.askBtn} onPress={() => sendLiveText()} disabled={busy}>
                <Text style={styles.askBtnText}>Ask</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.actions}>
            {!liveOn ? (
              <>
                <TouchableOpacity style={styles.actionChip} onPress={startLive} disabled={busy || !cameraReady}>
                  <Feather name="video" size={18} color="#fff" />
                  <Text style={styles.actionLabel}>Go live</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionChip}
                  onPress={() => runVisionAsk()}
                  disabled={busy || !cameraReady}
                >
                  {busy ? <ActivityIndicator color="#fff" size="small" /> : <Feather name="eye" size={18} color="#fff" />}
                  <Text style={styles.actionLabel}>
                    {mode === 'study' ? 'Solve' : mode === 'gym' ? 'Check form' : 'Snap & look'}
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity style={styles.actionChip} onPress={stopLive}>
                <Feather name="square" size={18} color="#fff" />
                <Text style={styles.actionLabel}>Stop live</Text>
              </TouchableOpacity>
            )}

            <Pressable
              onPressIn={startRecording}
              onPressOut={stopRecording}
              style={[styles.micBtn, (recording || busy) && styles.micActive]}
            >
              {busy && !recording
                ? <ActivityIndicator color="#fff" size="small" />
                : <Feather name="mic" size={24} color="#fff" />
              }
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  permWrap: { flex: 1, backgroundColor: '#eef4ff', paddingHorizontal: 28, alignItems: 'center' },
  permTitle: { fontSize: 22, fontWeight: '800', color: '#1a1a1a', marginBottom: 10 },
  permSub: { fontSize: 15, color: 'rgba(0,0,0,0.55)', textAlign: 'center', lineHeight: 22, marginBottom: 28 },
  primaryBtn: { backgroundColor: '#1a1a1a', paddingHorizontal: 28, paddingVertical: 14, borderRadius: 16, marginBottom: 12 },
  primaryBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  ghostBtn: { padding: 12 },
  ghostBtnText: { color: '#6c5ce7', fontWeight: '700' },
  topBar: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 14, gap: 10 },
  roundBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center',
  },
  topCenter: { flex: 1, alignItems: 'center', paddingTop: 4 },
  modeTitle: { color: '#fff', fontSize: 17, fontWeight: '800' },
  statusLine: { color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 4, textAlign: 'center' },
  liveBadge: {
    position: 'absolute', top: 100, alignSelf: 'center',
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
  },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#34d399' },
  liveText: { color: '#34d399', fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  replyBubble: {
    position: 'absolute', left: 18, right: 18, bottom: 180,
    backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 18, padding: 16,
  },
  replyText: { color: '#1a1a1a', fontSize: 15, lineHeight: 22 },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16 },
  inputRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  input: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 12, color: '#fff', fontSize: 15,
  },
  askBtn: { backgroundColor: '#6c5ce7', borderRadius: 14, paddingHorizontal: 18, justifyContent: 'center' },
  askBtnText: { color: '#fff', fontWeight: '800' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  actionChip: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 16, paddingVertical: 14,
  },
  actionLabel: { color: '#fff', fontWeight: '700', fontSize: 13 },
  micBtn: {
    width: 58, height: 58, borderRadius: 29,
    backgroundColor: 'rgba(108,92,231,0.85)', alignItems: 'center', justifyContent: 'center',
  },
  micActive: { backgroundColor: '#e74c3c' },
})
