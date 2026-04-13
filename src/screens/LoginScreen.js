import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Haptics from 'expo-haptics'
import { LinearGradient } from 'expo-linear-gradient'
import { useState } from 'react'
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function LoginScreen({ onLogin }) {
  const [name, setName] = useState('')

  const handleGuest = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    AsyncStorage.setItem('login-type', 'guest')
    onLogin('there')
  }

  return (
    <SafeAreaView style={styles.safe}>
      <LinearGradient colors={['#1a0533', '#0d0120', '#0a0a0f']} style={styles.bg}>

        <View style={styles.logoSection}>
          <LinearGradient colors={['#6c5ce7', '#f472b6']} style={styles.logoMark}>
            <Text style={styles.logoIcon}>✦</Text>
          </LinearGradient>
          <Text style={styles.appName}>CLARITY</Text>
          <Text style={styles.tagline}>Your daily mental clarity coach</Text>
        </View>

        <View style={styles.features}>
          {[
            { emoji: '🧠', text: 'Science-backed daily habits' },
            { emoji: '🔥', text: 'Streak tracking & milestones' },
            { emoji: '✨', text: 'AI coach powered by Claude' },
          ].map((f, i) => (
            <View key={i} style={styles.featureRow}>
              <Text style={styles.featureEmoji}>{f.emoji}</Text>
              <Text style={styles.featureText}>{f.text}</Text>
            </View>
          ))}
        </View>

        <View style={styles.buttons}>
          <View style={styles.comingSoon}>
            <Text style={styles.comingSoonText}> Apple  &   Google login</Text>
            <Text style={styles.comingSoonSub}>idk bruh</Text>
          </View>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>get started now</Text>
            <View style={styles.dividerLine} />
          </View>

          <TextInput
            style={styles.input}
            placeholder='Your name (optional)...'
            placeholderTextColor='rgba(255,255,255,0.3)'
            value={name}
            onChangeText={setName}
            returnKeyType='done'
          />

          <TouchableOpacity onPress={handleGuest} style={styles.guestBtn} activeOpacity={0.8}>
            <LinearGradient colors={['#6c5ce7', '#f472b6']} start={{x:0,y:0}} end={{x:1,y:0}} style={styles.guestBtnGradient}>
              <Text style={styles.guestBtnText}>Continue as guest →</Text>
            </LinearGradient>
          </TouchableOpacity>

          <Text style={styles.terms}>By continuing you agree to our Terms & Privacy Policy</Text>
        </View>
      </LinearGradient>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  bg: { flex: 1, paddingHorizontal: 28 },
  logoSection: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  logoMark: { width: 72, height: 72, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  logoIcon: { fontSize: 32, color: '#fff' },
  appName: { fontSize: 28, fontWeight: '700', letterSpacing: 6, color: '#fff', marginBottom: 8 },
  tagline: { fontSize: 14, color: 'rgba(255,255,255,0.5)' },
  features: { marginBottom: 32 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  featureEmoji: { fontSize: 20, width: 28 },
  featureText: { fontSize: 14, color: 'rgba(255,255,255,0.7)' },
  buttons: { paddingBottom: 24 },
  comingSoon: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 14, padding: 16, alignItems: 'center', marginBottom: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  comingSoonText: { fontSize: 14, color: 'rgba(255,255,255,0.6)', fontWeight: '500' },
  comingSoonSub: { fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 4 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.1)' },
  dividerText: { fontSize: 11, color: 'rgba(255,255,255,0.3)', letterSpacing: 0.5 },
  input: { backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 14, padding: 16, fontSize: 15, color: '#fff', marginBottom: 12 },
  guestBtn: { borderRadius: 14, overflow: 'hidden', marginBottom: 16 },
  guestBtnGradient: { paddingVertical: 16, alignItems: 'center' },
  guestBtnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  terms: { fontSize: 11, color: 'rgba(255,255,255,0.25)', textAlign: 'center', lineHeight: 16 },
})