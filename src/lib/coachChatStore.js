import AsyncStorage from '@react-native-async-storage/async-storage'
import { pushExtrasSoon } from './extrasSync'

const COACH_CHAT_KEY = 'coach-chat-v1'

export async function loadCoachChat() {
  try {
    const raw = await AsyncStorage.getItem(COACH_CHAT_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export async function saveCoachChat(messages) {
  const list = (messages || []).slice(-200).map((m) => ({
    id: m.id || `${m.ts || Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    role: m.role,
    content: m.content || m.text || '',
    ts: m.ts || Date.now(),
    device: m.device || 'phone',
  }))
  await AsyncStorage.setItem(COACH_CHAT_KEY, JSON.stringify(list))
  pushExtrasSoon()
  return list
}

export async function appendCoachMessages(newMessages) {
  const cur = await loadCoachChat()
  const merged = [...cur]
  for (const m of newMessages || []) {
    merged.push({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      role: m.role,
      content: m.content || '',
      ts: Date.now(),
      device: 'phone',
    })
  }
  return saveCoachChat(merged)
}

export function coachChatToUiMessages(list) {
  return (list || []).map((m) => ({
    role: m.role,
    content: m.content || m.text || '',
  }))
}
