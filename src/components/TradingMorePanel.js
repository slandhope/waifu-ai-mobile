import { useState } from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import TradingToolsPanel from './TradingToolsPanel'
import WalletPanel from './WalletPanel'

const MORE_TABS = [
  { key: 'tools', label: 'Tools' },
  { key: 'wallet', label: 'Wallet' },
]

export default function TradingMorePanel() {
  const [sub, setSub] = useState('tools')

  return (
    <View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {MORE_TABS.map((t) => (
          <TouchableOpacity
            key={t.key}
            onPress={() => setSub(t.key)}
            style={[styles.chip, sub === t.key && styles.chipOn]}
          >
            <Text style={[styles.chipText, sub === t.key && styles.chipTextOn]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      {sub === 'tools' && <TradingToolsPanel />}
      {sub === 'wallet' && <WalletPanel />}
    </View>
  )
}

const styles = StyleSheet.create({
  row: { gap: 8, marginBottom: 12 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  chipOn: { backgroundColor: 'rgba(108,92,231,0.2)' },
  chipText: { fontSize: 12, fontWeight: '600', color: 'rgba(0,0,0,0.45)' },
  chipTextOn: { color: '#6c5ce7' },
})
