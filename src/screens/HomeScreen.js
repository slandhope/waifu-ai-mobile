import * as Haptics from 'expo-haptics'
import { LinearGradient } from 'expo-linear-gradient'
import { useEffect, useState } from 'react'
import { Alert, Dimensions, FlatList, Image, Modal, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Svg, { Circle, Defs, Stop, LinearGradient as SvgGradient } from 'react-native-svg'
import AudioPlayer from '../components/AudioPlayer'
import LiveWallpaper from '../components/LiveWallpaper'
import ProfileAvatar from '../components/ProfileAvatar'
import VideoPlayer from '../components/VideoPlayer'
import { HABITS, MILESTONES, calcScore } from '../constants'
import { useTheme } from '../hooks/useTheme'

const { width } = Dimensions.get('window')

const RAILWAY_URL = 'https://clarity-app-production-e136.up.railway.app'

const MEDITATIONS = [
  { id: '1', title: '5 Min Morning', sub: 'Guided Meditation', type: 'audio', isPro: false, image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400', audio: 'https://assets.mixkit.co/music/preview/mixkit-serene-view-443.mp3' },
  { id: '2', title: 'Box Breathing', sub: '4-7-8 Technique', type: 'audio', isPro: false, image: 'https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?w=400', audio: 'https://assets.mixkit.co/music/preview/mixkit-dreaming-big-31.mp3' },
  { id: '3', title: 'Spirit in the Wood', sub: 'Deep Meditation', type: 'audio', isPro: true, image: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=400', audio: `${RAILWAY_URL}/audio/spirit-in-the-wood.mp3` },
  { id: '4', title: 'Valley Sunset', sub: 'Sleep Meditation', type: 'audio', isPro: true, image: 'https://images.unsplash.com/photo-1531353826977-0941b4779a1c?w=400', audio: `${RAILWAY_URL}/audio/valley-sunset.mp3` },
]

const FOCUS_MUSIC = [
  { id: '5', title: 'Lofi Beats', sub: 'Study & Relax', type: 'audio', isPro: false, image: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=400', audio: 'https://assets.mixkit.co/music/preview/mixkit-hip-hop-02-738.mp3' },
  { id: '6', title: 'Rain Sounds', sub: 'Sleep & Focus', type: 'audio', isPro: false, image: 'https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?w=400', audio: 'https://assets.mixkit.co/sfx/preview/mixkit-light-rain-loop-2393.mp3' },
  { id: '7', title: 'Forest Walk', sub: 'Nature & Calm', type: 'audio', isPro: true, image: 'https://images.unsplash.com/photo-1528715471579-d1bcf0ba5e83?w=400', audio: `${RAILWAY_URL}/audio/forest-walk.mp3` },
  { id: '8', title: 'Relax Beat', sub: 'Deep Focus', type: 'audio', isPro: true, image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400', audio: `${RAILWAY_URL}/audio/relax-beat.mp3` },
]

const PODCASTS = [
  { id: 'nm1TxQj9IsQ', title: 'Science of Sleep', sub: 'Huberman Lab', type: 'video', isPro: false, image: `https://img.youtube.com/vi/nm1TxQj9IsQ/mqdefault.jpg` },
  { id: 'PZ7lDrwYdZc', title: 'Atomic Habits', sub: 'James Clear', type: 'video', isPro: false, image: `https://img.youtube.com/vi/PZ7lDrwYdZc/mqdefault.jpg` },
  { id: 'H-XfCl-HpRM', title: 'Morning Routine', sub: 'Andrew Huberman', type: 'video', isPro: false, image: `https://img.youtube.com/vi/H-XfCl-HpRM/mqdefault.jpg` },
  { id: 'gbS88oRDNTk', title: 'Focus & Flow', sub: 'Tim Ferriss', type: 'video', isPro: false, image: `https://img.youtube.com/vi/gbS88oRDNTk/mqdefault.jpg` },
]

const MOODS = [
  { value: 1, label: 'Awful' },
  { value: 2, label: 'Bad' },
  { value: 3, label: 'Okay' },
  { value: 4, label: 'Good' },
  { value: 5, label: 'Great' },
]

function ContentCard({ item, accent, onPlay }) {
  return (
    <TouchableOpacity onPress={() => onPlay(item)} style={styles.smallCard} activeOpacity={0.8}>
      <Image source={{ uri: item.image }} style={styles.smallCardImg} />
      {item.isPro ? (
        <View style={styles.proBadge}>
          <Text style={styles.proBadgeText}>👑 PRO</Text>
        </View>
      ) : (
        <View style={styles.freeBadge}>
          <Text style={styles.freeBadgeText}>FREE</Text>
        </View>
      )}
      <View style={[styles.playBtn, { backgroundColor: item.isPro ? '#f59e0b' : accent.primary + 'cc' }]}>
        <Text style={{ color: '#fff', fontSize: 8 }}>{item.isPro ? '🔒' : '▶'}</Text>
      </View>
      <LinearGradient colors={['transparent', 'rgba(0,0,0,0.85)']} style={styles.smallCardOverlay}>
        <Text style={styles.smallCardTitle}>{item.title}</Text>
        <Text style={styles.smallCardSub}>{item.sub}</Text>
      </LinearGradient>
    </TouchableOpacity>
  )
}

function PremiumRing({ score, accent, colors, size = 180 }) {
  const radius = size * 0.41
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - score / 100)
  const cx = size / 2

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Defs>
          <SvgGradient id='ringGrad' x1='0%' y1='0%' x2='100%' y2='100%'>
            <Stop offset='0%' stopColor={accent.primary} />
            <Stop offset='100%' stopColor={accent.light} />
          </SvgGradient>
        </Defs>
        <Circle cx={cx} cy={cx} r={radius + 4} fill='none' stroke={accent.primary} strokeWidth={2} opacity={0.1} />
        <Circle cx={cx} cy={cx} r={radius} fill='none' stroke='rgba(255,255,255,0.08)' strokeWidth={size * 0.06} />
        <Circle
          cx={cx} cy={cx} r={radius}
          fill='none'
          stroke='url(#ringGrad)'
          strokeWidth={size * 0.06}
          strokeDasharray={`${circumference}`}
          strokeDashoffset={offset}
          strokeLinecap='round'
          rotation='-90'
          origin={`${cx}, ${cx}`}
        />
      </Svg>
      <View style={{ alignItems: 'center' }}>
        <Text style={{ fontSize: size * 0.22, fontWeight: '100', color: colors.text, letterSpacing: -3 }}>{score}</Text>
        <Text style={{ fontSize: 9, color: colors.textFaint, letterSpacing: 3, textTransform: 'uppercase', marginTop: 2 }}>clarity</Text>
        {score > 0 && <Text style={{ fontSize: 10, color: accent.primary, marginTop: 4 }}>↑ great work</Text>}
      </View>
    </View>
  )
}

export default function HomeScreen({ data, profile, onSettingsPress, wallpaper }) {
  const { todayHabits, streak, toggleHabit, seenMilestones, markMilestoneSeen, history } = data
  const [celebrating, setCelebrating] = useState(false)
  const [quote, setQuote] = useState({ quote: "The secret of getting ahead is getting started.", author: "Mark Twain" })
  const [showMood, setShowMood] = useState(false)
  const [selectedMood, setSelectedMood] = useState(null)
  const [playingAudio, setPlayingAudio] = useState(null)
  const [playingVideo, setPlayingVideo] = useState(null)
  const { colors, accent, toggleTheme } = useTheme()
  const { currentWallpaper } = wallpaper
  const score = calcScore(todayHabits)

  useEffect(() => {
    fetch('https://api.quotable.io/random?tags=motivational|inspirational|success|health|mind')
      .then(r => r.json())
      .then(d => { if(d.content) setQuote({ quote: d.content, author: d.author }) })
      .catch(() => {})
  }, [])

  const avg7 = (() => {
    let total = 0
    for(let i = 0; i < 7; i++) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = d.toISOString().split('T')[0]
      total += calcScore(history[key] || [])
    }
    return Math.round(total / 7)
  })()

  const getGreeting = () => {
    const hour = new Date().getHours()
    if(hour < 12) return 'Good morning'
    if(hour < 18) return 'Good afternoon'
    return 'Good evening'
  }

  const handleToggle = async (id) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    const next = toggleHabit(id)
    if(next.length === HABITS.length) {
      setCelebrating(true)
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      setTimeout(() => setCelebrating(false), 3000)
    }
    if(MILESTONES.includes(streak) && !seenMilestones.includes(streak)) {
      markMilestoneSeen(streak)
      Alert.alert('🎉 Milestone!', `You've hit a ${streak}-day streak!`, [{ text: 'Keep going!' }])
    }
  }

  const handleShare = async () => {
    try {
      await Share.share({ message: `My Clarity score today: ${score}/100 🧠\n${streak} day streak 🔥\nclarity.app · join me` })
    } catch(e) {}
  }

  const handleMoodSelect = (mood) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setSelectedMood(mood)
    setTimeout(() => setShowMood(false), 500)
  }

  const handlePlay = (item) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    if(item.isPro) {
      Alert.alert(
        '👑 Pro Track',
        'Upgrade to Clarity Pro to unlock this track and all premium content!',
        [
          { text: 'Maybe later', style: 'cancel' },
          { text: 'Upgrade to Pro 👑', onPress: () => {} }
        ]
      )
      return
    }
    if(item.type === 'audio') setPlayingAudio(item)
    else setPlayingVideo(item.id)
  }

  const completionPct = Math.round((todayHabits.length / HABITS.length) * 100)
  const hasWallpaper = !!currentWallpaper?.uri

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: hasWallpaper ? 'transparent' : colors.bg }]} edges={['top']}>
      {hasWallpaper && <LiveWallpaper uri={currentWallpaper.uri} />}

      {/* dark overlay when wallpaper is active */}
     {hasWallpaper && <View style={styles.wallpaperOverlay} pointerEvents='none' />}

<ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} style={{ zIndex: 2 }}>
        {/* header */}
        <View style={styles.header}>
          <TouchableOpacity
            onLongPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
              toggleTheme()
            }}
            delayLongPress={500}
            activeOpacity={1}
            style={styles.logoRow}
          >
            <LinearGradient colors={accent.gradient} start={{x:0,y:0}} end={{x:1,y:1}} style={styles.logoMark}>
              <Text style={{ fontSize: 14, color: '#fff' }}>✦</Text>
            </LinearGradient>
            <Text style={[styles.appName, { color: hasWallpaper ? '#fff' : colors.text }]}>CLARITY</Text>
          </TouchableOpacity>
          <View style={styles.headerRight}>
            <View style={[styles.streakBadge, { backgroundColor: accent.glow, borderColor: accent.primary + '40' }]}>
              <Text style={styles.flame}>🔥</Text>
              <Text style={[styles.streakText, { color: accent.primary }]}>{streak} day streak</Text>
            </View>
            <ProfileAvatar profile={profile} size={36} onPress={onSettingsPress} />
          </View>
        </View>

        {/* greeting */}
        <Text style={[styles.greeting, { color: hasWallpaper ? 'rgba(255,255,255,0.8)' : colors.textMuted }]}>{getGreeting()} ✨</Text>

        {/* celebration */}
        {celebrating && (
          <LinearGradient colors={accent.gradient} start={{x:0,y:0}} end={{x:1,y:0}} style={styles.celebrationBanner}>
            <Text style={styles.celebrationText}>🎉 Perfect day! All habits done!</Text>
          </LinearGradient>
        )}

        {/* score ring */}
        <View style={styles.scoreSection}>
          <PremiumRing score={score} accent={accent} colors={hasWallpaper ? { ...colors, text: '#fff', textFaint: 'rgba(255,255,255,0.5)' } : colors} size={200} />
        </View>

        {/* stat pills */}
        <View style={styles.pills}>
          <View style={[styles.pill, { backgroundColor: 'rgba(255,140,66,0.1)', borderColor: 'rgba(255,140,66,0.2)' }]}>
            <Text style={[styles.pillVal, { color: '#ff8c42' }]}>{streak}</Text>
            <Text style={[styles.pillLbl, { color: '#ff8c42' }]}>STREAK</Text>
          </View>
          <View style={[styles.pill, { backgroundColor: accent.glow, borderColor: accent.primary + '40' }]}>
            <Text style={[styles.pillVal, { color: accent.primary }]}>{todayHabits.length}/{HABITS.length}</Text>
            <Text style={[styles.pillLbl, { color: accent.primary }]}>HABITS</Text>
          </View>
          <View style={[styles.pill, { backgroundColor: 'rgba(52,211,153,0.1)', borderColor: 'rgba(52,211,153,0.2)' }]}>
            <Text style={[styles.pillVal, { color: '#34d399' }]}>{avg7}</Text>
            <Text style={[styles.pillLbl, { color: '#34d399' }]}>AVG 7D</Text>
          </View>
        </View>

        {/* habits card */}
        <View style={[styles.glassCard, {
          backgroundColor: hasWallpaper ? 'rgba(0,0,0,0.45)' : colors.surface,
          borderColor: hasWallpaper ? 'rgba(255,255,255,0.15)' : colors.border
        }]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: hasWallpaper ? 'rgba(255,255,255,0.6)' : colors.textMuted }]}>TODAY'S HABITS</Text>
            <Text style={[styles.cardPct, { color: accent.primary }]}>{completionPct}%</Text>
          </View>
          <View style={[styles.progressTrack, { backgroundColor: hasWallpaper ? 'rgba(255,255,255,0.1)' : colors.border }]}>
            <LinearGradient colors={accent.gradient} start={{x:0,y:0}} end={{x:1,y:0}} style={[styles.progressFill, { width: `${completionPct}%` }]} />
          </View>
          <View style={{ marginTop: 12 }}>
            {HABITS.map((habit, i) => {
              const checked = todayHabits.includes(habit.id)
              return (
                <TouchableOpacity
                  key={habit.id}
                  onPress={() => handleToggle(habit.id)}
                  activeOpacity={0.7}
                  style={[styles.habitRow, i < HABITS.length - 1 && { borderBottomWidth: 1, borderBottomColor: hasWallpaper ? 'rgba(255,255,255,0.08)' : colors.border }]}
                >
                  <View style={[styles.habitCheck, checked ? { borderWidth: 0 } : { borderWidth: 1.5, borderColor: hasWallpaper ? 'rgba(255,255,255,0.3)' : colors.border }]}>
                    {checked && (
                      <LinearGradient colors={accent.gradient} start={{x:0,y:0}} end={{x:1,y:1}} style={styles.habitCheckGrad}>
                        <Text style={{ color: '#fff', fontSize: 11, fontWeight: '600' }}>✓</Text>
                      </LinearGradient>
                    )}
                  </View>
                  <Text style={styles.habitEmoji}>{habit.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.habitName, { color: checked ? (hasWallpaper ? '#fff' : colors.text) : (hasWallpaper ? 'rgba(255,255,255,0.5)' : colors.textMuted) }]}>{habit.label}</Text>
                  </View>
                  <Text style={[styles.habitPts, { color: checked ? accent.primary : (hasWallpaper ? 'rgba(255,255,255,0.3)' : colors.textFaint) }]}>+{habit.pts}</Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>

        {/* mood strip */}
        <TouchableOpacity
          onPress={() => setShowMood(true)}
          style={[styles.moodStrip, {
            backgroundColor: hasWallpaper ? 'rgba(0,0,0,0.35)' : accent.glow,
            borderColor: hasWallpaper ? 'rgba(255,255,255,0.15)' : accent.primary + '30'
          }]}
          activeOpacity={0.8}
        >
          <Text style={[styles.moodText, { color: hasWallpaper ? '#fff' : colors.text }]}>
            {selectedMood ? `Feeling ${MOODS.find(m => m.value === selectedMood)?.label} today` : 'How are you feeling today?'}
          </Text>
          <Text style={[styles.moodArrow, { color: hasWallpaper ? 'rgba(255,255,255,0.5)' : colors.textFaint }]}>›</Text>
        </TouchableOpacity>

        {/* quote */}
        <View style={[styles.quoteCard, {
          backgroundColor: hasWallpaper ? 'rgba(0,0,0,0.35)' : colors.surface,
          borderColor: hasWallpaper ? 'rgba(255,255,255,0.15)' : colors.border
        }]}>
          <Text style={[styles.quoteLabel, { color: accent.primary }]}>✨ TODAY'S CLARITY QUOTE</Text>
          <Text style={[styles.quoteText, { color: hasWallpaper ? '#fff' : colors.text }]}>"{quote.quote}"</Text>
          <Text style={[styles.quoteAuthor, { color: hasWallpaper ? 'rgba(255,255,255,0.5)' : colors.textFaint }]}>— {quote.author}</Text>
        </View>

        {/* meditations */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: hasWallpaper ? '#fff' : colors.text }]}>🧘 Meditations</Text>
          <Text style={[styles.seeAll, { color: accent.primary }]}>Free & Pro</Text>
        </View>
        <FlatList
          data={MEDITATIONS}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.horizontalList}
          renderItem={({ item }) => <ContentCard item={item} accent={accent} onPlay={handlePlay} />}
          scrollEnabled={true}
          nestedScrollEnabled={true}
        />

        {/* focus music */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: hasWallpaper ? '#fff' : colors.text }]}>🎵 Focus Music</Text>
          <Text style={[styles.seeAll, { color: accent.primary }]}>Free & Pro</Text>
        </View>
        <FlatList
          data={FOCUS_MUSIC}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.horizontalList}
          renderItem={({ item }) => <ContentCard item={item} accent={accent} onPlay={handlePlay} />}
          scrollEnabled={true}
          nestedScrollEnabled={true}
        />

        {/* podcasts */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: hasWallpaper ? '#fff' : colors.text }]}>🎙️ Podcasts</Text>
          <Text style={[styles.seeAll, { color: accent.primary }]}>Free</Text>
        </View>
        <FlatList
          data={PODCASTS}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.horizontalList}
          renderItem={({ item }) => <ContentCard item={item} accent={accent} onPlay={handlePlay} />}
          scrollEnabled={true}
          nestedScrollEnabled={true}
        />

        {/* share button */}
        <TouchableOpacity onPress={handleShare} style={[styles.shareBtn, { marginTop: 16 }]} activeOpacity={0.85}>
          <LinearGradient colors={accent.gradient} start={{x:0,y:0}} end={{x:1,y:0}} style={styles.shareBtnInner}>
            <Text style={styles.shareBtnText}>Share my score  📤</Text>
          </LinearGradient>
        </TouchableOpacity>

        <View style={{ height: 140 }} />
      </ScrollView>

      {/* mood modal */}
      <Modal visible={showMood} transparent animationType='slide'>
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setShowMood(false)} activeOpacity={1}>
          <View style={[styles.moodModal, { backgroundColor: colors.surface }]}>
            <Text style={[styles.moodModalTitle, { color: colors.text }]}>How are you feeling today?</Text>
            <View style={styles.moodBtns}>
              {MOODS.map(m => (
                <TouchableOpacity
                  key={m.value}
                  onPress={() => handleMoodSelect(m.value)}
                  style={[
                    styles.moodBtn,
                    { borderColor: colors.border, backgroundColor: colors.surfaceAlt },
                    selectedMood === m.value && { borderColor: accent.primary, backgroundColor: accent.glow }
                  ]}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.moodBtnNum, { color: selectedMood === m.value ? accent.primary : colors.text }]}>{m.value}</Text>
                  <Text style={[styles.moodBtnLabel, { color: selectedMood === m.value ? accent.primary : colors.textFaint }]}>{m.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* players */}
      {playingAudio && <AudioPlayer item={playingAudio} onClose={() => setPlayingAudio(null)} />}
      {playingVideo && <VideoPlayer videoId={playingVideo} onClose={() => setPlayingVideo(null)} />}

    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  wallpaperOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.35)', zIndex: 1 ,pointerEvents: 'none' },
  content: { paddingHorizontal: 20, zIndex: 2 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 16, paddingBottom: 4 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoMark: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  appName: { fontSize: 16, fontWeight: '700', letterSpacing: 4 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  streakBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  flame: { fontSize: 13 },
  streakText: { fontSize: 12, fontWeight: '500' },
  greeting: { fontSize: 13, marginBottom: 8, marginTop: 2 },
  celebrationBanner: { borderRadius: 14, padding: 14, marginBottom: 12, alignItems: 'center' },
  celebrationText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  scoreSection: { alignItems: 'center', paddingVertical: 16 },
  pills: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  pill: { flex: 1, borderRadius: 14, padding: 10, alignItems: 'center', borderWidth: 1 },
  pillVal: { fontSize: 20, fontWeight: '200', letterSpacing: -0.5 },
  pillLbl: { fontSize: 8, letterSpacing: 1.5, marginTop: 3 },
  glassCard: { borderRadius: 20, padding: 16, marginBottom: 16, borderWidth: 1 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardTitle: { fontSize: 10, letterSpacing: 2 },
  cardPct: { fontSize: 13, fontWeight: '600' },
  progressTrack: { height: 3, borderRadius: 2, overflow: 'hidden', marginBottom: 4 },
  progressFill: { height: '100%', borderRadius: 2 },
  habitRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  habitCheck: { width: 24, height: 24, borderRadius: 12, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  habitCheckGrad: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  habitEmoji: { fontSize: 18 },
  habitName: { fontSize: 13 },
  habitPts: { fontSize: 12, fontWeight: '500' },
  moodStrip: { borderRadius: 14, padding: 14, marginBottom: 16, borderWidth: 1, flexDirection: 'row', alignItems: 'center' },
  moodText: { flex: 1, fontSize: 14, fontWeight: '500' },
  moodArrow: { fontSize: 18 },
  quoteCard: { borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1 },
  quoteLabel: { fontSize: 9, letterSpacing: 2, marginBottom: 10 },
  quoteText: { fontSize: 14, fontStyle: 'italic', lineHeight: 22, marginBottom: 8 },
  quoteAuthor: { fontSize: 12 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 14, fontWeight: '700' },
  seeAll: { fontSize: 11 },
  horizontalList: { paddingRight: 20, gap: 10, marginBottom: 20 },
  smallCard: { width: 120, borderRadius: 14, overflow: 'hidden', position: 'relative' },
  smallCardImg: { width: 120, height: 120 },
  freeBadge: { position: 'absolute', top: 8, left: 8, backgroundColor: 'rgba(52,211,153,0.9)', borderRadius: 5, paddingHorizontal: 5, paddingVertical: 2 },
  freeBadgeText: { fontSize: 7, color: '#000', fontWeight: '700' },
  proBadge: { position: 'absolute', top: 8, left: 8, backgroundColor: 'rgba(245,158,11,0.9)', borderRadius: 5, paddingHorizontal: 5, paddingVertical: 2 },
  proBadgeText: { fontSize: 7, color: '#000', fontWeight: '700' },
  playBtn: { position: 'absolute', top: 8, right: 8, width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  smallCardOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 8 },
  smallCardTitle: { fontSize: 10, fontWeight: '700', color: '#fff', marginBottom: 2 },
  smallCardSub: { fontSize: 8, color: 'rgba(255,255,255,0.7)' },
  shareBtn: { borderRadius: 16, overflow: 'hidden' },
  shareBtnInner: { paddingVertical: 16, alignItems: 'center' },
  shareBtnText: { color: '#fff', fontWeight: '600', fontSize: 15, letterSpacing: 0.3 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  moodModal: { borderRadius: 24, padding: 24, margin: 16, marginBottom: 40 },
  moodModalTitle: { fontSize: 18, fontWeight: '600', marginBottom: 20, textAlign: 'center' },
  moodBtns: { flexDirection: 'row', gap: 8 },
  moodBtn: { flex: 1, borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1 },
  moodBtnNum: { fontSize: 20, fontWeight: '200' },
  moodBtnLabel: { fontSize: 9, marginTop: 4 },
})