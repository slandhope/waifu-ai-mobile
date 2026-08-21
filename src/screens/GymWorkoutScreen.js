import { Feather } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { useEffect, useState } from 'react'
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import GlassSurface from '../components/GlassSurface'
import TabScreenShell from '../components/TabScreenShell'
import { todayKey } from '../constants'
import {
  clearDraft,
  getSession,
  loadDraft,
  newExercise,
  newSet,
  saveDraft,
  saveSession,
} from '../lib/gymStore'

function SetRow({ set, index, readOnly, accent, onChange, onToggle, onRemove }) {
  return (
    <View style={styles.setRow}>
      <Text style={styles.setNum}>{index + 1}</Text>
      <TextInput
        style={[styles.setInput, set.done && styles.setInputDone]}
        value={set.weight}
        onChangeText={(v) => onChange({ weight: v })}
        placeholder="lbs"
        placeholderTextColor="rgba(0,0,0,0.25)"
        keyboardType="decimal-pad"
        editable={!readOnly}
      />
      <Text style={styles.setX}>×</Text>
      <TextInput
        style={[styles.setInput, set.done && styles.setInputDone]}
        value={set.reps}
        onChangeText={(v) => onChange({ reps: v })}
        placeholder="reps"
        placeholderTextColor="rgba(0,0,0,0.25)"
        keyboardType="number-pad"
        editable={!readOnly}
      />
      {!readOnly && (
        <>
          <TouchableOpacity
            style={[styles.checkBtn, set.done && { backgroundColor: accent }]}
            onPress={onToggle}
          >
            <Feather name="check" size={16} color={set.done ? '#fff' : 'rgba(0,0,0,0.35)'} />
          </TouchableOpacity>
          <TouchableOpacity onPress={onRemove} hitSlop={8}>
            <Feather name="trash-2" size={16} color="rgba(0,0,0,0.2)" />
          </TouchableOpacity>
        </>
      )}
    </View>
  )
}

function ExerciseBlock({ exercise, readOnly, accent, onUpdate, onRemoveExercise }) {
  const updateSet = (setId, patch) => {
    const sets = exercise.sets.map((s) => (s.id === setId ? { ...s, ...patch } : s))
    onUpdate({ ...exercise, sets })
  }

  return (
    <GlassSurface borderRadius={18} style={styles.exBlock}>
      <View style={styles.exHead}>
        <TextInput
          style={styles.exName}
          value={exercise.name}
          onChangeText={(name) => onUpdate({ ...exercise, name })}
          editable={!readOnly}
          placeholder="Exercise name"
        />
        {!readOnly && (
          <TouchableOpacity onPress={onRemoveExercise}>
            <Feather name="x" size={20} color="rgba(0,0,0,0.3)" />
          </TouchableOpacity>
        )}
      </View>
      <Text style={styles.exTarget}>
        Goal: {exercise.targetSets} × {exercise.targetReps}
        {exercise.suggestedWeight ? ` · ${exercise.suggestedWeight}` : ''}
      </Text>
      {!!exercise.tip && <Text style={styles.exTip}>{exercise.tip}</Text>}

      {(exercise.sets || []).map((set, i) => (
        <SetRow
          key={set.id}
          set={set}
          index={i}
          readOnly={readOnly}
          accent={accent}
          onChange={(patch) => updateSet(set.id, patch)}
          onToggle={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
            updateSet(set.id, { done: !set.done })
          }}
          onRemove={() => {
            const sets = exercise.sets.filter((s) => s.id !== set.id)
            onUpdate({ ...exercise, sets: sets.length ? sets : [newSet()] })
          }}
        />
      ))}

      {!readOnly && (
        <TouchableOpacity
          style={styles.addSetBtn}
          onPress={() => {
            const last = exercise.sets[exercise.sets.length - 1]
            onUpdate({
              ...exercise,
              sets: [...exercise.sets, newSet(last?.reps || '', last?.weight || '')],
            })
          }}
        >
          <Feather name="plus" size={16} color="#6c5ce7" />
          <Text style={styles.addSetText}>Add set</Text>
        </TouchableOpacity>
      )}
    </GlassSurface>
  )
}

export default function GymWorkoutScreen({ route, navigation, data, wallpaper }) {
  const insets = useSafeAreaInsets()
  const readOnly = route.params?.readOnly
  const accent = '#6c5ce7'
  const [session, setSession] = useState(null)

  useEffect(() => {
    ;(async () => {
      if (route.params?.session) {
        setSession(route.params.session)
        if (!readOnly) await saveDraft(route.params.session)
        return
      }
      if (route.params?.sessionId) {
        const s = (await getSession(route.params.sessionId)) || (await loadDraft())
        if (s?.id === route.params.sessionId) setSession(s)
      }
    })()
  }, [route.params, readOnly])

  useEffect(() => {
    if (!session || readOnly) return
    const t = setTimeout(() => saveDraft(session), 800)
    return () => clearTimeout(t)
  }, [session, readOnly])

  if (!session) {
    return (
      <View style={styles.loading}>
        <Text style={{ color: '#666' }}>Loading…</Text>
      </View>
    )
  }

  function updateExercise(exId, next) {
    setSession((prev) => ({
      ...prev,
      exercises: prev.exercises.map((e) => (e.id === exId ? next : e)),
    }))
  }

  async function finishWorkout() {
    const doneSets = session.exercises.some((e) => e.sets.some((s) => s.done))
    if (!doneSets) {
      Alert.alert('Log at least one set', 'Check off a set before finishing.')
      return
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    const finished = { ...session, completedAt: Date.now() }
    await saveSession(finished)
    await clearDraft()
    const today = todayKey()
    if (data?.toggleHabit && !(data.history?.[today] || []).includes('exercise')) {
      data.toggleHabit('exercise')
    }
    Alert.alert('Saved!', 'Asuka will use this for your next workout plan.', [
      { text: 'OK', onPress: () => navigation.goBack() },
    ])
  }

  return (
    <TabScreenShell wallpaper={wallpaper}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.screen, { paddingTop: insets.top }]}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
              <Feather name="arrow-left" size={22} color="#1a1a1a" />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{session.split}</Text>
              <Text style={styles.date}>{session.date}{readOnly ? ' · view' : ' · logging'}</Text>
            </View>
          </View>

          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            {!!session.asukaInsight && (
              <Text style={styles.insight}>✦ {session.asukaInsight}</Text>
            )}

            {session.exercises.map((ex) => (
              <ExerciseBlock
                key={ex.id}
                exercise={ex}
                readOnly={readOnly}
                accent={accent}
                onUpdate={(next) => updateExercise(ex.id, next)}
                onRemoveExercise={() => {
                  setSession((prev) => ({
                    ...prev,
                    exercises: prev.exercises.filter((e) => e.id !== ex.id),
                  }))
                }}
              />
            ))}

            {!readOnly && (
              <>
                <TouchableOpacity
                  style={styles.addExBtn}
                  onPress={() => setSession((prev) => ({
                    ...prev,
                    exercises: [...prev.exercises, newExercise()],
                  }))}
                >
                  <Feather name="plus" size={18} color="#6c5ce7" />
                  <Text style={styles.addExText}>Add exercise</Text>
                </TouchableOpacity>

                <Text style={styles.noteLabel}>Session notes</Text>
                <TextInput
                  style={styles.noteInput}
                  value={session.note || ''}
                  onChangeText={(note) => setSession((prev) => ({ ...prev, note }))}
                  placeholder="Felt strong on bench, shoulder tight…"
                  placeholderTextColor="rgba(0,0,0,0.25)"
                  multiline
                />

                <TouchableOpacity style={styles.finishBtn} onPress={finishWorkout}>
                  <Text style={styles.finishText}>Finish workout</Text>
                </TouchableOpacity>
              </>
            )}

            <View style={{ height: 120 }} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </TabScreenShell>
  )
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  screen: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingBottom: 8, gap: 10 },
  iconBtn: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.55)',
  },
  title: { fontSize: 20, fontWeight: '800', color: '#1a1a1a' },
  date: { fontSize: 12, color: 'rgba(0,0,0,0.45)' },
  content: { paddingHorizontal: 18 },
  insight: { fontSize: 13, color: '#1a1a1a', marginBottom: 14, lineHeight: 19 },
  exBlock: { padding: 16, marginBottom: 14 },
  exHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  exName: { fontSize: 18, fontWeight: '800', color: '#1a1a1a', flex: 1 },
  exTarget: { fontSize: 13, fontWeight: '600', color: '#6c5ce7', marginBottom: 4 },
  exTip: { fontSize: 12, color: 'rgba(0,0,0,0.4)', marginBottom: 10 },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  setNum: { width: 20, fontSize: 13, fontWeight: '700', color: 'rgba(0,0,0,0.35)' },
  setInput: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  setInputDone: { opacity: 0.55 },
  setX: { fontSize: 14, color: 'rgba(0,0,0,0.3)', fontWeight: '700' },
  checkBtn: {
    width: 36, height: 36, borderRadius: 10,
    borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  addSetBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginTop: 12, paddingVertical: 8,
  },
  addSetText: { fontSize: 14, fontWeight: '700', color: '#6c5ce7' },
  addExBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    padding: 14, borderRadius: 14, borderWidth: 1.5, borderColor: 'rgba(108,92,231,0.25)', marginBottom: 16,
  },
  addExText: { fontSize: 15, fontWeight: '700', color: '#6c5ce7' },
  noteLabel: { fontSize: 12, fontWeight: '700', color: 'rgba(0,0,0,0.45)', marginBottom: 8 },
  noteInput: {
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: 14,
    padding: 14,
    fontSize: 15,
    minHeight: 80,
    color: '#1a1a1a',
    marginBottom: 20,
  },
  finishBtn: {
    backgroundColor: '#1a1a1a',
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
  },
  finishText: { color: '#fff', fontSize: 17, fontWeight: '800' },
})
