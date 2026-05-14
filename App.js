import { Feather } from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { registerRootComponent } from 'expo'
import { GlassView, isGlassEffectAPIAvailable } from 'expo-glass-effect'
import * as Haptics from 'expo-haptics'
import { StatusBar } from 'expo-status-bar'
import { useEffect, useState } from 'react'
import { Image, StyleSheet, TouchableOpacity, View } from 'react-native'
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import { useClarityData } from './src/hooks/useClarityData'
import { useFitnessData } from './src/hooks/useFitnessData'
import { useProfile } from './src/hooks/useProfile'
import { ThemeContext, useThemeProvider } from './src/hooks/useTheme'
import { useWallpaper } from './src/hooks/useWallpaper'

import AnalyticsDetailScreen from './src/screens/AnalyticsDetailScreen'
import AwardsListScreen from './src/screens/AwardsListScreen'
import CoachScreen from './src/screens/CoachScreen'
import FitnessScreen from './src/screens/FitnessScreen'
import HomeScreen from './src/screens/HomeScreen'
import LoginScreen from './src/screens/LoginScreen'
import OnboardingScreen from './src/screens/OnboardingScreen'
import PremiumScreen from './src/screens/PremiumScreen'
import SettingsScreen from './src/screens/SettingsScreen'
import StatsScreen from './src/screens/StatsScreen'

const Tab = createBottomTabNavigator()
const Stack = createNativeStackNavigator()
const RAILWAY_API = 'https://clarity-app-production-e136.up.railway.app'

const TABS = [
  { name: 'Home', icon: 'home' },
  { name: 'Coach', icon: 'message-circle' },
  { name: 'Stats', icon: 'bar-chart-2' },
  { name: 'Premium', icon: 'star' },
]

function TabItem({ route, focused, onPress }) {
  const scale = useSharedValue(1)
  const tab = TABS.find(t => t.name === route.name)
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))

  return (
    <TouchableOpacity
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        scale.value = withSpring(0.85, { damping: 8 }, () => { scale.value = withSpring(1, { damping: 8 }) })
        onPress()
      }}
      onPressIn={() => scale.value = withSpring(1.15, { damping: 6, stiffness: 300 })}
      onPressOut={() => scale.value = withSpring(1, { damping: 10, stiffness: 200 })}
      style={styles.ftab}
      activeOpacity={1}
    >
      {focused && <View style={styles.activeBlob} />}
      <Animated.View style={animStyle}>
        <Feather name={tab?.icon || 'circle'} size={20} color={focused ? '#fff' : 'rgba(0,0,0,0.55)'} />
      </Animated.View>
      <Animated.Text style={[styles.ftabLabel, animStyle, { color: focused ? '#fff' : 'rgba(0,0,0,0.5)', fontWeight: focused ? '600' : '400' }]}>
        {route.name}
      </Animated.Text>
    </TouchableOpacity>
  )
}

function GlassTabBar({ state, navigation }) {
  const glassAvailable = isGlassEffectAPIAvailable()
  const content = (
    <View style={styles.tabInner}>
      {state.routes.map((route, index) => (
        <TabItem key={route.name} route={route} focused={state.index === index} onPress={() => navigation.navigate(route.name)} />
      ))}
    </View>
  )
  return (
    <View style={styles.tabContainer}>
      {glassAvailable 
        ? <GlassView style={styles.tabWrap} glassEffectStyle='clear' colorScheme='system'>{content}</GlassView>
        : <View style={[styles.tabWrap, { backgroundColor: 'rgba(255,255,255,0.55)' }]}>{content}</View>
      }
    </View>
  )
}

function TabNavigator({ data, profile, wallpaper }) {
  return (
    <Tab.Navigator tabBar={(props) => <GlassTabBar {...props} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: 'transparent'} }}>
      <Tab.Screen name='Home'>
        {({ navigation }) => <HomeScreen data={data} profile={profile} wallpaper={wallpaper} onSettingsPress={() => navigation.navigate('Settings')} />}
      </Tab.Screen>
      <Tab.Screen name='Coach'>{() => <CoachScreen data={data} />}</Tab.Screen>
      <Tab.Screen name='Stats'>{({ navigation }) => <StatsScreen data={data} navigation={navigation} />}</Tab.Screen>
      <Tab.Screen name='Premium'>{() => <PremiumScreen />}</Tab.Screen>
    </Tab.Navigator>
  )
}

function App() {
  const data = useClarityData()
  const theme = useThemeProvider()
  const profile = useProfile()
  const wallpaper = useWallpaper()
  const [showOnboarding, setShowOnboarding] = useState(true)
  const [showLogin, setShowLogin] = useState(true)

  const { steps } = useFitnessData(data.toggleHabit, data.todayHabits)

  useEffect(() => {
    const syncToRailway = async () => {
      const userId = await AsyncStorage.getItem('user-id')
      const token = await AsyncStorage.getItem('auth-token')
      if (!userId || !token || !data.loaded) return

      try {
        await fetch(`${RAILWAY_API}/api/sync`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
          },
          body: JSON.stringify({
            userId,
            name: profile?.name || 'User',
            history: data.history,
            seenMilestones: data.seenMilestones,
            steps: steps,
            sleepHours: 0, 
            pushToken: null 
          })
        })
        console.log('Sync success:', steps)
      } catch (e) {
        console.error('Sync error:', e.message)
      }
    }

    if (data.loaded) syncToRailway()
  }, [steps, data.todayHabits, data.loaded])

  useEffect(() => {
    AsyncStorage.getItem('onboarding-done').then(val => { if(val === 'yes') setShowOnboarding(false) })
    AsyncStorage.getItem('login-type').then(val => { if(val === 'apple' || val == 'google') setShowLogin(false) })
  }, [])

  if(!data.loaded) return <View style={{ flex: 1, backgroundColor: '#0a0a1a' }} />

  const { currentWallpaper } = wallpaper
  const wallpaperSource = currentWallpaper?.isLocal ? require('./assets/wallpaper.png') : currentWallpaper?.uri ? { uri: currentWallpaper.uri } : require('./assets/wallpaper.png')

  if(showOnboarding) {
    return (
      <ThemeContext.Provider value={theme}>
        <SafeAreaProvider><StatusBar style='light' /><OnboardingScreen onDone={() => setShowOnboarding(false)} /></SafeAreaProvider>
      </ThemeContext.Provider>
    )
  }

  if(showLogin) {
    return (
      <ThemeContext.Provider value={theme}>
        <SafeAreaProvider>
          <StatusBar style='light' />
          <LoginScreen onLogin={(name) => {
            AsyncStorage.setItem('user-name', name)
            profile.reloadProfile()
            setShowLogin(false)
          }} />
        </SafeAreaProvider>
      </ThemeContext.Provider>
    )
  }

  return (
    <ThemeContext.Provider value={theme}>
      <SafeAreaProvider>
        <StatusBar style='light' />
        <View style={{ flex: 1, backgroundColor: '#0a0a1a' }}>
          <Image source={wallpaperSource} style={StyleSheet.absoluteFillObject} resizeMode='cover' />
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.4)' }]} pointerEvents='none' />
          <NavigationContainer>
            <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: 'transparent' } }}>
              <Stack.Screen name='Tabs'>{() => <TabNavigator data={data} profile={profile} wallpaper={wallpaper} />}</Stack.Screen>
              <Stack.Screen name='AnalyticsDetail' options={{ gestureEnabled: true, animation: 'slide_from_bottom' }}>
                {(props) => <AnalyticsDetailScreen {...props} data={data} wallpaper={wallpaper} />}
              </Stack.Screen>
              <Stack.Screen name='AwardsList' options={{ gestureEnabled: true, animation: 'slide_from_right' }}>
                {(props) => <AwardsListScreen {...props} />}
              </Stack.Screen>
             <Stack.Screen name='Settings' options={{ gestureEnabled: true, animation: 'slide_from_right', contentStyle: { backgroundColor: '#09090b' } }}>
  {() => <SettingsScreen profile={profile} wallpaper={wallpaper} onLogout={() => setShowLogin(true)} />}
</Stack.Screen>

              <Stack.Screen name='Fitness' options={{ gestureEnabled: true, animation: 'slide_from_right' }}>
                {() => <FitnessScreen data={data} />}
              </Stack.Screen>
            </Stack.Navigator>
          </NavigationContainer>
        </View>
      </SafeAreaProvider>
    </ThemeContext.Provider>
  )
}

const styles = StyleSheet.create({
  tabContainer: { position: 'absolute', bottom: 30, left: '5%', right: '5%' },
  tabWrap: { width: '100%', borderRadius: 50, overflow: 'hidden' },
  tabInner: { flexDirection: 'row', paddingVertical: 5, paddingHorizontal: 4 },
  ftab: { flex: 1, alignItems: 'center', paddingVertical: 7, borderRadius: 40, gap: 2, position: 'relative' },
  activeBlob: { position: 'absolute', top: 0, left: 4, right: 4, bottom: 0, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.25)', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.6)' },
  ftabLabel: { fontSize: 10, letterSpacing: 0.2, zIndex: 1 },
})

registerRootComponent(App)