import AsyncStorage from '@react-native-async-storage/async-storage'

const SETTINGS_KEY = 'trading-alert-settings-v1'
const HISTORY_KEY = 'trading-alert-history-v1'

const DEFAULT_SETTINGS = {
  enabled: true,
  callerSignals: true,
  tradeEvents: true,
}

export async function getAlertSettings() {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY)
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
  } catch (_e) {}
  return { ...DEFAULT_SETTINGS }
}

export async function saveAlertSettings(settings) {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}

export async function pushAlertHistory(entry) {
  try {
    const raw = await AsyncStorage.getItem(HISTORY_KEY)
    const list = raw ? JSON.parse(raw) : []
    list.unshift({ ...entry, id: Date.now(), time: Date.now() })
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, 50)))
  } catch (_e) {}
}

export async function getAlertHistory() {
  try {
    const raw = await AsyncStorage.getItem(HISTORY_KEY)
    if (raw) return JSON.parse(raw)
  } catch (_e) {}
  return []
}

export async function clearAlertHistory() {
  await AsyncStorage.removeItem(HISTORY_KEY)
}
