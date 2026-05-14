import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

export default function AwardsListScreen({ navigation }) {
  return (
    <View style={{flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <SafeAreaView style={styles.safe}>
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Feather name="chevron-left" size={28} color="#ebff00" /> 
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Awards</Text>
          <View style={{ width: 28 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBody}>
          
          {/* Top Progress Card: "Go For It" */}
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={styles.medalCircle}>
                <MaterialCommunityIcons name="trophy-outline" size={30} color="#555" />
              </View>
              <View style={styles.cardTextContent}>
                <Text style={styles.cardTitle}>Go For It</Text>
                <Text style={styles.cardSub}>100 Move Goals</Text>
                <Text style={styles.cardProgressText}>74 of 100</Text>
              </View>
              <TouchableOpacity>
                 <Text style={styles.showAll}>Show All</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Main Featured Award: "Close Your Rings" */}
          <View style={styles.mainAwardCard}>
            <Text style={styles.sectionTitle}>Close Your Rings</Text>
            <View style={styles.featuredMedalContainer}>
              {/* Replace icon with Image source if you have the PNG */}
              <MaterialCommunityIcons name="clover" size={180} color="#ff3b30" />
              <Text style={styles.medalName}>Move Goal 300%</Text>
              <Text style={styles.medalDate}>2026/04/19</Text>
              
              <View style={styles.stackRow}>
                <View style={styles.miniMedalStack}>
                   <View style={[styles.miniCircle, { backgroundColor: '#333' }]} />
                   <View style={[styles.miniCircle, { backgroundColor: '#444', marginLeft: -10 }]} />
                   <View style={[styles.miniCircle, { backgroundColor: '#555', marginLeft: -10 }]} />
                </View>
                <Text style={styles.moreText}>+4 more</Text>
                <Text style={styles.showAllSmall}>Show All</Text>
              </View>
            </View>
          </View>

          {/* Bottom Grid: Challenges & Workouts */}
          <View style={styles.grid}>
            <View style={styles.gridItem}>
               <Text style={styles.gridTitle}>Monthly{"\n"}Challenges</Text>
               <View style={styles.gridMedalArea}>
                 <MaterialCommunityIcons name="hexagon-slice-6" size={80} color="#00f2ad" />
               </View>
            </View>
            <View style={styles.gridItem}>
               <Text style={styles.gridTitle}>Workouts</Text>
               <View style={styles.gridMedalArea}>
                 <MaterialCommunityIcons name="run" size={80} color="#fff" />
               </View>
            </View>
          </View>

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  safe: { flex: 1 },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 15,
    paddingVertical: 10 
  },
  headerTitle: { color: '#fff', fontSize: 17, fontWeight: '600' },
  backButton: { backgroundColor: '#1c1c1e', borderRadius: 20, padding: 4 },
  scrollBody: { padding: 15 },
  
  // Progress Card Styles
  card: { 
    backgroundColor: '#1c1c1e', 
    borderRadius: 15, 
    padding: 15, 
    marginBottom: 15 
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  medalCircle: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  cardTextContent: { flex: 1, marginLeft: 15 },
  cardTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  cardSub: { color: '#8e8e93', fontSize: 14 },
  cardProgressText: { color: '#8e8e93', fontSize: 14, marginTop: 2 },
  showAll: { color: '#ebff00', fontWeight: '600', fontSize: 14 },

  // Featured Award Styles
  mainAwardCard: { 
    backgroundColor: '#1c1c1e', 
    borderRadius: 15, 
    padding: 20, 
    alignItems: 'flex-start',
    marginBottom: 15 
  },
  sectionTitle: { color: '#fff', fontSize: 20, fontWeight: '700', marginBottom: 20 },
  featuredMedalContainer: { width: '100%', alignItems: 'center' },
  medalName: { color: '#fff', fontSize: 16, fontWeight: '500', marginTop: 15 },
  medalDate: { color: '#8e8e93', fontSize: 14, marginTop: 4 },
  stackRow: { flexDirection: 'row', alignItems: 'center', marginTop: 20, width: '100%' },
  miniMedalStack: { flexDirection: 'row', flex: 1 },
  miniCircle: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, borderColor: '#1c1c1e' },
  moreText: { color: '#8e8e93', fontSize: 13, marginRight: 5 },
  showAllSmall: { color: '#ebff00', fontSize: 13, fontWeight: '600' },

  // Grid Styles
  grid: { flexDirection: 'row', justifyContent: 'space-between' },
  gridItem: { 
    backgroundColor: '#1c1c1e', 
    width: (width / 2) - 22, 
    borderRadius: 15, 
    padding: 15, 
    height: 220 
  },
  gridTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  gridMedalArea: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});