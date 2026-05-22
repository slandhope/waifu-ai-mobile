import { MaterialCommunityIcons } from '@expo/vector-icons';
import { GlassView } from 'expo-glass-effect';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Alert, Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const PLANS = [
  { 
    id: 'annual', 
    name: 'Annual', 
    price: '$69.99/yr', 
    sub: '$5.83/month — best value', 
    badge: 'Save 40%' 
  },
  { 
    id: 'monthly', 
    name: 'Monthly', 
    price: '$9.99/mo', 
    sub: 'Billed monthly', 
    badge: null 
  },
];

const FEATURES = [
  { icon: 'chart-line', text: 'Deep Dive Analytics & Progress Dashboard', desc: 'Compare metrics across days, weeks, and months.' },
  { icon: 'robot', text: 'Unlimited AI Coach Messages & Weekly Insights', desc: null },
  { icon: 'snowflake', text: 'Unlimited Streak Freezes', desc: 'Never lose your streak again.' },
  { icon: 'brain', text: '9 Additional Science-Backed Habits', desc: null },
  { icon: 'file-export', text: 'Export Data as CSV / JSON', desc: null },
  { icon: 'headset', text: 'Priority Support', desc: null },
];

export default function PremiumScreen() {
  const [selectedPlan, setSelectedPlan] = useState('annual');
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert(
      '👑 Clarity Pro',
      'In-app purchases are coming soon! You\'ll be able to subscribe to Clarity Pro directly in the app.\n\nStay tuned!',
      [{ text: 'Got it!', style: 'default' }]
    )
  };

  const handleRestore = () => {
    Alert.alert('Restore Purchases', 'No previous purchases found.')
  }

  return (
    <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

          {/* Hero */}
          <View style={styles.hero}>
            <LinearGradient
              colors={['#f6ad55', '#ed8936']}
              style={styles.crownCircle}
            >
              <MaterialCommunityIcons name="crown" size={36} color="#fff" />
            </LinearGradient>
            <Text style={styles.heroTitle}>Clarity Pro</Text>
            <Text style={styles.heroSub}>Unlock your full mental clarity potential</Text>
            <View style={styles.trialBadge}>
              <Text style={styles.trialText}>✦ 7-day free trial</Text>
            </View>
          </View>

          {/* Features */}
          <Text style={styles.sectionTitle}>EVERYTHING IN PRO</Text>
          <GlassView style={styles.featureContainer} glassEffectStyle='regular'>
            {FEATURES.map((feature, i) => (
              <View key={i}>
                <View style={styles.featureRow}>
                  <View style={styles.featureIcon}>
                    <MaterialCommunityIcons name={feature.icon} size={20} color="#f6ad55" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.featureText}>{feature.text}</Text>
                    {feature.desc && (
                      <Text style={styles.featureDesc}>{feature.desc}</Text>
                    )}
                  </View>
                  <MaterialCommunityIcons name="check-circle" size={20} color="#48bb78" />
                </View>
                {i < FEATURES.length - 1 && <View style={styles.divider} />}
              </View>
            ))}
          </GlassView>

          {/* Plans */}
          <Text style={styles.sectionTitle}>CHOOSE YOUR PLAN</Text>
          {PLANS.map((plan) => (
            <TouchableOpacity
              key={plan.id}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSelectedPlan(plan.id);
              }}
              activeOpacity={0.9}
            >
              <GlassView
                style={[styles.planCard, selectedPlan === plan.id && styles.selectedPlan]}
                glassEffectStyle='regular'
              >
                <View style={styles.planInfo}>
                  <Text style={styles.planName}>{plan.name}</Text>
                  <Text style={styles.planSub}>{plan.sub}</Text>
                </View>
                <View style={styles.planPriceGroup}>
                  <Text style={styles.planPrice}>{plan.price}</Text>
                  {plan.badge && (
                    <View style={styles.saveBadge}>
                      <Text style={styles.saveBadgeText}>{plan.badge}</Text>
                    </View>
                  )}
                </View>
                {selectedPlan === plan.id && (
                  <View style={styles.selectedDot} />
                )}
              </GlassView>
            </TouchableOpacity>
          ))}

          {/* CTA */}
          <TouchableOpacity
            onPress={handleSubscribe}
            style={styles.ctaWrapper}
            activeOpacity={0.8}
            disabled={loading}
          >
            <LinearGradient
              colors={['#f6ad55', '#ed8936']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.ctaBtn}
            >
              <Text style={styles.ctaText}>
                {loading ? 'Loading...' : 'Start 7-Day Free Trial 👑'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleRestore} style={styles.restoreBtn}>
            <Text style={styles.restoreText}>Restore purchases</Text>
          </TouchableOpacity>

          <Text style={styles.legalText}>
            Payment will be charged to your Apple ID account. Subscription automatically renews unless cancelled at least 24 hours before the end of the current period. You can manage and cancel your subscription in your App Store account settings.
          </Text>

          <View style={{ height: 120 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 20 },
  hero: { alignItems: 'center', marginVertical: 30 },
  crownCircle: { width: 80, height: 80, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  heroTitle: { fontSize: 36, fontWeight: '900', color: '#f6ad55', textAlign: 'center', marginBottom: 8 },
  heroSub: { color: 'rgba(255,255,255,0.7)', fontSize: 16, textAlign: 'center', marginBottom: 16 },
  trialBadge: { backgroundColor: 'rgba(246,173,85,0.15)', borderWidth: 1, borderColor: 'rgba(246,173,85,0.3)', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20 },
  trialText: { color: '#f6ad55', fontSize: 14, fontWeight: '700' },
  sectionTitle: { color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '800', letterSpacing: 1.5, marginBottom: 15, marginTop: 25 },
  featureContainer: { borderRadius: 28, overflow: 'hidden' },
  featureRow: { flexDirection: 'row', alignItems: 'center', padding: 18, gap: 14 },
  featureIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(246,173,85,0.1)', alignItems: 'center', justifyContent: 'center' },
  featureText: { color: '#fff', fontSize: 15, fontWeight: '600', flex: 1 },
  featureDesc: { color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 3 },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginLeft: 68 },
  planCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 22, borderRadius: 24, marginBottom: 12, overflow: 'hidden' },
  selectedPlan: { borderWidth: 2, borderColor: '#f6ad55' },
  planInfo: { flex: 1 },
  planName: { color: '#fff', fontSize: 20, fontWeight: '800' },
  planSub: { color: 'rgba(255,255,255,0.5)', fontSize: 13, marginTop: 4 },
  planPriceGroup: { alignItems: 'flex-end' },
  planPrice: { color: '#fff', fontSize: 20, fontWeight: '800' },
  saveBadge: { backgroundColor: 'rgba(72,187,120,0.15)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginTop: 6 },
  saveBadgeText: { color: '#48bb78', fontSize: 12, fontWeight: '900' },
  selectedDot: { position: 'absolute', top: 12, right: 12, width: 10, height: 10, borderRadius: 5, backgroundColor: '#f6ad55' },
  ctaWrapper: { marginTop: 10, borderRadius: 25, overflow: 'hidden' },
  ctaBtn: { paddingVertical: 20, alignItems: 'center' },
  ctaText: { color: '#fff', fontSize: 19, fontWeight: '900' },
  restoreBtn: { alignItems: 'center', marginTop: 16 },
  restoreText: { color: 'rgba(255,255,255,0.4)', fontSize: 14 },
  legalText: { color: 'rgba(255,255,255,0.25)', fontSize: 11, textAlign: 'center', lineHeight: 16, marginTop: 20 },
});