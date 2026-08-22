import { useEffect, useRef, useState } from 'react'
import {
  View, Text, Image, TextInput, TouchableOpacity, Pressable, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView, Modal,
} from 'react-native'
import { Audio } from 'expo-av'
import { Feather } from '@expo/vector-icons'
import Svg, { Circle, Path } from 'react-native-svg'
import AsukaLive2D from './AsukaLive2D'
import GlassSurface from './GlassSurface'
import HabitsPanel from './HabitsPanel'
import { calcScore, HABITS } from '../constants'
import { useFitness } from '../context/FitnessContext'
import { CHARACTERS } from '../lib/characters'
import { buildWaifuContextAsync } from '../lib/waifuContext'
import { useLive2DCharacter } from '../context/Live2DContext'
import { useLiveCamera } from '../context/LiveCameraContext'
import { useWaifuState } from '../context/WaifuStateContext'
import { getLive2dExprsForEquipped } from '../lib/waifuCare'
import { getReply, synthesize, transcribe, trySwitch, handleTeaching } from '../lib/waifu'
import {
  appendChatExchange, getApiHistoryForReply,
  pullChatFromCloud, toApiHistory,
} from '../lib/chatSync'

const SCENES = [
  { key: 'night', label: 'Night', tint: 'rgba(10,10,26,0.45)' },
  { key: 'sunset', label: 'Sunset', tint: 'rgba(120,40,60,0.35)' },
  { key: 'study', label: 'Study', tint: 'rgba(20,40,30,0.4)' },
  { key: 'clear', label: 'Clear', tint: 'rgba(255,255,255,0.08)' },
]

function formatHeaderDate() {
  return new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

function MiniClock() {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(id)
  }, [])

  const h = now.getHours() % 12
  const m = now.getMinutes()
  const hourAngle = ((h + m / 60) * 30 - 90) * (Math.PI / 180)
  const minAngle = (m * 6 - 90) * (Math.PI / 180)
  const cx = 18
  const cy = 18
  const hourX = cx + Math.cos(hourAngle) * 6
  const hourY = cy + Math.sin(hourAngle) * 6
  const minX = cx + Math.cos(minAngle) * 9
  const minY = cy + Math.sin(minAngle) * 9

  return (
    <Svg width={36} height={36}>
      <Circle cx={cx} cy={cy} r={16} stroke="rgba(0,0,0,0.12)" strokeWidth={1} fill="rgba(255,255,255,0.35)" />
      <Path d={`M ${cx} ${cy} L ${hourX} ${hourY}`} stroke="#1a1a1a" strokeWidth={1.5} strokeLinecap="round" />
      <Path d={`M ${cx} ${cy} L ${minX} ${minY}`} stroke="#1a1a1a" strokeWidth={1} strokeLinecap="round" />
      <Circle cx={cx} cy={cy} r={1.5} fill="#1a1a1a" />
    </Svg>
  )
}

export default function WaifuStage({ onSettingsPress, onHabitsPress, profile, data }) {
  const asuka = useRef(null)
  const recRef = useRef(null)
  const recordingRef = useRef(false)
  const { characterId, character, swapCharacter } = useLive2DCharacter()
  const { care, relationship, careAction, buyItem, equipItem, getCatalog } = useWaifuState()
  const { openLiveCamera } = useLiveCamera()
  const { steps, sleepHours, activeMinutes, connected } = useFitness()
  const [input, setInput] = useState('')
  const [reply, setReply] = useState('')
  const [busy, setBusy] = useState(false)
  const [recording, setRecording] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const [history, setHistory] = useState([])
  const [panel, setPanel] = useState(null)
  const [tint, setTint] = useState(SCENES[3].tint)
  const [shopCat, setShopCat] = useState('outfit')
  const [shopChar, setShopChar] = useState(null)
  const [shopToast, setShopToast] = useState('')

  const name = profile?.name || 'there'
  const todayHabits = data?.todayHabits || []
  const score = calcScore(todayHabits)

  async function say(text) {
    setReply(text)
    try { const a = await synthesize(text); asuka.current?.speak(a) } catch (_e) {}
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
          const ctx = await buildWaifuContextAsync({
            todayHabits,
            streak: data?.streak || 0,
            steps,
            sleepHours,
            activeMinutes,
            connected,
            coins: care?.coins ?? 0,
          }, msg)
          answer = await getReply(history, msg, ctx)
        }
      }
      const merged = await appendChatExchange(msg, answer)
      setHistory(toApiHistory(merged, 20))
      setReply(answer)
      if (speak) { const audio = await synthesize(answer); asuka.current?.speak(audio) }
    } catch (e) {
      setReply('(' + (e?.message || 'something went wrong') + ')')
    } finally { setBusy(false) }
  }

  function showToast(msg) {
    setShopToast(msg)
    setTimeout(() => setShopToast(''), 2200)
  }

  function doCare(action) {
    const r = careAction(action, characterId)
    if (!r) return
    let msg = r.message
    if (r.levelInfo?.leveledUp) {
      const unlocks = (r.levelInfo.unlocked || []).map((u) => u.split(':')[1]).filter(Boolean).join(', ')
      msg = `${r.levelInfo.tier.emoji} We're now ${r.levelInfo.tier.name}!${unlocks ? ` Unlocked: ${unlocks}!` : ''} +${r.levelInfo.coinBonus} coins 💕`
    }
    say(msg)
  }

  function handleBuy(category, id) {
    const r = buyItem(category, id)
    if (r?.success) showToast(r.message || 'Purchased!')
    else if (r?.error === 'not_enough') showToast(`Need ${r.need} more coins!`)
    else if (r?.error === 'locked') showToast(`🔒 Reach ${r.tierName} (Lvl ${r.needLevel})`)
    else showToast(r?.error || 'Could not buy')
  }

  function applyEquippedLooks(equipped) {
    const exprs = getLive2dExprsForEquipped(equipped)
    if (exprs.length) exprs.forEach((e) => asuka.current?.setExpression(e))
  }

  function handleEquip(category, id, forChar) {
    const r = equipItem(category, id, forChar, characterId)
    if (r?.success) {
      if (forChar === characterId) applyEquippedLooks(r.equipped)
      showToast('Wearing it now~ 💕')
    } else showToast(r?.error || 'Could not equip')
  }

  const shopData = panel === 'shop' ? getCatalog(shopChar || characterId, characterId) : null

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const merged = await pullChatFromCloud()
      if (cancelled) return
      const log = merged?.chatLog || (Array.isArray(merged) ? merged : null)
      const apiHist = log?.length ? toApiHistory(log, 20) : await getApiHistoryForReply(20)
      if (apiHist.length) setHistory(apiHist)
    })()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!care) return
    const eq = care.equippedByChar?.[characterId] || care.equipped
    applyEquippedLooks(eq)
  }, [care, characterId])

  async function startRecording() {
    if (busy || transcribing || recordingRef.current) return
    try {
      const perm = await Audio.requestPermissionsAsync()
      if (!perm.granted) {
        setReply('(Microphone permission is needed for voice chat)')
        return
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true })
      const rec = new Audio.Recording()
      await rec.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY)
      await rec.startAsync()
      recRef.current = rec
      recordingRef.current = true
      setRecording(true)
      setPanel(null)
    } catch (e) {
      setReply('(' + (e?.message || 'could not start mic') + ')')
    }
  }

  async function stopRecording() {
    if (!recordingRef.current || !recRef.current) return
    recordingRef.current = false
    setRecording(false)
    const rec = recRef.current
    recRef.current = null
    setTranscribing(true)
    setReply('…')
    try {
      await rec.stopAndUnloadAsync()
      const uri = rec.getURI()
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true })
      if (!uri) throw new Error('no recording')
      const text = await transcribe(uri)
      if (!text) {
        setReply("(Didn't catch that — hold the mic and try again)")
        return
      }
      setInput(text)
      await send(text)
    } catch (e) {
      setReply('(' + (e?.message || 'voice failed') + ')')
    } finally {
      setTranscribing(false)
    }
  }

  function renderPttButton(large = false) {
    return (
      <Pressable
        onPressIn={startRecording}
        onPressOut={stopRecording}
        disabled={busy && !recording}
        style={({ pressed }) => [
          large ? styles.pttLarge : styles.micBtn,
          (pressed || recording) && styles.pttActive,
        ]}
      >
        <GlassSurface borderRadius={large ? 40 : 28} style={large ? styles.pttLargeInner : styles.micInner}>
          {transcribing || (busy && !recording)
            ? <ActivityIndicator color="#333" size="small" />
            : <Feather name="mic" size={large ? 32 : 22} color={recording ? '#e74c3c' : '#333'} />
          }
        </GlassSurface>
        {large && (
          <Text style={styles.pttHint}>
            {recording ? 'Listening… release when done' : transcribing ? 'Transcribing…' : 'Hold to talk'}
          </Text>
        )}
      </Pressable>
    )
  }

  function renderAvatar(size = 44) {
    if (profile?.avatar) {
      return <Image source={{ uri: profile.avatar }} style={{ width: size, height: size, borderRadius: size / 2 }} />
    }
    return (
      <View style={[styles.avatarFallback, { width: size, height: size, borderRadius: size / 2 }]}>
        <Text style={{ fontSize: size * 0.45 }}>{profile?.animalAvatar || '✨'}</Text>
      </View>
    )
  }

  const habitsLeft = HABITS.filter((h) => !todayHabits.includes(h.id)).length

  const COMPANION_BTNS = [
    { key: 'talk', icon: 'mic', label: 'Talk' },
    { key: 'habits', icon: 'check-circle', label: 'Habits & Gym', badge: habitsLeft > 0 ? habitsLeft : null },
    { key: 'room', icon: 'image', label: 'Room' },
    { key: 'care', icon: 'heart', label: 'Care' },
    { key: 'shop', icon: 'shopping-bag', label: 'Shop' },
    { key: 'waifu', icon: 'users', label: 'Waifu' },
  ]

  return (
    <View style={styles.root}>
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: tint }]} pointerEvents="none" />

      {/* Layer 1 — header (above character) */}
      <View style={styles.header} pointerEvents="box-none">
        <View style={styles.headerSafe}>
          <View style={styles.topBar}>
            <GlassSurface borderRadius={28} style={styles.weatherPill}>
              <View style={styles.weatherInner}>
                <Text style={styles.weatherIcon}>✨</Text>
                <Text style={styles.weatherTemp}>{score}</Text>
              </View>
            </GlassSurface>

            <GlassSurface borderRadius={28} style={styles.clockPill}>
              <View style={styles.clockInner}>
                <MiniClock />
                <View style={styles.companionThumb}>
                  <Text style={{ fontSize: 18 }}>🌌</Text>
                </View>
              </View>
            </GlassSurface>

            <TouchableOpacity onPress={onSettingsPress} activeOpacity={0.85}>
              <GlassSurface borderRadius={28} style={styles.avatarPill}>
                {renderAvatar(40)}
              </GlassSurface>
            </TouchableOpacity>
          </View>

          <View style={styles.greetingBlock}>
            <Text style={styles.dateLine}>{formatHeaderDate()}</Text>
            <Text style={styles.greetingLine}>{getGreeting()}, {name}</Text>
          </View>
        </View>
      </View>

      {/* Layer 2 — Asuka (hero) */}
      <View style={styles.characterStage} pointerEvents="box-none">
        <AsukaLive2D ref={asuka} style={styles.character} />
      </View>

      {/* Layer 3 — companion actions beside her */}
      <View style={styles.companionStrip} pointerEvents="box-none">
        {COMPANION_BTNS.map((b) => (
          <TouchableOpacity key={b.key} onPress={() => {
            if (b.key === 'habits' && onHabitsPress) onHabitsPress()
            else setPanel(b.key)
          }} activeOpacity={0.85}>
            <GlassSurface borderRadius={16} style={styles.companionChip}>
              <View style={styles.companionChipInner}>
                <Feather name={b.icon} size={18} color="#333" />
                {b.badge != null && (
                  <View style={styles.habitBadge}>
                    <Text style={styles.habitBadgeText}>{b.badge}</Text>
                  </View>
                )}
                <Text style={styles.companionLabel}>{b.label}</Text>
              </View>
            </GlassSurface>
          </TouchableOpacity>
        ))}
      </View>

      {/* Layer 4 — reply bubble */}
      {!!reply && (
        <View style={styles.replyWrap} pointerEvents="box-none">
          <GlassSurface borderRadius={24} style={styles.replyCard}>
            <ScrollView style={{ maxHeight: 100 }} showsVerticalScrollIndicator={false}>
              <Text style={styles.replyText}>{reply}</Text>
            </ScrollView>
          </GlassSurface>
        </View>
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.bottom}
        pointerEvents="box-none"
      >
        <GlassSurface borderRadius={32} style={styles.inputShell}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Type a message"
            placeholderTextColor="rgba(0,0,0,0.35)"
            onSubmitEditing={() => send()}
            returnKeyType="send"
          />
        </GlassSurface>
        <TouchableOpacity
          onPress={() => openLiveCamera('home', { onHomeReply: (text) => setReply(text) })}
          activeOpacity={0.85}
          style={styles.mediaBtn}
        >
          <GlassSurface borderRadius={28} style={styles.mediaBtnInner}>
            <Feather name="camera" size={22} color="#333" />
          </GlassSurface>
        </TouchableOpacity>
        {renderPttButton()}
        {!!input.trim() && !recording && (
          <TouchableOpacity style={styles.sendFab} onPress={() => send()} disabled={busy} activeOpacity={0.85}>
            <Feather name="arrow-up" size={20} color="#fff" />
          </TouchableOpacity>
        )}
      </KeyboardAvoidingView>

      <Modal visible={!!panel} transparent animationType="slide" onRequestClose={() => setPanel(null)}>
        <View style={styles.sheetWrap}>
          <GlassSurface borderRadius={28} style={styles.sheet}>
            <View style={styles.sheetHead}>
              <Text style={styles.sheetTitle}>
                {panel === 'talk' ? 'Talk'
                  : panel === 'habits' ? 'Habits & Gym'
                  : panel === 'room' ? 'Room & Scenes'
                  : panel === 'care' ? 'Care'
                  : panel === 'shop' ? 'Dress-Up Shop'
                  : 'Choose waifu'}
              </Text>
              <TouchableOpacity onPress={() => setPanel(null)}>
                <Feather name="x" size={22} color="#666" />
              </TouchableOpacity>
            </View>

            {panel === 'talk' && (
              <View style={styles.talkPanel}>
                <Text style={styles.sheetText}>
                  Hold the button and speak — Asuka will hear you and reply in her voice.
                </Text>
                {renderPttButton(true)}
              </View>
            )}

            {panel === 'habits' && (
              <HabitsPanel
                active
                data={data}
                onRewardMessage={(msg) => say(msg)}
              />
            )}

            {panel === 'room' && (
              <View style={styles.sceneRow}>
                {SCENES.map((s) => (
                  <TouchableOpacity
                    key={s.key}
                    style={[styles.sceneChip, tint === s.tint && styles.sceneChipOn]}
                    onPress={() => setTint(s.tint)}
                  >
                    <Text style={styles.sceneText}>{s.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {panel === 'care' && !care && (
              <ActivityIndicator color="#6c5ce7" style={{ marginVertical: 24 }} />
            )}

            {panel === 'care' && care && (
              <View>
                {relationship && (
                  <View style={styles.tierRow}>
                    <Text style={styles.tierEmoji}>{relationship.tier.emoji}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.tierName}>{relationship.tier.name}</Text>
                      <Text style={styles.tierSub}>
                        {care.coins ?? 0} 🪙 · Bond {relationship.xp} XP
                        {relationship.next ? ` · ${relationship.toNext} to ${relationship.next.name}` : ''}
                      </Text>
                    </View>
                  </View>
                )}
                <Bar label="Hunger" v={care.hunger} />
                <Bar label="Happiness" v={care.happiness} />
                <Bar label="Cleanliness" v={care.cleanliness} />
                <Bar label="Affection" v={care.affection} />
                <View style={styles.careGrid}>
                  <TouchableOpacity style={styles.careBtn} onPress={() => doCare('feed')}>
                    <Text style={styles.careBtnText}>🍙 Feed</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.careBtn} onPress={() => doCare('pat')}>
                    <Text style={styles.careBtnText}>💗 Pat</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.careBtn} onPress={() => doCare('clean')}>
                    <Text style={styles.careBtnText}>🛁 Clean</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.careBtn} onPress={() => doCare('play')}>
                    <Text style={styles.careBtnText}>🎀 Play</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {panel === 'shop' && shopData && (
              <View>
                <View style={styles.shopHead}>
                  <Text style={styles.coinsText}>{shopData.coins ?? 0} 🪙</Text>
                  <Text style={styles.shopSub}>
                    {shopData.tier?.emoji} {shopData.tier?.name} · {character.name}'s wardrobe
                  </Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.charScroll}>
                  {shopData.characters.map((c) => (
                    <TouchableOpacity
                      key={c.id}
                      style={[styles.charPill, (shopChar || characterId) === c.id && styles.charPillOn]}
                      onPress={() => setShopChar(c.id)}
                    >
                      <Text style={styles.charPillText}>{c.emoji} {c.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <View style={styles.shopTabs}>
                  {[
                    { key: 'outfit', label: '👗 Outfits' },
                    { key: 'hair', label: '💇 Hair' },
                    { key: 'accessory', label: '🎀 Acc' },
                  ].map((t) => (
                    <TouchableOpacity
                      key={t.key}
                      style={[styles.shopTab, shopCat === t.key && styles.shopTabOn]}
                      onPress={() => setShopCat(t.key)}
                    >
                      <Text style={[styles.shopTabText, shopCat === t.key && styles.shopTabTextOn]}>{t.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <ScrollView style={{ maxHeight: 280 }} showsVerticalScrollIndicator={false}>
                  <View style={styles.shopGrid}>
                    {(shopData.catalog[shopCat] || []).filter((i) => i.available !== false).map((item) => {
                      const eq = shopData.equipped?.[shopCat]
                      const isEq = eq === item.id || (shopCat === 'accessory' && !eq && (item.id === 'none' || item.id === 'default'))
                      const forChar = shopChar || characterId
                      return (
                        <View key={item.id} style={[styles.shopItem, item.limited && styles.shopItemLimited]}>
                          <Text style={styles.shopEmoji}>{item.emoji || '✨'}</Text>
                          <Text style={styles.shopItemName} numberOfLines={2}>{item.name}</Text>
                          {item.levelLocked ? (
                            <Text style={styles.shopLock}>🔒 Lvl {item.unlockLevel}</Text>
                          ) : isEq ? (
                            <View style={styles.shopBtnEquipped}><Text style={styles.shopBtnEquippedText}>Wearing ✓</Text></View>
                          ) : item.owned ? (
                            <TouchableOpacity style={styles.shopBtnEquip} onPress={() => handleEquip(shopCat, item.id, forChar)}>
                              <Text style={styles.shopBtnEquipText}>Wear</Text>
                            </TouchableOpacity>
                          ) : (
                            <TouchableOpacity style={styles.shopBtnBuy} onPress={() => handleBuy(shopCat, item.id)}>
                              <Text style={styles.shopBtnBuyText}>{item.price} 🪙</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      )
                    })}
                  </View>
                </ScrollView>
                {!!shopToast && <Text style={styles.shopToast}>{shopToast}</Text>}
              </View>
            )}

            {panel === 'waifu' && (
              <View>
                <Text style={styles.sheetText}>Swap your Live2D companion. Voice and chat stay the same.</Text>
                <View style={styles.charGrid}>
                  {CHARACTERS.map((c) => {
                    const active = c.id === characterId
                    return (
                      <TouchableOpacity
                        key={c.id}
                        style={[styles.charCard, active && styles.charCardOn]}
                        onPress={() => swapCharacter(c.id)}
                        activeOpacity={0.85}
                      >
                        <Text style={styles.charEmoji}>{c.emoji}</Text>
                        <Text style={styles.charName}>{c.name}</Text>
                        <Text style={styles.charDesc} numberOfLines={2}>{c.description}</Text>
                        {active && <Text style={styles.charActive}>Active</Text>}
                      </TouchableOpacity>
                    )
                  })}
                </View>
                <Text style={styles.charHint}>Current: {character.name} {character.emoji}</Text>
              </View>
            )}
          </GlassSurface>
        </View>
      </Modal>
    </View>
  )
}

function Bar({ label, v }) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={styles.barLabel}>{label} · {v}%</Text>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${v}%` }]} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 12,
    elevation: 12,
    paddingHorizontal: 22,
  },
  headerSafe: {},
  characterStage: {
    position: 'absolute',
    left: 4,
    right: -20,
    top: 168,
    bottom: 100,
    zIndex: 10,
    elevation: 10,
  },
  character: { ...StyleSheet.absoluteFillObject, backgroundColor: 'transparent' },
  companionStrip: {
    position: 'absolute',
    left: 16,
    top: '38%',
    zIndex: 20,
    elevation: 20,
    gap: 10,
  },
  companionChip: { width: 52 },
  companionChipInner: {
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 6,
    gap: 4,
    position: 'relative',
  },
  habitBadge: {
    position: 'absolute',
    top: 2,
    right: 0,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#6c5ce7',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  habitBadgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  companionLabel: { fontSize: 10, color: 'rgba(0,0,0,0.55)', fontWeight: '600' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    marginBottom: 8,
  },
  weatherPill: { minWidth: 72 },
  weatherInner: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 12 },
  weatherIcon: { fontSize: 14 },
  weatherTemp: { fontSize: 20, fontWeight: '600', color: '#1a1a1a' },
  clockPill: { flex: 1, marginHorizontal: 12, maxWidth: 160 },
  clockInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 8 },
  companionThumb: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPill: { overflow: 'hidden' },
  avatarFallback: { backgroundColor: 'rgba(255,255,255,0.6)', alignItems: 'center', justifyContent: 'center' },
  greetingBlock: { marginBottom: 4 },
  dateLine: { fontSize: 15, color: 'rgba(0,0,0,0.45)', fontWeight: '400', marginBottom: 4 },
  greetingLine: { fontSize: 28, fontWeight: '700', color: '#1a1a1a', letterSpacing: -0.5 },
  replyWrap: {
    position: 'absolute',
    left: 22,
    right: 22,
    bottom: 168,
    zIndex: 15,
    elevation: 15,
  },
  replyCard: { marginBottom: 0 },
  replyText: { padding: 16, fontSize: 14, lineHeight: 21, color: '#1a1a1a' },
  bottom: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 100,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    zIndex: 25,
    elevation: 25,
  },
  inputShell: { flex: 1 },
  input: { paddingHorizontal: 22, paddingVertical: 16, fontSize: 16, color: '#1a1a1a' },
  micBtn: {},
  micInner: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
  mediaBtn: {},
  mediaBtnInner: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
  pttActive: { opacity: 0.92 },
  pttLarge: { alignItems: 'center', marginTop: 20, gap: 12 },
  pttLargeInner: { width: 80, height: 80, alignItems: 'center', justifyContent: 'center' },
  pttHint: { fontSize: 14, color: 'rgba(0,0,0,0.55)', fontWeight: '600' },
  talkPanel: { alignItems: 'center' },
  sendFab: {
    position: 'absolute',
    right: 134,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#6c5ce7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetWrap: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.2)', padding: 16, paddingBottom: 40 },
  sheet: { padding: 22 },
  sheetHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sheetTitle: { fontSize: 20, fontWeight: '700', color: '#1a1a1a' },
  sheetText: { fontSize: 14, lineHeight: 22, color: 'rgba(0,0,0,0.55)' },
  sceneRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  sceneChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.45)' },
  sceneChipOn: { backgroundColor: 'rgba(108,92,231,0.2)', borderWidth: 1, borderColor: 'rgba(108,92,231,0.4)' },
  sceneText: { color: '#333', fontWeight: '600', fontSize: 13 },
  barLabel: { color: 'rgba(0,0,0,0.5)', fontSize: 13, marginBottom: 6 },
  barTrack: { height: 8, backgroundColor: 'rgba(0,0,0,0.06)', borderRadius: 6, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: '#6c5ce7' },
  careBtns: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 },
  careGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 },
  careBtn: { width: '47%', backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  careBtnText: { color: '#333', fontWeight: '700', fontSize: 15 },
  tierRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14, padding: 12, borderRadius: 14, backgroundColor: 'rgba(108,92,231,0.08)' },
  tierEmoji: { fontSize: 28 },
  tierName: { fontSize: 16, fontWeight: '700', color: '#1a1a1a' },
  tierSub: { fontSize: 12, color: 'rgba(0,0,0,0.5)', marginTop: 2 },
  shopHead: { marginBottom: 10 },
  coinsText: { fontSize: 22, fontWeight: '800', color: '#c9a227' },
  shopSub: { fontSize: 12, color: 'rgba(0,0,0,0.5)', marginTop: 4 },
  charScroll: { marginBottom: 10 },
  charPill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.45)', marginRight: 8 },
  charPillOn: { backgroundColor: 'rgba(108,92,231,0.2)', borderWidth: 1, borderColor: 'rgba(108,92,231,0.4)' },
  charPillText: { fontSize: 13, fontWeight: '600', color: '#333' },
  shopTabs: { flexDirection: 'row', gap: 6, marginBottom: 12 },
  shopTab: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.4)' },
  shopTabOn: { backgroundColor: 'rgba(108,92,231,0.2)' },
  shopTabText: { fontSize: 12, fontWeight: '600', color: 'rgba(0,0,0,0.45)' },
  shopTabTextOn: { color: '#6c5ce7' },
  shopGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  shopItem: { width: '30%', backgroundColor: 'rgba(255,255,255,0.45)', borderRadius: 14, padding: 10, alignItems: 'center' },
  shopItemLimited: { borderWidth: 1, borderColor: 'rgba(232,155,196,0.5)' },
  shopEmoji: { fontSize: 28, marginBottom: 6 },
  shopItemName: { fontSize: 11, fontWeight: '700', color: '#333', textAlign: 'center', minHeight: 28, marginBottom: 8 },
  shopLock: { fontSize: 10, color: '#e84393', fontWeight: '700' },
  shopBtnBuy: { backgroundColor: '#f0c040', borderRadius: 12, paddingVertical: 6, paddingHorizontal: 10, width: '100%', alignItems: 'center' },
  shopBtnBuyText: { fontSize: 11, fontWeight: '800', color: '#1a1426' },
  shopBtnEquip: { backgroundColor: '#6c5ce7', borderRadius: 12, paddingVertical: 6, width: '100%', alignItems: 'center' },
  shopBtnEquipText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  shopBtnEquipped: { backgroundColor: 'rgba(0,0,0,0.08)', borderRadius: 12, paddingVertical: 6, width: '100%', alignItems: 'center' },
  shopBtnEquippedText: { fontSize: 10, fontWeight: '700', color: 'rgba(0,0,0,0.45)' },
  shopToast: { marginTop: 12, textAlign: 'center', fontSize: 13, fontWeight: '700', color: '#6c5ce7' },
  charGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 14 },
  charCard: {
    width: '47%',
    backgroundColor: 'rgba(255,255,255,0.45)',
    borderRadius: 16,
    padding: 14,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  charCardOn: { borderColor: 'rgba(108,92,231,0.55)', backgroundColor: 'rgba(108,92,231,0.12)' },
  charEmoji: { fontSize: 28, marginBottom: 6 },
  charName: { fontSize: 16, fontWeight: '700', color: '#1a1a1a', marginBottom: 4 },
  charDesc: { fontSize: 12, lineHeight: 16, color: 'rgba(0,0,0,0.5)' },
  charActive: { marginTop: 8, fontSize: 11, fontWeight: '700', color: '#6c5ce7' },
  charHint: { marginTop: 14, fontSize: 13, color: 'rgba(0,0,0,0.45)', textAlign: 'center' },
})
