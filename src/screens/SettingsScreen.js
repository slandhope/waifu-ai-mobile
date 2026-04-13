import AsyncStorage from '@react-native-async-storage/async-storage'
import { useNavigation } from '@react-navigation/native'
import * as Haptics from 'expo-haptics'
import { LinearGradient } from 'expo-linear-gradient'
import { useEffect, useState } from 'react'
import { Alert, Image, Modal, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ACCENT_COLORS } from '../constants'
import { WALLPAPERS } from '../constants/wallpapers'
import { useTheme } from '../hooks/useTheme'
import { useWallpaper } from '../hooks/useWallpaper'


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

const colorGroups = [
  { name: 'Violet', emoji: '💜', dark: 'purple_dark', light: 'purple_light' },
  { name: 'Forest', emoji: '🌿', dark: 'green_dark', light: 'green_light' },
  { name: 'Ocean', emoji: '💙', dark: 'blue_dark', light: 'blue_light' },
  { name: 'Gold', emoji: '✨', dark: 'gold_dark', light: 'gold_light' },
]

export default function SettingsScreen({ profile, wallpaper }) {
  const { colors, accent, accentKey, setAccent, autoMode, toggleTheme } = useTheme()
  const navigation = useNavigation()
  const { wallpaperId, setWallpaper } = wallpaper || useWallpaper()
  const [name, setName] = useState(profile?.name || '')
  const [reminderHour, setReminderHour] = useState('20')
  const [showProfile, setShowProfile] = useState(false)
  const [showTheme, setShowTheme] = useState(false)
  const [showReminder, setShowReminder] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    AsyncStorage.getItem('reminder-hour').then(val => { if(val) setReminderHour(val) })
  }, [])

  const handleSave = async () => {
    await AsyncStorage.setItem('user-name', name)
    await AsyncStorage.setItem('reminder-hour', reminderHour)
    profile?.setName(name)
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    setShowProfile(false)
    setShowReminder(false)
  }

  const handleReset = () => {
    Alert.alert(
      'Reset all data',
      'This will delete all your habits, streak and history. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.clear()
            Alert.alert('Done', 'All data cleared. Restart the app.')
          }
        }
      ]
    )
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Text style={[styles.backBtn, { color: accent.primary }]}>← Back</Text>
          </TouchableOpacity>
          <Text style={[styles.pageTitle, { color: colors.text }]}>Settings</Text>
          <View style={{ width: 60 }} />
        </View>

        {/* profile card */}
        <TouchableOpacity
          onPress={() => setShowProfile(true)}
          style={[styles.profileCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
          activeOpacity={0.7}
        >
          {profile?.avatarType === 'custom' && profile?.avatar ? (
            <Image source={{ uri: profile.avatar }} style={[styles.profileAvatar, { borderColor: accent.primary }]} />
          ) : (
            <LinearGradient colors={['#1e1a3a', '#2d2456']} style={[styles.profileAvatar, { borderColor: accent.primary, alignItems: 'center', justifyContent: 'center' }]}>
              <Text style={{ fontSize: 28 }}>{profile?.animalAvatar || '🦊'}</Text>
            </LinearGradient>
          )}
          <View style={{ flex: 1 }}>
            <Text style={[styles.profileName, { color: colors.text }]}>{name || 'Your name'}</Text>
            <Text style={[styles.profileSub, { color: colors.textFaint }]}>Tap to edit</Text>
          </View>
          <Text style={[styles.rowArrow, { color: colors.textFaint }]}>›</Text>
        </TouchableOpacity>

        {/* appearance */}
        <Text style={[styles.sectionLabel, { color: colors.textFaint }]}>APPEARANCE</Text>
        <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TouchableOpacity
            onPress={() => setShowTheme(true)}
            style={[styles.row, { borderBottomColor: colors.border }]}
            activeOpacity={0.7}
          >
            <Text style={[styles.rowLabel, { color: colors.text }]}>Theme</Text>
            <View style={styles.rowRight}>
              <View style={styles.themeDots}>
                {[ACCENT_COLORS[accentKey]?.primary, ACCENT_COLORS[accentKey]?.light].map((c, i) => (
                  <View key={i} style={[styles.themeDot, { backgroundColor: c }]} />
                ))}
              </View>
              <Text style={[styles.rowArrow, { color: colors.textFaint }]}>›</Text>
            </View>
          </TouchableOpacity>
          <View style={styles.row}>
            <Text style={[styles.rowLabel, { color: colors.text }]}>Auto mode</Text>
            <View style={[styles.badge, { backgroundColor: accent.glow }]}>
              <Text style={[styles.badgeText, { color: accent.primary }]}>{autoMode ? 'ON' : 'OFF'}</Text>
            </View>
          </View>
        </View>

        {/* live wallpaper */}
        <Text style={[styles.sectionLabel, { color: colors.textFaint }]}>LIVE WALLPAPER</Text>
        <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, padding: 14 }}>
            {WALLPAPERS.map((w) => (
              <TouchableOpacity
                key={w.id}
                onPress={() => {
                  if(w.isPro) {
                    Alert.alert('👑 Pro Wallpaper', 'Upgrade to Clarity Pro to unlock this wallpaper!', [
                      { text: 'Maybe later', style: 'cancel' },
                      { text: 'Upgrade 👑', onPress: () => {} }
                    ])
                    return
                  }
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                  setWallpaper(w.id)
                }}
                style={[
                  styles.wallpaperThumb,
                  wallpaperId === w.id && { borderColor: accent.primary }
                ]}
                activeOpacity={0.8}
              >
                {w.thumb ? (
                  <Image source={{ uri: w.thumb }} style={styles.wallpaperImg} />
                ) : (
                  <View style={[styles.wallpaperImg, { backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' }]}>
                    <Text style={{ fontSize: 20 }}>⬛</Text>
                  </View>
                )}
                {w.isPro && (
                  <View style={styles.wallpaperProBadge}>
                    <Text style={styles.wallpaperProText}>👑</Text>
                  </View>
                )}
                {wallpaperId === w.id && (
                  <View style={[styles.wallpaperCheck, { backgroundColor: accent.primary }]}>
                    <Text style={{ color: '#fff', fontSize: 10 }}>✓</Text>
                  </View>
                )}
                <Text style={[styles.wallpaperName, { color: colors.textFaint }]}>{w.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* notifications */}
        <Text style={[styles.sectionLabel, { color: colors.textFaint }]}>NOTIFICATIONS</Text>
        <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TouchableOpacity
            onPress={() => setShowReminder(true)}
            style={styles.row}
            activeOpacity={0.7}
          >
            <Text style={[styles.rowLabel, { color: colors.text }]}>Daily reminder</Text>
            <View style={styles.rowRight}>
              <Text style={[styles.rowValue, { color: colors.textFaint }]}>{reminderHour}:00</Text>
              <Text style={[styles.rowArrow, { color: colors.textFaint }]}>›</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* integrations */}
        <Text style={[styles.sectionLabel, { color: colors.textFaint }]}>INTEGRATIONS</Text>
        <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TouchableOpacity
            onPress={() => navigation.navigate('Fitness')}
            style={styles.row}
            activeOpacity={0.7}
          >
            <Text style={[styles.rowLabel, { color: colors.text }]}>⌚ Connect Fitness</Text>
            <Text style={[styles.rowArrow, { color: colors.textFaint }]}>›</Text>
          </TouchableOpacity>
        </View>

        {/* account */}
        <Text style={[styles.sectionLabel, { color: colors.textFaint }]}>ACCOUNT</Text>
        <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.row, { borderBottomColor: colors.border }]}>
            <Text style={[styles.rowLabel, { color: colors.text }]}>Clarity Pro</Text>
            <View style={[styles.badge, { backgroundColor: accent.glow }]}>
              <Text style={[styles.badgeText, { color: accent.primary }]}>FREE</Text>
            </View>
          </View>
          <TouchableOpacity onPress={handleReset} style={styles.row} activeOpacity={0.7}>
            <Text style={[styles.rowLabel, { color: '#ff4444' }]}>Reset all data</Text>
            <Text style={[styles.rowArrow, { color: colors.textFaint }]}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* profile modal */}
      <Modal visible={showProfile} animationType='slide' presentationStyle='pageSheet'>
        <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowProfile(false)}>
                <Text style={[styles.backBtn, { color: accent.primary }]}>← Back</Text>
              </TouchableOpacity>
              <Text style={[styles.pageTitle, { color: colors.text }]}>Profile</Text>
              <View style={{ width: 60 }} />
            </View>

            <View style={styles.avatarCenter}>
              {profile?.avatarType === 'custom' && profile?.avatar ? (
                <Image source={{ uri: profile.avatar }} style={[styles.bigAvatar, { borderColor: accent.primary }]} />
              ) : (
                <LinearGradient colors={['#1e1a3a', '#2d2456']} style={[styles.bigAvatar, { borderColor: accent.primary, alignItems: 'center', justifyContent: 'center' }]}>
                  <Text style={{ fontSize: 52 }}>{profile?.animalAvatar || '🦊'}</Text>
                </LinearGradient>
              )}
            </View>

            <TouchableOpacity
              onPress={profile?.pickCustomPhoto}
              style={[styles.photoBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <Text style={[styles.rowLabel, { color: colors.text }]}>Choose from photos</Text>
              <Text style={[styles.rowArrow, { color: colors.textFaint }]}>›</Text>
            </TouchableOpacity>

            <Text style={[styles.sectionLabel, { color: colors.textFaint }]}>ANIMAL AVATAR</Text>
            <View style={styles.animalGrid}>
              {ANIMALS.map((a) => (
                <TouchableOpacity
                  key={a.emoji}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                    profile?.pickAnimalAvatar(a.emoji)
                  }}
                  style={[
                    styles.animalBtn,
                    { backgroundColor: colors.surface, borderColor: profile?.animalAvatar === a.emoji && profile?.avatarType === 'animal' ? accent.primary : colors.border }
                  ]}
                >
                  <Text style={{ fontSize: 26 }}>{a.emoji}</Text>
                  <Text style={[styles.animalName, { color: colors.textFaint }]}>{a.name}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.sectionLabel, { color: colors.textFaint }]}>YOUR NAME</Text>
            <TextInput
              style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]}
              value={name}
              onChangeText={setName}
              placeholder='Your name...'
              placeholderTextColor={colors.textFaint}
            />

            <TouchableOpacity onPress={handleSave} style={styles.saveBtn} activeOpacity={0.8}>
              <LinearGradient colors={accent.gradient} start={{x:0,y:0}} end={{x:1,y:0}} style={styles.saveBtnGradient}>
                <Text style={styles.saveBtnText}>{saved ? '✓ Saved!' : 'Save changes'}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* theme modal */}
      <Modal visible={showTheme} animationType='slide' presentationStyle='pageSheet'>
        <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowTheme(false)}>
                <Text style={[styles.backBtn, { color: accent.primary }]}>← Back</Text>
              </TouchableOpacity>
              <Text style={[styles.pageTitle, { color: colors.text }]}>Theme</Text>
              <View style={{ width: 60 }} />
            </View>

            <Text style={[styles.sectionLabel, { color: colors.textFaint }]}>COLOR</Text>
            {colorGroups.map((group) => (
              <View key={group.name} style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border, marginBottom: 10 }]}>
                <Text style={[styles.groupName, { color: colors.textMuted, borderBottomColor: colors.border }]}>{group.emoji} {group.name}</Text>
                <TouchableOpacity
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setAccent(group.dark) }}
                  style={[styles.row, { borderBottomColor: colors.border }]}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.rowLabel, { color: colors.text }]}>Dark</Text>
                  {accentKey === group.dark && <Text style={[styles.check, { color: accent.primary }]}>✓</Text>}
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setAccent(group.light) }}
                  style={styles.row}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.rowLabel, { color: colors.text }]}>Light</Text>
                  {accentKey === group.light && <Text style={[styles.check, { color: accent.primary }]}>✓</Text>}
                </TouchableOpacity>
              </View>
            ))}

            <Text style={[styles.sectionLabel, { color: colors.textFaint }]}>AUTO MODE</Text>
            <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.row}>
                <Text style={[styles.rowLabel, { color: colors.text }]}>Switch by time of day</Text>
                <Switch
                  value={autoMode}
                  onValueChange={toggleTheme}
                  trackColor={{ false: colors.border, true: accent.primary }}
                  thumbColor='#fff'
                />
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* reminder modal */}
      <Modal visible={showReminder} animationType='slide' presentationStyle='pageSheet'>
        <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
          <View style={styles.content}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowReminder(false)}>
                <Text style={[styles.backBtn, { color: accent.primary }]}>← Back</Text>
              </TouchableOpacity>
              <Text style={[styles.pageTitle, { color: colors.text }]}>Reminder</Text>
              <View style={{ width: 60 }} />
            </View>

            <Text style={[styles.sectionLabel, { color: colors.textFaint }]}>REMINDER TIME (24HR)</Text>
            <View style={[styles.reminderRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <TextInput
                style={[styles.reminderInput, { color: colors.text }]}
                value={reminderHour}
                onChangeText={setReminderHour}
                keyboardType='number-pad'
                maxLength={2}
                placeholder='20'
                placeholderTextColor={colors.textFaint}
              />
              <Text style={[styles.reminderColon, { color: colors.textMuted }]}>:00</Text>
              <Text style={[styles.reminderNote, { color: colors.textFaint }]}>20 = 8pm</Text>
            </View>

            <TouchableOpacity onPress={handleSave} style={[styles.saveBtn, { marginTop: 20 }]} activeOpacity={0.8}>
              <LinearGradient colors={accent.gradient} start={{x:0,y:0}} end={{x:1,y:0}} style={styles.saveBtnGradient}>
                <Text style={styles.saveBtnText}>Save</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { paddingHorizontal: 20 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 16, marginBottom: 20 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 16, marginBottom: 20 },
  backBtn: { fontSize: 15, fontWeight: '500' },
  pageTitle: { fontSize: 17, fontWeight: '600' },
  profileCard: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 16, padding: 14, borderWidth: 1, marginBottom: 24 },
  profileAvatar: { width: 52, height: 52, borderRadius: 26, borderWidth: 2 },
  profileName: { fontSize: 15, fontWeight: '600' },
  profileSub: { fontSize: 11, marginTop: 2 },
  sectionLabel: { fontSize: 10, letterSpacing: 1.5, marginBottom: 8, marginLeft: 4 },
  sectionCard: { borderRadius: 14, borderWidth: 1, overflow: 'hidden', marginBottom: 24 },
  row: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1 },
  rowLabel: { flex: 1, fontSize: 14 },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowValue: { fontSize: 13 },
  rowArrow: { fontSize: 16 },
  badge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  themeDots: { flexDirection: 'row', gap: 4 },
  themeDot: { width: 10, height: 10, borderRadius: 5 },
  groupName: { fontSize: 12, fontWeight: '600', padding: 10, borderBottomWidth: 1 },
  check: { fontSize: 16, fontWeight: '600' },
  wallpaperThumb: { width: 70, alignItems: 'center', borderRadius: 12, borderWidth: 2, borderColor: 'transparent', overflow: 'hidden' },
  wallpaperImg: { width: 70, height: 120, borderRadius: 10 },
  wallpaperProBadge: { position: 'absolute', top: 6, right: 6, backgroundColor: 'rgba(245,158,11,0.9)', borderRadius: 6, padding: 2 },
  wallpaperProText: { fontSize: 10 },
  wallpaperCheck: { position: 'absolute', top: 6, left: 6, width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  wallpaperName: { fontSize: 9, marginTop: 4, textAlign: 'center' },
  avatarCenter: { alignItems: 'center', marginBottom: 20 },
  bigAvatar: { width: 100, height: 100, borderRadius: 50, borderWidth: 3 },
  photoBtn: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 14, borderWidth: 1, marginBottom: 20 },
  animalGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  animalBtn: { width: '18%', aspectRatio: 1, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  animalName: { fontSize: 7, marginTop: 2 },
  input: { borderRadius: 12, padding: 14, fontSize: 15, borderWidth: 1, marginBottom: 20 },
  saveBtn: { borderRadius: 14, overflow: 'hidden' },
  saveBtnGradient: { paddingVertical: 16, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  reminderRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, padding: 14, borderWidth: 1 },
  reminderInput: { fontSize: 28, fontWeight: '200', width: 60, textAlign: 'center' },
  reminderColon: { fontSize: 28, fontWeight: '200' },
  reminderNote: { fontSize: 12 },
})