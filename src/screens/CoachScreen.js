import { Feather } from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useNavigation } from '@react-navigation/native'
import * as Haptics from 'expo-haptics'
import { LinearGradient } from 'expo-linear-gradient'
import { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Keyboard, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import GlassSurface from '../components/GlassSurface'
import TabScreenShell from '../components/TabScreenShell'
import WhiteboardCanvas from '../components/WhiteboardCanvas'
import { teachOnWhiteboard } from '../lib/whiteboard'
import { HABITS, calcScore, localDateKey } from '../constants'
import { saveDailyGoals } from '../lib/aiGoalsStore'
import { apiCall } from '../utils/api'

const QUICK_PROMPTS = [
  'Why is sleep so important for focus?',
  "I'm feeling foggy — what should I do?",
  'Explain the science behind my streak',
]

const WHITEBOARD_TOPICS = ['RSI oversold', 'Liquidation', 'Funding rate', 'Risk/reward', 'Sleep & focus']

export default function CoachScreen({ data, wallpaper }) {
  const navigation = useNavigation()
  const insets = useSafeAreaInsets()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [generatingInsight, setGeneratingInsight] = useState(false)
  const [generatingGoals, setGeneratingGoals] = useState(false)
  const [isKeyboardVisible, setKeyboardVisible] = useState(false)
  const [wbLoading, setWbLoading] = useState(false)
  const [wbData, setWbData] = useState(null)
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
      const key = localDateKey(d)
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

    return `You are waifu.ai Coach — a personal AI wellness coach with access to the user's real health data.

USER DATA:
- Current streak: ${streak} days
- Today's waifu.ai score: ${todayScore}/100
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
      const res = await apiCall('/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          system: buildSystemPrompt(),
          messages: newMessages.slice(-6),
          userId: userId
        })
      })
      if (!res.ok) {
        setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I'm having trouble connecting. Try again!" }])
        return
      }
      const json = await res.json()
      const reply = json.content?.[0]?.text || "I'm here to help with your waifu.ai journey!"
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
    const msg = 'Analyze my data and generate my personalized daily goals for today.'
    const newMessages = [...messages, { role: 'user', content: msg }]
    setMessages(newMessages)
    setLoading(true)
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100)

    try {
      const userId = await AsyncStorage.getItem('user-id')
      const res = await apiCall('/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          system: buildSystemPrompt(),
          messages: newMessages.slice(-6),
          userId,
        })
      })
      if (!res.ok) {
        setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, couldn't generate goals right now." }])
        return
      }
      const json = await res.json()
      const reply = json.content?.[0]?.text || ''

      try {
        const jsonMatch = reply.match(/\{[\s\S]*\}/)
        if(jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0])
          await saveDailyGoals(parsed)
          const count = (parsed.goals || []).length + (parsed.newHabit ? 1 : 0)
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: count > 0
              ? `Done! ${count} personalized focus${count > 1 ? ' areas' : ''} saved — open Habits on Home to see them.`
              : 'Goals saved! Open Habits on Home to track them.',
          }])
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

  async function drawWhiteboard(topic) {
    setWbLoading(true)
    setWbData(null)
    const r = await teachOnWhiteboard(topic)
    setWbLoading(false)
    if (r?.success) {
      setWbData(r)
      setMessages(prev => [...prev, { role: 'assistant', content: r.narration || `Here's ${topic} on the board~` }])
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100)
    }
  }

  return (
    <TabScreenShell wallpaper={wallpaper}>
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
            <GlassSurface borderRadius={30} style={styles.profilePill}>
              <TouchableOpacity onPress={() => navigation.getParent?.()?.navigate('Settings')} activeOpacity={0.85}>
                <View style={styles.profilePillInner}>
                  <View style={styles.avatarCircle}>
                    <Feather name='user' size={14} color='#6c5ce7' />
                  </View>
                  <Text style={styles.profileName}>Profile</Text>
                  <Feather name='edit-2' size={13} color='rgba(0,0,0,0.35)' />
                </View>
              </TouchableOpacity>
            </GlassSurface>
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
                <Text style={styles.coachName}>waifu.ai Coach</Text>
                <Text style={styles.coachSub}>Science-grounded, never preachy</Text>
              </View>
            </View>

            {/* action cards */}
            <View style={styles.insightWrap}>
              <GlassSurface borderRadius={16} style={styles.insightCard}>
                <TouchableOpacity onPress={generateInsight} activeOpacity={0.8} style={styles.insightInner} disabled={generatingInsight}>
                  <Text style={styles.insightLabel}>✦  WEEKLY INSIGHT</Text>
                  {generatingInsight
                    ? <ActivityIndicator color='#6c5ce7' style={{ marginTop: 4 }} />
                    : <Text style={styles.insightCta}>Generate my insight →</Text>
                  }
                </TouchableOpacity>
              </GlassSurface>

              <GlassSurface borderRadius={16} style={[styles.insightCard, { marginTop: 10 }]}>
                <TouchableOpacity onPress={generateDailyGoals} activeOpacity={0.8} style={styles.insightInner} disabled={generatingGoals}>
                  <Text style={styles.insightLabel}>🎯  DAILY AI GOALS</Text>
                  {generatingGoals
                    ? <ActivityIndicator color='#6c5ce7' style={{ marginTop: 4 }} />
                    : <Text style={styles.insightCta}>Generate my goals for today →</Text>
                  }
                </TouchableOpacity>
              </GlassSurface>
            </View>

            <View style={styles.insightWrap}>
              <GlassSurface borderRadius={16} style={styles.insightCard}>
                <View style={styles.insightInner}>
                  <Text style={styles.insightLabel}>🖊️  WHITEBOARD</Text>
                  <Text style={[styles.insightCta, { fontSize: 13, fontWeight: '500', marginBottom: 8 }]}>
                    PC-style animated board for trading & wellness concepts (Study tab = full classroom)
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {WHITEBOARD_TOPICS.map((t) => (
                      <TouchableOpacity key={t} onPress={() => drawWhiteboard(t)} disabled={wbLoading}>
                        <GlassSurface borderRadius={20} style={{ paddingHorizontal: 12, paddingVertical: 8 }}>
                          <Text style={{ fontSize: 12, fontWeight: '600', color: '#6c5ce7' }}>{t}</Text>
                        </GlassSurface>
                      </TouchableOpacity>
                    ))}
                  </View>
                  {wbLoading && <ActivityIndicator color="#6c5ce7" style={{ marginTop: 12 }} />}
                  {!!wbData?.cmds?.length && <WhiteboardCanvas cmds={wbData.cmds} />}
                </View>
              </GlassSurface>
            </View>

            {/* empty state */}
            {messages.length === 0 && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>Ask me anything about your wellness.</Text>
                <View style={styles.quickPrompts}>
                  {QUICK_PROMPTS.map((p, i) => (
                    <TouchableOpacity key={i} onPress={() => sendMessage(p)} activeOpacity={0.8}>
                      <GlassSurface borderRadius={30} style={styles.promptPill}>
                        <Text style={styles.promptText}>{p}</Text>
                      </GlassSurface>
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
                  <GlassSurface
                    style={[styles.msgBubble, msg.role === 'user' && styles.msgBubbleUser]}
                    borderRadius={18}
                  >
                    <Text style={styles.msgText}>{msg.content}</Text>
                  </GlassSurface>
                </View>
              ))}
              {loading && (
                <View style={[styles.msgRow, styles.msgRowAssistant]}>
                  <LinearGradient colors={['#7c3aed', '#a855f7']} style={styles.msgAvatar}>
                    <Text style={{ fontSize: 10, color: '#fff' }}>✦</Text>
                  </LinearGradient>
                  <GlassSurface style={styles.msgBubble} borderRadius={18}>
                    <ActivityIndicator color='#6c5ce7' size='small' />
                  </GlassSurface>
                </View>
              )}
            </View>

            <View style={{ height: 20 }} />
          </ScrollView>

          {/* input bar */}
          <View style={[styles.inputContainer, { paddingBottom: isKeyboardVisible ? 12 : TAB_BAR_HEIGHT }]}>
            <GlassSurface borderRadius={30} style={styles.inputBox}>
              <TextInput
                style={styles.input}
                placeholder='Ask your coach...'
                placeholderTextColor='rgba(0,0,0,0.35)'
                value={input}
                onChangeText={setInput}
                onSubmitEditing={() => sendMessage()}
                returnKeyType='send'
                blurOnSubmit={false}
              />
              <TouchableOpacity
                onPress={() => sendMessage()}
                style={styles.sendBtn}
              >
                <Feather name='send' size={16} color='#fff' />
              </TouchableOpacity>
            </GlassSurface>
          </View>

        </KeyboardAvoidingView>
    </TabScreenShell>
  )
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 20, paddingTop: 12, marginBottom: 12 },
  dateText: { fontSize: 13, color: 'rgba(0,0,0,0.45)', marginBottom: 2 },
  greeting: { fontSize: 24, fontWeight: '700', color: '#1a1a1a' },
  profilePill: { overflow: 'hidden' },
  profilePillInner: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8 },
  avatarCircle: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(108,92,231,0.15)', alignItems: 'center', justifyContent: 'center' },
  profileName: { fontSize: 13, color: '#1a1a1a', fontWeight: '600' },
  divider: { height: 1, backgroundColor: 'rgba(0,0,0,0.06)', marginHorizontal: 20, marginBottom: 16 },
  coachRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, marginBottom: 16 },
  coachAvatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  coachAvatarIcon: { fontSize: 20, color: '#fff' },
  coachName: { fontSize: 18, fontWeight: '700', color: '#1a1a1a' },
  coachSub: { fontSize: 13, color: 'rgba(0,0,0,0.45)', marginTop: 2 },
  insightWrap: { paddingHorizontal: 20, marginBottom: 16 },
  insightCard: {},
  insightInner: { padding: 16 },
  insightLabel: { fontSize: 11, letterSpacing: 1.5, color: 'rgba(0,0,0,0.45)', marginBottom: 6, fontWeight: '700' },
  insightCta: { fontSize: 16, fontWeight: '600', color: '#1a1a1a' },
  messagesContent: { paddingHorizontal: 20, paddingBottom: 20 },
  emptyState: { alignItems: 'center', paddingTop: 20 },
  emptyText: { fontSize: 15, color: 'rgba(0,0,0,0.55)', textAlign: 'center', marginBottom: 24 },
  quickPrompts: { width: '100%', gap: 12 },
  promptPill: { width: '100%' },
  promptText: { fontSize: 14, color: '#1a1a1a', padding: 16, textAlign: 'center', fontWeight: '500' },
  messages: { gap: 12 },
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  msgRowUser: { justifyContent: 'flex-end' },
  msgRowAssistant: { justifyContent: 'flex-start' },
  msgAvatar: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  msgBubble: { maxWidth: '80%', padding: 12 },
  msgBubbleUser: { backgroundColor: 'rgba(108,92,231,0.12)' },
  msgText: { fontSize: 14, color: '#1a1a1a', lineHeight: 20 },
  inputContainer: { paddingHorizontal: 16, paddingTop: 8 },
  inputBox: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  input: { flex: 1, fontSize: 15, color: '#1a1a1a', height: 40 },
  sendBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#6c5ce7' },
})