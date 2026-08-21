import { Feather } from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { GlassView, isGlassEffectAPIAvailable } from 'expo-glass-effect'
import * as Haptics from 'expo-haptics'
import { StatusBar } from 'expo-status-bar'
import { useEffect, useState } from 'react'
import { StyleSheet, TouchableOpacity, View } from 'react-native'
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated'
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
        <Feather name={tab?.icon || 'circle'} size={20} color={focused ? '#1a1a1a' : 'rgba(0,0,0,0.45)'} />
      </Animated.View>
      <Animated.Text style={[styles.ftabLabel, animStyle, { color: focused ? '#1a1a1a' : 'rgba(0,0,0,0.45)', fontWeight: focused ? '600' : '400' }]}>
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
        ? <GlassView style={styles.tabWrap} glassEffectStyle='regular' colorScheme='light'>{content}</GlassView>
        : <View style={[styles.tabWrap, { backgroundColor: 'rgba(255,255,255,0.65)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)' }]}>{content}</View>
      }
    </View>
  )
}

function TabNavigator({ data, profile, wallpaper }) {
  return (
    <Tab.Navigator
      tabBar={(props) => <GlassTabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: 'transparent' } }}
    >
      <Tab.Screen name='Home' options={{ lazy: false }}>
        {({ navigation }) => (
          <HomeScreen
            data={data}
            profile={profile}
            wallpaper={wallpaper}
            onSettingsPress={() => navigation.navigate('Settings')}
            onHabitsPress={() => navigation.getParent()?.navigate('Habits')}
          />
        )}
      </Tab.Screen>
      <Tab.Screen name='Coach'>{() => <CoachScreen data={data} wallpaper={wallpaper} />}</Tab.Screen>
      <Tab.Screen name='Trading'>{() => <TradingScreen wallpaper={wallpaper} profile={profile} />}</Tab.Screen>
      <Tab.Screen name='Study'>{() => <StudyScreen wallpaper={wallpaper} />}</Tab.Screen>
      <Tab.Screen name='Stats'>{({ navigation }) => <StatsScreen data={data} navigation={navigation} wallpaper={wallpaper} />}</Tab.Screen>
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
      <ThemeContext.Provider value={theme}>
        <SafeAreaProvider><StatusBar style='light' /><OnboardingScreen onDone={() => setShowOnboarding(false)} /></SafeAreaProvider>
      </ThemeContext.Provider>
    )
  }

  return (
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
                <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: 'transparent' } }}>
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
  )
}

const styles = StyleSheet.create({
  tabContainer: { position: 'absolute', bottom: 30, left: '5%', right: '5%' },
  tabWrap: { width: '100%', borderRadius: 50, overflow: 'hidden' },
  tabInner: { flexDirection: 'row', paddingVertical: 5, paddingHorizontal: 4 },
  ftab: { flex: 1, alignItems: 'center', paddingVertical: 7, borderRadius: 40, gap: 2, position: 'relative' },
  activeBlob: { position: 'absolute', top: 0, left: 4, right: 4, bottom: 0, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.85)', borderWidth: 0.5, borderColor: 'rgba(255,255,255,1)' },
  ftabLabel: { fontSize: 10, letterSpacing: 0.2, zIndex: 1 },
})

export default App