import 'react-native-get-random-values'
try {
  require('@walletconnect/react-native-compat')
} catch (_e) {
  // WalletConnect native compat — requires dev build
}
import { registerRootComponent } from 'expo'
import App from './App'

registerRootComponent(App)
