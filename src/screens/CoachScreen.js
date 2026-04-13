import * as Haptics from 'expo-haptics'
import { LinearGradient } from 'expo-linear-gradient'
import { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, FlatList, KeyboardAvoidingView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { API_URL, HABITS, calcScore } from '../constants'

const SUGGESTIONS = [
  "Why is sleep so important for focus?",
  "I'm feeling foggy — what should I do?",
  "Explain the science behind my streak",
]

export default function CoachScreen({ data }) {
  const { todayHabits, streak, messages, addMessage, weeklyInsight, setWeeklyInsight } = data
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const listRef = useRef(null)
  const score = calcScore(todayHabits)
  const checkedIn = todayHabits.length >= Math.ceil(HABITS.length / 2)

  useEffect(() => {
    if(messages.length > 0) setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100)
  }, [messages])

  const callClaude = async (userMsg) => {
    console.log('calling API...')
    const completedToday = todayHabits.map((id) => HABITS.find((h) => h.id === id)?.label).join(', ') || 'none yet'
    const system = `You are Clarity, a warm, science-grounded mental clarity coach. Be concise (2-4 sentences), specific, cite mechanisms (BDNF, cortisol, glymphatic system) in plain language. Today completed: ${completedToday}. Streak: ${streak} days. Score: ${score}/100.`
    const recentHistory = messages.slice(-6).map((m) => ({ role: m.role, content: m.content }))

    try {
      const res = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system,
          messages: [...recentHistory, { role: 'user', content: userMsg }]
        }),
      })
      console.log('response status:', res.status)
      const d = await res.json()
      console.log('response:', JSON.stringify(d).slice(0, 200))
      return d.content?.map((c) => c.text || '').join('\n') || ''
    } catch(e) {
      console.log('fetch error:', e.message)
      return ''
    }
  }

  const sendMessage = async (text) => {
    const userMsg = (text || input).trim()
    if(!userMsg || sending) return
    setInput('')
    console.log('sending:', userMsg)
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    addMessage({ role: 'user', content: userMsg, ts: Date.now() })
    setSending(true)
    try {
      const reply = await callClaude(userMsg)
      console.log('reply:', reply)
      if(reply) {
        addMessage({ role: 'assistant', content: reply, ts: Date.now() })
      } else {
        addMessage({ role: 'assistant', content: 'Having trouble connecting. Try again in a moment.', ts: Date.now() })
      }
    } catch(e) {
      console.log('send error:', e.message)
      addMessage({ role: 'assistant', content: 'Having trouble connecting. Try again in a moment.', ts: Date.now() })
    }
    setSending(false)
  }

  const generateWeeklyInsight = async () => {
    setSending(true)
    try {
      const system = 'You are Clarity, a warm science-grounded mental clarity coach. Give a 3-4 sentence personalized weekly insight. One pattern, one win, one suggestion. Brief science. No bullet points.'
      const prompt = `Streak: ${streak} days. Score today: ${score}/100. Habits done: ${todayHabits.map(id => HABITS.find(h => h.id === id)?.shortLabel).join(', ') || 'none'}.`
      const res = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ system, messages: [{ role: 'user', content: prompt }] }),
      })
      const d = await res.json()
      const text = d.content?.map((c) => c.text || '').join('\n') || ''
      setWeeklyInsight({ text, date: new Date().toISOString().split('T')[0] })
    } catch(e) {
      console.log('insight error:', e.message)
      setWeeklyInsight({ text: "Couldn't generate insight right now.", date: '' })
    }
    setSending(false)
  }

  const renderMessage = ({ item }) => (
    <View style={[styles.msgRow, item.role === 'user' ? styles.msgRowUser : styles.msgRowAssistant]}>
      <View style={[styles.bubble, item.role === 'user' ? styles.bubbleUser : styles.bubbleAssistant]}>
        <Text style={[styles.bubbleText, item.role === 'user' && styles.bubbleTextUser]}>{item.content}</Text>
      </View>
    </View>
  )

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior='padding' keyboardVerticalOffset={80}>
        <View style={styles.header}>
          <LinearGradient colors={['#6c5ce7', '#f472b6']} style={styles.coachAvatar}>
            <Text style={{ fontSize: 16 }}>✨</Text>
          </LinearGradient>
          <View>
            <Text style={styles.coachName}>Clarity Coach</Text>
            <Text style={styles.coachSub}>Science-grounded, never preachy</Text>
          </View>
        </View>

        {!checkedIn && (
          <View style={styles.lockBanner}>
            <Text style={styles.lockText}>Complete at least {Math.ceil(HABITS.length / 2)} habits to unlock your coach 🔒</Text>
          </View>
        )}

        {checkedIn && (
          <View style={styles.insightCard}>
            <Text style={styles.insightLabel}>✨ WEEKLY INSIGHT</Text>
            {weeklyInsight ? (
              <Text style={styles.insightText}>{weeklyInsight.text}</Text>
            ) : (
              <TouchableOpacity onPress={generateWeeklyInsight} disabled={sending}>
                <Text style={styles.insightBtnText}>{sending ? 'Analyzing...' : 'Generate my insight →'}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(_, i) => String(i)}
          renderItem={renderMessage}
          contentContainerStyle={styles.chatContent}
          ListHeaderComponent={messages.length === 0 && checkedIn ? (
            <View style={styles.emptyChat}>
              <Text style={styles.emptyChatText}>Ask me anything about your mental clarity.</Text>
              {SUGGESTIONS.map((q) => (
                <TouchableOpacity key={q} style={styles.suggestionBtn} onPress={() => sendMessage(q)}>
                  <Text style={styles.suggestionText}>{q}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}
          ListFooterComponent={sending ? (
            <View style={styles.typingRow}>
              <View style={styles.bubbleAssistant}>
                <ActivityIndicator size='small' color='#a78bfa' />
              </View>
            </View>
          ) : null}
        />

        {checkedIn && (
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={input}
              onChangeText={setInput}
              placeholder='Ask your coach...'
              placeholderTextColor='rgba(255,255,255,0.3)'
              onSubmitEditing={() => sendMessage()}
              returnKeyType='send'
              editable={!sending}
            />
            <TouchableOpacity onPress={() => sendMessage()} disabled={!input.trim() || sending} style={styles.sendBtn}>
              <LinearGradient colors={['#6c5ce7', '#f472b6']} style={[styles.sendBtnGradient, (!input.trim() || sending) && { opacity: 0.3 }]}>
                <Text style={{ color: '#fff', fontSize: 16 }}>↑</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0a0a0f' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' },
  coachAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  coachName: { fontSize: 15, fontWeight: '500', color: '#fff' },
  coachSub: { fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 1 },
  lockBanner: { margin: 16, backgroundColor: '#1e1a3a', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#3d3580' },
  lockText: { color: '#a89ef0', fontSize: 13, textAlign: 'center', lineHeight: 20 },
  insightCard: { margin: 16, backgroundColor: 'rgba(108,92,231,0.1)', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(108,92,231,0.2)' },
  insightLabel: { fontSize: 10, color: '#a89ef0', letterSpacing: 2, marginBottom: 8 },
  insightText: { fontSize: 13, color: 'rgba(255,255,255,0.8)', lineHeight: 20 },
  insightBtnText: { fontSize: 13, color: '#a89ef0' },
  chatContent: { padding: 16, gap: 8 },
  msgRow: { marginBottom: 8 },
  msgRowUser: { alignItems: 'flex-end' },
  msgRowAssistant: { alignItems: 'flex-start' },
  bubble: { maxWidth: '85%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleUser: { backgroundColor: '#fff' },
  bubbleAssistant: { backgroundColor: '#1a1a24', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  bubbleText: { fontSize: 14, color: 'rgba(255,255,255,0.85)', lineHeight: 20 },
  bubbleTextUser: { color: '#000' },
  typingRow: { alignItems: 'flex-start', paddingHorizontal: 4, marginBottom: 8 },
  emptyChat: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  emptyChatText: { fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 8 },
  suggestionBtn: { backgroundColor: '#1a1a24', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  suggestionText: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)', marginBottom: 80 },
  input: { flex: 1, backgroundColor: '#1a1a24', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 24, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, color: '#fff' },
  sendBtn: { width: 42, height: 42, borderRadius: 21, overflow: 'hidden' },
  sendBtnGradient: { flex: 1, alignItems: 'center', justifyContent: 'center' },
})