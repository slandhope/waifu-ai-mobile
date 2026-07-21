import { useRef, useState } from 'react'
import {
  View, Text, Image, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView, Modal,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Feather } from '@expo/vector-icons'
import AsukaLive2D from './AsukaLive2D'
import { getReply, synthesize, trySwitch, handleTeaching } from '../lib/waifu'

const SCENES = [
  { key: 'night', label: 'Night', tint: 'rgba(10,10,26,0.45)' },
  { key: 'sunset', label: 'Sunset', tint: 'rgba(120,40,60,0.35)' },
  { key: 'study', label: 'Study', tint: 'rgba(20,40,30,0.4)' },
  { key: 'clear', label: 'Clear', tint: 'rgba(0,0,0,0.15)' },
]

export default function WaifuStage({ onSettingsPress, wallpaperUri }) {
  const asuka = useRef(null)
  const [input, setInput] = useState('')
  const [reply, setReply] = useState('')
  const [busy, setBusy] = useState(false)
  const [history, setHistory] = useState([])
  const [panel, setPanel] = useState(null) // 'talk' | 'room' | 'care' | 'shop'
  const [tint, setTint] = useState(SCENES[0].tint)
  const [care, setCare] = useState({ energy: 70, happy: 80 })

  async function say(text) {
    setReply(text)
    try { const a = await synthesize(text); asuka.current?.speak(a) } catch (e) {}
  }

  async function send(text) {
    const msg = (text ?? input).trim()
    if (!msg || busy) return
    setInput('')
    setBusy(true)
    setReply('…')
    try {
      let answer
      let speak = true
      const switched = trySwitch(msg)
      if (switched != null) answer = switched
      else {
        const taught = await handleTeaching(history, msg)
        if (taught != null) { answer = taught; speak = answer.length < 240 }
        else {
          answer = await getReply(history, msg)
          setHistory((h) => [...h, { role: 'user', content: msg }, { role: 'assistant', content: answer }].slice(-10))
        }
      }
      setReply(answer)
      if (speak) { const audio = await synthesize(answer); asuka.current?.speak(audio) }
    } catch (e) {
      setReply('(' + (e?.message || 'something went wrong') + ')')
    } finally { setBusy(false) }
  }

  function feed() { setCare((c) => ({ ...c, energy: Math.min(100, c.energy + 15) })); say('Mmm~ thank you! That hit the spot 💗') }
  function pet() { setCare((c) => ({ ...c, happy: Math.min(100, c.happy + 15) })); say('Ehehe~ I like that.') }

  const BTNS = [
    { key: 'talk', icon: 'mic', label: 'Talk' },
    { key: 'room', icon: 'image', label: 'Room' },
    { key: 'care', icon: 'heart', label: 'Care' },
    { key: 'shop', icon: 'shopping-bag', label: 'Shop' },
  ]

  return (
    <View style={{ flex: 1, backgroundColor: '#0a0a1a' }}>
      {wallpaperUri
        ? <Image source={{ uri: wallpaperUri }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
        : <Image source={require('../../assets/wallpaper.png')} style={StyleSheet.absoluteFillObject} resizeMode="cover" />}
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: tint }]} pointerEvents="none" />

      <AsukaLive2D ref={asuka} style={StyleSheet.absoluteFillObject} />

      <SafeAreaView style={{ flex: 1 }} edges={['top']} pointerEvents="box-none">
        <View style={{ alignItems: 'flex-end', paddingHorizontal: 16, paddingTop: 8 }}>
          <TouchableOpacity onPress={onSettingsPress} activeOpacity={0.7} style={styles.gear}>
            <Feather name="settings" size={20} color="rgba(255,255,255,0.8)" />
          </TouchableOpacity>
        </View>

        {/* companion buttons beside her — PC style */}
        <View style={styles.strip} pointerEvents="box-none">
          {BTNS.map((b) => (
            <TouchableOpacity key={b.key} style={styles.chip} activeOpacity={0.8} onPress={() => setPanel(b.key)}>
              <Feather name={b.icon} size={18} color="#fff" />
              <Text style={styles.chipLabel}>{b.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.bottom} pointerEvents="box-none">
        {!!reply && (
          <View style={styles.bubble}>
            <ScrollView style={{ maxHeight: 220 }} showsVerticalScrollIndicator={false}>
              <Text style={styles.bubbleText}>{reply}</Text>
            </ScrollView>
          </View>
        )}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="talk, or try: tutor mode on"
            placeholderTextColor="rgba(255,255,255,0.4)"
            onSubmitEditing={() => send()}
            returnKeyType="send"
          />
          <TouchableOpacity style={styles.sendBtn} onPress={() => send()} disabled={busy} activeOpacity={0.8}>
            {busy ? <ActivityIndicator color="#fff" size="small" /> : <Feather name="arrow-up" size={20} color="#fff" />}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* panels */}
      <Modal visible={!!panel} transparent animationType="slide" onRequestClose={() => setPanel(null)}>
        <View style={styles.sheetWrap}>
          <View style={styles.sheet}>
            <View style={styles.sheetHead}>
              <Text style={styles.sheetTitle}>
                {panel === 'talk' ? 'Talk' : panel === 'room' ? 'Room & Scenes' : panel === 'care' ? 'Care' : 'Shop'}
              </Text>
              <TouchableOpacity onPress={() => setPanel(null)}><Feather name="x" size={22} color="#aaa" /></TouchableOpacity>
            </View>

            {panel === 'talk' && (
              <View>
                <Text style={styles.sheetText}>Push-to-talk — hold to speak, she replies in her voice. This needs the mic module and a quick rebuild, so it's the next drop. For now, type to her below.</Text>
              </View>
            )}

            {panel === 'room' && (
              <View style={styles.sceneRow}>
                {SCENES.map((s) => (
                  <TouchableOpacity key={s.key} style={[styles.scene, tint === s.tint && styles.sceneOn]} onPress={() => { setTint(s.tint); }}>
                    <Text style={styles.sceneText}>{s.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {panel === 'care' && (
              <View>
                <Bar label="Energy" v={care.energy} />
                <Bar label="Happiness" v={care.happy} />
                <View style={styles.careBtns}>
                  <TouchableOpacity style={styles.careBtn} onPress={feed}><Text style={styles.careBtnText}>🍙 Feed</Text></TouchableOpacity>
                  <TouchableOpacity style={styles.careBtn} onPress={pet}><Text style={styles.careBtnText}>💗 Pet</Text></TouchableOpacity>
                </View>
              </View>
            )}

            {panel === 'shop' && (
              <Text style={styles.sheetText}>Outfits, room items, and voice packs will live here. Starter shop — coming soon.</Text>
            )}
          </View>
        </View>
      </Modal>
    </View>
  )
}

function Bar({ label, v }) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={styles.barLabel}>{label} · {v}%</Text>
      <View style={styles.barTrack}><View style={[styles.barFill, { width: v + '%' }]} /></View>
    </View>
  )
}

const styles = StyleSheet.create({
  gear: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center' },
  strip: { position: 'absolute', left: 12, top: 90, gap: 12 },
  chip: { width: 54, alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 14, paddingVertical: 9, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  chipLabel: { color: '#fff', fontSize: 10, marginTop: 3 },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingBottom: 100, paddingHorizontal: 16 },
  bubble: { alignSelf: 'stretch', backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 18, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 10 },
  bubbleText: { color: '#fff', fontSize: 15, lineHeight: 22 },
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(20,20,30,0.85)', borderRadius: 26, paddingLeft: 18, paddingRight: 6, paddingVertical: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  input: { flex: 1, color: '#fff', fontSize: 15, paddingVertical: 8 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#7f5af0', alignItems: 'center', justifyContent: 'center', marginLeft: 6 },
  sheetWrap: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { backgroundColor: '#16161f', borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 22, paddingBottom: 40 },
  sheetHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sheetTitle: { color: '#fff', fontSize: 20, fontWeight: '800' },
  sheetText: { color: '#b8b8c8', fontSize: 14, lineHeight: 21 },
  sceneRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  scene: { paddingHorizontal: 18, paddingVertical: 12, borderRadius: 12, backgroundColor: '#22222e', borderWidth: 1, borderColor: 'transparent' },
  sceneOn: { borderColor: '#7f5af0', backgroundColor: 'rgba(127,90,240,0.2)' },
  sceneText: { color: '#fff', fontWeight: '600' },
  barLabel: { color: '#b8b8c8', fontSize: 13, marginBottom: 6 },
  barTrack: { height: 10, backgroundColor: '#22222e', borderRadius: 6, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: '#7f5af0' },
  careBtns: { flexDirection: 'row', gap: 12, marginTop: 8 },
  careBtn: { flex: 1, backgroundColor: '#22222e', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  careBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
})
