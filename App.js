import { Feather } from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { NavigationContainer, useNavigation } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { canUseNativeGlass } from './src/lib/glass'
import { isExpoGo } from './src/utils/isExpoGo'
import * as Haptics from 'expo-haptics'
import { StatusBar } from 'expo-status-bar'
import { Component, useEffect, useState } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import { Live2DProvider } from './src/context/Live2DContext'
import { FitnessProvider } from './src/context/FitnessContext'
import { LiveCameraProvider } from './src/context/LiveCameraContext'
import { WaifuStateProvider } from './src/context/WaifuStateContext'

import { useClarityData } from './src/hooks/useClarityData'
import { useNotifications } from './src/hooks/useNotifications'
import { useProfile } from './src/hooks/useProfile'
import { ThemeContext, useThemeProvider } from './src/hooks/useTheme'
import { useTradingAlerts } from './src/hooks/useTradingAlerts'
import { useWallpaper } from './src/hooks/useWallpaper'

import AnalyticsDetailScreen from './src/screens/AnalyticsDetailScreen'
import LiveCameraSheet from './src/components/LiveCameraSheet'
import AwardsListScreen from './src/screens/AwardsListScreen'
import CoachScreen from './src/screens/CoachScreen'
import FitnessScreen from './src/screens/FitnessScreen'
import GymWorkoutScreen from './src/screens/GymWorkoutScreen'
import HomeScreen from './src/screens/HomeScreen'
import WaifuStage from './src/components/WaifuStage'
import WallpaperBackground from './src/components/WallpaperBackground'
import HabitsScreen from './src/screens/HabitsScreen'
import HabitDetailScreen from './src/screens/HabitDetailScreen'
import StudyScreen from './src/screens/StudyScreen'
import LoginScreen from './src/screens/LoginScreen'
import OnboardingScreen from './src/screens/OnboardingScreen'
import PremiumScreen from './src/screens/PremiumScreen'
import SettingsScreen from './src/screens/SettingsScreen'
import StatsScreen from './src/screens/StatsScreen'
import TradingScreen from './src/screens/TradingScreen'

const Tab = createBottomTabNavigator()
const Stack = createNativeStackNavigator()

const TABS = [
  { name: 'Home', icon: 'home' },
  { name: 'Coach', icon: 'message-circle' },
  { name: 'Trading', icon: 'trending-up' },
  { name: 'Study', icon: 'book-open' },
  { name: 'Stats', icon: 'bar-chart-2' },
]

function TabItem({ route, focused, onPress }) {
  const tab = TABS.find(t => t.name === route.name)
  return (
    <TouchableOpacity
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {})
        onPress()
      }}
      style={styles.ftab}
      activeOpacity={0.85}
    >
      {focused && <View style={styles.activeBlob} />}
      <Feather name={tab?.icon || 'circle'} size={20} color={focused ? '#1a1a1a' : 'rgba(0,0,0,0.45)'} />
      <Text style={[styles.ftabLabel, { color: focused ? '#1a1a1a' : 'rgba(0,0,0,0.45)', fontWeight: focused ? '600' : '400' }]}>
        {route.name}
      </Text>
    </TouchableOpacity>
  )
}

function GlassTabBar({ state, navigation }) {
  const content = (
    <View style={styles.tabInner}>
      {state.routes.map((route, index) => (
        <TabItem key={route.name} route={route} focused={state.index === index} onPress={() => navigation.navigate(route.name)} />
      ))}
    </View>
  )
  let wrap = (
    <View style={[styles.tabWrap, { backgroundColor: 'rgba(255,255,255,0.92)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.95)' }]}>
      {content}
    </View>
  )
  if (canUseNativeGlass()) {
    try {
      const { GlassView } = require('expo-glass-effect')
      wrap = (
        <GlassView style={styles.tabWrap} glassEffectStyle="regular" colorScheme="light">
          {content}
        </GlassView>
      )
    } catch (_e) {}
  }
  return (
    <View style={styles.tabContainer} pointerEvents="box-none" collapsable={false}>
      {wrap}
    </View>
  )
}

class TabErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { err: null }
  }
  static getDerivedStateFromError(err) { return { err } }
  componentDidCatch(err) { console.log('[Tab]', this.props.name, err?.message || err) }
  render() {
    if (this.state.err) {
      return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Text style={{ fontSize: 18, fontWeight: '800', color: '#1a1a1a', marginBottom: 8 }}>{this.props.name} hit an error</Text>
          <Text style={{ fontSize: 13, color: 'rgba(0,0,0,0.55)', textAlign: 'center' }}>{String(this.state.err?.message || this.state.err)}</Text>
        </View>
      )
    }
    return this.props.children
  }
}

function ExpoGoPane({ children }) {
  return (
    <View
      pointerEvents="box-none"
      collapsable={false}
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 80 }}
    >
      {children}
    </View>
  )
}

function ExpoGoTabs({ data, profile, wallpaper }) {
  const navigation = useNavigation()
  const [tab, setTab] = useState('Home')
  const routes = TABS.map((t) => ({ name: t.name, key: t.name }))
  const index = Math.max(0, TABS.findIndex((t) => t.name === tab))
  const wp = wallpaper?.currentWallpaper ?? wallpaper

  const goTab = (name) => {
    console.log('[ExpoGoTabs] tab', name)
    setTab(name)
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#eef4ff' }} collapsable={false}>
      <View pointerEvents="none" style={StyleSheet.absoluteFill} collapsable={false}>
        <WallpaperBackground wallpaper={wp} style={{ flex: 1 }} />
      </View>
      {tab === 'Home' && (
        <View style={StyleSheet.absoluteFill} collapsable={false} pointerEvents="box-none">
          <HomeScreen wallpaper={wallpaper} />
        </View>
      )}
      {tab === 'Home' && (
        <ExpoGoPane>
          <WaifuStage
            data={data}
            profile={profile}
            onSettingsPress={() => navigation.navigate('Settings')}
            onHabitsPress={() => navigation.navigate('Habits')}
          />
        </ExpoGoPane>
      )}
      {tab === 'Coach' && (
        <ExpoGoPane>
          <TabErrorBoundary name="Coach">
            <CoachScreen data={data} wallpaper={wallpaper} />
          </TabErrorBoundary>
        </ExpoGoPane>
      )}
      {tab === 'Trading' && (
        <ExpoGoPane>
          <TabErrorBoundary name="Trading">
            <TradingScreen wallpaper={wallpaper} profile={profile} />
          </TabErrorBoundary>
        </ExpoGoPane>
      )}
      {tab === 'Study' && (
        <ExpoGoPane>
          <TabErrorBoundary name="Study">
            <StudyScreen wallpaper={wallpaper} />
          </TabErrorBoundary>
        </ExpoGoPane>
      )}
      {tab === 'Stats' && (
        <ExpoGoPane>
          <TabErrorBoundary name="Stats">
            <StatsScreen data={data} navigation={navigation} wallpaper={wallpaper} />
          </TabErrorBoundary>
        </ExpoGoPane>
      )}
      <GlassTabBar
        state={{ index, routes }}
        navigation={{ navigate: goTab }}
      />
    </View>
  )
}

function TabNavigator({ data, profile, wallpaper }) {
  if (isExpoGo()) {
    return (
      <TabErrorBoundary name="Tabs">
        <ExpoGoTabs data={data} profile={profile} wallpaper={wallpaper} />
      </TabErrorBoundary>
    )
  }
  return (
    <Tab.Navigator
      tabBar={(props) => <GlassTabBar {...props} />}
      detachInactiveScreens
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: '#eef4ff', flex: 1 } }}
    >
      <Tab.Screen name="Home" options={{ unmountOnBlur: true }}>
        {({ navigation }) => (
          <View style={{ flex: 1 }}>
            <HomeScreen wallpaper={wallpaper} />
            <View pointerEvents="box-none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 80 }}>
              <WaifuStage
                data={data}
                profile={profile}
                onSettingsPress={() => navigation.navigate('Settings')}
                onHabitsPress={() => navigation.getParent()?.navigate('Habits')}
              />
            </View>
          </View>
        )}
      </Tab.Screen>
      <Tab.Screen name="Coach">
        {() => (
          <View style={{ flex: 1 }}>
            <CoachScreen data={data} wallpaper={wallpaper} />
          </View>
        )}
      </Tab.Screen>
      <Tab.Screen name="Trading">
        {() => (
          <View style={{ flex: 1 }}>
            <TradingScreen wallpaper={wallpaper} profile={profile} />
          </View>
        )}
      </Tab.Screen>
      <Tab.Screen name="Study">
        {() => (
          <View style={{ flex: 1 }}>
            <StudyScreen wallpaper={wallpaper} />
          </View>
        )}
      </Tab.Screen>
      <Tab.Screen name="Stats">
        {({ navigation }) => (
          <View style={{ flex: 1 }}>
            <StatsScreen data={data} navigation={navigation} wallpaper={wallpaper} />
          </View>
        )}
      </Tab.Screen>
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
  const [waifuSyncKey, setWaifuSyncKey] = useState(0)

  // Background health sync + auto habit checks (via FitnessProvider)
  useTradingAlerts(!showLogin)
  useNotifications(data.missed, data.streak, !showLogin)
  useEffect(() => {
    console.log('[App] ready', { expoGo: isExpoGo(), onboarding: showOnboarding, login: showLogin })
  }, [showOnboarding, showLogin])

  useEffect(() => {
    AsyncStorage.getItem('onboarding-done').then(val => { if(val === 'yes') setShowOnboarding(false) })
    AsyncStorage.multiGet(['login-type', 'auth-token']).then(([[, loginType], [, token]]) => {
      if ((loginType === 'apple' || loginType === 'google' || loginType === 'guest') && (token || loginType === 'guest')) {
        setShowLogin(false)
      }
    })
  }, [])

  if(!data.loaded) return <View style={{ flex: 1, backgroundColor: '#eef4ff' }} />

  if(showOnboarding) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeContext.Provider value={theme}>
        <SafeAreaProvider><StatusBar style='light' /><OnboardingScreen onDone={() => setShowOnboarding(false)} /></SafeAreaProvider>
      </ThemeContext.Provider>
      </GestureHandlerRootView>
    )
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <ThemeContext.Provider value={theme}>
      <Live2DProvider>
        <WaifuStateProvider key={waifuSyncKey}>
        <SafeAreaProvider>
          <StatusBar style={showLogin ? 'light' : 'dark'} />
          <View style={{ flex: 1, backgroundColor: showLogin ? undefined : '#eef4ff' }}>
            {showLogin ? (
              <LoginScreen onLogin={(name) => {
                AsyncStorage.setItem('user-name', name)
                profile.reloadProfile()
                setWaifuSyncKey((k) => k + 1)
                setShowLogin(false)
              }} />
            ) : (
              <FitnessProvider toggleHabit={data.toggleHabit} todayHabits={data.todayHabits}>
              <LiveCameraProvider>
              <NavigationContainer>
                <Stack.Navigator detachInactiveScreens={false} screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#eef4ff', flex: 1 } }}>
                  <Stack.Screen name='Tabs'>{() => <TabNavigator data={data} profile={profile} wallpaper={wallpaper} />}</Stack.Screen>
                  <Stack.Screen name='Habits' options={{ gestureEnabled: true, animation: 'slide_from_right' }}>
                    {(props) => <HabitsScreen {...props} data={data} wallpaper={wallpaper} />}
                  </Stack.Screen>
                  <Stack.Screen name='HabitDetail' options={{ gestureEnabled: true, animation: 'slide_from_right' }}>
                    {(props) => <HabitDetailScreen {...props} data={data} wallpaper={wallpaper} />}
                  </Stack.Screen>
                  <Stack.Screen name='AnalyticsDetail' options={{ gestureEnabled: true, animation: 'slide_from_bottom' }}>
                    {(props) => <AnalyticsDetailScreen {...props} data={data} wallpaper={wallpaper} />}
                  </Stack.Screen>
                  <Stack.Screen name='AwardsList' options={{ gestureEnabled: true, animation: 'slide_from_right' }}>
                    {(props) => <AwardsListScreen {...props} data={data} wallpaper={wallpaper} />}
                  </Stack.Screen>
                  <Stack.Screen name='Settings' options={{ gestureEnabled: true, animation: 'slide_from_right', contentStyle: { backgroundColor: '#eef4ff' } }}>
                    {() => <SettingsScreen profile={profile} wallpaper={wallpaper} onLogout={() => setShowLogin(true)} />}
                  </Stack.Screen>
                  <Stack.Screen name='Fitness' options={{ gestureEnabled: true, animation: 'slide_from_right' }}>
                    {() => <FitnessScreen data={data} />}
                  </Stack.Screen>
                  <Stack.Screen name='GymWorkout' options={{ gestureEnabled: true, animation: 'slide_from_right' }}>
                    {(props) => <GymWorkoutScreen {...props} data={data} wallpaper={wallpaper} />}
                  </Stack.Screen>
                  <Stack.Screen name='Premium' options={{ gestureEnabled: true, animation: 'slide_from_right' }}>
                    {(props) => <PremiumScreen {...props} wallpaper={wallpaper} />}
                  </Stack.Screen>
                </Stack.Navigator>
              </NavigationContainer>
              <LiveCameraSheet />
              </LiveCameraProvider>
              </FitnessProvider>
            )}
          </View>
        </SafeAreaProvider>
        </WaifuStateProvider>
      </Live2DProvider>
    </ThemeContext.Provider>
    </GestureHandlerRootView>
  )
}

const styles = StyleSheet.create({
  tabContainer: { position: 'absolute', bottom: 30, left: '5%', right: '5%', zIndex: 200, elevation: 20 },
  tabWrap: { width: '100%', borderRadius: 50, overflow: 'hidden' },
  tabInner: { flexDirection: 'row', paddingVertical: 5, paddingHorizontal: 4 },
  ftab: { flex: 1, alignItems: 'center', paddingVertical: 7, borderRadius: 40, gap: 2, position: 'relative' },
  activeBlob: { position: 'absolute', top: 0, left: 4, right: 4, bottom: 0, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.85)', borderWidth: 0.5, borderColor: 'rgba(255,255,255,1)' },
  ftabLabel: { fontSize: 10, letterSpacing: 0.2, zIndex: 1 },
})

export default App