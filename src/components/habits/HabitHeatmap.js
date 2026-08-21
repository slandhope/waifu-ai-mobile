import { Pressable, StyleSheet, Text, View } from 'react-native'
import { todayKey } from '../../constants'
import { getCardColor, getHeatmapMonthLabels, getHeatmapWeeks } from '../../lib/habitHelpers'

export default function HabitHeatmap({ habit, history, selectedDate, onSelectDate }) {
  const weeks = getHeatmapWeeks(history, habit.id, 22)
  const monthLabels = getHeatmapMonthLabels(weeks)
  const accent = getCardColor(habit)

  return (
    <View style={styles.wrap}>
      <View style={styles.monthRow}>
        {monthLabels.map((m) => (
          <Text
            key={`${m.label}-${m.weekIndex}`}
            style={[styles.monthLabel, { left: m.weekIndex * 14 + 2 }]}
          >
            {m.label}
          </Text>
        ))}
      </View>
      <View style={styles.grid}>
        {weeks.map((week, wi) => (
          <View key={wi} style={styles.weekCol}>
            {week.map((day) => {
              const selected = day.dateKey === selectedDate
              const filled = day.done
              const selectable = !day.future && day.dateKey <= todayKey()
              return (
                <Pressable
                  key={day.dateKey}
                  onPress={() => selectable && onSelectDate?.(day.dateKey)}
                  disabled={!selectable}
                  style={[
                    styles.cell,
                    filled && { backgroundColor: accent },
                    selected && styles.cellSelected,
                    day.future && styles.cellFuture,
                  ]}
                />
              )
            })}
          </View>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { marginVertical: 8 },
  monthRow: {
    height: 18,
    position: 'relative',
    marginBottom: 6,
    marginLeft: 2,
  },
  monthLabel: {
    position: 'absolute',
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(0,0,0,0.35)',
    letterSpacing: 0.5,
  },
  grid: {
    flexDirection: 'row',
    gap: 3,
  },
  weekCol: {
    gap: 3,
  },
  cell: {
    width: 11,
    height: 11,
    borderRadius: 3,
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  cellSelected: {
    borderWidth: 2,
    borderColor: '#1a1a1a',
  },
  cellFuture: {
    opacity: 0.35,
  },
})
