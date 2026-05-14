import AsyncStorage from '@react-native-async-storage/async-storage'
import { API_URL } from '../constants'

export async function apiCall(endpoint, options = {}) {
  const token = await AsyncStorage.getItem('auth-token')
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  }
  console.group('apiCall token:', token ? 'YES' : 'NO', endpoint)
  if(token) {
    headers['Authorization'] = 'Bearer ' + token
  }

  const res = await fetch(API_URL + endpoint, {
    ...options,
    headers,
  })

  if(res.status === 401 || res.status === 403) {
    console.log('Auth failed, clearing token')
    await AsyncStorage.removeItem('auth-token')
  }

  return res
}

export async function login(userId, name, loginType) {
  try {
    const res = await fetch(API_URL + '/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, name, loginType })
    })
    const json = await res.json()
    if(json.token) {
      await AsyncStorage.setItem('auth-token', json.token)
      console.log('JWT token saved')
      return true
    }
    return false
  } catch(e) {
    console.log('Login failed:', e.message)
    return false
  }
}
