import * as Haptics from 'expo-haptics'
import { LinearGradient } from 'expo-linear-gradient'
import { useState } from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTheme } from '../hooks/useTheme'

const FEATURES = [
  { text: 'Unlimited AI coach messages', badge: 'Pro' },
  { text: 'Weekly AI insights', badge: 'Pro' },
  { text: '9 additional science habits', badge: 'Pro' },
  { text: '90-day progress dashboard', badge: 'Pro' },
  { text: 'Streak freeze feature', badge: 'Pro' },
  { text: 'Habit correlation insights', badge: 'Pro' },
  { text: 'Export data CSV/JSON', badge: 'Pro' },
  { text: 'Priority AI responses', badge: 'Pro' },
]

const PLANS = [
  { id: 'annual', name: 'Annual', price: '$69000.99/yr', sub: '$500000.83/month', badge: 'Save 40%', recommended: true },
  { id: 'monthly', name: 'Monthly', price: '$900000.99/mo', sub: 'Billed monthly', badge: null, recommended: false },
]

export default function PremiumScreen() {
  const { colors, accent, isDark } = useTheme()
  const [selectedPlan, setSelectedPlan] = useState('annual')

  const handleSubscribe = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    alert('In-app purchases coming soon! This will connect to the App Store when published.')
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* hero */}
        <View style={styles.hero}>
          <Text style={styles.crown}>👑</Text>
          <Text style={[styles.heroTitle, { color: colors.text }]}>Clarity Pro</Text>
          <Text style={[styles.heroSub, { color: colors.textMuted }]}>Unlock your full mental clarity potential</Text>
        </View>

        {/* features */}
        <Text style={[styles.sectionTitle, { color: colors.textFaint }]}>WHAT YOU GET</Text>
        <View style={[styles.featCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {FEATURES.map((f, i) => (
            <View key={i} style={[styles.featRow, i < FEATURES.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
              <LinearGradient colors={accent.gradient} style={styles.featCheck}>
                <Text style={styles.featCheckText}>✓</Text>
              </LinearGradient>
              <Text style={[styles.featText, { color: colors.text }]}>{f.text}</Text>
              <View style={[styles.featBadge, { backgroundColor: accent.glow }]}>
                <Text style={[styles.featBadgeText, { color: accent.primary }]}>{f.badge}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* plans */}
        <Text style={[styles.sectionTitle, { color: colors.textFaint }]}>CHOOSE YOUR PLAN</Text>
        {PLANS.map((plan) => (
          <TouchableOpacity
            key={plan.id}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
              setSelectedPlan(plan.id)
            }}
            style={[
              styles.plan,
              {
                backgroundColor: selectedPlan === plan.id ? accent.glow : colors.surface,
                borderColor: selectedPlan === plan.id ? accent.primary : colors.border,
              }
            ]}
            activeOpacity={0.8}
          >
            <View style={styles.planRow}>
              <View>
                <Text style={[styles.planName, { color: colors.text }]}>{plan.name}</Text>
                <Text style={[styles.planSub, { color: colors.textFaint }]}>{plan.sub}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.planPrice, { color: accent.primary }]}>{plan.price}</Text>
                {plan.badge && (
                  <View style={styles.planBadge}>
                    <Text style={styles.planBadgeText}>{plan.badge}</Text>
                  </View>
                )}
              </View>
            </View>
          </TouchableOpacity>
        ))}

        {/* cta */}
        <TouchableOpacity onPress={handleSubscribe} style={styles.ctaBtn} activeOpacity={0.8}>
          <LinearGradient colors={accent.gradient} start={{x:0,y:0}} end={{x:1,y:0}} style={styles.ctaInner}>
            <Text style={styles.ctaText}>Start 7-day free trial 👑</Text>
          </LinearGradient>
        </TouchableOpacity>

        <Text style={[styles.ctaSub, { color: colors.textFaint }]}>Cancel anytime · No commitment</Text>

        <TouchableOpacity style={styles.restoreBtn}>
          <Text style={[styles.restoreText, { color: colors.textFaint }]}>Restore purchase</Text>
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { paddingHorizontal: 20 },
  hero: { alignItems: 'center', paddingVertical: 24 },
  crown: { fontSize: 48, marginBottom: 12 },
  heroTitle: { fontSize: 24, fontWeight: '700', marginBottom: 6 },
  heroSub: { fontSize: 13, textAlign: 'center' },
  sectionTitle: { fontSize: 10, letterSpacing: 1.5, marginBottom: 10, marginTop: 4 },
  featCard: { borderRadius: 16, borderWidth: 1, overflow: 'hidden', marginBottom: 24 },
  featRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 },
  featCheck: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  featCheckText: { fontSize: 10, color: '#fff', fontWeight: '600' },
  featText: { flex: 1, fontSize: 13 },
  featBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  featBadgeText: { fontSize: 9, fontWeight: '600' },
  plan: { borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 2 },
  planRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  planName: { fontSize: 14, fontWeight: '600' },
  planSub: { fontSize: 11, marginTop: 2 },
  planPrice: { fontSize: 16, fontWeight: '700' },
  planBadge: { backgroundColor: 'rgba(52,211,153,0.15)', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2, marginTop: 3 },
  planBadgeText: { fontSize: 9, color: '#34d399', fontWeight: '600' },
  ctaBtn: { borderRadius: 16, overflow: 'hidden', marginTop: 8 },
  ctaInner: { paddingVertical: 16, alignItems: 'center' },
  ctaText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  ctaSub: { fontSize: 11, textAlign: 'center', marginTop: 10 },
  restoreBtn: { alignItems: 'center', marginTop: 12 },
  restoreText: { fontSize: 12 },
})