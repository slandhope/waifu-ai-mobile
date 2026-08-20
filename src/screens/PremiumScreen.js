import { Feather } from '@expo/vector-icons'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Alert, Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import GlassSurface from '../components/GlassSurface';
import TabScreenShell from '../components/TabScreenShell';

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

export default function PremiumScreen({ wallpaper }) {
  const navigation = useNavigation()
  const [selectedPlan, setSelectedPlan] = useState('annual');
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert(
      '👑 waifu.ai Pro',
      'In-app purchases are coming soon! You\'ll be able to subscribe to waifu.ai Pro directly in the app.\n\nStay tuned!',
      [{ text: 'Got it!', style: 'default' }]
    )
  };

  const handleRestore = () => {
    Alert.alert('Restore Purchases', 'No previous purchases found.')
  }

  return (
    <TabScreenShell wallpaper={wallpaper}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.85}>
          <Feather name="chevron-left" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

          {/* Hero */}
          <View style={styles.hero}>
            <LinearGradient
              colors={['#f6ad55', '#ed8936']}
              style={styles.crownCircle}
            >
              <MaterialCommunityIcons name="crown" size={36} color="#fff" />
            </LinearGradient>
            <Text style={styles.heroTitle}>waifu.ai Pro</Text>
            <Text style={styles.heroSub}>Unlock your full potential with waifu.ai</Text>
            <View style={styles.trialBadge}>
              <Text style={styles.trialText}>✦ 7-day free trial</Text>
            </View>
          </View>

          {/* Features */}
          <Text style={styles.sectionTitle}>EVERYTHING IN PRO</Text>
          <GlassSurface borderRadius={28} style={styles.featureContainer}>
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
          </GlassSurface>

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
              <GlassSurface
                borderRadius={24}
                style={[styles.planCard, selectedPlan === plan.id && styles.selectedPlan]}
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
              </GlassSurface>
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
    </TabScreenShell>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20 },
  backBtn: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4, alignSelf: 'flex-start' },
  hero: { alignItems: 'center', marginVertical: 30 },
  crownCircle: { width: 80, height: 80, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  heroTitle: { fontSize: 36, fontWeight: '900', color: '#e08b2a', textAlign: 'center', marginBottom: 8 },
  heroSub: { color: 'rgba(0,0,0,0.55)', fontSize: 16, textAlign: 'center', marginBottom: 16 },
  trialBadge: { backgroundColor: 'rgba(246,173,85,0.15)', borderWidth: 1, borderColor: 'rgba(246,173,85,0.35)', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20 },
  trialText: { color: '#e08b2a', fontSize: 14, fontWeight: '700' },
  sectionTitle: { color: 'rgba(0,0,0,0.4)', fontSize: 12, fontWeight: '800', letterSpacing: 1.5, marginBottom: 15, marginTop: 25 },
  featureContainer: { overflow: 'hidden' },
  featureRow: { flexDirection: 'row', alignItems: 'center', padding: 18, gap: 14 },
  featureIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(246,173,85,0.12)', alignItems: 'center', justifyContent: 'center' },
  featureText: { color: '#1a1a1a', fontSize: 15, fontWeight: '600', flex: 1 },
  featureDesc: { color: 'rgba(0,0,0,0.45)', fontSize: 12, marginTop: 3 },
  divider: { height: 1, backgroundColor: 'rgba(0,0,0,0.06)', marginLeft: 68 },
  planCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 22, marginBottom: 12, overflow: 'hidden' },
  selectedPlan: { borderWidth: 2, borderColor: '#f6ad55' },
  planInfo: { flex: 1 },
  planName: { color: '#1a1a1a', fontSize: 20, fontWeight: '800' },
  planSub: { color: 'rgba(0,0,0,0.45)', fontSize: 13, marginTop: 4 },
  planPriceGroup: { alignItems: 'flex-end' },
  planPrice: { color: '#1a1a1a', fontSize: 20, fontWeight: '800' },
  saveBadge: { backgroundColor: 'rgba(72,187,120,0.15)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginTop: 6 },
  saveBadgeText: { color: '#16a34a', fontSize: 12, fontWeight: '900' },
  selectedDot: { position: 'absolute', top: 12, right: 12, width: 10, height: 10, borderRadius: 5, backgroundColor: '#f6ad55' },
  ctaWrapper: { marginTop: 10, borderRadius: 25, overflow: 'hidden' },
  ctaBtn: { paddingVertical: 20, alignItems: 'center' },
  ctaText: { color: '#fff', fontSize: 19, fontWeight: '900' },
  restoreBtn: { alignItems: 'center', marginTop: 16 },
  restoreText: { color: 'rgba(0,0,0,0.45)', fontSize: 14 },
  legalText: { color: 'rgba(0,0,0,0.35)', fontSize: 11, textAlign: 'center', lineHeight: 16, marginTop: 20 },
});