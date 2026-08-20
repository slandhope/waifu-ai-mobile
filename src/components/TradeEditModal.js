import { Feather } from '@expo/vector-icons'
import { useState } from 'react'
import {
  ActivityIndicator, Modal, StyleSheet, Text, TextInput,
  TouchableOpacity, View,
} from 'react-native'
import GlassSurface from './GlassSurface'
import { closeTrade, editTrade, fmtUsd } from '../lib/trading'

export default function TradeEditModal({ trade, visible, onClose, onUpdated }) {
  const [sl, setSl] = useState('')
  const [tp, setTp] = useState('')
  const [busy, setBusy] = useState('')
  const [msg, setMsg] = useState('')

  if (!trade) return null

  const resetFields = () => {
    setSl(trade.stopLoss != null ? String(trade.stopLoss) : '')
    setTp(trade.target != null ? String(trade.target) : '')
    setMsg('')
  }

  const run = async (label, fn) => {
    setBusy(label)
    setMsg('')
    try {
      const r = await fn()
      if (r?.success) {
        setMsg(r.closed ? 'Trade closed' : 'Updated ✓')
        onUpdated?.()
        if (r.closed) setTimeout(onClose, 600)
      } else {
        setMsg(r?.error || 'Failed — is server updated?')
      }
    } catch (e) {
      setMsg(e.message || 'Request failed')
    } finally {
      setBusy('')
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} onShow={resetFields}>
      <View style={styles.wrap}>
        <GlassSurface borderRadius={24} style={styles.sheet}>
          <View style={styles.head}>
            <View>
              <Text style={styles.title}>{trade.coin} · {(trade.direction || 'long').toUpperCase()}</Text>
              <Text style={styles.sub}>{trade.caller || 'Scanner'} · {trade.leverage || 1}x · Entry {fmtUsd(trade.entry)}</Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Feather name="x" size={22} color="#666" />
            </TouchableOpacity>
          </View>

          <View style={styles.fieldRow}>
            <Text style={styles.label}>Stop loss</Text>
            <TextInput
              style={styles.input}
              value={sl}
              onChangeText={setSl}
              keyboardType="decimal-pad"
              placeholder={trade.stopLoss != null ? String(trade.stopLoss) : 'SL'}
              placeholderTextColor="rgba(0,0,0,0.3)"
            />
            <TouchableOpacity
              style={styles.miniBtn}
              disabled={!!busy}
              onPress={() => run('sl', () => editTrade(trade.id, 'sl', sl))}
            >
              <Text style={styles.miniBtnText}>Save</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.fieldRow}>
            <Text style={styles.label}>Take profit</Text>
            <TextInput
              style={styles.input}
              value={tp}
              onChangeText={setTp}
              keyboardType="decimal-pad"
              placeholder={trade.target != null ? String(trade.target) : 'TP'}
              placeholderTextColor="rgba(0,0,0,0.3)"
            />
            <TouchableOpacity
              style={styles.miniBtn}
              disabled={!!busy}
              onPress={() => run('tp', () => editTrade(trade.id, 'tp', tp))}
            >
              <Text style={styles.miniBtnText}>Save</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.actionBtn}
              disabled={!!busy}
              onPress={() => run('be', () => editTrade(trade.id, 'breakeven'))}
            >
              <Text style={styles.actionText}>Breakeven SL</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionBtn}
              disabled={!!busy}
              onPress={() => run('partial', () => editTrade(trade.id, 'partial', 50))}
            >
              <Text style={styles.actionText}>Partial 50%</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.closeBtn}
            disabled={!!busy}
            onPress={() => run('close', () => closeTrade(trade.id))}
          >
            {busy === 'close' ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.closeBtnText}>Close position</Text>
            )}
          </TouchableOpacity>

          {!!msg && <Text style={styles.msg}>{msg}</Text>}
          {!!busy && busy !== 'close' && (
            <ActivityIndicator style={{ marginTop: 10 }} color="#6c5ce7" />
          )}
        </GlassSurface>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.25)', padding: 16, paddingBottom: 40 },
  sheet: { padding: 20 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  title: { fontSize: 20, fontWeight: '800', color: '#1a1a1a' },
  sub: { fontSize: 12, color: 'rgba(0,0,0,0.45)', marginTop: 4 },
  fieldRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  label: { width: 72, fontSize: 12, fontWeight: '600', color: 'rgba(0,0,0,0.5)' },
  input: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#1a1a1a',
  },
  miniBtn: { backgroundColor: 'rgba(108,92,231,0.2)', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10 },
  miniBtnText: { fontSize: 12, fontWeight: '700', color: '#6c5ce7' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 8, marginBottom: 12 },
  actionBtn: { flex: 1, backgroundColor: 'rgba(255,255,255,0.5)', paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  actionText: { fontSize: 13, fontWeight: '700', color: '#333' },
  closeBtn: { backgroundColor: '#ef4444', paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  closeBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  msg: { marginTop: 12, textAlign: 'center', fontSize: 13, fontWeight: '600', color: '#6c5ce7' },
})
