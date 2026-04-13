import AsyncStorage from '@react-native-async-storage/async-storage'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { registerRootComponent } from 'expo'
import * as Haptics from 'expo-haptics'
import { StatusBar } from 'expo-status-bar'
import React, { useEffect, useState } from 'react'
import { Platform, StyleSheet, TouchableOpacity, View } from 'react-native'
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import { useClarityData } from './src/hooks/useClarityData'
import { useProfile } from './src/hooks/useProfile'
import { ThemeContext, useThemeProvider } from './src/hooks/useTheme'
import { useWallpaper } from './src/hooks/useWallpaper'
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

const TABS = [
  { name: 'Home', icon: '🏠' },
  { name: 'Coach', icon: '✨' },
  { name: 'Stats', icon: '📊' },
  { name: 'Pro', icon: '👑' },
]

function TabItem({ route, focused, onPress, accent, isDark }) {
  const scale = useSharedValue(1)
  const icon = TABS.find(t => t.name === route.name)?.icon || '●'

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))

  return (
    <TouchableOpacity
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        scale.value = withSpring(0.85, { damping: 8 }, () => {
          scale.value = withSpring(1, { damping: 8 })
        })
        onPress()
      }}
      onPressIn={() => {
        scale.value = withSpring(1.2, { damping: 6, stiffness: 300 })
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 10, stiffness: 200 })
      }}
      style={styles.ftab}
      activeOpacity={1}
    >
      {focused && (
        <View style={[styles.pill, {
          backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
          borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)',
        }]} />
      )}
      <Animated.Text style={[styles.ftabIcon, animStyle, { opacity: focused ? 1 : 0.4 }]}>
        {icon}
      </Animated.Text>
      <Animated.Text style={[styles.ftabLabel, animStyle, {
        color: focused
          ? accent.primary
          : isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)'
      }]}>
        {route.name}
      </Animated.Text>
    </TouchableOpacity>
  )
}

function GlassTabBar({ state, navigation }) {
  const theme = React.useContext(ThemeContext)
  const { accent, isDark } = theme

  return (
    <View style={[styles.tabWrap, {
      backgroundColor: isDark ? 'rgba(12,8,24,0.92)' : 'rgba(248,248,255,0.92)',
      borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
    }]}>
      <View style={styles.tabInner}>
        {state.routes.map((route, index) => (
          <TabItem
            key={route.name}
            route={route}
            focused={state.index === index}
            onPress={() => navigation.navigate(route.name)}
            accent={accent}
            isDark={isDark}
          />
        ))}
      </View>
    </View>
  )
}

function TabNavigator({ data, profile, wallpaper }) {
  return (
    <Tab.Navigator
      tabBar={(props) => <GlassTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name='Home'>
        {({ navigation }) => (
          <HomeScreen
            data={data}
            profile={profile}
            wallpaper={wallpaper}
            onSettingsPress={() => navigation.navigate('Settings')}
          />
        )}
      </Tab.Screen>
      <Tab.Screen name='Coach'>{() => <CoachScreen data={data} />}</Tab.Screen>
      <Tab.Screen name='Stats'>{() => <StatsScreen data={data} />}</Tab.Screen>
      <Tab.Screen name='Pro'>{() => <PremiumScreen />}</Tab.Screen>
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

  useEffect(() => {
    AsyncStorage.getItem('onboarding-done').then(val => {
      if(val === 'yes') setShowOnboarding(false)
    })
  }, [])

  useEffect(() => {
    AsyncStorage.getItem('login-type').then(val => {
      if(val) setShowLogin(false)
    })
  }, [])

  if(!data.loaded) return null

  if(showOnboarding) {
    return (
      <ThemeContext.Provider value={theme}>
        <SafeAreaProvider>
          <StatusBar style='light' />
          <OnboardingScreen onDone={() => setShowOnboarding(false)} />
        </SafeAreaProvider>
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
            setShowLogin(false)
          }} />
        </SafeAreaProvider>
      </ThemeContext.Provider>
    )
  }

  return (
    <ThemeContext.Provider value={theme}>
      <SafeAreaProvider>
        <StatusBar style={theme.isDark ? 'light' : 'dark'} />
        <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name='Tabs'>
              {() => <TabNavigator data={data} profile={profile} wallpaper={wallpaper} />}
            </Stack.Screen>
            <Stack.Screen
              name='Settings'
              options={{ gestureEnabled: true, animation: 'slide_from_right' }}
            >
              {() => <SettingsScreen profile={profile} wallpaper={wallpaper} />}
            </Stack.Screen>
            <Stack.Screen
              name='Fitness'
              options={{ gestureEnabled: true, animation: 'slide_from_right' }}
            >
              {() => <FitnessScreen />}
            </Stack.Screen>
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </ThemeContext.Provider>
  )
}

const styles = StyleSheet.create({
  tabWrap: {
    borderTopWidth: 1,
    paddingBottom: Platform.OS === 'ios' ? 28 : 8,
    paddingTop: 6,
    paddingHorizontal: 8,
  },
  tabInner: {
    flexDirection: 'row',
    gap: 4,
  },
  ftab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 20,
    gap: 3,
    position: 'relative',
  },
  pill: {
    position: 'absolute',
    top: 4,
    left: 4,
    right: 4,
    bottom: 4,
    borderRadius: 16,
    borderWidth: 1,
  },
  ftabIcon: { fontSize: 22 },
  ftabLabel: { fontSize: 10, fontWeight: '500', letterSpacing: 0.3 },
})

registerRootComponent(App)