import { MaterialCommunityIcons } from '@expo/vector-icons';
import { GlassView } from 'expo-glass-effect';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Dimensions, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const PLANS = [
  { id: 'annual', name: 'Annual', price: '$69000.99/yr', sub: '$500000.83/month', badge: 'Save 40%' },
  { id: 'monthly', name: 'Monthly', price: '$90000.99/mo', sub: 'Billed monthly', badge: null },
];

export default function PremiumScreen() {
  const [selectedPlan, setSelectedPlan] = useState('annual');

  const handleSubscribe = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    alert('Connecting to App Store...');
  };

  return (
      <View style={{flex: 1, backgroundColor: 'rgba(0,0,0,0.5)'}}>
        <SafeAreaView style={styles.safe} edges={['top']}>
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            
            {/* Hero Header */}
            <View style={styles.hero}>
              <View style={styles.logoRow}>
                <MaterialCommunityIcons name="infinity" size={32} color="#fff" />
                <Text style={styles.logoText}>CLARITY</Text>
              </View>
              <Text style={styles.heroTitle}>Upgrade to Clarity Pro</Text>
              <Text style={styles.heroSub}>Unlock your full mental clarity potential.</Text>
            </View>

            {/* Feature List Section */}
            <Text style={styles.sectionTitle}>WHAT YOU GET</Text>
            <GlassView style={styles.featureContainer} glassEffectStyle='regular'>
              
              {/* Feature 1: Deep Dive Analytics with Images */}
              <View style={styles.featureRow}>
                <View style={styles.checkCol}>
                  <MaterialCommunityIcons name="check-circle" size={22} color="#9F7AEA" />
                </View>
                <View style={styles.featureBody}>
                  <View style={styles.rowHeader}>
                    <Image 
                      source={require('../../assets/ring-preview.png')} 
                      style={styles.uiAssetRing} 
                      resizeMode="contain"
                    />
                    <View style={styles.textContainer}>
                      <Text style={styles.featureTitle}>Deep Dive Analytics<Text style={styles.ampersand}>&</Text></Text>
                      <Text style={styles.featureSubTitle}>Progress Dashboard</Text>
                    </View>
                    <Image 
                      source={require('../../assets/graph-preview.png')} 
                      style={styles.uiAssetGraph} 
                      resizeMode="contain"
                    />
                  </View>
                  <Text style={styles.featureDesc}>Compare metrics across days, weeks, and seasons for a clearer overview.</Text>
                </View>
              </View>

              <View style={styles.divider} />

              {/* Feature 2: AI Coach */}
              <View style={styles.featureRow}>
                <View style={styles.checkCol}>
                  <MaterialCommunityIcons name="check-circle" size={22} color="#9F7AEA" />
                </View>
                <Text style={styles.simpleFeatureText}>Unlimited AI Coach Messages & Weekly Insights</Text>
              </View>

              <View style={styles.divider} />

              {/* Feature 3: Priority Support with Masterclass Image */}
              <View style={styles.featureRow}>
                <View style={styles.checkCol}>
                  <MaterialCommunityIcons name="check-circle" size={22} color="#9F7AEA" />
                </View>
                <View style={styles.featureBody}>
                  <View style={styles.rowHeader}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.simpleFeatureText}>Priority Support & 9 Additional Science Habits</Text>
                        <Text style={styles.featureDesc}>Ad-free access to exclusive mindfulness responses and feature constants.</Text>
                    </View>
                    <Image 
                      source={require('../../assets/masterclass-preview.png')} 
                      style={styles.uiAssetThumb} 
                      resizeMode="cover"
                    />
                  </View>
                </View>
              </View>

              <View style={styles.divider} />

              {/* Simple Rows */}
              {['Streak Freeze Feature', 'Habit Correlation Insights', 'Export Data CSV/JSON'].map((item, i) => (
                <View key={i}>
                    <View style={styles.featureRow}>
                        <View style={styles.checkCol}>
                          <MaterialCommunityIcons name="check-circle" size={22} color="#9F7AEA" />
                        </View>
                        <Text style={styles.simpleFeatureText}>{item}</Text>
                    </View>
                    {i < 2 && <View style={styles.divider} />}
                </View>
              ))}
            </GlassView>

            {/* Plan Selection */}
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
                </GlassView>
              </TouchableOpacity>
            ))}

            {/* CTA Button */}
            <TouchableOpacity onPress={handleSubscribe} style={styles.ctaWrapper} activeOpacity={0.8}>
                <LinearGradient 
                    colors={['#f6ad55', '#ed8936']} 
                    start={{x:0, y:0}} 
                    end={{x:1, y:0}} 
                    style={styles.ctaBtn}
                >
                    <Text style={styles.ctaText}>Start 7-day Free Trial 👑</Text>
                </LinearGradient>
            </TouchableOpacity>

            <View style={{ height: 120 }} />
          </ScrollView>
        </SafeAreaView>
      </View>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  safe: { flex: 1 },
  content: { padding: 20 },
  hero: { alignItems: 'center', marginVertical: 35 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 15 },
  logoText: { color: '#fff', fontSize: 24, fontWeight: '300', letterSpacing: 5 },
  heroTitle: { fontSize: 36, fontWeight: '900', color: '#f6ad55', textAlign: 'center', marginBottom: 5 },
  heroSub: { color: '#fff', fontSize: 16, opacity: 0.8, textAlign: 'center' },
  sectionTitle: { color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '800', letterSpacing: 1.5, marginBottom: 15, marginTop: 25 },
  featureContainer: { borderRadius: 28, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  featureRow: { flexDirection: 'row', padding: 20 },
  checkCol: { marginRight: 15 },
  featureBody: { flex: 1 },
  rowHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  uiAssetRing: { width: 55, height: 55 },
  uiAssetGraph: { width: 70, height: 45, borderRadius: 10 },
  uiAssetThumb: { width: 70, height: 45, borderRadius: 6, marginLeft: 10 },
  textContainer: { flex: 1, paddingHorizontal: 15 },
  featureTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  ampersand: { color: 'rgba(255,255,255,0.4)', fontWeight: '400' },
  featureSubTitle: { color: 'rgba(255,255,255,0.6)', fontSize: 16, fontWeight: '500' },
  featureDesc: { color: 'rgba(255,255,255,0.4)', fontSize: 13, marginTop: 10, lineHeight: 18 },
  simpleFeatureText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.08)' },
  planCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 22, borderRadius: 24, marginBottom: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  selectedPlan: { borderColor: '#f6ad55', backgroundColor: 'rgba(246, 173, 85, 0.08)' },
  planInfo: { flex: 1 },
  planName: { color: '#fff', fontSize: 20, fontWeight: '800' },
  planSub: { color: 'rgba(255,255,255,0.5)', fontSize: 13, marginTop: 4 },
  planPriceGroup: { alignItems: 'flex-end' },
  planPrice: { color: '#fff', fontSize: 18, fontWeight: '800' },
  saveBadge: { backgroundColor: 'rgba(72, 187, 120, 0.15)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginTop: 6 },
  saveBadgeText: { color: '#48bb78', fontSize: 12, fontWeight: '900' },
  ctaWrapper: { marginTop: 10, borderRadius: 25, overflow: 'hidden' },
  ctaBtn: { paddingVertical: 20, alignItems: 'center' },
  ctaText: { color: '#fff', fontSize: 19, fontWeight: '900' }
});