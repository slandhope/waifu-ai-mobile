import AsyncStorage from '@react-native-async-storage/async-storage'
import { API_URL } from '../constants'

// Every API call sends the stored Google ID token as a Bearer token.
// The AWS backend verifies it and identifies the user by email — same
// account as desktop, so Asuka + data sync across devices.
export async function apiCall(endpoint, options = {}) {
  const token = await AsyncStorage.getItem('auth-token')
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  }
  if (token) headers['Authorization'] = 'Bearer ' + token

  const res = await fetch(API_URL + endpoint, { ...options, headers })

  if (res.status === 401) {
    // token expired/invalid — clear it so the app re-prompts login
    await AsyncStorage.removeItem('auth-token')
  }
  return res
}

// Save the Google ID token as our auth token. Called right after
// native Google Sign-In succeeds. No server round-trip needed —
// the backend verifies the Google token itself on each request.
export async function saveAuthToken(idToken) {
  if (!idToken) return false
  await AsyncStorage.setItem('auth-token', idToken)
  return true
}

export async function clearAuth() {
  await AsyncStorage.removeItem('auth-token')
}

// Pull the user's synced state (wellness + name) from the backend.
export async function fetchMe() {
  try {
    const res = await apiCall('/api/sync/me')
    if (!res.ok) return null
    return await res.json()
  } catch (e) { return null }
}
