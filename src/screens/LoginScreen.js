import { FontAwesome } from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin'
import * as AppleAuthentication from 'expo-apple-authentication'
import * as Haptics from 'expo-haptics'
import { LinearGradient } from 'expo-linear-gradient'
import { useState } from 'react'
import { Alert, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { login } from '../utils/api'

GoogleSignin.configure({
  iosClientId: '979514312077-9pfv6i8rb2nj63qtfanq155qde3mfisc.apps.googleusercontent.com',
})

async function getOrCreateUserId() {
  let uid = await AsyncStorage.getItem('user-id')
  if(uid && !uid.includes('-')) {
    await AsyncStorage.removeItem('user-id')
    await AsyncStorage.removeItem('auth-token')
    uid = null
  }
  if(!uid) {
    uid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0
      const v = c === 'x' ? r : (r & 0x3 | 0x8)
      return v.toString(16)
    })
    await AsyncStorage.setItem('user-id', uid)
  }
  return uid
}

export default function LoginScreen({ onLogin }) {
  const [loading, setLoading] = useState(false)

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

      await AsyncStorage.setItem('user-name', firstName)
      await AsyncStorage.setItem('user-email', email)
      await AsyncStorage.setItem('login-type', 'apple')

      const userId = await getOrCreateUserId()
      const loggedIn = await login(userId, firstName, 'apple')
      if(!loggedIn) {
        Alert.alert('Error', 'Could not connect to server. Try again.')
        setLoading(false)
        return
      }

      onLogin(firstName)
    } catch(e) {
      if(e.code !== 'ERR_REQUEST_CANCELED') {
        Alert.alert('Error', 'Apple login failed. Try again.')
      }
    }
    setLoading(false)
  }

  const handleGoogleLogin = async () => {
    try {
      setLoading(true)
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      await GoogleSignin.hasPlayServices()
      const result = await GoogleSignin.signIn()

      if(result.type === 'cancelled' || result.data === null) {
        setLoading(false)
        return
      }

      const user = result.data?.user || result.user || {}
      const firstName = user.givenName || user.name || user.displayName || 'User'
      const email = user.email || ''
      const photo = user.photo || user.photoURL || null

      await AsyncStorage.setItem('user-name', firstName)
      await AsyncStorage.setItem('user-email', email)
      await AsyncStorage.setItem('login-type', 'google')
      if(photo) {
        await AsyncStorage.setItem('google-photo', photo)
        await AsyncStorage.setItem('avatar-uri', photo)
        await AsyncStorage.setItem('avatar-type', 'custom')
      }

      const userId = await getOrCreateUserId()
      const loggedIn = await login(userId, firstName, 'google')
      if(!loggedIn) {
        Alert.alert('Error', 'Could not connect to server. Try again.')
        setLoading(false)
        return
      }

      onLogin(firstName)
    } catch(e) {
      if(e.code === statusCodes.SIGN_IN_CANCELLED) {
        setLoading(false)
        return
      } else if(e.code === statusCodes.IN_PROGRESS) {
        Alert.alert('Error', 'Sign in already in progress')
      } else {
        Alert.alert('Error', 'Google login failed: ' + e.message)
      }
    }
    setLoading(false)
  }

  return (
    <View style={{ flex: 1 }}>
      <Image 
        source={require('../../assets/wallpaper.png')} 
        style={StyleSheet.absoluteFillObject} 
        resizeMode='cover' 
      />
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(15, 76, 100, 0.45)' }]} />
      
      <SafeAreaView style={styles.safe}>
        
        {/* Logo center top */}
        <View style={styles.logoSection}>
          <LinearGradient 
            colors={['#c8956d', '#8b5a3c']} 
            start={{ x: 0, y: 0 }} 
            end={{ x: 1, y: 1 }}
            style={styles.logoMark}
          >
            <Text style={styles.logoIcon}>✦</Text>
          </LinearGradient>
          <Text style={styles.appName}>CLARITY</Text>
          <Text style={styles.tagline}>Your daily mental clarity coach</Text>
        </View>

        {/* Buttons bottom */}
        <View style={styles.buttons}>
          <TouchableOpacity 
            onPress={handleAppleLogin} 
            style={styles.whitePillBtn}
            activeOpacity={0.85}
            disabled={loading}
          >
<FontAwesome name='apple' size={22} color='#000' />
            <Text style={styles.btnText}>Continue with Apple</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleGoogleLogin}
            style={[styles.whitePillBtn, loading && { opacity: 0.7 }]}
            activeOpacity={0.85}
            disabled={loading}
          >
            <Text style={styles.googleIcon}>G</Text>
            <Text style={styles.btnText}>
              {loading ? 'Signing in...' : 'Continue with Google'}
            </Text>
          </TouchableOpacity>

          <Text style={styles.terms}>
            By tapping Continue or logging into an existing Clarity{'\n'}
            account, you agree to our <Text style={styles.link}>Terms</Text> and acknowledge that{'\n'}
            you have read our <Text style={styles.link}>Privacy Policy</Text>, which explains how{'\n'}
            to opt out of offers and promos.
          </Text>

          <Text style={styles.loginPrompt}>
            Have an account? <Text style={styles.link}>Log In</Text>
          </Text>
        </View>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, paddingHorizontal: 28, justifyContent: 'space-between' },
  logoSection: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 40 },
  logoMark: { 
    width: 90, 
    height: 90, 
    borderRadius: 22, 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginBottom: 24,
    shadowColor: '#8b5a3c',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  logoIcon: { fontSize: 38, color: '#fff' },
  appName: { 
    fontSize: 32, 
    fontWeight: '700', 
    letterSpacing: 8, 
    color: '#fff', 
    marginBottom: 10,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  tagline: { fontSize: 15, color: 'rgba(255,255,255,0.9)', fontWeight: '500' },
  buttons: { paddingBottom: 30 },
  whitePillBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    gap: 10, 
    backgroundColor: '#fff', 
    borderRadius: 30, 
    height: 56, 
    marginBottom: 12 
  },
  appleIcon: { fontSize: 22, color: '#000' },
  googleIcon: { fontSize: 22, fontWeight: '700', color: '#4285f4' },
  btnText: { fontSize: 16, fontWeight: '600', color: '#000' },
  terms: { 
    fontSize: 12, 
    color: 'rgba(255,255,255,0.85)', 
    textAlign: 'center', 
    lineHeight: 18,
    marginTop: 16,
    marginBottom: 12,
  },
  link: { 
    textDecorationLine: 'underline',
    fontWeight: '600',
  },
  loginPrompt: { 
    fontSize: 13, 
    color: 'rgba(255,255,255,0.9)', 
    textAlign: 'center',
  },
})
