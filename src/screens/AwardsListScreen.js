import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import GlassSurface from '../components/GlassSurface';
import TabScreenShell from '../components/TabScreenShell';
import { MILESTONES } from '../constants';
import { useFitness } from '../context/FitnessContext';
import { AWARD_DEFS, getEarnedAwards, getMilestoneProgress } from '../lib/statsHelpers';

export default function AwardsListScreen({ navigation, data = {}, wallpaper }) {
  const { streak = 0, todayHabits = [], seenMilestones = [] } = data
  const { steps, sleepHours } = useFitness()

  const ctx = { streak, steps, todayHabits, sleepHours }
  const earned = getEarnedAwards(ctx)
  const locked = AWARD_DEFS.filter((a) => !a.check(ctx))
  const milestone = getMilestoneProgress(streak)
  const featured = earned[earned.length - 1]

  return (
    <TabScreenShell wallpaper={wallpaper}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Feather name="chevron-left" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Awards</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBody}>
        <GlassSurface borderRadius={20} style={styles.card}>
          <View style={styles.row}>
            <View style={styles.medalCircle}>
              <MaterialCommunityIcons name="trophy-outline" size={28} color="#f59e0b" />
            </View>
            <View style={styles.cardTextContent}>
              <Text style={styles.cardTitle}>Next Milestone</Text>
              <Text style={styles.cardSub}>{milestone.next}-Day Streak</Text>
              <Text style={styles.cardProgressText}>
                {streak} of {milestone.next} days
              </Text>
            </View>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${Math.min(100, (streak / milestone.next) * 100)}%` }]} />
          </View>
        </GlassSurface>

        {featured ? (
          <GlassSurface borderRadius={20} style={styles.mainAwardCard}>
            <Text style={styles.sectionTitle}>Latest Earned</Text>
            <View style={styles.featuredMedalContainer}>
              <MaterialCommunityIcons name={featured.icon} size={120} color={featured.color} />
              <Text style={styles.medalName}>{featured.label}</Text>
              <Text style={styles.medalDate}>{earned.length} award{earned.length !== 1 ? 's' : ''} unlocked</Text>
            </View>
          </GlassSurface>
        ) : (
          <GlassSurface borderRadius={20} style={styles.mainAwardCard}>
            <Text style={styles.sectionTitle}>Keep Going</Text>
            <Text style={styles.emptyText}>Complete habits and build your streak to earn your first award.</Text>
          </GlassSurface>
        )}

        <Text style={styles.listTitle}>Earned ({earned.length})</Text>
        <View style={styles.grid}>
          {earned.map((award) => (
            <GlassSurface key={award.id} borderRadius={16} style={styles.gridItem}>
              <MaterialCommunityIcons name={award.icon} size={48} color={award.color} />
              <Text style={styles.gridAwardLabel}>{award.label}</Text>
            </GlassSurface>
          ))}
          {earned.length === 0 && (
            <Text style={styles.emptyText}>No awards yet — check off habits today to get started.</Text>
          )}
        </View>

        <Text style={styles.listTitle}>Locked ({locked.length})</Text>
        <View style={styles.grid}>
          {locked.map((award) => (
            <GlassSurface key={award.id} borderRadius={16} style={[styles.gridItem, styles.lockedItem]}>
              <MaterialCommunityIcons name={award.icon} size={48} color="rgba(0,0,0,0.15)" />
              <Text style={styles.gridAwardLabel}>{award.label}</Text>
            </GlassSurface>
          ))}
        </View>

        {seenMilestones.length > 0 && (
          <>
            <Text style={styles.listTitle}>Milestones Seen</Text>
            <GlassSurface borderRadius={16} style={styles.milestoneRow}>
              {MILESTONES.filter((m) => seenMilestones.includes(m)).map((m) => (
                <View key={m} style={styles.milestoneBadge}>
                  <Text style={styles.milestoneText}>{m}d</Text>
                </View>
              ))}
            </GlassSurface>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </TabScreenShell>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  headerTitle: { color: '#1a1a1a', fontSize: 18, fontWeight: '700' },
  backButton: {
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: 20,
    padding: 6,
  },
  scrollBody: { padding: 16 },
  card: { padding: 16, marginBottom: 16 },
  row: { flexDirection: 'row', alignItems: 'center' },
  medalCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(245,158,11,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTextContent: { flex: 1, marginLeft: 14 },
  cardTitle: { color: '#1a1a1a', fontSize: 17, fontWeight: '700' },
  cardSub: { color: 'rgba(0,0,0,0.5)', fontSize: 14 },
  cardProgressText: { color: 'rgba(0,0,0,0.45)', fontSize: 13, marginTop: 2 },
  progressBar: {
    height: 6,
    backgroundColor: 'rgba(0,0,0,0.08)',
    borderRadius: 3,
    marginTop: 14,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: '#f59e0b', borderRadius: 3 },
  mainAwardCard: { padding: 20, marginBottom: 16 },
  sectionTitle: { color: '#1a1a1a', fontSize: 18, fontWeight: '700', marginBottom: 16 },
  featuredMedalContainer: { alignItems: 'center' },
  medalName: { color: '#1a1a1a', fontSize: 16, fontWeight: '600', marginTop: 12 },
  medalDate: { color: 'rgba(0,0,0,0.45)', fontSize: 14, marginTop: 4 },
  listTitle: { color: '#1a1a1a', fontSize: 16, fontWeight: '700', marginBottom: 12, marginTop: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 8 },
  gridItem: { width: '47%', padding: 16, alignItems: 'center', gap: 8 },
  lockedItem: { opacity: 0.7 },
  gridAwardLabel: { color: '#1a1a1a', fontSize: 12, fontWeight: '600', textAlign: 'center' },
  emptyText: { color: 'rgba(0,0,0,0.5)', fontSize: 14, lineHeight: 20 },
  milestoneRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 14 },
  milestoneBadge: {
    backgroundColor: 'rgba(245,158,11,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  milestoneText: { color: '#b45309', fontWeight: '700', fontSize: 13 },
});
