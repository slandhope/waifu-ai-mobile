import Constants from 'expo-constants'

/** True when running inside the stock Expo Go app (no custom native modules). */
export function isExpoGo() {
  return Constants.appOwnership === 'expo'
}
