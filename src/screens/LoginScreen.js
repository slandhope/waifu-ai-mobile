import { FontAwesome } from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as AppleAuthentication from 'expo-apple-authentication'
import * as Haptics from 'expo-haptics'
import { LinearGradient } from 'expo-linear-gradient'
import { useState } from 'react'
import { Alert, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { saveAuthToken } from '../utils/api'
import { isExpoGo } from '../utils/isExpoGo'

export default function LoginScreen({ onLogin }) {
  const [loading, setLoading] = useState(false)

  const handleGuestContinue = async () => {
    try {
      setLoading(true)
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      await AsyncStorage.setItem('user-name', 'Guest')
      await AsyncStorage.setItem('login-type', 'guest')
      onLogin('Guest')
    } finally {
      setLoading(false)
    }
  }

  const handleAppleLogin = async () => {
    try {
      setLoading(true)
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      })
      const firstName = credential.fullName?.givenName || 'User'
      const email = credential.email || ''
      // Apple gives an identityToken (a JWT). Store it as our auth token.
      const idToken = credential.identityToken
      if (!idToken) { Alert.alert('Error', 'Apple did not return a token. Try again.'); setLoading(false); return }

      await AsyncStorage.setItem('user-name', firstName)
      await AsyncStorage.setItem('user-email', email)
      await AsyncStorage.setItem('login-type', 'apple')
      await saveAuthToken(idToken)

      onLogin(firstName)
    } catch (e) {
      if (e.code !== 'ERR_REQUEST_CANCELED') Alert.alert('Error', 'Apple login failed. Try again.')
    }
    setLoading(false)
  }

  const handleGoogleLogin = async () => {
    if (isExpoGo()) {
      Alert.alert('Not in Expo Go', 'Google Sign-In needs a dev build. Use "Continue as guest" to try the app.')
      return
    }

    try {
      setLoading(true)
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      const { GoogleSignin, statusCodes } = await import('@react-native-google-signin/google-signin')
      GoogleSignin.configure({
        iosClientId: '979514312077-9pfv6i8rb2nj63qtfanq155qde3mfisc.apps.googleusercontent.com',
      })
      await GoogleSignin.hasPlayServices()
      const result = await GoogleSignin.signIn()

      if (result.type === 'cancelled' || result.data === null) { setLoading(false); return }

      const data = result.data || result
      const user = data.user || {}
      const firstName = user.givenName || user.name || 'User'
      const email = user.email || ''
      const photo = user.photo || null
      // THE KEY PIECE: the Google ID token. The backend verifies this and
      // keys the user by email → same account as desktop.
      const idToken = data.idToken || result.idToken
      if (!idToken) { Alert.alert('Error', 'Google did not return an ID token. Check webClientId for Android.'); setLoading(false); return }

      await AsyncStorage.setItem('user-name', firstName)
      await AsyncStorage.setItem('user-email', email)
      await AsyncStorage.setItem('login-type', 'google')
      if (photo) {
        await AsyncStorage.setItem('google-photo', photo)
        await AsyncStorage.setItem('avatar-uri', photo)
        await AsyncStorage.setItem('avatar-type', 'custom')
      }
      await saveAuthToken(idToken)

      onLogin(firstName)
    } catch (e) {
      const { statusCodes } = await import('@react-native-google-signin/google-signin').catch(() => ({ statusCodes: {} }))
      if (e.code === statusCodes.SIGN_IN_CANCELLED) { setLoading(false); return }
      else if (e.code === statusCodes.IN_PROGRESS) Alert.alert('Error', 'Sign in already in progress')
      else Alert.alert('Error', 'Google login failed: ' + e.message)
    }
    setLoading(false)
  }

  return (
    <View style={{ flex: 1 }}>
      <Image source={require('../../assets/wallpaper.png')} style={StyleSheet.absoluteFillObject} resizeMode='cover' />
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(15, 76, 100, 0.45)' }]} />

      <SafeAreaView style={styles.safe}>
        <View style={styles.logoSection}>
          <LinearGradient colors={['#c8956d', '#8b5a3c']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.logoMark}>
            <Text style={styles.logoIcon}>✦</Text>
          </LinearGradient>
          <Text style={styles.appName}>waifu.ai</Text>
          <Text style={styles.tagline}>Your daily companion & waifu.ai coach</Text>
        </View>

        <View style={styles.buttons}>
          <TouchableOpacity onPress={handleAppleLogin} style={styles.whitePillBtn} activeOpacity={0.85} disabled={loading}>
            <FontAwesome name='apple' size={22} color='#000' />
            <Text style={styles.btnText}>Continue with Apple</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleGoogleLogin} style={[styles.whitePillBtn, loading && { opacity: 0.7 }]} activeOpacity={0.85} disabled={loading}>
            <Text style={styles.googleIcon}>G</Text>
            <Text style={styles.btnText}>{loading ? 'Signing in...' : 'Continue with Google'}</Text>
          </TouchableOpacity>

          {isExpoGo() && (
            <TouchableOpacity onPress={handleGuestContinue} style={styles.guestBtn} activeOpacity={0.85} disabled={loading}>
              <Text style={styles.guestText}>Continue as guest</Text>
            </TouchableOpacity>
          )}

          <Text style={styles.terms}>
            By tapping Continue or logging into an existing waifu.ai{'\n'}
            account, you agree to our <Text style={styles.link}>Terms</Text> and acknowledge that{'\n'}
            you have read our <Text style={styles.link}>Privacy Policy</Text>.
          </Text>
        </View>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, paddingHorizontal: 28, justifyContent: 'space-between' },
  logoSection: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 40 },
  logoMark: { width: 90, height: 90, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 24, shadowColor: '#8b5a3c', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 12 },
  logoIcon: { fontSize: 38, color: '#fff' },
  appName: { fontSize: 32, fontWeight: '700', letterSpacing: 8, color: '#fff', marginBottom: 10, textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 },
  tagline: { fontSize: 15, color: 'rgba(255,255,255,0.9)', fontWeight: '500' },
  buttons: { paddingBottom: 30 },
  whitePillBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#fff', borderRadius: 30, height: 56, marginBottom: 12 },
  googleIcon: { fontSize: 22, fontWeight: '700', color: '#4285f4' },
  btnText: { fontSize: 16, fontWeight: '600', color: '#000' },
  guestBtn: { alignItems: 'center', justifyContent: 'center', paddingVertical: 14, marginBottom: 4 },
  guestText: { fontSize: 15, fontWeight: '600', color: 'rgba(255,255,255,0.95)', textDecorationLine: 'underline' },
  terms: { fontSize: 12, color: 'rgba(255,255,255,0.85)', textAlign: 'center', lineHeight: 18, marginTop: 16, marginBottom: 12 },
  link: { textDecorationLine: 'underline', fontWeight: '600' },
})
