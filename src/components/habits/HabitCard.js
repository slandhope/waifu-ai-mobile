import { Feather } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import GlassSurface from '../GlassSurface'
import { todayKey } from '../../constants'
import {
  calcHabitStreak,
  getLast7DaysView,
  habitCompletedOn,
} from '../../lib/habitHelpers'

export default function HabitCard({ habit, history, onToggleToday, onPress }) {
  const accent = habit.accent || habit.color || '#6c5ce7'
  const streak = calcHabitStreak(history, habit.id)
  const week = getLast7DaysView(history, habit.id)
  const doneToday = habitCompletedOn(history, habit.id, todayKey())
  const coins = Math.max(5, Math.round((habit.pts || 10) / 2))

  function handleToggle() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    onToggleToday?.()
  }

  return (
    <GlassSurface borderRadius={20} style={styles.card}>
      <View style={styles.row}>
        <TouchableOpacity style={styles.mainTap} onPress={handleToggle} activeOpacity={0.88}>
          <View style={[styles.check, doneToday && { backgroundColor: accent, borderColor: accent }]}>
            {doneToday && <Feather name="check" size={15} color="#fff" />}
          </View>

          <Text style={styles.emoji}>{habit.emoji || '✨'}</Text>

          <View style={styles.body}>
            <View style={styles.titleRow}>
              <Text style={[styles.title, doneToday && styles.titleDone]} numberOfLines={1}>
                {habit.label}
              </Text>
              {habit.fromAsuka && (
                <View style={styles.asukaBadge}>
                  <Text style={styles.asukaBadgeText}>Asuka</Text>
                </View>
              )}
            </View>
            {!!habit.tip && (
              <Text style={styles.tip} numberOfLines={2}>{habit.tip}</Text>
            )}

            <View style={styles.weekRow}>
              {week.map((d) => (
                <View key={d.dateKey} style={styles.weekCell}>
                  <View
                    style={[
                      styles.weekDot,
                      d.done && { backgroundColor: accent },
                      d.isToday && !d.done && { borderColor: accent, borderWidth: 2 },
                      d.isToday && d.done && { borderColor: '#fff', borderWidth: 2 },
                    ]}
                  />
                  <Text style={[styles.weekLabel, d.isToday && styles.weekLabelToday]}>
                    {d.label}
                  </Text>
                </View>
              ))}
            </View>
            <Text style={styles.weekHint}>Last 7 days · view only</Text>
          </View>

          <View style={styles.meta}>
            <Text style={styles.streak}>🔥 {streak}</Text>
            <Text style={styles.coins}>+{coins}🪙</Text>
          </View>
        </TouchableOpacity>

        <Pressable style={styles.chevron} onPress={() => onPress?.(habit)} hitSlop={8}>
          <Feather name="chevron-right" size={20} color="rgba(0,0,0,0.25)" />
        </Pressable>
      </View>
    </GlassSurface>
  )
}

const styles = StyleSheet.create({
  card: { marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'stretch' },
  mainTap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 16,
    paddingRight: 4,
  },
  check: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  emoji: { fontSize: 26, marginTop: 1 },
  body: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  title: { fontSize: 16, fontWeight: '700', color: '#1a1a1a', flexShrink: 1 },
  titleDone: { color: 'rgba(0,0,0,0.45)', textDecorationLine: 'line-through' },
  asukaBadge: {
    backgroundColor: 'rgba(108,92,231,0.12)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  asukaBadgeText: { fontSize: 10, fontWeight: '700', color: '#6c5ce7' },
  tip: { fontSize: 12, color: 'rgba(0,0,0,0.45)', marginTop: 4, lineHeight: 17 },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  weekCell: { alignItems: 'center', flex: 1 },
  weekDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.08)',
    marginBottom: 4,
  },
  weekLabel: { fontSize: 9, fontWeight: '600', color: 'rgba(0,0,0,0.3)' },
  weekLabelToday: { color: '#6c5ce7', fontWeight: '800' },
  weekHint: { fontSize: 9, color: 'rgba(0,0,0,0.28)', marginTop: 6 },
  meta: { alignItems: 'flex-end', gap: 6, paddingTop: 2, minWidth: 44 },
  streak: { fontSize: 13, fontWeight: '700', color: '#1a1a1a' },
  coins: { fontSize: 11, fontWeight: '600', color: '#6c5ce7' },
  chevron: {
    justifyContent: 'center',
    paddingRight: 14,
    paddingLeft: 4,
  },
})
