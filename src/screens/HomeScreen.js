import { Feather, Ionicons } from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useFocusEffect } from '@react-navigation/native'
import * as Haptics from 'expo-haptics'
import { LinearGradient } from 'expo-linear-gradient'
import { useCallback, useEffect, useState } from 'react'
import { Alert, Dimensions, FlatList, Image, Modal, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Svg, { Circle, Path } from 'react-native-svg'
import AudioPlayer from '../components/AudioPlayer'
import GlassCard from '../components/GlassCard'
import ProfileAvatar from '../components/ProfileAvatar'
import VideoPlayer from '../components/VideoPlayer'
import { calcScore } from '../constants'
import { useFitnessData } from '../hooks/useFitnessData'
import { useTheme } from '../hooks/useTheme'
import { apiCall } from '../utils/api'

const { width } = Dimensions.get('window')
const RAILWAY_URL = 'https://clarity-app-production-e136.up.railway.app'

const MEDITATIONS = [
  { id: '1', title: '5 Min Morning', sub: 'Guided Meditation', type: 'audio', isPro: false, image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400', audio: RAILWAY_URL + '/audio/relax-beat.mp3' },
  { id: '2', title: 'Box Breathing', sub: '4-7-8 Technique', type: 'audio', isPro: false, image: 'https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?w=400', audio: RAILWAY_URL + '/audio/forest-walk.mp3' },
  { id: '3', title: 'Spirit in the Wood', sub: 'Deep Meditation', type: 'audio', isPro: true, image: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=400', audio: RAILWAY_URL + '/audio/spirit-in-the-wood.mp3' },
  { id: '4', title: 'Valley Sunset', sub: 'Sleep Meditation', type: 'audio', isPro: true, image: 'https://images.unsplash.com/photo-1531353826977-0941b4779a1c?w=400', audio: RAILWAY_URL + '/audio/valley-sunset.mp3' },
]

const FOCUS_MUSIC = [
  { id: '5', title: 'Lofi Beats', sub: 'Study & Relax', type: 'audio', isPro: false, image: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=400', audio: RAILWAY_URL + '/audio/relax-beat.mp3' },
  { id: '6', title: 'Rain Sounds', sub: 'Sleep & Focus', type: 'audio', isPro: false, image: 'https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?w=400', audio: RAILWAY_URL + '/audio/forest-walk.mp3' },
  { id: '7', title: 'Forest Walk', sub: 'Nature & Calm', type: 'audio', isPro: true, image: 'https://images.unsplash.com/photo-1528715471579-d1bcf0ba5e83?w=400', audio: RAILWAY_URL + '/audio/forest-walk.mp3' },
  { id: '8', title: 'Relax Beat', sub: 'Deep Focus', type: 'audio', isPro: true, image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400', audio: RAILWAY_URL + '/audio/relax-beat.mp3' },
]

const PODCASTS = [
  { id: 'nm1TxQj9IsQ', title: 'Science of Sleep', sub: 'Huberman Lab', type: 'video', isPro: false, image: 'https://img.youtube.com/vi/nm1TxQj9IsQ/mqdefault.jpg' },
  { id: 'PZ7lDrwYdZc', title: 'Atomic Habits', sub: 'James Clear', type: 'video', isPro: false, image: 'https://img.youtube.com/vi/PZ7lDrwYdZc/mqdefault.jpg' },
  { id: 'H-XfCl-HpRM', title: 'Morning Routine', sub: 'Andrew Huberman', type: 'video', isPro: false, image: 'https://img.youtube.com/vi/H-XfCl-HpRM/mqdefault.jpg' },
  { id: 'gbS88oRDNTk', title: 'Focus & Flow', sub: 'Tim Ferriss', type: 'video', isPro: false, image: 'https://img.youtube.com/vi/gbS88oRDNTk/mqdefault.jpg' },
]

const MOODS = [
  { value: 1, label: 'Awful' },
  { value: 2, label: 'Bad' },
  { value: 3, label: 'Okay' },
  { value: 4, label: 'Good' },
  { value: 5, label: 'Great' },
]

function ActivityRing({ size, strokeWidth, progress, color, bgColor }) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - Math.min(progress, 1))
  const cx = size / 2
  return (
    <Svg width={size} height={size}>
      <Circle cx={cx} cy={cx} r={radius} fill='none' stroke={bgColor} strokeWidth={strokeWidth} />
      <Circle cx={cx} cy={cx} r={radius} fill='none' stroke={color} strokeWidth={strokeWidth} strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap='round' rotation='-90' origin={cx + ', ' + cx} />
    </Svg>
  )
}

function TripleRing({ move, exercise, stand, size = 160 }) {
  const rings = [
    { progress: move, color: '#ff3b57', bg: 'rgba(255,59,87,0.2)', sw: 12 },
    { progress: exercise, color: '#aaf200', bg: 'rgba(170,242,0,0.2)', sw: 12 },
    { progress: stand, color: '#00d4ff', bg: 'rgba(0,212,255,0.2)', sw: 12 },
  ]
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {rings.map((ring, i) => (
        <View key={i} style={{ position: 'absolute' }}>
          <ActivityRing size={size - i * 32} strokeWidth={ring.sw} progress={ring.progress} color={ring.color} bgColor={ring.bg} />
        </View>
      ))}
    </View>
  )
}

function SparkLine({ data, color, width: w, height: h }) {
  w = w || 120
  h = h || 40
  if (!data || data.length < 2) return null
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const points = data.map(function (v, i) {
    const x = (i / (data.length - 1)) * w
    const y = h - ((v - min) / range) * (h - 8) - 4
    return x + ',' + y
  })
  return (
    <Svg width={w} height={h}>
      <Path d={'M ' + points.join(' L ')} stroke={color} strokeWidth={2} fill='none' strokeLinecap='round' strokeLinejoin='round' />
    </Svg>
  )
}

function StatCard({ children, style }) {
  return <View style={[styles.statCard, style]}>{children}</View>
}

function ContentCard({ item, accent, onPlay }) {
  return (
    <TouchableOpacity onPress={function () { onPlay(item) }} style={styles.smallCard} activeOpacity={0.8}>
      <Image source={{ uri: item.image }} style={styles.smallCardImg} />
      {item.isPro
        ? <View style={styles.proBadge}><Text style={styles.proBadgeText}>PRO</Text></View>
        : <View style={styles.freeBadgeS}><Text style={styles.freeBadgeText}>FREE</Text></View>
      }
      <View style={[styles.playBtn, { backgroundColor: item.isPro ? '#f59e0b' : accent.primary + 'cc' }]}>
        {item.isPro
          ? <Ionicons name='lock-closed' size={10} color='#fff' />
          : <Ionicons name='play' size={10} color='#fff' />
        }
      </View>
      <LinearGradient colors={['transparent', 'rgba(0,0,0,0.85)']} style={styles.smallCardOverlay}>
        <Text style={styles.smallCardTitle}>{item.title}</Text>
        <Text style={styles.smallCardSub}>{item.sub}</Text>
      </LinearGradient>
    </TouchableOpacity>
  )
}

export default function HomeScreen({ data, profile, onSettingsPress, wallpaper }) {
  const { todayHabits, streak, toggleHabit, history } = data
  const { accent } = useTheme()
  const { steps } = useFitnessData(toggleHabit, todayHabits)
  const realDistance = (steps * 0.76) / 1000

  const [celebrating, setCelebrating] = useState(false)
  const [quote, setQuote] = useState({ quote: 'The secret of getting ahead is getting started.', author: 'Mark Twain' })
  const [showMood, setShowMood] = useState(false)
  const [selectedMood, setSelectedMood] = useState(null)
  const [playingAudio, setPlayingAudio] = useState(null)
  const [playingVideo, setPlayingVideo] = useState(null)
  const [aiHabits, setAiHabits] = useState([])
  const [completedHabits, setCompletedHabits] = useState([])
  const [loadingHabit, setLoadingHabit] = useState(null)
  const [freezes, setFreezes] = useState(0)

  const totalHabits = aiHabits.length + completedHabits.length
  const score = totalHabits > 0 ? Math.round((completedHabits.length / totalHabits) * 100) : 0

  useEffect(function () {
    fetch('https://api.quotable.io/random?tags=motivational|inspirational|success|health|mind')
      .then(function (r) { return r.json() })
      .then(function (d) { if (d.content) setQuote({ quote: d.content, author: d.author }) })
      .catch(function () { })
  }, [])

  const loadAiHabits = useCallback(async () => {
    try {
      const userId = await AsyncStorage.getItem('user-id')
      if (!userId) return
      console.log('Loading habits for:', userId)
      const res = await apiCall('/api/daily-habits/' +  userId)
      const json = await res.json()
      if (json.habits) setAiHabits(json.habits)
      if (json.completed) setCompletedHabits(json.completed)
    } catch (e) {
      console.log('load habits error:', e.message)
    }
  }, [])

  const loadFreezes = useCallback(async () => {
    try {
      const userId = await AsyncStorage.getItem('user-id')
      if (!userId) return
      const res = await apiCall('/api/freezes/' + userId)
      const json = await res.json()
      setFreezes(json.freezes || 0)
    } catch (e) { }
  }, [])

  useFocusEffect(
    useCallback(() => {
      loadAiHabits()
      loadFreezes()
    }, [loadAiHabits, loadFreezes])
  )

  const handleAiHabitComplete = async (habit) => {
    if (loadingHabit) return
    setLoadingHabit(habit.id)
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)

    try {
      const userId = await AsyncStorage.getItem('user-id')
      const res = await apiCall('/api/complete-habit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, habitId: habit.id })
      })
      const json = await res.json()
      if (json.habits) setAiHabits(json.habits)
      if (json.completed) setCompletedHabits(json.completed)

      if (json.newHabit) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        Alert.alert('✨ Habit Complete!', 'AI added a new habit: ' + json.newHabit.label)
      }
    } catch (e) {
      console.log('complete habit error:', e.message)
    }
    setLoadingHabit(null)
  }

  const moveProgress = Math.min(score / 100, 1)
  const exerciseProgress = todayHabits.includes('exercise') ? 1 : 0
  const standProgress = completedHabits.length / Math.max(totalHabits, 5)
  const standHours = completedHabits.length * 2

  const sparkData = Array.from({ length: 7 }, function (_, i) {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    const key = d.toISOString().split('T')[0]
    return calcScore(history[key] || [])
  })
  const avg7 = Math.round(sparkData.reduce(function (a, b) { return a + b }, 0) / 7)

  const getGreeting = function () {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
  }

  const getDate = function () {
    return new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' })
  }

  const handleShare = async function () {
    try {
      await Share.share({ message: 'My Clarity score today: ' + score + '/100\n' + streak + ' day streak\nclarity.app' })
    } catch (e) { }
  }

  const handleMoodSelect = function (mood) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setSelectedMood(mood)
    setTimeout(function () { setShowMood(false) }, 500)
  }

  const handlePlay = function (item) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    if (item.type === 'audio') setPlayingAudio(item)
    else setPlayingVideo(item.id)
  }

  const handleFreezeInfo = function () {
    Alert.alert(
      '❄️ Streak Freeze',
      'Freezes protect your streak when you miss a day.\n\nYou get 1 free freeze every Sunday (max 3).\n\nUpgrade to Pro for unlimited freezes!',
      [{ text: 'Got it!' }]
    )
  }

  const { currentWallpaper } = wallpaper || {}

  return (
    <View style={{ flex: 1, backgroundColor: '#0a0a1a' }}>
      {currentWallpaper?.uri
        ? <Image source={{ uri: currentWallpaper.uri }} style={StyleSheet.absoluteFillObject} resizeMode='cover' />
        : <Image source={require('../../assets/wallpaper.png')} style={StyleSheet.absoluteFillObject} resizeMode='cover' />
      }
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.4)' }]} pointerEvents='none' />

      <SafeAreaView style={{ flex: 1 }} edges={['top']}>

        <View style={styles.header}>
          <View style={styles.logoRow}>
            <LinearGradient colors={accent.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.logoMark}>
              <Feather name='star' size={14} color='#fff' />
            </LinearGradient>
            <View>
              <Text style={styles.appName}>CLARITY</Text>
              <Text style={[styles.dateText, { color: accent.primary }]}>{getDate()}</Text>
            </View>
          </View>
          <ProfileAvatar profile={profile} size={75} onPress={onSettingsPress} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

          <View style={styles.greetingRow}>
            <Text style={styles.greeting}>{getGreeting()},</Text>
            <Feather name='star' size={20} color={accent.primary} style={{ marginTop: 4 }} />
          </View>

          {/* STREAK + FREEZE BADGES */}
          <View style={styles.streakRow}>
            <View style={styles.streakBadge}>
              <Text style={styles.streakEmoji}>🔥</Text>
              <Text style={styles.streakText}>{streak} day streak</Text>
            </View>
            <TouchableOpacity onPress={handleFreezeInfo} style={styles.freezeBadge} activeOpacity={0.7}>
              <Text style={styles.streakEmoji}>❄️</Text>
              <Text style={styles.streakText}>{freezes} freeze{freezes !== 1 ? 's' : ''}</Text>
            </TouchableOpacity>
          </View>

          {celebrating && (
            <LinearGradient colors={accent.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.celebrationBanner}>
              <Text style={styles.celebrationText}>Perfect day! All habits done!</Text>
            </LinearGradient>
          )}

          <GlassCard>
            <View style={styles.ringsRow}>
              <TripleRing move={moveProgress} exercise={exerciseProgress} stand={standProgress} size={160} />
              <View style={styles.ringsLegend}>
                <View style={styles.legendItem}>
                  <Text style={styles.legendLabel}>Move</Text>
                  <View style={styles.legendValue}>
                    <Text style={[styles.legendNum, { color: '#ff3b57' }]}>{score}</Text>
                    <Text style={styles.legendUnit}>/100</Text>
                  </View>
                </View>
                <View style={styles.legendItem}>
                  <Text style={styles.legendLabel}>Exercise</Text>
                  <View style={styles.legendValue}>
                    <Text style={[styles.legendNum, { color: '#aaf200' }]}>{steps > 5000 ? 30 : 0}</Text>
                    <Text style={styles.legendUnit}>/30 MIN</Text>
                  </View>
                </View>
                <View style={styles.legendItem}>
                  <Text style={styles.legendLabel}>Stand</Text>
                  <View style={styles.legendValue}>
                    <Text style={[styles.legendNum, { color: '#00d4ff' }]}>{standHours}</Text>
                    <Text style={styles.legendUnit}>/12 HRS</Text>
                  </View>
                </View>
              </View>
            </View>
          </GlassCard>

          <View style={styles.statRow}>
            <StatCard>
              <Text style={styles.statLabel}>Step Count</Text>
              <Text style={styles.statValue}>{steps.toLocaleString()}</Text>
              <SparkLine data={[200, 400, 350, 600, 450, 700, steps]} color='#ff3b57' width={120} height={40} />
            </StatCard>
            <StatCard>
              <Text style={styles.statLabel}>Step Distance</Text>
              <Text style={[styles.statValueGold, { color: accent.primary }]}>{realDistance.toFixed(2)} KM</Text>
              <SparkLine data={[0.1, 0.3, 0.25, 0.5, 0.4, 0.6, realDistance]} color={accent.primary} width={120} height={40} />
            </StatCard>
          </View>

          <GlassCard>
            <View style={styles.pulseHeader}>
              <View>
                <Text style={styles.statLabel}>Clarity Pulse</Text>
                <Text style={styles.statValue}>{score}</Text>
              </View>
              <View>
                <Text style={styles.statLabel}>7-Day Avg</Text>
                <Text style={[styles.statValueGold, { color: '#00d4ff' }]}>{avg7} pts</Text>
              </View>
            </View>
            <View style={styles.dualChart}>
              <SparkLine data={sparkData} color='#ff3b57' width={width - 80} height={60} />
              <View style={{ position: 'absolute', top: 0, left: 0 }}>
                <SparkLine data={sparkData.map(function (v, i) { return v * 0.8 + i * 2 })} color='#00d4ff' width={width - 80} height={60} />
              </View>
            </View>
          </GlassCard>

          <GlassCard>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>✦ TODAYS HABITS</Text>
              <Text style={[styles.cardPct, { color: accent.primary }]}>{completedHabits.length}/{totalHabits || 5}</Text>
            </View>
            <View style={[styles.progressTrack, { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
              <LinearGradient colors={accent.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.progressFill, { width: (totalHabits > 0 ? (completedHabits.length / totalHabits) * 100 : 0) + '%' }]} />
            </View>

            {aiHabits.length === 0 && completedHabits.length === 0 && (
              <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>Loading your AI-personalized habits...</Text>
              </View>
            )}

            {aiHabits.map(function (habit, i) {
              const isLoading = loadingHabit === habit.id
              return (
                <TouchableOpacity
                  key={habit.id}
                  onPress={function () { handleAiHabitComplete(habit) }}
                  activeOpacity={0.7}
                  disabled={isLoading}
                  style={[styles.habitRow, i < aiHabits.length - 1 && { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' }]}
                >
                  <View style={[styles.habitCheck, { borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)' }]} />
                  <Text style={styles.habitEmoji}>{habit.emoji || '✨'}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.habitName, { color: '#fff' }]}>{habit.label}</Text>
                    {habit.tip && (
                      <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 2 }}>{habit.tip}</Text>
                    )}
                  </View>
                  <Text style={[styles.habitPts, { color: accent.primary }]}>+{habit.points || 10}</Text>
                </TouchableOpacity>
              )
            })}

            {completedHabits.length > 0 && (
              <View style={{ marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)' }}>
                <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, letterSpacing: 1, marginBottom: 8 }}>✓ COMPLETED TODAY</Text>
                {completedHabits.map(function (label, i) {
                  return (
                    <View key={i} style={styles.habitRow}>
                      <View style={[styles.habitCheck, { borderWidth: 0 }]}>
                        <LinearGradient colors={accent.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.habitCheckGrad}>
                          <Feather name='check' size={12} color='#fff' />
                        </LinearGradient>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.habitName, { color: 'rgba(255,255,255,0.5)', textDecorationLine: 'line-through' }]}>{label}</Text>
                      </View>
                    </View>
                  )
                })}
              </View>
            )}
          </GlassCard>

          <TouchableOpacity onPress={function () { setShowMood(true) }} activeOpacity={0.8}>
            <GlassCard style={styles.moodStrip}>
              <Feather name='smile' size={16} color={accent.primary} />
              <Text style={styles.moodText}>
                {selectedMood
                  ? 'Feeling ' + (MOODS.find(function (m) { return m.value === selectedMood }) || {}).label + ' today'
                  : 'How are you feeling today?'}
              </Text>
              <Feather name='chevron-right' size={16} color='rgba(255,255,255,0.4)' />
            </GlassCard>
          </TouchableOpacity>

          <GlassCard>
            <Text style={[styles.quoteLabel, { color: accent.primary }]}>TODAYS CLARITY QUOTE</Text>
            <Text style={styles.quoteText}>"{quote.quote}"</Text>
            <Text style={styles.quoteAuthor}>— {quote.author}</Text>
          </GlassCard>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Meditations</Text>
            <Text style={[styles.seeAll, { color: accent.primary }]}>Free and Pro</Text>
          </View>
          <FlatList
            data={MEDITATIONS}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={function (item) { return item.id }}
            contentContainerStyle={styles.horizontalList}
            renderItem={function ({ item }) { return <ContentCard item={item} accent={accent} onPlay={handlePlay} /> }}
            scrollEnabled={true}
            nestedScrollEnabled={true}
          />

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Focus Music</Text>
            <Text style={[styles.seeAll, { color: accent.primary }]}>Free and Pro</Text>
          </View>
          <FlatList
            data={FOCUS_MUSIC}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={function (item) { return item.id }}
            contentContainerStyle={styles.horizontalList}
            renderItem={function ({ item }) { return <ContentCard item={item} accent={accent} onPlay={handlePlay} /> }}
            scrollEnabled={true}
            nestedScrollEnabled={true}
          />

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Podcasts</Text>
            <Text style={[styles.seeAll, { color: accent.primary }]}>Free</Text>
          </View>
          <FlatList
            data={PODCASTS}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={function (item) { return item.id }}
            contentContainerStyle={styles.horizontalList}
            renderItem={function ({ item }) { return <ContentCard item={item} accent={accent} onPlay={handlePlay} /> }}
            scrollEnabled={true}
            nestedScrollEnabled={true}
          />

          <TouchableOpacity onPress={handleShare} style={styles.shareBtn} activeOpacity={0.85}>
            <LinearGradient colors={accent.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.shareBtnInner}>
              <Feather name='share-2' size={16} color='#fff' />
              <Text style={styles.shareBtnText}>Share my score</Text>
            </LinearGradient>
          </TouchableOpacity>

          <View style={{ height: 140 }} />
        </ScrollView>
      </SafeAreaView>

      <Modal visible={showMood} transparent={true} animationType='slide'>
        <TouchableOpacity style={styles.modalOverlay} onPress={function () { setShowMood(false) }} activeOpacity={1}>
          <View style={styles.moodModal}>
            <Text style={styles.moodModalTitle}>How are you feeling today?</Text>
            <View style={styles.moodBtns}>
              {MOODS.map(function (m) {
                return (
                  <TouchableOpacity
                    key={m.value}
                    onPress={function () { handleMoodSelect(m.value) }}
                    style={[styles.moodBtn, selectedMood === m.value && { borderColor: accent.primary, backgroundColor: 'rgba(127,90,240,0.15)' }]}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.moodBtnNum, { color: selectedMood === m.value ? accent.primary : '#fff' }]}>{m.value}</Text>
                    <Text style={[styles.moodBtnLabel, { color: selectedMood === m.value ? accent.primary : 'rgba(255,255,255,0.4)' }]}>{m.label}</Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {playingAudio && <AudioPlayer item={playingAudio} onClose={function () { setPlayingAudio(null) }} />}
      {playingVideo && <VideoPlayer videoId={playingVideo} onClose={function () { setPlayingVideo(null) }} />}

    </View>
  )
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8, height: 85 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoMark: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  appName: { fontSize: 16, fontWeight: '800', letterSpacing: 2.5, color: '#fff' },
  dateText: { fontSize: 11, marginTop: -2, fontWeight: '500' },
  greetingRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 12 },
  greeting: { fontSize: 28, fontWeight: '700', color: '#fff', letterSpacing: -0.5 },
  streakRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  streakBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,107,53,0.15)', borderWidth: 1, borderColor: 'rgba(255,107,53,0.3)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  freezeBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,212,255,0.15)', borderWidth: 1, borderColor: 'rgba(0,212,255,0.3)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  streakEmoji: { fontSize: 14 },
  streakText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  celebrationBanner: { borderRadius: 14, padding: 14, marginBottom: 12, alignItems: 'center' },
  celebrationText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  glassCard: { borderRadius: 20, padding: 16, marginBottom: 16, backgroundColor: 'rgba(0,0,0,0.3)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' },
  ringsRow: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  ringsLegend: { flex: 1, gap: 12 },
  legendItem: { gap: 2 },
  legendLabel: { fontSize: 10, letterSpacing: 1, color: 'rgba(255,255,255,0.5)' },
  legendValue: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  legendNum: { fontSize: 22, fontWeight: '200' },
  legendUnit: { fontSize: 10, color: 'rgba(255,255,255,0.4)' },
  statRow: { flexDirection: 'row', gap: 10, marginBottom: 16, alignItems: 'center' },
  statCard: { flex: 1, borderRadius: 16, padding: 12, backgroundColor: 'rgba(0,0,0,0.3)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' },
  statLabel: { fontSize: 10, letterSpacing: 0.5, marginBottom: 4, color: 'rgba(255,255,255,0.5)' },
  statValue: { fontSize: 28, fontWeight: '200', letterSpacing: -1, color: '#fff' },
  statValueGold: { fontSize: 28, fontWeight: '200', letterSpacing: -1, color: '#fff' },
  pulseHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  dualChart: { position: 'relative', height: 60 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardTitle: { fontSize: 10, letterSpacing: 2, color: 'rgba(255,255,255,0.6)' },
  cardPct: { fontSize: 13, fontWeight: '600' },
  progressTrack: { height: 3, borderRadius: 2, overflow: 'hidden', marginBottom: 4 },
  progressFill: { height: '100%', borderRadius: 2 },
  habitRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  habitCheck: { width: 24, height: 24, borderRadius: 12, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  habitCheckGrad: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  habitEmoji: { fontSize: 18 },
  habitName: { fontSize: 13 },
  habitPts: { fontSize: 12, fontWeight: '500' },
  moodStrip: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 },
  moodText: { flex: 1, fontSize: 14, fontWeight: '500', color: '#fff' },
  quoteLabel: { fontSize: 9, letterSpacing: 2, marginBottom: 10 },
  quoteText: { fontSize: 14, fontStyle: 'italic', lineHeight: 22, marginBottom: 8, color: '#fff' },
  quoteAuthor: { fontSize: 12, color: 'rgba(255,255,255,0.5)' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#fff' },
  seeAll: { fontSize: 11 },
  horizontalList: { paddingRight: 20, gap: 10, marginBottom: 20 },
  smallCard: { width: 120, borderRadius: 14, overflow: 'hidden', position: 'relative' },
  smallCardImg: { width: 120, height: 120 },
  freeBadgeS: { position: 'absolute', top: 8, left: 8, backgroundColor: 'rgba(52,211,153,0.9)', borderRadius: 5, paddingHorizontal: 5, paddingVertical: 2 },
  freeBadgeText: { fontSize: 7, color: '#000', fontWeight: '700' },
  proBadge: { position: 'absolute', top: 8, left: 8, backgroundColor: 'rgba(245,158,11,0.9)', borderRadius: 5, paddingHorizontal: 5, paddingVertical: 2 },
  proBadgeText: { fontSize: 7, color: '#000', fontWeight: '700' },
  playBtn: { position: 'absolute', top: 8, right: 8, width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  smallCardOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 8 },
  smallCardTitle: { fontSize: 10, fontWeight: '700', color: '#fff', marginBottom: 2 },
  smallCardSub: { fontSize: 8, color: 'rgba(255,255,255,0.7)' },
  shareBtn: { borderRadius: 16, overflow: 'hidden', marginTop: 16 },
  shareBtnInner: { paddingVertical: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 },
  shareBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  moodModal: { borderRadius: 24, padding: 24, margin: 16, marginBottom: 40, backgroundColor: '#18181b' },
  moodModalTitle: { fontSize: 18, fontWeight: '600', marginBottom: 20, textAlign: 'center', color: '#fff' },
  moodBtns: { flexDirection: 'row', gap: 8 },
  moodBtn: { flex: 1, borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#27272a', backgroundColor: '#27272a' },
  moodBtnNum: { fontSize: 20, fontWeight: '200' },
  moodBtnLabel: { fontSize: 9, marginTop: 4 },
})