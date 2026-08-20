import { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import GlassSurface from './GlassSurface'
import { BUCKET_LABELS, fetchAllocations, fetchBucketUsage, saveAllocations } from '../lib/allocations'

const KEYS = ['daily', 'main', 'scalp', 'manual', 'other']

export default function AllocationEditor() {
  const [alloc, setAlloc] = useState(null)
  const [usage, setUsage] = useState(null)
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)

  const load = useCallback(async () => {
    const [a, u] = await Promise.all([fetchAllocations(), fetchBucketUsage()])
    if (a && a.auth !== false) setAlloc(a)
    if (u) setUsage(u)
  }, [])

  useEffect(() => { load() }, [load])

  if (!alloc) {
    return (
      <GlassSurface borderRadius={14} style={{ padding: 16, marginBottom: 12 }}>
        <Text style={styles.title}>💰 Capital allocation</Text>
        <Text style={styles.sub}>Sign in to sync allocation buckets with PC</Text>
      </GlassSurface>
    )
  }

  const total = KEYS.reduce((s, k) => s + (Number(alloc[k]) || 0), 0)
  const reserve = Math.max(0, 100 - total)

  async function onSave() {
    setBusy(true)
    await saveAllocations(Object.fromEntries(KEYS.map((k) => [k, Number(alloc[k]) || 0])))
    setBusy(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    await load()
  }

  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={styles.title}>💰 Capital allocation</Text>
      <Text style={styles.sub}>Same buckets as PC — caps paper trade size per system</Text>
      <GlassSurface borderRadius={14} style={styles.box}>
        {KEYS.map((k) => {
          const b = usage?.buckets?.[k]
          return (
            <View key={k} style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>{BUCKET_LABELS[k]}</Text>
                {!!b && (
                  <Text style={styles.used}>
                    ${Math.round(b.used || 0).toLocaleString()} / ${Math.round(b.cap || 0).toLocaleString()} used
                  </Text>
                )}
              </View>
              <TextInput
                style={styles.pctInput}
                value={String(alloc[k] ?? 0)}
                onChangeText={(v) => setAlloc({ ...alloc, [k]: v.replace(/[^0-9]/g, '') })}
                keyboardType="number-pad"
              />
              <Text style={styles.pct}>%</Text>
            </View>
          )
        })}
        <Text style={styles.reserve}>Reserve (unallocated): {reserve}%</Text>
        <TouchableOpacity style={styles.saveBtn} onPress={onSave} disabled={busy || total > 100}>
          {busy ? <ActivityIndicator color="#fff" /> : (
            <Text style={styles.saveText}>{saved ? 'Saved ✓' : 'Save allocations'}</Text>
          )}
        </TouchableOpacity>
        {total > 100 && <Text style={styles.warn}>Total cannot exceed 100%</Text>}
      </GlassSurface>
    </View>
  )
}

const styles = StyleSheet.create({
  title: { fontSize: 16, fontWeight: '700', color: '#1a1a1a', marginBottom: 4 },
  sub: { fontSize: 12, color: 'rgba(0,0,0,0.45)', marginBottom: 8, lineHeight: 18 },
  box: { padding: 14 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  label: { fontSize: 13, fontWeight: '600', color: '#1a1a1a' },
  used: { fontSize: 10, color: 'rgba(0,0,0,0.4)', marginTop: 2 },
  pctInput: { width: 44, textAlign: 'center', backgroundColor: 'rgba(255,255,255,0.55)', borderRadius: 8, paddingVertical: 6, fontWeight: '700' },
  pct: { marginLeft: 4, fontSize: 13, color: 'rgba(0,0,0,0.45)' },
  reserve: { fontSize: 12, color: 'rgba(0,0,0,0.45)', marginTop: 4, marginBottom: 10 },
  saveBtn: { backgroundColor: '#6c5ce7', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  saveText: { color: '#fff', fontWeight: '800' },
  warn: { marginTop: 8, fontSize: 12, color: '#ef4444', textAlign: 'center' },
})
