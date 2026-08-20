import { Feather, MaterialCommunityIcons } from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useNavigation } from '@react-navigation/native'
import * as ImagePicker from 'expo-image-picker'
import { useContext, useEffect, useState } from 'react'
import { Alert, Image, Linking, Modal, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import GlassSurface from '../components/GlassSurface'
import PastelBackground from '../components/PastelBackground'
import { WALLPAPERS } from '../constants/wallpapers'
import { ThemeContext } from '../hooks/useTheme'
import { askPermission, scheduleDailyReminder } from '../hooks/useNotifications'
import { apiCall, clearAuth } from '../utils/api'

const ANIMALS = [
  { emoji: '🦊', name: 'Fox' },
  { emoji: '🐼', name: 'Panda' },
  { emoji: '🦁', name: 'Lion' },
  { emoji: '🐨', name: 'Koala' },
  { emoji: '🐯', name: 'Tiger' },
  { emoji: '🦅', name: 'Eagle' },
  { emoji: '🐺', name: 'Wolf' },
  { emoji: '🦉', name: 'Owl' },
  { emoji: '🐬', name: 'Dolphin' },
  { emoji: '🦋', name: 'Butterfly' },
]

function SettingsHeader({ title, onBack }) {
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={onBack} activeOpacity={0.85}>
        <GlassSurface borderRadius={20} style={styles.backPill}>
          <View style={styles.backInner}>
            <Feather name="chevron-left" size={22} color="#6c5ce7" />
            <Text style={styles.backText}>Back</Text>
          </View>
        </GlassSurface>
      </TouchableOpacity>
      <Text style={styles.headerTitle}>{title}</Text>
      <View style={styles.headerSpacer} />
    </View>
  )
}

function SectionLabel({ children }) {
  return <Text style={styles.sectionLabel}>{children}</Text>
}

function GlassRow({ children, border = false, onPress }) {
  const inner = (
    <View style={[styles.row, border && styles.rowBorder]}>
      {children}
    </View>
  )
  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
        {inner}
      </TouchableOpacity>
    )
  }
  return inner
}

export default function SettingsScreen({ profile, wallpaper, onLogout }) {
  const navigation = useNavigation()
  const theme = useContext(ThemeContext)
  const { wallpaperId, setWallpaper } = wallpaper || {}
  const [name, setName] = useState(profile?.name || 'there')
  const [editName, setEditName] = useState(profile?.name || 'there')
  const [reminderHour, setReminderHour] = useState('20')
  const [showProfile, setShowProfile] = useState(false)
  const [showReminder, setShowReminder] = useState(false)
  const [saved, setSaved] = useState(false)
  const [isPro, setIsPro] = useState(false)
  const [versionTaps, setVersionTaps] = useState(0)

  const darkMode = theme?.isDark ?? true
  const autoMode = theme?.autoMode ?? false

  useEffect(() => {
    AsyncStorage.getItem('reminder-hour').then(val => { if(val) setReminderHour(val) })
    AsyncStorage.getItem('is-pro').then(val => { if(val === 'true') setIsPro(true) })
    AsyncStorage.getItem('user-name').then(val => { if(val) setName(val) })
  }, [])

  const handleSaveReminder = async () => {
    const hour = Math.min(23, Math.max(0, parseInt(reminderHour, 10) || 20))
    setReminderHour(String(hour))
    await AsyncStorage.setItem('reminder-hour', String(hour))
    const ok = await askPermission()
    if (ok) {
      await scheduleDailyReminder(hour, 0)
      Alert.alert('Reminder set', `Daily check-in at ${hour}:00`)
    } else {
      Alert.alert('Notifications off', 'Enable notifications in iOS Settings to get daily reminders.')
    }
    setShowReminder(false)
  }

  const handleDarkMode = async (val) => {
    if (!theme?.toggleTheme) return
    if (val === theme.isDark) return
    if (theme.autoMode) await theme.toggleTheme()
    await theme.toggleTheme()
  }

  const handleAutoMode = async (val) => {
    if (!theme?.toggleTheme || val === theme.autoMode) return
    await theme.toggleTheme()
  }

  const openPro = () => navigation.navigate('Premium')

  const openUrl = (url) => {
    Linking.openURL(url).catch(() => Alert.alert('Could not open link'))
  }

  const handleSaveName = async () => {
    await AsyncStorage.setItem('user-name', editName)
    setName(editName)
    profile?.setName?.(editName)
    setSaved(true)
    setTimeout(() => {
      setSaved(false)
      setShowProfile(false)
    }, 1000)
  }

  const handleReset = () => {
    Alert.alert('Reset all data', 'This will delete everything on this device only. Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', style: 'destructive', onPress: async () => {
        await AsyncStorage.clear()
        Alert.alert('Done', 'All data cleared. Restart the app.')
      }}
    ])
  }

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: async () => {
        await clearAuth()
        await AsyncStorage.multiRemove([
          'login-type', 'user-name', 'user-email', 'auth-token',
          'google-photo', 'avatar-uri', 'avatar-type',
        ])
        onLogout?.()
      }}
    ])
  }

  const handleDeleteAccount = () => {
    Alert.alert(
      '⚠️ Delete Account',
      'This will permanently delete your account and ALL your data from our servers. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Forever',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await apiCall('/api/account', { method: 'DELETE' })
              if(res.ok) {
                await AsyncStorage.clear()
                onLogout?.()
              } else {
                Alert.alert('Error', 'Could not delete account. Try again.')
              }
            } catch(e) {
              Alert.alert('Error', 'Could not delete account: ' + e.message)
            }
          }
        }
      ]
    )
  }

  const handlePickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if(status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photo library.')
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    })
    if(!result.canceled) {
      const uri = result.assets[0].uri
      profile?.pickCustomPhoto?.(uri)
    }
  }

  const renderAvatar = (size = 60) => {
    if(profile?.avatar) {
      return (
        <Image
          source={{ uri: profile.avatar }}
          style={{ width: size, height: size, borderRadius: size / 2 }}
        />
      )
    }
    return <Text style={{ fontSize: size * 0.47 }}>{profile?.animalAvatar || '🦊'}</Text>
  }

  return (
    <PastelBackground>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <SettingsHeader title="Settings" onBack={() => navigation.goBack()} />

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

          <TouchableOpacity onPress={() => { setEditName(name); setShowProfile(true) }} activeOpacity={0.85}>
            <GlassSurface borderRadius={24} style={styles.profileCard}>
              <View style={styles.profileRow}>
                <View style={styles.avatarWrapper}>
                  {renderAvatar(56)}
                </View>
                <View style={styles.profileText}>
                  <Text style={styles.username}>{name}</Text>
                  <Text style={styles.tapToEdit}>Tap to edit profile</Text>
                </View>
                <Feather name="chevron-right" size={20} color="rgba(0,0,0,0.25)" />
              </View>
            </GlassSurface>
          </TouchableOpacity>

          <SectionLabel>WALLPAPER</SectionLabel>
          <GlassSurface borderRadius={24} style={styles.cardGroup}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.wpScroll}>
              {WALLPAPERS.map((w) => (
                <TouchableOpacity key={w.id} onPress={() => {
                  if(w.isPro && !isPro) {
                    Alert.alert('Pro Wallpaper', 'Upgrade to waifu.ai Pro to unlock!', [
                      { text: 'Maybe later', style: 'cancel' },
                      { text: 'Upgrade', onPress: openPro }
                    ])
                    return
                  }
                  setWallpaper(w.id)
                }} style={styles.wpItem} activeOpacity={0.85}>
                  <View style={styles.wpThumb}>
                    {w.thumb ? (
                      <Image source={{ uri: w.thumb }} style={styles.wpImage} />
                    ) : (
                      <View style={[styles.wpImage, styles.wpEmpty]}>
                        <Feather name="slash" size={20} color="rgba(0,0,0,0.2)" />
                      </View>
                    )}
                    {wallpaperId === w.id && (
                      <View style={styles.checkOverlay}>
                        <MaterialCommunityIcons name="check" size={18} color="white" />
                      </View>
                    )}
                    {w.isPro && (
                      <View style={styles.crownBadge}>
                        <MaterialCommunityIcons name="crown" size={14} color="#f6ad55" />
                      </View>
                    )}
                  </View>
                  <Text style={[styles.wpTitle, wallpaperId === w.id && styles.wpTitleActive]}>{w.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </GlassSurface>

          <SectionLabel>DISPLAY</SectionLabel>
          <GlassSurface borderRadius={24} style={styles.cardGroup}>
            <GlassRow border>
              <View style={styles.rowLeft}>
                <Feather name="moon" size={18} color="#6c5ce7" style={styles.rowIcon} />
                <Text style={styles.rowLabel}>Dark Mode</Text>
              </View>
              <Switch
                value={darkMode}
                onValueChange={handleDarkMode}
                trackColor={{ false: 'rgba(0,0,0,0.12)', true: '#6c5ce7' }}
                thumbColor="#fff"
              />
            </GlassRow>
            <GlassRow>
              <View style={styles.rowLeft}>
                <Feather name="clock" size={18} color="#6c5ce7" style={styles.rowIcon} />
                <View>
                  <Text style={styles.rowLabel}>Auto Day/Night</Text>
                  <Text style={styles.rowSub}>6AM light · 8PM dark</Text>
                </View>
              </View>
              <Switch
                value={autoMode}
                onValueChange={handleAutoMode}
                trackColor={{ false: 'rgba(0,0,0,0.12)', true: '#6c5ce7' }}
                thumbColor="#fff"
              />
            </GlassRow>
          </GlassSurface>

          <SectionLabel>NOTIFICATIONS</SectionLabel>
          <GlassSurface borderRadius={24} style={styles.cardGroup}>
            <GlassRow onPress={() => setShowReminder(true)}>
              <View style={styles.rowLeft}>
                <Feather name="bell" size={18} color="#6c5ce7" style={styles.rowIcon} />
                <Text style={styles.rowLabel}>Daily reminder</Text>
              </View>
              <View style={styles.rowRight}>
                <Text style={styles.timeText}>{reminderHour}:00</Text>
                <Feather name="chevron-right" size={18} color="rgba(0,0,0,0.25)" />
              </View>
            </GlassRow>
          </GlassSurface>

          <SectionLabel>INTEGRATIONS</SectionLabel>
          <GlassSurface borderRadius={24} style={styles.cardGroup}>
            <GlassRow onPress={() => navigation.navigate('Fitness')}>
              <View style={styles.rowLeft}>
                <MaterialCommunityIcons name="watch" size={20} color="#6c5ce7" style={styles.rowIcon} />
                <Text style={styles.rowLabel}>Connect Fitness</Text>
              </View>
              <Feather name="chevron-right" size={18} color="rgba(0,0,0,0.25)" />
            </GlassRow>
          </GlassSurface>

          <SectionLabel>ACCOUNT</SectionLabel>
          <GlassSurface borderRadius={24} style={styles.cardGroup}>
            <GlassRow border onPress={openPro}>
              <View style={styles.rowLeft}>
                <Feather name="star" size={18} color="#f6ad55" style={styles.rowIcon} />
                <Text style={styles.rowLabel}>waifu.ai Pro</Text>
              </View>
              <View style={styles.rowRight}>
                <View style={styles.badge}><Text style={styles.badgeText}>{isPro ? 'PRO' : 'FREE'}</Text></View>
                <Feather name="chevron-right" size={18} color="rgba(0,0,0,0.25)" />
              </View>
            </GlassRow>
            <GlassRow border onPress={handleSignOut}>
              <View style={styles.rowLeft}>
                <Feather name="log-out" size={18} color="#e74c3c" style={styles.rowIcon} />
                <Text style={[styles.rowLabel, styles.dangerText]}>Sign Out</Text>
              </View>
              <Feather name="chevron-right" size={18} color="rgba(0,0,0,0.25)" />
            </GlassRow>
            <GlassRow border onPress={handleReset}>
              <View style={styles.rowLeft}>
                <Feather name="trash-2" size={18} color="#e74c3c" style={styles.rowIcon} />
                <Text style={[styles.rowLabel, styles.dangerText]}>Reset local data</Text>
              </View>
              <Feather name="chevron-right" size={18} color="rgba(0,0,0,0.25)" />
            </GlassRow>
            <GlassRow onPress={handleDeleteAccount}>
              <View style={styles.rowLeft}>
                <Feather name="x-circle" size={18} color="#e74c3c" style={styles.rowIcon} />
                <Text style={[styles.rowLabel, styles.dangerText]}>Delete Account</Text>
              </View>
              <Feather name="chevron-right" size={18} color="rgba(0,0,0,0.25)" />
            </GlassRow>
          </GlassSurface>

          <SectionLabel>ABOUT</SectionLabel>
          <GlassSurface borderRadius={24} style={styles.cardGroup}>
            <GlassRow
              border
              onPress={() => {
                setVersionTaps(prev => {
                  const next = prev + 1
                  if(next >= 7) {
                    AsyncStorage.setItem('is-pro', 'true').then(() => {
                      setIsPro(true)
                      Alert.alert('Surprise!', 'Pro wallpapers unlocked 🎉')
                    })
                    return 0
                  }
                  if(next >= 6) Alert.alert('', next + ' of 7...')
                  return next
                })
              }}
            >
              <Text style={styles.rowLabel}>Version</Text>
              <Text style={styles.timeText}>1.0.0</Text>
            </GlassRow>
            <GlassRow border onPress={() => openUrl('https://waifu.ai/privacy')}>
              <Text style={styles.rowLabel}>Privacy Policy</Text>
              <Feather name="chevron-right" size={18} color="rgba(0,0,0,0.25)" />
            </GlassRow>
            <GlassRow onPress={() => openUrl('https://waifu.ai/terms')}>
              <Text style={styles.rowLabel}>Terms of Service</Text>
              <Feather name="chevron-right" size={18} color="rgba(0,0,0,0.25)" />
            </GlassRow>
          </GlassSurface>

          <View style={{ height: 100 }} />
        </ScrollView>
      </SafeAreaView>

      <Modal visible={showProfile} animationType="slide" presentationStyle="pageSheet">
        <PastelBackground>
          <SafeAreaView style={styles.safe} edges={['top']}>
            <SettingsHeader title="Edit Profile" onBack={() => setShowProfile(false)} />
            <ScrollView contentContainerStyle={styles.content}>

              <View style={styles.avatarHero}>
                <GlassSurface borderRadius={50} style={styles.avatarHeroRing}>
                  <View style={[styles.avatarWrapper, styles.avatarHeroInner]}>
                    {renderAvatar(100)}
                  </View>
                </GlassSurface>
              </View>

              <View style={styles.photoOptions}>
                <TouchableOpacity onPress={handlePickPhoto} activeOpacity={0.85}>
                  <GlassSurface borderRadius={14} style={styles.photoOptionBtn}>
                    <Feather name="image" size={16} color="#6c5ce7" />
                    <Text style={styles.photoOptionText}>Choose Photo</Text>
                  </GlassSurface>
                </TouchableOpacity>
                {profile?.googlePhoto && (
                  <TouchableOpacity onPress={() => profile?.pickCustomPhoto?.(profile.googlePhoto)} activeOpacity={0.85}>
                    <GlassSurface borderRadius={14} style={styles.photoOptionBtn}>
                      <MaterialCommunityIcons name="google" size={16} color="#4285f4" />
                      <Text style={styles.photoOptionText}>Use Google Photo</Text>
                    </GlassSurface>
                  </TouchableOpacity>
                )}
                {profile?.applePhoto && (
                  <TouchableOpacity onPress={() => profile?.pickCustomPhoto?.(profile.applePhoto)} activeOpacity={0.85}>
                    <GlassSurface borderRadius={14} style={styles.photoOptionBtn}>
                      <MaterialCommunityIcons name="apple" size={16} color="#1a1a1a" />
                      <Text style={styles.photoOptionText}>Use Apple Photo</Text>
                    </GlassSurface>
                  </TouchableOpacity>
                )}
                {profile?.avatar && (
                  <TouchableOpacity onPress={() => profile?.pickAnimalAvatar?.(profile.animalAvatar || '🦊')} activeOpacity={0.85}>
                    <GlassSurface borderRadius={14} style={[styles.photoOptionBtn, styles.photoOptionDanger]}>
                      <Feather name="trash-2" size={16} color="#e74c3c" />
                      <Text style={[styles.photoOptionText, styles.dangerText]}>Remove Photo</Text>
                    </GlassSurface>
                  </TouchableOpacity>
                )}
              </View>

              <SectionLabel>ANIMAL AVATAR</SectionLabel>
              <View style={styles.animalGrid}>
                {ANIMALS.map((a) => (
                  <TouchableOpacity
                    key={a.emoji}
                    onPress={() => profile?.pickAnimalAvatar?.(a.emoji)}
                    activeOpacity={0.85}
                  >
                    <GlassSurface
                      borderRadius={14}
                      style={[
                        styles.animalBtn,
                        !profile?.avatar && profile?.animalAvatar === a.emoji && styles.animalBtnActive,
                      ]}
                    >
                      <Text style={{ fontSize: 28 }}>{a.emoji}</Text>
                      <Text style={styles.animalName}>{a.name}</Text>
                    </GlassSurface>
                  </TouchableOpacity>
                ))}
              </View>

              <SectionLabel>YOUR NAME</SectionLabel>
              <GlassSurface borderRadius={16} style={styles.inputShell}>
                <TextInput
                  style={styles.nameInput}
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="Your name..."
                  placeholderTextColor="rgba(0,0,0,0.35)"
                />
              </GlassSurface>

              <TouchableOpacity onPress={handleSaveName} activeOpacity={0.85}>
                <GlassSurface borderRadius={16} style={styles.saveBtn}>
                  <Text style={styles.saveBtnText}>{saved ? '✓ Saved!' : 'Save changes'}</Text>
                </GlassSurface>
              </TouchableOpacity>

            </ScrollView>
          </SafeAreaView>
        </PastelBackground>
      </Modal>

      <Modal visible={showReminder} animationType="slide" presentationStyle="pageSheet">
        <PastelBackground>
          <SafeAreaView style={styles.safe} edges={['top']}>
            <SettingsHeader title="Daily Reminder" onBack={() => setShowReminder(false)} />
            <View style={styles.content}>
              <SectionLabel>REMINDER TIME (24HR)</SectionLabel>
              <GlassSurface borderRadius={24} style={styles.cardGroup}>
                <GlassRow>
                  <Text style={styles.rowLabel}>Hour (0-23)</Text>
                  <GlassSurface borderRadius={12} style={styles.hourInputShell}>
                    <TextInput
                      style={styles.hourInput}
                      value={reminderHour}
                      onChangeText={setReminderHour}
                      keyboardType="number-pad"
                      maxLength={2}
                      placeholderTextColor="rgba(0,0,0,0.35)"
                    />
                  </GlassSurface>
                </GlassRow>
              </GlassSurface>
              <Text style={styles.hintText}>
                e.g. 20 = 8:00 PM · 8 = 8:00 AM
              </Text>
              <TouchableOpacity onPress={handleSaveReminder} activeOpacity={0.85}>
                <GlassSurface borderRadius={16} style={styles.saveBtn}>
                  <Text style={styles.saveBtnText}>Save Reminder</Text>
                </GlassSurface>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </PastelBackground>
      </Modal>

    </PastelBackground>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
    paddingTop: 4,
  },
  backPill: { overflow: 'hidden' },
  backInner: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, gap: 2 },
  backText: { color: '#6c5ce7', fontSize: 16, fontWeight: '600' },
  headerTitle: { color: '#1a1a1a', fontSize: 20, fontWeight: '700', letterSpacing: -0.3 },
  headerSpacer: { width: 88 },
  content: { paddingHorizontal: 20 },
  profileCard: { marginBottom: 24, marginTop: 4 },
  profileRow: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  avatarWrapper: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  profileText: { flex: 1, marginLeft: 14 },
  username: { color: '#1a1a1a', fontSize: 20, fontWeight: '700' },
  tapToEdit: { color: 'rgba(0,0,0,0.45)', fontSize: 13, marginTop: 2 },
  sectionLabel: {
    color: 'rgba(0,0,0,0.4)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 10,
    marginLeft: 4,
  },
  cardGroup: { marginBottom: 24, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16, paddingHorizontal: 18 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.06)' },
  rowLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  rowIcon: { marginRight: 12 },
  rowLabel: { color: '#1a1a1a', fontSize: 16, fontWeight: '600' },
  rowSub: { color: 'rgba(0,0,0,0.45)', fontSize: 12, marginTop: 2 },
  rowRight: { flexDirection: 'row', alignItems: 'center' },
  dangerText: { color: '#e74c3c' },
  badge: { backgroundColor: 'rgba(108,92,231,0.15)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { color: '#6c5ce7', fontSize: 11, fontWeight: '800' },
  wpScroll: { paddingHorizontal: 14, paddingVertical: 18, gap: 14 },
  wpItem: { alignItems: 'center' },
  wpThumb: { width: 140, height: 240, borderRadius: 20, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.35)' },
  wpImage: { width: '100%', height: '100%' },
  wpEmpty: { alignItems: 'center', justifyContent: 'center' },
  checkOverlay: { position: 'absolute', top: 10, left: 10, width: 28, height: 28, borderRadius: 14, backgroundColor: '#6c5ce7', justifyContent: 'center', alignItems: 'center' },
  crownBadge: { position: 'absolute', top: 10, right: 10, width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center' },
  wpTitle: { color: 'rgba(0,0,0,0.55)', fontSize: 13, fontWeight: '600', marginTop: 10 },
  wpTitleActive: { color: '#1a1a1a' },
  timeText: { color: 'rgba(0,0,0,0.45)', fontSize: 15, marginRight: 4, fontWeight: '500' },
  avatarHero: { alignItems: 'center', marginBottom: 20, marginTop: 8 },
  avatarHeroRing: { padding: 4 },
  avatarHeroInner: { width: 100, height: 100, borderRadius: 50 },
  photoOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20, justifyContent: 'center' },
  photoOptionBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10 },
  photoOptionDanger: { borderColor: 'rgba(231,76,60,0.35)' },
  photoOptionText: { color: '#1a1a1a', fontSize: 13, fontWeight: '600' },
  animalGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  animalBtn: { width: 62, height: 72, alignItems: 'center', justifyContent: 'center' },
  animalBtnActive: { borderColor: 'rgba(108,92,231,0.5)', backgroundColor: 'rgba(108,92,231,0.12)' },
  animalName: { color: 'rgba(0,0,0,0.45)', fontSize: 10, marginTop: 4 },
  inputShell: { marginBottom: 20 },
  nameInput: { paddingHorizontal: 16, paddingVertical: 16, fontSize: 16, color: '#1a1a1a' },
  hourInputShell: { overflow: 'hidden' },
  hourInput: { paddingHorizontal: 12, paddingVertical: 10, fontSize: 24, color: '#1a1a1a', width: 70, textAlign: 'center', fontWeight: '600' },
  hintText: { color: 'rgba(0,0,0,0.45)', fontSize: 13, marginBottom: 24, marginLeft: 4 },
  saveBtn: { backgroundColor: 'rgba(108,92,231,0.85)', marginBottom: 24 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16, textAlign: 'center', paddingVertical: 16 },
})
