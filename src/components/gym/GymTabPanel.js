import { Feather } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  DeviceEventEmitter,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import GlassSurface from '../GlassSurface'
import { useLiveCamera } from '../../context/LiveCameraContext'
import { useFitness } from '../../context/FitnessContext'
import { fetchGymPlan, GYM_PLAN_UPDATED, loadCachedPlan } from '../../lib/gymAsuka'
import {
  formatSessionSummary,
  loadDraft,
  loadSessions,
  sessionFromPlan,
} from '../../lib/gymStore'

function PlanExercise({ ex }) {
  return (
    <View style={styles.planRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.planName}>{ex.name}</Text>
        <Text style={styles.planTarget}>
          {ex.targetSets} sets × {ex.targetReps} reps
          {ex.suggestedWeight ? ` · ${ex.suggestedWeight}` : ''}
        </Text>
        {!!ex.tip && <Text style={styles.planTip}>{ex.tip}</Text>}
      </View>
    </View>
  )
}

export default function GymTabPanel({ navigation, refreshing, onRefresh, onRefreshingChange }) {
  const { openLiveCamera } = useLiveCamera()
  const { steps, sleepHours } = useFitness()
  const [plan, setPlan] = useState(null)
  const [sessions, setSessions] = useState([])
  const [draft, setDraft] = useState(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async (force = false) => {
    const [p, s, d] = await Promise.all([
      fetchGymPlan({ sleepHours, steps, force }),
      loadSessions(),
      loadDraft(),
    ])
    setPlan(p)
    setSessions(s)
    setDraft(d)
    return p
  }, [sleepHours, steps])

  useEffect(() => {
    loadCachedPlan().then(setPlan)
    refresh().finally(() => setLoading(false))
    const sub = DeviceEventEmitter.addListener(GYM_PLAN_UPDATED, setPlan)
    return () => sub.remove()
  }, [refresh])

  async function handleRefresh() {
    onRefreshingChange?.(true)
    await refresh(true)
    onRefreshingChange?.(false)
    onRefresh?.()
  }

  function startWorkout(fromDraft = false) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    if (fromDraft && draft) {
      navigation.navigate('GymWorkout', { sessionId: draft.id })
      return
    }
    const session = sessionFromPlan(plan)
    navigation.navigate('GymWorkout', { session })
  }

  if (loading) {
    return <ActivityIndicator color="#6c5ce7" style={{ marginTop: 40 }} />
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={!!refreshing} onRefresh={handleRefresh} tintColor="#6c5ce7" />
      }
    >
      <GlassSurface borderRadius={22} style={styles.planCard}>
        <View style={styles.planHead}>
          <Text style={styles.planSplit}>{plan?.split || 'Today'}</Text>
          <View style={styles.asukaTag}>
            <Text style={styles.asukaTagText}>Asuka</Text>
          </View>
        </View>
        {!!plan?.insight && <Text style={styles.insight}>{plan.insight}</Text>}
        {!!plan?.adjustment && <Text style={styles.adjustment}>↻ {plan.adjustment}</Text>}
        {(plan?.exercises || []).map((ex, i) => (
          <PlanExercise key={`${ex.name}-${i}`} ex={ex} />
        ))}
      </GlassSurface>

      {draft && (
        <TouchableOpacity style={styles.resumeBtn} onPress={() => startWorkout(true)}>
          <Feather name="play-circle" size={20} color="#6c5ce7" />
          <Text style={styles.resumeText}>Resume workout in progress</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={styles.formBtn}
        onPress={() => openLiveCamera('gym', { exerciseName: plan?.split || '' })}
      >
        <Feather name="camera" size={18} color="#6c5ce7" />
        <Text style={styles.formBtnText}>Check my form (live camera)</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.startBtn} onPress={() => startWorkout(false)}>
        <Text style={styles.startBtnText}>Start workout</Text>
        <Feather name="arrow-right" size={20} color="#fff" />
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Recent sessions</Text>
      {sessions.length === 0 && (
        <Text style={styles.empty}>No sessions yet — your first log teaches Asuka your numbers.</Text>
      )}
      {sessions.slice(0, 8).map((s) => (
        <TouchableOpacity
          key={s.id}
          style={styles.sessionRow}
          onPress={() => navigation.navigate('GymWorkout', { sessionId: s.id, readOnly: true })}
        >
          <View>
            <Text style={styles.sessionDate}>{s.date}</Text>
            <Text style={styles.sessionSum}>{formatSessionSummary(s)}</Text>
          </View>
          <Feather name="chevron-right" size={18} color="rgba(0,0,0,0.25)" />
        </TouchableOpacity>
      ))}
      <View style={{ height: 100 }} />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingHorizontal: 18 },
  planCard: { padding: 18, marginBottom: 16 },
  planHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  planSplit: { fontSize: 20, fontWeight: '800', color: '#1a1a1a' },
  asukaTag: { backgroundColor: 'rgba(108,92,231,0.12)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  asukaTagText: { fontSize: 11, fontWeight: '700', color: '#6c5ce7' },
  insight: { fontSize: 14, color: '#1a1a1a', lineHeight: 20, marginBottom: 6 },
  adjustment: { fontSize: 12, color: '#6c5ce7', fontWeight: '600', marginBottom: 12 },
  planRow: { paddingVertical: 10, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.06)' },
  planName: { fontSize: 16, fontWeight: '700', color: '#1a1a1a' },
  planTarget: { fontSize: 13, color: 'rgba(0,0,0,0.55)', marginTop: 3, fontWeight: '600' },
  planTip: { fontSize: 12, color: 'rgba(0,0,0,0.4)', marginTop: 4, fontStyle: 'italic' },
  resumeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 14, borderRadius: 16, backgroundColor: 'rgba(108,92,231,0.08)', marginBottom: 12,
  },
  resumeText: { fontSize: 14, fontWeight: '700', color: '#6c5ce7' },
  formBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    padding: 14, borderRadius: 16, backgroundColor: 'rgba(108,92,231,0.08)', marginBottom: 12,
    borderWidth: 1, borderColor: 'rgba(108,92,231,0.2)',
  },
  formBtnText: { fontSize: 14, fontWeight: '700', color: '#6c5ce7' },
  startBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: '#1a1a1a', borderRadius: 18, paddingVertical: 16, marginBottom: 24,
  },
  startBtnText: { color: '#fff', fontSize: 17, fontWeight: '800' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1a1a1a', marginBottom: 10 },
  empty: { fontSize: 13, color: 'rgba(0,0,0,0.4)', marginBottom: 16 },
  sessionRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  sessionDate: { fontSize: 12, color: 'rgba(0,0,0,0.4)', fontWeight: '600' },
  sessionSum: { fontSize: 15, fontWeight: '600', color: '#1a1a1a', marginTop: 2 },
})
