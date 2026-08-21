import { Feather } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { useEffect, useMemo, useState } from 'react'
import {
  DeviceEventEmitter, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import HabitHeatmap from '../components/habits/HabitHeatmap'
import GlassSurface from '../components/GlassSurface'
import TabScreenShell from '../components/TabScreenShell'
import { HABITS, todayKey } from '../constants'
import { buildHabitList, loadAsukaHabits } from '../lib/asukaHabits'
import { loadCustomHabits, getHabitNote, loadHabitNotes, saveHabitNote } from '../lib/customHabitsStore'
import {
  calcHabitCompletionRate,
  calcHabitReps,
  calcHabitStreak,
  getCardColor,
  habitWeekOverWeek,
} from '../lib/habitHelpers'
import { SYNC_EXTRAS_APPLIED } from '../lib/extrasSync'

export default function HabitDetailScreen({ route, navigation, data, wallpaper }) {
  const insets = useSafeAreaInsets()
  const habitId = route?.params?.habitId
  const { history = {}, toggleHabit } = data || {}
  const [asukaPack, setAsukaPack] = useState({ habits: [] })
  const [customHabits, setCustomHabits] = useState([])
  const [notes, setNotes] = useState({})
  const [selectedDate, setSelectedDate] = useState(todayKey())
  const [noteDraft, setNoteDraft] = useState('')

  useEffect(() => {
    loadAsukaHabits().then(setAsukaPack)
    loadCustomHabits().then(setCustomHabits)
    loadHabitNotes().then(setNotes)
    const sub = DeviceEventEmitter.addListener(SYNC_EXTRAS_APPLIED, () => {
      loadAsukaHabits().then(setAsukaPack)
      loadCustomHabits().then(setCustomHabits)
      loadHabitNotes().then(setNotes)
    })
    return () => sub.remove()
  }, [])

  const habit = useMemo(() => {
    const all = buildHabitList(asukaPack, customHabits)
    return all.find((h) => h.id === habitId) || HABITS.find((h) => h.id === habitId)
  }, [asukaPack, customHabits, habitId])

  useEffect(() => {
    if (habit) setNoteDraft(getHabitNote(notes, habit.id, selectedDate))
  }, [habit, notes, selectedDate])

  if (!habit) {
    return (
      <View style={styles.fallback}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.fallbackText}>Habit not found</Text>
      </View>
    )
  }

  const streak = calcHabitStreak(history, habit.id)
  const reps = calcHabitReps(history, habit.id)
  const rate = calcHabitCompletionRate(history, habit.id, 30)
  const wow = habitWeekOverWeek(history, habit.id)
  const accent = getCardColor(habit)
  const isToday = selectedDate === todayKey()
  const isDone = (history[selectedDate] || []).includes(habit.id)
  const selectedLabel = new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'short', day: 'numeric',
  })

  function toggleToday() {
    if (!isToday) return
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    toggleHabit?.(habit.id)
  }

  async function saveNote() {
    const next = await saveHabitNote(habit.id, selectedDate, noteDraft)
    setNotes(next)
  }

  return (
    <TabScreenShell wallpaper={wallpaper}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 8 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
            <Feather name="arrow-left" size={22} color="#1a1a1a" />
          </TouchableOpacity>
        </View>

        <View style={styles.hero}>
          <Text style={styles.emoji}>{habit.emoji || '✨'}</Text>
          <Text style={styles.title}>{habit.label}</Text>
          {!!habit.tip && <Text style={styles.subtitle}>{habit.tip}</Text>}
        </View>

        <View style={styles.statsRow}>
          <GlassSurface borderRadius={16} style={styles.stat}>
            <Text style={styles.statVal}>🔥 {streak}</Text>
            <Text style={styles.statLbl}>Streak</Text>
          </GlassSurface>
          <GlassSurface borderRadius={16} style={styles.stat}>
            <Text style={styles.statVal}>{reps}</Text>
            <Text style={styles.statLbl}>Total days</Text>
          </GlassSurface>
          <GlassSurface borderRadius={16} style={styles.stat}>
            <Text style={styles.statVal}>{rate}%</Text>
            <Text style={styles.statLbl}>30-day {wow.delta >= 0 ? `+${wow.delta}%` : `${wow.delta}%`}</Text>
          </GlassSurface>
        </View>

        <Text style={styles.sectionTitle}>History</Text>
        <Text style={styles.sectionSub}>Tap a past day to view · only today can be checked off</Text>
        <GlassSurface borderRadius={18} style={styles.heatmapWrap}>
          <HabitHeatmap
            habit={habit}
            history={history}
            selectedDate={selectedDate}
            onSelectDate={(key) => {
              if (key <= todayKey()) setSelectedDate(key)
            }}
          />
        </GlassSurface>

        <GlassSurface borderRadius={18} style={styles.noteCard}>
          <Text style={styles.noteDate}>{selectedLabel}</Text>
          {isToday ? (
            <TouchableOpacity
              style={[styles.todayBtn, isDone && { backgroundColor: accent }]}
              onPress={toggleToday}
            >
              <Feather name={isDone ? 'check-circle' : 'circle'} size={18} color={isDone ? '#fff' : accent} />
              <Text style={[styles.todayBtnText, isDone && { color: '#fff' }]}>
                {isDone ? 'Done today' : 'Mark done for today'}
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.statusRow}>
              <Feather name={isDone ? 'check' : 'minus'} size={16} color={isDone ? accent : 'rgba(0,0,0,0.35)'} />
              <Text style={styles.statusText}>{isDone ? 'Completed this day' : 'Not completed'}</Text>
            </View>
          )}
          <TextInput
            style={styles.noteInput}
            value={noteDraft}
            onChangeText={setNoteDraft}
            placeholder="Add a note for this day…"
            placeholderTextColor="rgba(0,0,0,0.25)"
            multiline
            onBlur={saveNote}
            editable={selectedDate <= todayKey()}
          />
        </GlassSurface>

        <View style={{ height: 80 }} />
      </ScrollView>
    </TabScreenShell>
  )
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20 },
  fallback: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  fallbackText: { fontSize: 16, color: '#666' },
  topBar: { marginBottom: 8 },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hero: { marginBottom: 20 },
  emoji: { fontSize: 36, marginBottom: 8 },
  title: { fontSize: 26, fontWeight: '800', color: '#1a1a1a', letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: 'rgba(0,0,0,0.5)', marginTop: 6, lineHeight: 20 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  stat: { flex: 1, padding: 14, alignItems: 'center' },
  statVal: { fontSize: 18, fontWeight: '800', color: '#1a1a1a' },
  statLbl: { fontSize: 10, color: 'rgba(0,0,0,0.4)', marginTop: 4, fontWeight: '600', textAlign: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1a1a1a', marginBottom: 4 },
  sectionSub: { fontSize: 11, color: 'rgba(0,0,0,0.35)', marginBottom: 10 },
  heatmapWrap: { padding: 16, marginBottom: 16 },
  noteCard: { padding: 18, marginBottom: 16 },
  noteDate: { fontSize: 12, fontWeight: '700', color: 'rgba(0,0,0,0.45)', marginBottom: 12 },
  todayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(108,92,231,0.08)',
    marginBottom: 14,
  },
  todayBtnText: { fontSize: 15, fontWeight: '700', color: '#6c5ce7' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  statusText: { fontSize: 14, color: 'rgba(0,0,0,0.5)', fontWeight: '600' },
  noteInput: {
    fontSize: 16,
    color: '#1a1a1a',
    lineHeight: 24,
    minHeight: 72,
  },
})
