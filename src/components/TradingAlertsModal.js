import { Feather } from '@expo/vector-icons'
import { useCallback, useEffect, useState } from 'react'
import {
  Modal, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View,
} from 'react-native'
import GlassSurface from './GlassSurface'
import {
  clearAlertHistory, getAlertHistory, getAlertSettings, saveAlertSettings,
} from '../lib/tradingAlerts'

function ToggleRow({ label, sub, value, onChange }) {
  return (
    <View style={styles.toggleRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.toggleLabel}>{label}</Text>
        {!!sub && <Text style={styles.toggleSub}>{sub}</Text>}
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: '#6c5ce7' }} />
    </View>
  )
}

export default function TradingAlertsModal({ visible, onClose }) {
  const [settings, setSettings] = useState({ enabled: true, callerSignals: true, tradeEvents: true })
  const [history, setHistory] = useState([])

  const load = useCallback(async () => {
    setSettings(await getAlertSettings())
    setHistory(await getAlertHistory())
  }, [])

  useEffect(() => {
    if (visible) load()
  }, [visible, load])

  const update = async (patch) => {
    const next = { ...settings, ...patch }
    setSettings(next)
    await saveAlertSettings(next)
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.wrap}>
        <GlassSurface borderRadius={24} style={styles.sheet}>
          <View style={styles.head}>
            <View style={styles.headLeft}>
              <Feather name="bell" size={20} color="#6c5ce7" />
              <Text style={styles.title}>Trading alerts</Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Feather name="x" size={22} color="#666" />
            </TouchableOpacity>
          </View>

          <Text style={styles.intro}>
            Same alerts as PC — caller Telegram signals, paper trades opening/closing. Polls every 25s when signed in.
          </Text>

          <ToggleRow
            label="All alerts"
            sub="Master switch"
            value={settings.enabled}
            onChange={(v) => update({ enabled: v })}
          />
          <ToggleRow
            label="Caller signals"
            sub="When tracked Telegram callers post"
            value={settings.callerSignals}
            onChange={(v) => update({ callerSignals: v })}
          />
          <ToggleRow
            label="Trade events"
            sub="Paper positions open or close"
            value={settings.tradeEvents}
            onChange={(v) => update({ tradeEvents: v })}
          />

          <View style={styles.historyHead}>
            <Text style={styles.historyTitle}>Recent alerts</Text>
            {!!history.length && (
              <TouchableOpacity onPress={async () => { await clearAlertHistory(); setHistory([]) }}>
                <Text style={styles.clearBtn}>Clear</Text>
              </TouchableOpacity>
            )}
          </View>

          <ScrollView style={{ maxHeight: 220 }} showsVerticalScrollIndicator={false}>
            {history.length ? history.map((h) => (
              <View key={h.id} style={styles.historyItem}>
                <Text style={styles.historyItemTitle}>{h.title}</Text>
                <Text style={styles.historyItemBody} numberOfLines={2}>{h.body}</Text>
                <Text style={styles.historyItemTime}>
                  {new Date(h.time).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            )) : (
              <Text style={styles.empty}>No alerts yet — they'll show here when callers signal or trades move</Text>
            )}
          </ScrollView>
        </GlassSurface>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.25)', padding: 16, paddingBottom: 40 },
  sheet: { padding: 20, maxHeight: '85%' },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  headLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 20, fontWeight: '800', color: '#1a1a1a' },
  intro: { fontSize: 13, color: 'rgba(0,0,0,0.5)', lineHeight: 18, marginBottom: 14 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(0,0,0,0.08)' },
  toggleLabel: { fontSize: 15, fontWeight: '600', color: '#1a1a1a' },
  toggleSub: { fontSize: 11, color: 'rgba(0,0,0,0.45)', marginTop: 2 },
  historyHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, marginBottom: 8 },
  historyTitle: { fontSize: 14, fontWeight: '700', color: '#1a1a1a' },
  clearBtn: { fontSize: 13, fontWeight: '600', color: '#6c5ce7' },
  historyItem: { paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(0,0,0,0.06)' },
  historyItemTitle: { fontSize: 14, fontWeight: '700', color: '#1a1a1a' },
  historyItemBody: { fontSize: 12, color: 'rgba(0,0,0,0.55)', marginTop: 2 },
  historyItemTime: { fontSize: 10, color: 'rgba(0,0,0,0.35)', marginTop: 4 },
  empty: { fontSize: 13, color: 'rgba(0,0,0,0.45)', textAlign: 'center', paddingVertical: 20, lineHeight: 20 },
})
