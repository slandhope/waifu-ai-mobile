import { useState } from 'react'
import {
  ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native'
import GlassSurface from './GlassSurface'
import { runLiqGuard, runPositionDoctor, runWhatIf } from '../lib/tradingTools'

export default function TradingToolsPanel() {
  const [coin, setCoin] = useState('BTC')
  const [direction, setDirection] = useState('long')
  const [entry, setEntry] = useState('')
  const [leverage, setLeverage] = useState('5')
  const [sizeUsd, setSizeUsd] = useState('500')
  const [buyPrice, setBuyPrice] = useState('')
  const [sellPrice, setSellPrice] = useState('')
  const [amountUsd, setAmountUsd] = useState('100')
  const [result, setResult] = useState(null)
  const [busy, setBusy] = useState(false)

  async function onDoctor() {
    setBusy(true)
    setResult(await runPositionDoctor({
      coin, direction, entry: parseFloat(entry), leverage: parseFloat(leverage), sizeUsd: parseFloat(sizeUsd),
    }))
    setBusy(false)
  }

  async function onWhatIf() {
    setBusy(true)
    setResult(await runWhatIf({
      coin, buyPrice: buyPrice || undefined, sellPrice: sellPrice || undefined,
      amountUsd: parseFloat(amountUsd), leverage: parseFloat(leverage),
    }))
    setBusy(false)
  }

  async function onLiqGuard() {
    setBusy(true)
    setResult(await runLiqGuard({ direction, entry: parseFloat(entry), leverage: parseFloat(leverage) }))
    setBusy(false)
  }

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>🩺 Trading tools</Text>
      <Text style={styles.sub}>Position doctor, what-if sim, liq guard — same as PC dashboard tools</Text>

      <GlassSurface borderRadius={14} style={styles.box}>
        <Text style={styles.section}>Position doctor</Text>
        <TextInput style={styles.input} placeholder="Coin (BTC)" value={coin} onChangeText={setCoin} autoCapitalize="characters" placeholderTextColor="rgba(0,0,0,0.35)" />
        <View style={styles.chipRow}>
          {['long', 'short'].map((d) => (
            <TouchableOpacity key={d} style={[styles.chip, direction === d && styles.chipOn]} onPress={() => setDirection(d)}>
              <Text style={[styles.chipText, direction === d && styles.chipTextOn]}>{d.toUpperCase()}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TextInput style={styles.input} placeholder="Entry price" value={entry} onChangeText={setEntry} keyboardType="decimal-pad" placeholderTextColor="rgba(0,0,0,0.35)" />
        <TextInput style={styles.input} placeholder="Leverage" value={leverage} onChangeText={setLeverage} keyboardType="decimal-pad" placeholderTextColor="rgba(0,0,0,0.35)" />
        <TextInput style={styles.input} placeholder="Size USD" value={sizeUsd} onChangeText={setSizeUsd} keyboardType="decimal-pad" placeholderTextColor="rgba(0,0,0,0.35)" />
        <TouchableOpacity style={styles.btn} onPress={onDoctor} disabled={busy}>
          <Text style={styles.btnText}>Diagnose position</Text>
        </TouchableOpacity>
      </GlassSurface>

      <GlassSurface borderRadius={14} style={styles.box}>
        <Text style={styles.section}>What-if simulator</Text>
        <TextInput style={styles.input} placeholder="Buy at (blank = live)" value={buyPrice} onChangeText={setBuyPrice} keyboardType="decimal-pad" placeholderTextColor="rgba(0,0,0,0.35)" />
        <TextInput style={styles.input} placeholder="Sell at (blank = live)" value={sellPrice} onChangeText={setSellPrice} keyboardType="decimal-pad" placeholderTextColor="rgba(0,0,0,0.35)" />
        <TextInput style={styles.input} placeholder="Amount USD" value={amountUsd} onChangeText={setAmountUsd} keyboardType="decimal-pad" placeholderTextColor="rgba(0,0,0,0.35)" />
        <TouchableOpacity style={styles.btn} onPress={onWhatIf} disabled={busy}>
          <Text style={styles.btnText}>Run what-if</Text>
        </TouchableOpacity>
      </GlassSurface>

      <TouchableOpacity style={[styles.btn, styles.btnSec]} onPress={onLiqGuard} disabled={busy}>
        <Text style={styles.btnSecText}>Check liquidation distance</Text>
      </TouchableOpacity>

      {busy && <ActivityIndicator style={{ marginTop: 16 }} color="#6c5ce7" />}

      {!!result && (
        <GlassSurface borderRadius={14} style={[styles.box, { marginTop: 12 }]}>
          {result.verdict && <Text style={styles.out}>{result.verdict}</Text>}
          {result.pnl != null && (
            <Text style={styles.out}>
              P&L ${result.pnl} ({result.pnlPct}%) · {result.liquidated ? '⚠️ LIQUIDATED' : 'OK'}
            </Text>
          )}
          {result.warning && <Text style={styles.warn}>{result.warning}</Text>}
          {result.error && <Text style={styles.warn}>{result.error}</Text>}
        </GlassSurface>
      )}

      <GlassSurface borderRadius={14} style={[styles.box, { marginTop: 12, marginBottom: 20 }]}>
        <Text style={styles.section}>Spot / Binance live</Text>
        <Text style={styles.spotNote}>
          Live spot buy/sell with your Binance keys stays on PC (keys never leave desktop). Paper sniper + paper trades work here on mobile.
        </Text>
      </GlassSurface>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  title: { fontSize: 16, fontWeight: '700', color: '#1a1a1a', marginBottom: 4 },
  sub: { fontSize: 12, color: 'rgba(0,0,0,0.45)', marginBottom: 12, lineHeight: 18 },
  box: { padding: 14, marginBottom: 10 },
  section: { fontSize: 14, fontWeight: '700', marginBottom: 10, color: '#1a1a1a' },
  input: { backgroundColor: 'rgba(255,255,255,0.55)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, fontSize: 15, color: '#1a1a1a', marginBottom: 10 },
  chipRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.45)' },
  chipOn: { backgroundColor: 'rgba(108,92,231,0.2)' },
  chipText: { fontSize: 12, fontWeight: '600', color: 'rgba(0,0,0,0.45)' },
  chipTextOn: { color: '#6c5ce7' },
  btn: { backgroundColor: '#6c5ce7', paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '800' },
  btnSec: { marginBottom: 8 },
  btnSecText: { color: '#6c5ce7', fontWeight: '700', textAlign: 'center' },
  out: { fontSize: 14, color: '#1a1a1a', lineHeight: 22 },
  warn: { fontSize: 13, color: '#ef4444', marginTop: 8, lineHeight: 20 },
  spotNote: { fontSize: 13, color: 'rgba(0,0,0,0.5)', lineHeight: 20 },
})
