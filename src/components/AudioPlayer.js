import { Feather } from '@expo/vector-icons'
import Slider from '@react-native-community/slider'
import { Audio } from 'expo-av'
import { GlassView, isGlassEffectAPIAvailable } from 'expo-glass-effect'
import * as Haptics from 'expo-haptics'
import { LinearGradient } from 'expo-linear-gradient'
import { useEffect, useState } from 'react'
import { ActivityIndicator, Dimensions, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useTheme } from '../hooks/useTheme'

const { width } = Dimensions.get('window')

function GlassBox({ children, style, borderRadius = 20 }) {
  const glassAvailable = isGlassEffectAPIAvailable()
  if(glassAvailable) {
    return (
      <GlassView style={[{ borderRadius, overflow: 'hidden' }, style]} glassEffectStyle='regular' colorScheme='system'>
        {children}
      </GlassView>
    )
  }
  return (
    <View style={[{ borderRadius, overflow: 'hidden', backgroundColor: 'rgba(0,0,0,0.45)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' }, style]}>
      {children}
    </View>
  )
}

export default function AudioPlayer({ item, onClose }) {
  const { accent } = useTheme()
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
      <View style={styles.miniContainer}>
        <GlassBox style={styles.miniPlayer} borderRadius={20}>
          <TouchableOpacity onPress={() => setExpanded(true)} style={styles.miniLeft} activeOpacity={0.8}>
            <Image source={{ uri: item.image }} style={styles.miniArtwork} />
            <View style={styles.miniInfo}>
              <Text style={styles.miniTitle} numberOfLines={1}>{item.title}</Text>
              <Text style={styles.miniSub} numberOfLines={1}>{item.sub}</Text>
            </View>
          </TouchableOpacity>
          <View style={styles.miniControls}>
            <TouchableOpacity onPress={togglePlay} style={[styles.miniPlayBtn, { backgroundColor: accent.primary }]}>
              {loading
                ? <ActivityIndicator color='#fff' size='small' />
                : <Feather name={playing ? 'pause' : 'play'} size={14} color='#fff' />
              }
            </TouchableOpacity>
            <TouchableOpacity onPress={handleClose} style={styles.miniCloseBtn}>
              <Feather name='x' size={16} color='rgba(255,255,255,0.6)' />
            </TouchableOpacity>
          </View>
          <View style={styles.miniProgressBg}>
            <LinearGradient
              colors={accent.gradient}
              start={{x:0,y:0}} end={{x:1,y:0}}
              style={[styles.miniProgressFill, { width: `${progress * 100}%` }]}
            />
          </View>
        </GlassBox>
      </View>
    )
  }

  return (
    <View style={styles.expandedContainer}>
      <GlassBox style={styles.expandedPlayer} borderRadius={0}>
        {/* header */}
        <View style={styles.expandedHeader}>
          <TouchableOpacity onPress={() => setExpanded(false)} style={styles.chevronBtn}>
            <Feather name='chevron-down' size={24} color='rgba(255,255,255,0.8)' />
          </TouchableOpacity>
          <Text style={styles.expandedHeaderTitle}>NOW PLAYING</Text>
          <TouchableOpacity onPress={handleClose} style={styles.chevronBtn}>
            <Feather name='x' size={24} color='rgba(255,255,255,0.8)' />
          </TouchableOpacity>
        </View>

        {/* artwork */}
        <Image source={{ uri: item.image }} style={styles.bigArtwork} resizeMode='cover' />

        {/* info */}
        <View style={styles.expandedInfo}>
          <Text style={styles.expandedTitle}>{item.title}</Text>
          <Text style={styles.expandedSub}>{item.sub}</Text>
        </View>

        {/* slider */}
        <View style={styles.progressWrap}>
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={1}
            value={isSeeking ? seekValue : progress}
            minimumTrackTintColor={accent.primary}
            maximumTrackTintColor='rgba(255,255,255,0.2)'
            thumbTintColor={accent.primary}
            onSlidingStart={(val) => { setIsSeeking(true); setSeekValue(val) }}
            onValueChange={(val) => setSeekValue(val)}
            onSlidingComplete={async (val) => {
              setIsSeeking(false)
              await sound?.setPositionAsync(val * duration)
            }}
          />
          <View style={styles.timeRow}>
            <Text style={styles.timeText}>{formatTime(isSeeking ? seekValue * duration : position)}</Text>
            <Text style={styles.timeText}>{formatTime(duration)}</Text>
          </View>
        </View>

        {/* controls */}
        <View style={styles.expandedControls}>
          <TouchableOpacity onPress={() => sound?.setPositionAsync(Math.max(0, position - 15000))} style={styles.skipBtn}>
            <Feather name='rotate-ccw' size={20} color='rgba(255,255,255,0.6)' />
            <Text style={styles.skipLabel}>15</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={togglePlay} style={styles.bigPlayBtn} activeOpacity={0.8}>
            <LinearGradient colors={accent.gradient} style={styles.bigPlayBtnGrad}>
              {loading
                ? <ActivityIndicator color='#fff' size='large' />
                : <Feather name={playing ? 'pause' : 'play'} size={28} color='#fff' />
              }
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => sound?.setPositionAsync(Math.min(duration, position + 15000))} style={styles.skipBtn}>
            <Feather name='rotate-cw' size={20} color='rgba(255,255,255,0.6)' />
            <Text style={styles.skipLabel}>15</Text>
          </TouchableOpacity>
        </View>
      </GlassBox>
    </View>
  )
}

const styles = StyleSheet.create({
  miniContainer: {
    position: 'absolute',
    bottom: 100,
    left: 12,
    right: 12,
    zIndex: 100,
  },
  miniPlayer: {
    overflow: 'hidden',
  },
  miniLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, paddingRight: 100 },
  miniArtwork: { width: 44, height: 44, borderRadius: 10 },
  miniInfo: { flex: 1 },
  miniTitle: { fontSize: 13, fontWeight: '600', color: '#fff' },
  miniSub: { fontSize: 11, marginTop: 2, color: 'rgba(255,255,255,0.6)' },
  miniControls: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingRight: 12, position: 'absolute', right: 0, top: 0, bottom: 16 },
  miniPlayBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  miniCloseBtn: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  miniProgressBg: { height: 2, backgroundColor: 'rgba(255,255,255,0.1)' },
  miniProgressFill: { height: 2 },
  expandedContainer: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 200,
  },
  expandedPlayer: {
    flex: 1,
    paddingHorizontal: 32,
    paddingTop: 60,
    paddingBottom: 40,
  },
  expandedHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 },
  chevronBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  expandedHeaderTitle: { fontSize: 11, letterSpacing: 2, color: 'rgba(255,255,255,0.6)' },
  bigArtwork: { width: width - 64, height: width - 64, borderRadius: 20, marginBottom: 32 },
  expandedInfo: { marginBottom: 24 },
  expandedTitle: { fontSize: 22, fontWeight: '700', color: '#fff', marginBottom: 6 },
  expandedSub: { fontSize: 14, color: 'rgba(255,255,255,0.6)' },
  progressWrap: { marginBottom: 32 },
  slider: { width: '100%', height: 40 },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: -8 },
  timeText: { fontSize: 11, color: 'rgba(255,255,255,0.4)' },
  expandedControls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 40 },
  skipBtn: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  skipLabel: { fontSize: 10, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  bigPlayBtn: { width: 72, height: 72, borderRadius: 36, overflow: 'hidden' },
  bigPlayBtnGrad: { flex: 1, alignItems: 'center', justifyContent: 'center' },
})
