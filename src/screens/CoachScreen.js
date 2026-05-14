import { Feather } from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { GlassView, isGlassEffectAPIAvailable } from 'expo-glass-effect'
import * as Haptics from 'expo-haptics'
import { LinearGradient } from 'expo-linear-gradient'
import { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Keyboard, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { API_URL, HABITS, calcScore } from '../constants'
import { useTheme } from '../hooks/useTheme'
import { apiCall } from '../utils/api'


const QUICK_PROMPTS = [
  'Why is sleep so important for focus?',
  "I'm feeling foggy — what should I do?",
  'Explain the science behind my streak',
]

function GlassBox({ children, style, borderRadius = 20 }) {
  const glassAvailable = isGlassEffectAPIAvailable()
  if(glassAvailable) {
    return (
      <GlassView style={[{ borderRadius, overflow: 'hidden' }, style]} glassEffectStyle='regular' colorScheme='system'>
        {children}
      </GlassView>
    )
  }
  return (
    <View style={[{ borderRadius, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }, style]}>
      {children}
    </View>
  )
}

export default function CoachScreen({ data }) {
  const { accent } = useTheme()
  const insets = useSafeAreaInsets()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [generatingInsight, setGeneratingInsight] = useState(false)
  const [generatingGoals, setGeneratingGoals] = useState(false)
  const [isKeyboardVisible, setKeyboardVisible] = useState(false)
  const scrollRef = useRef(null)

  useEffect(() => {
    const showSubscription = Keyboard.addListener('keyboardWillShow', () => setKeyboardVisible(true))
    const hideSubscription = Keyboard.addListener('keyboardWillHide', () => setKeyboardVisible(false))
    return () => {
      showSubscription.remove()
      hideSubscription.remove()
    }
  }, [])

  const TAB_BAR_HEIGHT = 65 + insets.bottom

  const getDate = () => new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' })
  const getGreeting = () => {
    const hour = new Date().getHours()
    if(hour < 12) return 'Good morning'
    if(hour < 18) return 'Good afternoon'
    return 'Good evening'
  }

  const buildSystemPrompt = () => {
    const todayHabits = data?.todayHabits || []
    const todayScore = calcScore(todayHabits)
    const streak = data?.streak || 0
    const history = data?.history || {}

    const last7 = Array.from({ length: 7 }, (_, i) => {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = d.toISOString().split('T')[0]
      const habits = history[key] || []
      return { date: key, habits, score: calcScore(habits) }
    })

    const avgScore = Math.round(last7.reduce((a, b) => a + b.score, 0) / 7)
    const missedHabits = HABITS.filter(h => !todayHabits.includes(h.id)).map(h => h.label)
    const completedHabits = HABITS.filter(h => todayHabits.includes(h.id)).map(h => h.label)

    const habitFrequency = {}
    HABITS.forEach(h => {
      const count = last7.filter(d => d.habits.includes(h.id)).length
      habitFrequency[h.label] = count
    })

    const weakHabits = Object.entries(habitFrequency)
      .filter(([_, count]) => count <= 2)
      .map(([label]) => label)

    const strongHabits = Object.entries(habitFrequency)
      .filter(([_, count]) => count >= 5)
      .map(([label]) => label)

    return `You are Clarity Coach — a personal AI wellness coach with access to the user's real health data.

USER DATA:
- Current streak: ${streak} days
- Today's clarity score: ${todayScore}/100
- 7-day average score: ${avgScore}/100
- Today's completed habits: ${completedHabits.join(', ') || 'none yet'}
- Today's missed habits: ${missedHabits.join(', ') || 'all done!'}

HABIT PATTERNS (last 7 days):
${Object.entries(habitFrequency).map(([h, c]) => '- ' + h + ': ' + c + '/7 days').join('\n')}

WEAK HABITS (needs improvement): ${weakHabits.join(', ') || 'none'}
STRONG HABITS (keep it up): ${strongHabits.join(', ') || 'still building'}

YOUR ROLE:
1. Give personalized advice based on THEIR actual data above
2. When asked to generate goals, return ONLY raw JSON, no markdown, no backticks, no explanation. Use ONLY these exact habitIds: sleep, exercise, hydration, meditation, nutrition, breathwork, screens. Example:
{"goals":[{"habitId":"exercise","target":"30 min movement","tip":"Daily movement boosts energy"},{"habitId":"hydration","target":"2.5L water","tip":"Stay hydrated for focus"}],"newHabit":{"id":"gratitude","label":"5 min gratitude","emoji":"🙏","tip":"Gratitude increases positivity by 15%"}}
3. Proactively notice patterns
4. Be science-grounded, never preachy, max 150 words unless generating goals`
  }

  const sendMessage = async (text) => {
    const msg = text || input.trim()
    if(!msg) return
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setInput('')
    const newMessages = [...messages, { role: 'user', content: msg }]
    setMessages(newMessages)
    setLoading(true)
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100)

    try {
      const userId = await AsyncStorage.getItem('user-id')
      // ADD THESE TWO LINES HERE:
    console.log("Coach is using ID:", userId);
    console.log("Fetching from:", API_URL + '/api/chat');
      const res = await apiCall('/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          system: buildSystemPrompt(),
          messages: newMessages.slice(-6),
          userId: userId
        })
      })
      const json = await res.json()
      const reply = json.content?.[0]?.text || "I'm here to help with your mental clarity journey!"
      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
    } catch(e) {
      setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I'm having trouble connecting. Try again!" }])
    }
    setLoading(false)
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100)
  }

  const generateInsight = async () => {
    setGeneratingInsight(true)
    await sendMessage('Analyze my habit data and give me a personalized weekly insight. What patterns do you see and what should I focus on?')
    setGeneratingInsight(false)
  }

  const generateDailyGoals = async () => {
    setGeneratingGoals(true)
    const msg = 'Analyze my data and generate my personalized daily goals for today. Return them in the JSON format specified in your instructions. Return ONLY the JSON, nothing else.'
    const newMessages = [...messages, { role: 'user', content: msg }]
    setMessages(newMessages)
    setLoading(true)
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100)

    try {
      const res = await apiCall('/api/chat', {
        method: 'POST',
       
        body: JSON.stringify({
          system: buildSystemPrompt(),
          messages: newMessages.slice(-6)
        })
      })
      const json = await res.json()
      console.log('chat response:', JSON.stringify(json))
      const reply = json.content?.[0]?.text || ''

      try {
        const jsonMatch = reply.match(/\{[\s\S]*\}/)
        if(jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0])
          const today = new Date().toISOString().split('T')[0]
          if(parsed.goals) {
            await AsyncStorage.setItem('ai-goals', JSON.stringify(parsed.goals))
            await AsyncStorage.setItem('ai-goals-date', today)
          }
          if(parsed.newHabit) {
            await AsyncStorage.setItem('ai-new-habit', JSON.stringify(parsed.newHabit))
          }
          setMessages(prev => [...prev, { role: 'assistant', content: 'Your personalized goals for today have been set! Check your Home screen to see them.' }])
        } else {
          setMessages(prev => [...prev, { role: 'assistant', content: reply }])
        }
      } catch(e) {
        setMessages(prev => [...prev, { role: 'assistant', content: reply }])
      }
    } catch(e) {
      setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, couldn't generate goals right now." }])
    }

    setLoading(false)
    setGeneratingGoals(false)
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100)
  }

  return (
    <View style={{ flex: 1 }}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={0}
        >
          {/* header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.dateText}>{getDate()}</Text>
              <Text style={styles.greeting}>{getGreeting()}, ✨</Text>
            </View>
            <GlassBox style={styles.profilePill} borderRadius={30}>
              <View style={styles.profilePillInner}>
                <View style={styles.avatarCircle}>
                  <Feather name='user' size={14} color='#fff' />
                </View>
                <Text style={styles.profileName}>G'day</Text>
                <Feather name='edit-2' size={13} color='rgba(255,255,255,0.7)' />
              </View>
            </GlassBox>
          </View>

          <View style={styles.divider} />

          <ScrollView
            ref={scrollRef}
            style={{ flex: 1 }}
            contentContainerStyle={styles.messagesContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps='handled'
          >
            {/* coach identity */}
            <View style={styles.coachRow}>
              <LinearGradient colors={['#7c3aed', '#a855f7']} style={styles.coachAvatar}>
                <Text style={styles.coachAvatarIcon}>✦</Text>
              </LinearGradient>
              <View>
                <Text style={styles.coachName}>Clarity Coach</Text>
                <Text style={styles.coachSub}>Science-grounded, never preachy</Text>
              </View>
            </View>

            {/* action cards */}
            <View style={styles.insightWrap}>
              <GlassBox style={styles.insightCard} borderRadius={16}>
                <TouchableOpacity onPress={generateInsight} activeOpacity={0.8} style={styles.insightInner} disabled={generatingInsight}>
                  <Text style={styles.insightLabel}>✦  WEEKLY INSIGHT</Text>
                  {generatingInsight
                    ? <ActivityIndicator color='#fff' style={{ marginTop: 4 }} />
                    : <Text style={styles.insightCta}>Generate my insight →</Text>
                  }
                </TouchableOpacity>
              </GlassBox>

              <GlassBox style={[styles.insightCard, { marginTop: 10 }]} borderRadius={16}>
                <TouchableOpacity onPress={generateDailyGoals} activeOpacity={0.8} style={styles.insightInner} disabled={generatingGoals}>
                  <Text style={styles.insightLabel}>🎯  DAILY AI GOALS</Text>
                  {generatingGoals
                    ? <ActivityIndicator color='#fff' style={{ marginTop: 4 }} />
                    : <Text style={styles.insightCta}>Generate my goals for today →</Text>
                  }
                </TouchableOpacity>
              </GlassBox>
            </View>

            {/* empty state */}
            {messages.length === 0 && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>Ask me anything about your mental clarity.</Text>
                <View style={styles.quickPrompts}>
                  {QUICK_PROMPTS.map((p, i) => (
                    <TouchableOpacity key={i} onPress={() => sendMessage(p)} activeOpacity={0.8}>
                      <GlassBox style={styles.promptPill} borderRadius={30}>
                        <Text style={styles.promptText}>{p}</Text>
                      </GlassBox>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* messages */}
            <View style={styles.messages}>
              {messages.map((msg, i) => (
                <View key={i} style={[styles.msgRow, msg.role === 'user' ? styles.msgRowUser : styles.msgRowAssistant]}>
                  {msg.role === 'assistant' && (
                    <LinearGradient colors={['#7c3aed', '#a855f7']} style={styles.msgAvatar}>
                      <Text style={{ fontSize: 10, color: '#fff' }}>✦</Text>
                    </LinearGradient>
                  )}
                  <GlassBox
                    style={[styles.msgBubble, msg.role === 'user' ? styles.msgBubbleUser : styles.msgBubbleAssistant]}
                    borderRadius={18}
                  >
                    <Text style={styles.msgText}>{msg.content}</Text>
                  </GlassBox>
                </View>
              ))}
              {loading && (
                <View style={[styles.msgRow, styles.msgRowAssistant]}>
                  <LinearGradient colors={['#7c3aed', '#a855f7']} style={styles.msgAvatar}>
                    <Text style={{ fontSize: 10, color: '#fff' }}>✦</Text>
                  </LinearGradient>
                  <GlassBox style={styles.msgBubble} borderRadius={18}>
                    <ActivityIndicator color='#fff' size='small' />
                  </GlassBox>
                </View>
              )}
            </View>

            <View style={{ height: 20 }} />
          </ScrollView>

          {/* input bar */}
          <View style={[styles.inputContainer, { paddingBottom: isKeyboardVisible ? 12 : TAB_BAR_HEIGHT }]}>
            <GlassBox style={styles.inputBox} borderRadius={30}>
              <TextInput
                style={styles.input}
                placeholder='Ask your coach...'
                placeholderTextColor='rgba(255,255,255,0.4)'
                value={input}
                onChangeText={setInput}
                onSubmitEditing={() => sendMessage()}
                returnKeyType='send'
                blurOnSubmit={false}
              />
              <TouchableOpacity
                onPress={() => sendMessage()}
                style={[styles.sendBtn, { backgroundColor: accent.primary }]}
              >
                <Feather name='send' size={16} color='#fff' />
              </TouchableOpacity>
            </GlassBox>
          </View>

        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 20, paddingTop: 12, marginBottom: 12 },
  dateText: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 2 },
  greeting: { fontSize: 24, fontWeight: '700', color: '#fff' },
  profilePill: { overflow: 'hidden' },
  profilePillInner: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8 },
  avatarCircle: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  profileName: { fontSize: 13, color: '#fff', fontWeight: '500' },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.15)', marginHorizontal: 20, marginBottom: 16 },
  coachRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, marginBottom: 16 },
  coachAvatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  coachAvatarIcon: { fontSize: 20, color: '#fff' },
  coachName: { fontSize: 18, fontWeight: '700', color: '#fff' },
  coachSub: { fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  insightWrap: { paddingHorizontal: 20, marginBottom: 16 },
  insightCard: {},
  insightInner: { padding: 16 },
  insightLabel: { fontSize: 11, letterSpacing: 1.5, color: 'rgba(255,255,255,0.6)', marginBottom: 6 },
  insightCta: { fontSize: 16, fontWeight: '600', color: '#fff' },
  messagesContent: { paddingHorizontal: 20, paddingBottom: 20 },
  emptyState: { alignItems: 'center', paddingTop: 20 },
  emptyText: { fontSize: 15, color: 'rgba(255,255,255,0.7)', textAlign: 'center', marginBottom: 24 },
  quickPrompts: { width: '100%', gap: 12 },
  promptPill: { width: '100%' },
  promptText: { fontSize: 14, color: '#fff', padding: 16, textAlign: 'center' },
  messages: { gap: 12 },
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  msgRowUser: { justifyContent: 'flex-end' },
  msgRowAssistant: { justifyContent: 'flex-start' },
  msgAvatar: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  msgBubble: { maxWidth: '80%', padding: 12 },
  msgBubbleUser: {},
  msgBubbleAssistant: {},
  msgText: { fontSize: 14, color: '#fff', lineHeight: 20 },
  inputContainer: { paddingHorizontal: 16, paddingTop: 8 },
  inputBox: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  input: { flex: 1, fontSize: 15, color: '#fff', height: 40 },
  sendBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
})