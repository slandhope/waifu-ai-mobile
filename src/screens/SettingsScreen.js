import { Feather, MaterialCommunityIcons } from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useNavigation } from '@react-navigation/native'
import * as ImagePicker from 'expo-image-picker'
import { useEffect, useState } from 'react'
import { Alert, Image, Modal, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { WALLPAPERS } from '../constants/wallpapers'
import { useWallpaper } from '../hooks/useWallpaper'
import { apiCall } from '../utils/api'

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

export default function SettingsScreen({ profile, wallpaper, onLogout }) {
  const navigation = useNavigation()
  const { wallpaperId, setWallpaper } = wallpaper || useWallpaper()
  const [name, setName] = useState(profile?.name || 'there')
  const [editName, setEditName] = useState(profile?.name || 'there')
  const [reminderHour, setReminderHour] = useState('20')
  const [showProfile, setShowProfile] = useState(false)
  const [showReminder, setShowReminder] = useState(false)
  const [saved, setSaved] = useState(false)
  const [darkMode, setDarkMode] = useState(true)
  const [autoMode, setAutoMode] = useState(false)
  const [versionTaps, setVersionTaps] = useState(0)

  useEffect(() => {
    AsyncStorage.getItem('reminder-hour').then(val => { if(val) setReminderHour(val) })
    AsyncStorage.getItem('dark-mode').then(val => { if(val !== null) setDarkMode(val === 'true') })
    AsyncStorage.getItem('auto-mode').then(val => { if(val) setAutoMode(val === 'true') })
    AsyncStorage.getItem('user-name').then(val => { if(val) setName(val) })
  }, [])

  useEffect(() => {
    if(!autoMode) return
    const checkTime = () => {
      const hour = new Date().getHours()
      const isDay = hour >= 6 && hour < 20
      setDarkMode(!isDay)
    }
    checkTime()
    const interval = setInterval(checkTime, 60000)
    return () => clearInterval(interval)
  }, [autoMode])

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

  const handleSaveReminder = async () => {
    await AsyncStorage.setItem('reminder-hour', reminderHour)
    setShowReminder(false)
  }

  const handleDarkMode = async (val) => {
    setDarkMode(val)
    await AsyncStorage.setItem('dark-mode', val.toString())
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
      await AsyncStorage.clear()
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
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtnWrapper}>
          <Feather name="chevron-left" size={28} color="#9F7AEA" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 80 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        <TouchableOpacity onPress={() => { setEditName(name); setShowProfile(true) }} activeOpacity={0.8}>
          <View style={styles.profileCard}>
            <View style={styles.avatarWrapper}>
              {renderAvatar(56)}
            </View>
            <View style={styles.profileText}>
              <Text style={styles.username}>{name}</Text>
              <Text style={styles.tapToEdit}>Tap to edit profile</Text>
            </View>
            <Feather name="chevron-right" size={20} color="rgba(255,255,255,0.2)" />
          </View>
        </TouchableOpacity>

        <Text style={styles.sectionLabel}>WALLPAPER</Text>
        <View style={styles.cardGroup}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.wpScroll}>
            {WALLPAPERS.map((w) => (
              <TouchableOpacity key={w.id} onPress={() => {
                if(w.isPro) {
                  Alert.alert('Pro Wallpaper', 'Upgrade to Clarity Pro to unlock!', [
                    { text: 'Maybe later', style: 'cancel' },
                    { text: 'Upgrade', onPress: () => {} }
                  ])
                  return
                }
                setWallpaper(w.id)
              }} style={styles.wpItem}>
                <View style={styles.wpThumb}>
                  {w.thumb ? (
                    <Image source={{ uri: w.thumb }} style={styles.wpImage} />
                  ) : (
                    <View style={[styles.wpImage, { backgroundColor: '#1a1a2e', alignItems: 'center', justifyContent: 'center' }]}>
                      <Feather name="slash" size={20} color="rgba(255,255,255,0.3)" />
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
                <Text style={[styles.wpTitle, wallpaperId === w.id && { color: '#fff' }]}>{w.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <Text style={styles.sectionLabel}>DISPLAY</Text>
        <View style={styles.cardGroup}>
          <View style={[styles.row, { borderBottomWidth: 1, borderBottomColor: '#27272a' }]}>
            <View style={styles.rowLeft}>
              <Feather name="moon" size={18} color="#9F7AEA" style={{ marginRight: 12 }} />
              <Text style={styles.rowLabel}>Dark Mode</Text>
            </View>
            <Switch
              value={darkMode}
              onValueChange={handleDarkMode}
              trackColor={{ false: '#27272a', true: '#7F5AF0' }}
              thumbColor='#fff'
            />
          </View>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Feather name="clock" size={18} color="#9F7AEA" style={{ marginRight: 12 }} />
              <View>
                <Text style={styles.rowLabel}>Auto Day/Night</Text>
                <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 2 }}>6AM light · 8PM dark</Text>
              </View>
            </View>
            <Switch
              value={autoMode}
              onValueChange={async (val) => {
                setAutoMode(val)
                await AsyncStorage.setItem('auto-mode', val.toString())
              }}
              trackColor={{ false: '#27272a', true: '#7F5AF0' }}
              thumbColor='#fff'
            />
          </View>
        </View>

        <Text style={styles.sectionLabel}>NOTIFICATIONS</Text>
        <View style={styles.cardGroup}>
          <TouchableOpacity onPress={() => setShowReminder(true)} style={styles.row}>
            <View style={styles.rowLeft}>
              <Feather name="bell" size={18} color="#9F7AEA" style={{ marginRight: 12 }} />
              <Text style={styles.rowLabel}>Daily reminder</Text>
            </View>
            <View style={styles.rowRight}>
              <Text style={styles.timeText}>{reminderHour}:00</Text>
              <Feather name="chevron-right" size={18} color="rgba(255,255,255,0.3)" />
            </View>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionLabel}>INTEGRATIONS</Text>
        <View style={styles.cardGroup}>
          <TouchableOpacity style={styles.row} onPress={() => navigation.navigate('Fitness')}>
            <View style={styles.rowLeft}>
              <MaterialCommunityIcons name="watch" size={20} color="#9F7AEA" style={{ marginRight: 12 }} />
              <Text style={styles.rowLabel}>Connect Fitness</Text>
            </View>
            <Feather name="chevron-right" size={18} color="rgba(255,255,255,0.3)" />
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionLabel}>ACCOUNT</Text>
        <View style={styles.cardGroup}>
          <View style={[styles.row, { borderBottomWidth: 1, borderBottomColor: '#27272a' }]}>
            <View style={styles.rowLeft}>
              <Feather name="star" size={18} color="#f6ad55" style={{ marginRight: 12 }} />
              <Text style={styles.rowLabel}>Clarity Pro</Text>
            </View>
            <View style={styles.badge}><Text style={styles.badgeText}>FREE</Text></View>
          </View>
          <TouchableOpacity onPress={handleSignOut} style={[styles.row, { borderBottomWidth: 1, borderBottomColor: '#27272a' }]}>
            <View style={styles.rowLeft}>
              <Feather name="log-out" size={18} color="#E53E3E" style={{ marginRight: 12 }} />
              <Text style={[styles.rowLabel, { color: '#E53E3E' }]}>Sign Out</Text>
            </View>
            <Feather name="chevron-right" size={18} color="rgba(255,255,255,0.3)" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleReset} style={[styles.row, { borderBottomWidth: 1, borderBottomColor: '#27272a' }]}>
            <View style={styles.rowLeft}>
              <Feather name="trash-2" size={18} color="#E53E3E" style={{ marginRight: 12 }} />
              <Text style={[styles.rowLabel, { color: '#E53E3E' }]}>Reset local data</Text>
            </View>
            <Feather name="chevron-right" size={18} color="rgba(255,255,255,0.3)" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDeleteAccount} style={styles.row}>
            <View style={styles.rowLeft}>
              <Feather name="x-circle" size={18} color="#E53E3E" style={{ marginRight: 12 }} />
              <Text style={[styles.rowLabel, { color: '#E53E3E' }]}>Delete Account</Text>
            </View>
            <Feather name="chevron-right" size={18} color="rgba(255,255,255,0.3)" />
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionLabel}>ABOUT</Text>
        <View style={styles.cardGroup}>
          <TouchableOpacity
            style={[styles.row, { borderBottomWidth: 1, borderBottomColor: '#27272a' }]}
            onPress={() => {
              setVersionTaps(prev => {
                const next = prev + 1
                if(next >= 7) {
                  AsyncStorage.setItem('is-pro', 'true').then(() => {
                    Alert.alert('👑 Pro Unlocked!', 'You are now a Pro user!')
                  })
                  return 0
                }
                if(next >= 4) Alert.alert('', next + ' of 7...')
                return next
              })
            }}
          >
            <Text style={styles.rowLabel}>Version</Text>
            <Text style={styles.timeText}>1.0.0</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.row, { borderBottomWidth: 1, borderBottomColor: '#27272a' }]}>
            <Text style={styles.rowLabel}>Privacy Policy</Text>
            <Feather name="chevron-right" size={18} color="rgba(255,255,255,0.3)" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.row}>
            <Text style={styles.rowLabel}>Terms of Service</Text>
            <Feather name="chevron-right" size={18} color="rgba(255,255,255,0.3)" />
          </TouchableOpacity>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      <Modal visible={showProfile} animationType='slide' presentationStyle='pageSheet'>
        <SafeAreaView style={styles.safe} edges={['top']}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setShowProfile(false)} style={styles.backBtnWrapper}>
              <Feather name="chevron-left" size={28} color="#9F7AEA" />
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Edit Profile</Text>
            <View style={{ width: 80 }} />
          </View>
          <ScrollView contentContainerStyle={styles.content}>

            <View style={{ alignItems: 'center', marginBottom: 16, marginTop: 8 }}>
              <View style={[styles.avatarWrapper, { width: 100, height: 100, borderRadius: 50 }]}>
                {renderAvatar(100)}
              </View>
            </View>

            <View style={styles.photoOptions}>
              <TouchableOpacity onPress={handlePickPhoto} style={styles.photoOptionBtn}>
                <Feather name="image" size={16} color="#9F7AEA" />
                <Text style={styles.photoOptionText}>Choose Photo</Text>
              </TouchableOpacity>
              {profile?.googlePhoto && (
                <TouchableOpacity
                  onPress={() => profile?.pickCustomPhoto?.(profile.googlePhoto)}
                  style={styles.photoOptionBtn}
                >
                  <MaterialCommunityIcons name="google" size={16} color="#4285f4" />
                  <Text style={styles.photoOptionText}>Use Google Photo</Text>
                </TouchableOpacity>
              )}
              {profile?.applePhoto && (
                <TouchableOpacity
                  onPress={() => profile?.pickCustomPhoto?.(profile.applePhoto)}
                  style={styles.photoOptionBtn}
                >
                  <MaterialCommunityIcons name="apple" size={16} color="#fff" />
                  <Text style={styles.photoOptionText}>Use Apple Photo</Text>
                </TouchableOpacity>
              )}
              {profile?.avatar && (
                <TouchableOpacity
                  onPress={() => profile?.pickAnimalAvatar?.(profile.animalAvatar || '🦊')}
                  style={[styles.photoOptionBtn, { borderColor: '#E53E3E' }]}
                >
                  <Feather name="trash-2" size={16} color="#E53E3E" />
                  <Text style={[styles.photoOptionText, { color: '#E53E3E' }]}>Remove Photo</Text>
                </TouchableOpacity>
              )}
            </View>

            <Text style={[styles.sectionLabel, { marginTop: 16 }]}>ANIMAL AVATAR</Text>
            <View style={styles.animalGrid}>
              {ANIMALS.map((a) => (
                <TouchableOpacity
                  key={a.emoji}
                  onPress={() => profile?.pickAnimalAvatar?.(a.emoji)}
                  style={[
                    styles.animalBtn,
                    !profile?.avatar && profile?.animalAvatar === a.emoji && {
                      borderColor: '#7F5AF0',
                      backgroundColor: 'rgba(127,90,240,0.15)'
                    }
                  ]}
                >
                  <Text style={{ fontSize: 28 }}>{a.emoji}</Text>
                  <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, marginTop: 4 }}>{a.name}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.sectionLabel, { marginTop: 8 }]}>YOUR NAME</Text>
            <TextInput
              style={styles.nameInput}
              value={editName}
              onChangeText={setEditName}
              placeholder='Your name...'
              placeholderTextColor='rgba(255,255,255,0.3)'
            />

            <TouchableOpacity onPress={handleSaveName} style={styles.saveBtn}>
              <Text style={styles.saveBtnText}>{saved ? '✓ Saved!' : 'Save changes'}</Text>
            </TouchableOpacity>

          </ScrollView>
        </SafeAreaView>
      </Modal>

      <Modal visible={showReminder} animationType='slide' presentationStyle='pageSheet'>
        <SafeAreaView style={styles.safe} edges={['top']}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setShowReminder(false)} style={styles.backBtnWrapper}>
              <Feather name="chevron-left" size={28} color="#9F7AEA" />
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Daily Reminder</Text>
            <View style={{ width: 80 }} />
          </View>
          <View style={styles.content}>
            <Text style={[styles.sectionLabel, { marginTop: 20 }]}>REMINDER TIME (24HR)</Text>
            <View style={styles.cardGroup}>
              <View style={styles.row}>
                <Text style={styles.rowLabel}>Hour (0-23)</Text>
                <TextInput
                  style={styles.hourInput}
                  value={reminderHour}
                  onChangeText={setReminderHour}
                  keyboardType='number-pad'
                  maxLength={2}
                  placeholderTextColor='rgba(255,255,255,0.3)'
                />
              </View>
            </View>
            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginBottom: 24, marginLeft: 5 }}>
              e.g. 20 = 8:00 PM · 8 = 8:00 AM
            </Text>
            <TouchableOpacity onPress={handleSaveReminder} style={styles.saveBtn}>
              <Text style={styles.saveBtnText}>Save Reminder</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#09090b' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15, paddingBottom: 10 },
  backBtnWrapper: { flexDirection: 'row', alignItems: 'center' },
  backText: { color: '#9F7AEA', fontSize: 17, marginLeft: -4 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  content: { paddingHorizontal: 20 },
  profileCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 24, backgroundColor: '#18181b', marginBottom: 25, marginTop: 10, borderWidth: 1, borderColor: '#27272a' },
  avatarWrapper: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#1e1a3a', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#7F5AF0', overflow: 'hidden' },
  profileText: { flex: 1, marginLeft: 15 },
  username: { color: '#fff', fontSize: 20, fontWeight: '700' },
  tapToEdit: { color: 'rgba(255,255,255,0.4)', fontSize: 13, marginTop: 2 },
  sectionLabel: { color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: '700', letterSpacing: 1.2, marginBottom: 10, marginLeft: 5 },
  cardGroup: { borderRadius: 20, overflow: 'hidden', backgroundColor: '#18181b', marginBottom: 25, borderWidth: 1, borderColor: '#27272a' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 18, paddingHorizontal: 20 },
  rowLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  rowLabel: { color: '#fff', fontSize: 16, fontWeight: '500' },
  rowRight: { flexDirection: 'row', alignItems: 'center' },
  badge: { backgroundColor: 'rgba(159,122,234,0.15)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { color: '#9F7AEA', fontSize: 11, fontWeight: '800' },
  wpScroll: { paddingHorizontal: 15, paddingVertical: 20, gap: 14 },
  wpItem: { alignItems: 'center' },
  wpThumb: { width: 160, height: 280, borderRadius: 24, overflow: 'hidden', backgroundColor: '#09090b' },
  wpImage: { width: '100%', height: '100%' },
  checkOverlay: { position: 'absolute', top: 12, left: 12, width: 28, height: 28, borderRadius: 14, backgroundColor: '#7F5AF0', justifyContent: 'center', alignItems: 'center' },
  crownBadge: { position: 'absolute', top: 12, right: 12, width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  wpTitle: { color: '#fff', fontSize: 14, fontWeight: '600', marginTop: 12 },
  timeText: { color: 'rgba(255,255,255,0.4)', fontSize: 15, marginRight: 5 },
  photoOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20, justifyContent: 'center' },
  photoOptionBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, borderWidth: 1, borderColor: '#27272a', backgroundColor: '#18181b', paddingHorizontal: 14, paddingVertical: 10 },
  photoOptionText: { color: '#fff', fontSize: 13 },
  animalGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  animalBtn: { width: '18%', aspectRatio: 1, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#18181b', borderWidth: 2, borderColor: '#27272a' },
  nameInput: { backgroundColor: '#18181b', borderRadius: 14, padding: 16, fontSize: 16, color: '#fff', borderWidth: 1, borderColor: '#27272a', marginBottom: 20 },
  hourInput: { backgroundColor: '#27272a', borderRadius: 10, padding: 10, fontSize: 24, color: '#fff', width: 70, textAlign: 'center', fontWeight: '200' },
  saveBtn: { backgroundColor: '#7F5AF0', borderRadius: 16, padding: 16, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
})