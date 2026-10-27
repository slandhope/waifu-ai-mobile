import Constants from 'expo-constants'

/** True when running inside the stock Expo Go app (no custom native modules). */
export function isExpoGo() {
  try {
    return Constants.appOwnership === 'expo' || Constants.executionEnvironment === 'storeClient'
  } catch (_e) {
    return false
  }
}
