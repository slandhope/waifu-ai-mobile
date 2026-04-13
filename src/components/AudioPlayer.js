import Slider from '@react-native-community/slider'
import { Audio } from 'expo-av'
import * as Haptics from 'expo-haptics'
import { LinearGradient } from 'expo-linear-gradient'
import { useEffect, useState } from 'react'
import { ActivityIndicator, Dimensions, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useTheme } from '../hooks/useTheme'

const { width } = Dimensions.get('window')

export default function AudioPlayer({ item, onClose }) {
  const { accent, colors, isDark } = useTheme()
  const [sound, setSound] = useState(null)
  const [playing, setPlaying] = useState(false)
  const [loading, setLoading] = useState(true)
  const [position, setPosition] = useState(0)
  const [duration, setDuration] = useState(0)
  const [expanded, setExpanded] = useState(false)
  const [isSeeking, setIsSeeking] = useState(false)
  const [seekValue, setSeekValue] = useState(0)

  useEffect(() => {
    loadAudio()
    return () => { sound?.unloadAsync() }
  }, [])

  const loadAudio = async () => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
      })
      const { sound: s } = await Audio.Sound.createAsync(
        { uri: item.audio },
        { shouldPlay: true },
        (status) => {
          if(status.isLoaded && !isSeeking) {
            setPosition(status.positionMillis || 0)
            setDuration(status.durationMillis || 0)
            setPlaying(status.isPlaying)
          }
        }
      )
      setSound(s)
      setPlaying(true)
      setLoading(false)
    } catch(e) {
      console.log('audio error:', e)
      setLoading(false)
    }
  }

  const togglePlay = async () => {
    if(!sound) return
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    if(playing) await sound.pauseAsync()
    else await sound.playAsync()
  }

  const handleClose = async () => {
    await sound?.unloadAsync()
    onClose()
  }

  const formatTime = (ms) => {
    const secs = Math.floor(ms / 1000)
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const progress = duration > 0 ? position / duration : 0

  if(!expanded) {
    return (
      <View style={[styles.miniPlayer, {
        backgroundColor: isDark ? 'rgba(20,10,40,0.97)' : 'rgba(255,255,255,0.97)',
        borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
      }]}>
        <TouchableOpacity onPress={() => setExpanded(true)} style={styles.miniLeft} activeOpacity={0.8}>
          <Image source={{ uri: item.image }} style={styles.miniArtwork} />
          <View style={styles.miniInfo}>
            <Text style={[styles.miniTitle, { color: colors.text }]} numberOfLines={1}>{item.title}</Text>
            <Text style={[styles.miniSub, { color: colors.textFaint }]} numberOfLines={1}>{item.sub}</Text>
          </View>
        </TouchableOpacity>
        <View style={styles.miniControls}>
          <TouchableOpacity onPress={togglePlay} style={[styles.miniPlayBtn, { backgroundColor: accent.primary }]}>
            {loading
              ? <ActivityIndicator color='#fff' size='small' />
              : <Text style={styles.miniPlayIcon}>{playing ? '⏸' : '▶'}</Text>
            }
          </TouchableOpacity>
          <TouchableOpacity onPress={handleClose} style={styles.miniCloseBtn}>
            <Text style={[styles.miniCloseIcon, { color: colors.textFaint }]}>✕</Text>
          </TouchableOpacity>
        </View>
        <View style={[styles.miniProgress, { backgroundColor: colors.border }]}>
          <LinearGradient
            colors={accent.gradient}
            start={{x:0,y:0}} end={{x:1,y:0}}
            style={[styles.miniProgressFill, { width: `${progress * 100}%` }]}
          />
        </View>
      </View>
    )
  }

  return (
    <View style={[styles.expandedPlayer, { backgroundColor: isDark ? '#0a0a0f' : '#f0f0ff' }]}>
      {/* header */}
      <View style={styles.expandedHeader}>
        <TouchableOpacity onPress={() => setExpanded(false)} style={styles.chevronBtn}>
          <Text style={[styles.chevron, { color: colors.textFaint }]}>↓</Text>
        </TouchableOpacity>
        <Text style={[styles.expandedHeaderTitle, { color: colors.textFaint }]}>NOW PLAYING</Text>
        <TouchableOpacity onPress={handleClose} style={styles.chevronBtn}>
          <Text style={[styles.chevron, { color: colors.textFaint }]}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* artwork */}
      <Image
        source={{ uri: item.image }}
        style={styles.bigArtwork}
        resizeMode='cover'
      />

      {/* info */}
      <View style={styles.expandedInfo}>
        <Text style={[styles.expandedTitle, { color: colors.text }]}>{item.title}</Text>
        <Text style={[styles.expandedSub, { color: colors.textFaint }]}>{item.sub}</Text>
      </View>

      {/* slider */}
      <View style={styles.progressWrap}>
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={1}
          value={isSeeking ? seekValue : progress}
          minimumTrackTintColor={accent.primary}
          maximumTrackTintColor={isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)'}
          thumbTintColor={accent.primary}
          onSlidingStart={(val) => {
            setIsSeeking(true)
            setSeekValue(val)
          }}
          onValueChange={(val) => setSeekValue(val)}
          onSlidingComplete={async (val) => {
            setIsSeeking(false)
            await sound?.setPositionAsync(val * duration)
          }}
        />
        <View style={styles.timeRow}>
          <Text style={[styles.timeText, { color: colors.textFaint }]}>{formatTime(isSeeking ? seekValue * duration : position)}</Text>
          <Text style={[styles.timeText, { color: colors.textFaint }]}>{formatTime(duration)}</Text>
        </View>
      </View>

      {/* controls */}
      <View style={styles.expandedControls}>
        <TouchableOpacity
          onPress={() => sound?.setPositionAsync(Math.max(0, position - 15000))}
          style={styles.skipBtn}
        >
          <Text style={[styles.skipIcon, { color: colors.textMuted }]}>↩ 15</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={togglePlay} style={styles.bigPlayBtn} activeOpacity={0.8}>
          <LinearGradient colors={accent.gradient} style={styles.bigPlayBtnGrad}>
            {loading
              ? <ActivityIndicator color='#fff' size='large' />
              : <Text style={styles.bigPlayIcon}>{playing ? '⏸' : '▶'}</Text>
            }
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => sound?.setPositionAsync(Math.min(duration, position + 15000))}
          style={styles.skipBtn}
        >
          <Text style={[styles.skipIcon, { color: colors.textMuted }]}>15 ↪</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  miniPlayer: {
    position: 'absolute',
    bottom: 90,
    left: 12,
    right: 12,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  miniLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, paddingRight: 100 },
  miniArtwork: { width: 44, height: 44, borderRadius: 10 },
  miniInfo: { flex: 1 },
  miniTitle: { fontSize: 13, fontWeight: '600' },
  miniSub: { fontSize: 11, marginTop: 2 },
  miniControls: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingRight: 12, position: 'absolute', right: 0, top: 0, bottom: 16 },
  miniPlayBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  miniPlayIcon: { color: '#fff', fontSize: 14 },
  miniCloseBtn: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  miniCloseIcon: { fontSize: 14 },
  miniProgress: { height: 2, width: '100%' },
  miniProgressFill: { height: 2 },
  expandedPlayer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, paddingHorizontal: 32, paddingTop: 60, paddingBottom: 40 },
  expandedHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 },
  chevronBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  chevron: { fontSize: 22 },
  expandedHeaderTitle: { fontSize: 11, letterSpacing: 2 },
  bigArtwork: { width: width - 64, height: width - 64, borderRadius: 20, marginBottom: 32 },
  expandedInfo: { marginBottom: 24 },
  expandedTitle: { fontSize: 22, fontWeight: '700', marginBottom: 6 },
  expandedSub: { fontSize: 14 },
  progressWrap: { marginBottom: 32 },
  slider: { width: '100%', height: 40 },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: -8 },
  timeText: { fontSize: 11 },
  expandedControls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 32 },
  skipBtn: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  skipIcon: { fontSize: 14, fontWeight: '600' },
  bigPlayBtn: { width: 72, height: 72, borderRadius: 36, overflow: 'hidden' },
  bigPlayBtnGrad: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  bigPlayIcon: { fontSize: 28, color: '#fff' },
})