import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Haptics from 'expo-haptics'
import { LinearGradient } from 'expo-linear-gradient'
import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Swiper from 'react-native-swiper'
import { COLORS } from '../constants'

const { width } = Dimensions.get('window')

const slides = [
  {
    emoji: '🧠',
    title: 'Welcome to Clarity',
    subtitle: 'Your daily mental clarity coach.',
    desc: 'Track 7 science-backed habits every day and see your clarity score improve over time.',
  },
  {
    emoji: '🔥',
    title: 'Build your streak',
    subtitle: 'Consistency is everything.',
    desc: 'Check in daily to build your streak. Miss a day and your logo gets sad. Hit milestones and celebrate.',
  },
  {
    emoji: '✨',
    title: 'Meet your AI coach',
    subtitle: 'Science-grounded, never preachy.',
    desc: 'Complete your habits to unlock your personal AI coach. Ask it anything about your mental clarity.',
  },
]

export default function OnboardingScreen({ onDone }) {
  const handleDone = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    await AsyncStorage.setItem('onboarding-done', 'yes')
    onDone()
  }

  return (
    <SafeAreaView style={styles.safe}>
      <Swiper
        loop={false}
        dot={<View style={styles.dot} />}
        activeDot={<View style={styles.dotActive} />}
        paginationStyle={styles.pagination}
        onIndexChanged={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        }}
      >
        {slides.map((slide, i) => (
          <View key={i} style={styles.slide}>
            <Text style={styles.slideEmoji}>{slide.emoji}</Text>
            <Text style={styles.slideTitle}>{slide.title}</Text>
            <Text style={styles.slideSub}>{slide.subtitle}</Text>
            <Text style={styles.slideDesc}>{slide.desc}</Text>
          </View>
        ))}
      </Swiper>

      <View style={styles.bottomBtns}>
        <Pressable onPress={handleDone} style={styles.nextBtn}>
          <LinearGradient
            colors={['#6c5ce7', '#f472b6']}
            start={{x:0,y:0}}
            end={{x:1,y:0}}
            style={styles.nextBtnGradient}
          >
            <Text style={styles.nextBtnText}>Get started →</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  slide: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingBottom: 120 },
  slideEmoji: { fontSize: 80, marginBottom: 32 },
  slideTitle: { fontSize: 28, fontWeight: '600', color: '#fff', textAlign: 'center', marginBottom: 10 },
  slideSub: { fontSize: 16, color: '#a89ef0', textAlign: 'center', marginBottom: 16, fontWeight: '500' },
  slideDesc: { fontSize: 14, color: 'rgba(255,255,255,0.5)', textAlign: 'center', lineHeight: 22 },
  pagination: { bottom: 100 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#333', margin: 4 },
  dotActive: { width: 20, height: 8, borderRadius: 4, backgroundColor: '#a78bfa', margin: 4 },
  bottomBtns: { paddingHorizontal: 28, paddingBottom: 50 },
  nextBtn: { borderRadius: 14, overflow: 'hidden' },
  nextBtnGradient: { paddingVertical: 16, alignItems: 'center' },
  nextBtnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
})