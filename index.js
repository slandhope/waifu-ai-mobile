import 'react-native-get-random-values'
import Constants from 'expo-constants'
import { registerRootComponent } from 'expo'
import { enableScreens } from 'react-native-screens'
import App from './App'

try {
  require('@walletconnect/react-native-compat')
} catch (_e) {
  // WalletConnect native compat — requires dev build
}

try {
  const isGo =
    Constants.appOwnership === 'expo' || Constants.executionEnvironment === 'storeClient'
  if (isGo) enableScreens(false)
} catch (_e) {}

registerRootComponent(App)
