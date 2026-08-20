import AsyncStorage from '@react-native-async-storage/async-storage'
import { pushExtrasSoon } from './extrasSync'

const RESUME_PROFILE_KEY = 'create-studio-resume-v1'
const CREATE_HISTORY_KEY = 'create-studio-history-v1'
const WEBSITE_DRAFT_KEY = 'create-studio-website-draft-v1'
const MAX_HISTORY = 12

export async function getProfileHints() {
  const [[, name], [, email]] = await AsyncStorage.multiGet(['user-name', 'user-email'])
  return {
    name: name || '',
    email: email || '',
    contact: email || '',
  }
}

export async function loadResumeProfile() {
  try {
    const raw = await AsyncStorage.getItem(RESUME_PROFILE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch (_e) {
    return null
  }
}

export async function saveResumeProfile(profile) {
  const payload = {
    ...profile,
    updatedAt: Date.now(),
  }
  await AsyncStorage.setItem(RESUME_PROFILE_KEY, JSON.stringify(payload))
  pushExtrasSoon()
  return payload
}

export async function loadWebsiteDraft() {
  try {
    const raw = await AsyncStorage.getItem(WEBSITE_DRAFT_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch (_e) {
    return null
  }
}

export async function saveWebsiteDraft(draft) {
  const payload = { ...draft, updatedAt: Date.now() }
  await AsyncStorage.setItem(WEBSITE_DRAFT_KEY, JSON.stringify(payload))
  pushExtrasSoon()
  return payload
}

export async function loadCreateHistory() {
  try {
    const raw = await AsyncStorage.getItem(CREATE_HISTORY_KEY)
    if (!raw) return []
    const list = JSON.parse(raw)
    return Array.isArray(list) ? list : []
  } catch (_e) {
    return []
  }
}

export async function addCreateHistory(entry) {
  const list = await loadCreateHistory()
  const item = {
    id: String(Date.now()),
    createdAt: Date.now(),
    ...entry,
  }
  const next = [item, ...list.filter((h) => h.id !== item.id)].slice(0, MAX_HISTORY)
  await AsyncStorage.setItem(CREATE_HISTORY_KEY, JSON.stringify(next))
  pushExtrasSoon()
  return next
}

export async function removeCreateHistory(id) {
  const list = await loadCreateHistory()
  const next = list.filter((h) => h.id !== id)
  await AsyncStorage.setItem(CREATE_HISTORY_KEY, JSON.stringify(next))
  pushExtrasSoon()
  return next
}

export function resumeFromHistory(entry) {
  if (!entry?.form) return null
  return {
    name: entry.form.name || '',
    tagline: entry.form.tagline || '',
    experience: entry.form.experience || '',
    skills: entry.form.skills || '',
    education: entry.form.education || '',
    contact: entry.form.contact || '',
  }
}

export function websiteFromHistory(entry) {
  if (!entry?.form) return null
  return {
    siteType: entry.form.siteType || 'business',
    name: entry.form.name || '',
    symbol: entry.form.symbol || '',
    tagline: entry.form.tagline || '',
    brief: entry.form.customBrief || entry.form.brief || '',
    ca: entry.form.ca || '',
  }
}
