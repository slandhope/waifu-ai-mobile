import { Feather } from '@expo/vector-icons'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator, Alert, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View,
} from 'react-native'
import { useConnectedWallet } from '../hooks/useConnectedWallet'
import GlassSurface from './GlassSurface'
import {
  analyzeToken, executeLiveBuy, executeLiveSell, snipeBuy, snipeSell, walletMatchesToken,
} from '../lib/sniper'
import {
  addCopyWallet, addLimitOrder, addWatchlist, DEFAULT_SNIPER_SETTINGS,
  fetchSnipeState, removeCopyWallet, removeLimitOrder, removeWatchlist, saveSnipeSettings,
} from '../lib/sniperMaestro'

const TABS = [
  { key: 'snipe', label: 'Snipe', icon: 'crosshair' },
  { key: 'auto', label: 'Auto', icon: 'zap' },
  { key: 'copy', label: 'Copy', icon: 'users' },
  { key: 'limits', label: 'Limits', icon: 'clock' },
  { key: 'settings', label: 'Settings', icon: 'sliders' },
]

function fmtUsd(n) {
  if (n == null || Number.isNaN(n)) return '—'
  return '$' + Number(n).toLocaleString(undefined, { maximumFractionDigits: n < 1 ? 6 : 2 })
}

function ToggleRow({ label, hint, value, onChange }) {
  return (
    <View style={styles.toggleRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.toggleLabel}>{label}</Text>
        {!!hint && <Text style={styles.toggleHint}>{hint}</Text>}
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: '#6c5ce7' }} />
    </View>
  )
}

function NumField({ label, value, onChange, suffix }) {
  return (
    <View style={styles.numField}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.numRow}>
        <TextInput
          style={styles.numInput}
          value={String(value)}
          onChangeText={onChange}
          keyboardType="decimal-pad"
          placeholderTextColor="rgba(0,0,0,0.35)"
        />
        {!!suffix && <Text style={styles.numSuffix}>{suffix}</Text>}
      </View>
    </View>
  )
}

export default function SniperPanel() {
  const { wallet, address } = useConnectedWallet()
  const liveReady = !!address && (wallet?.live !== false)
  const [tab, setTab] = useState('snipe')
  const [ca, setCa] = useState('')
  const [usd, setUsd] = useState('50')
  const [info, setInfo] = useState(null)
  const [positions, setPositions] = useState([])
  const [settings, setSettings] = useState(DEFAULT_SNIPER_SETTINGS)
  const [watchlist, setWatchlist] = useState([])
  const [copyWallets, setCopyWallets] = useState([])
  const [limitOrders, setLimitOrders] = useState([])
  const [alerts, setAlerts] = useState([])
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [note, setNote] = useState('')
  const [watchCa, setWatchCa] = useState('')
  const [copyAddr, setCopyAddr] = useState('')
  const [limitPrice, setLimitPrice] = useState('')
  const pollRef = useRef(null)

  const load = useCallback(async () => {
    const r = await fetchSnipeState()
    setPositions(r?.positions || [])
    if (r?.settings) setSettings({ ...DEFAULT_SNIPER_SETTINGS, ...r.settings })
    setWatchlist(r?.watchlist || [])
    setCopyWallets(r?.copyWallets || [])
    setLimitOrders(r?.limitOrders || [])
    setAlerts(r?.alerts || [])
    if (r?.automation?.alerts?.length) {
      setNote(r.automation.alerts.map(a => a.text).slice(0, 2).join(' · '))
    }
  }, [])

  useEffect(() => {
    load()
    pollRef.current = setInterval(load, 20000)
    return () => clearInterval(pollRef.current)
  }, [load])

  const canLive = liveReady && info?.found && walletMatchesToken(wallet, info.chain)
  const presets = settings.presets || DEFAULT_SNIPER_SETTINGS.presets

  async function persistSettings(next) {
    setSettings(next)
    await saveSnipeSettings(next)
  }

  async function onAnalyze() {
    setErr('')
    setNote('')
    setBusy(true)
    const r = await analyzeToken(ca.trim())
    setBusy(false)
    if (!r?.found) { setErr('Token not found on DexScreener'); setInfo(null); return }
    setInfo(r)
    if (r.honeypot) setErr('Honeypot detected — buy blocked')
    if (liveReady && !walletMatchesToken(wallet, r.chain)) {
      setNote(`Wallet chain mismatch — token is on ${r.chain}`)
    }
  }

  async function onBuy(amountUsd) {
    if (info?.honeypot) { setErr('Honeypot — buy blocked'); return }
    setBusy(true)
    setErr('')
    setNote('')
    const amount = amountUsd ?? (parseFloat(usd) || 50)
    const r = canLive
      ? await executeLiveBuy(ca.trim(), amount, wallet, settings.slippage)
      : await snipeBuy(ca.trim(), amount)
    setBusy(false)
    if (!r?.success && !r?.pending) { setErr(r?.error || 'Buy failed'); return }
    if (r.note) setNote(r.note)
    if (r.txHash) setNote(`Tx ${r.txHash.slice(0, 10)}…`)
    if (!r.pending) { setInfo(null); setCa('') }
    await load()
  }

  async function onSell(p) {
    setBusy(true)
    setErr('')
    const r = p.mode === 'live' && liveReady
      ? await executeLiveSell(p, wallet)
      : await snipeSell(p.id)
    setBusy(false)
    if (!r?.success && !r?.pending) setErr(r?.error || 'Sell failed')
    else if (r?.note) setNote(r.note)
    await load()
  }

  return (
    <View>
      <View style={styles.titleRow}>
        <Text style={styles.title}>Maestro Sniper</Text>
        <View style={[styles.modeBadge, liveReady ? styles.modeLive : styles.modePaper]}>
          <Text style={[styles.modeText, liveReady && styles.modeTextLive]}>
            {liveReady ? 'LIVE' : 'PAPER'}
          </Text>
        </View>
      </View>
      <Text style={styles.sub}>
        TP/SL · auto-snipe · copy trade · limits · honeypot check · {liveReady ? 'wallet connected' : 'connect wallet on Overview'}
      </Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabRow}>
        {TABS.map((t) => (
          <TouchableOpacity
            key={t.key}
            onPress={() => setTab(t.key)}
            style={[styles.tabChip, tab === t.key && styles.tabChipOn]}
          >
            <Feather name={t.icon} size={13} color={tab === t.key ? '#6c5ce7' : 'rgba(0,0,0,0.4)'} />
            <Text style={[styles.tabChipText, tab === t.key && styles.tabChipTextOn]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {!!alerts.length && tab === 'snipe' && (
        <GlassSurface borderRadius={12} style={styles.alertBox}>
          {alerts.slice(0, 3).map((a, i) => (
            <Text key={i} style={styles.alertText}>• {a.text}</Text>
          ))}
        </GlassSurface>
      )}

      {tab === 'snipe' && (
        <>
          <GlassSurface borderRadius={14} style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder="Contract address"
              placeholderTextColor="rgba(0,0,0,0.35)"
              value={ca}
              onChangeText={setCa}
              autoCapitalize="none"
            />
            <View style={styles.presetRow}>
              {presets.map((p) => (
                <TouchableOpacity key={p} style={styles.presetBtn} onPress={() => { setUsd(String(p)); if (info && ca) onBuy(p) }} disabled={busy}>
                  <Text style={styles.presetText}>${p}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={styles.input}
              placeholder="Custom size USD"
              placeholderTextColor="rgba(0,0,0,0.35)"
              value={usd}
              onChangeText={setUsd}
              keyboardType="decimal-pad"
            />
            <View style={styles.row}>
              <TouchableOpacity style={[styles.btn, styles.btnSec]} onPress={onAnalyze} disabled={busy}>
                <Text style={styles.btnSecText}>Analyze</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btn} onPress={() => onBuy()} disabled={busy || !ca.trim() || info?.honeypot}>
                {busy ? <ActivityIndicator color="#fff" /> : (
                  <Text style={styles.btnText}>{canLive ? 'Live snipe' : 'Paper snipe'}</Text>
                )}
              </TouchableOpacity>
            </View>
          </GlassSurface>

          {info?.found && (
            <GlassSurface borderRadius={14} style={styles.info}>
              <Text style={styles.infoSym}>{info.symbol} · {info.chain}</Text>
              <Text style={styles.infoPrice}>{fmtUsd(info.priceUsd)}</Text>
              <Text style={styles.infoMeta}>
                Liq {fmtUsd(info.liquidity)} · TP +{settings.tpPct}% · SL -{settings.slPct}%
              </Text>
              {(info.flags || []).map((f, i) => (
                <Text key={i} style={styles.flag}>⚠️ {f}</Text>
              ))}
            </GlassSurface>
          )}

          <Text style={styles.listTitle}>Positions</Text>
          {positions.length ? positions.map((p) => {
            const open = p.status === 'open'
            const up = (p.pnlPct ?? 0) >= 0
            return (
              <GlassSurface key={p.id} borderRadius={14} style={styles.pos}>
                <View style={styles.posHead}>
                  <Text style={styles.posSym}>{p.symbol || '?'} {p.mode === 'live' ? '· LIVE' : ''}</Text>
                  <Text style={[styles.posPnl, { color: up ? '#22c55e' : '#ef4444' }]}>
                    {open ? `${up ? '+' : ''}${(p.pnlPct ?? 0).toFixed(1)}%` : p.closeReason || p.status}
                  </Text>
                </View>
                <Text style={styles.posMeta}>
                  {fmtUsd(p.amountUsd)} @ {fmtUsd(p.entryPrice)}
                  {p.autoSnipe ? ' · auto' : ''}{p.copyFrom ? ' · copy' : ''}
                </Text>
                {open && (
                  <TouchableOpacity style={styles.sellBtn} onPress={() => onSell(p)} disabled={busy}>
                    <Text style={styles.sellBtnText}>{p.mode === 'live' && liveReady ? 'Live sell' : 'Sell'}</Text>
                  </TouchableOpacity>
                )}
              </GlassSurface>
            )
          }) : (
            <Text style={styles.empty}>No snipes yet</Text>
          )}
        </>
      )}

      {tab === 'auto' && (
        <GlassSurface borderRadius={14} style={styles.section}>
          <ToggleRow
            label="Auto-snipe watchlist"
            hint="Buys when CA has enough liquidity & passes anti-rug"
            value={settings.autoSnipeEnabled}
            onChange={(v) => persistSettings({ ...settings, autoSnipeEnabled: v })}
          />
          <Text style={styles.sectionTitle}>Watchlist (paste CA before launch)</Text>
          <TextInput style={styles.input} placeholder="Token CA" value={watchCa} onChangeText={setWatchCa} autoCapitalize="none" />
          <TouchableOpacity
            style={styles.btn}
            onPress={async () => {
              if (!watchCa.trim()) return
              await addWatchlist(watchCa.trim(), parseFloat(usd) || 50)
              setWatchCa('')
              load()
            }}
          >
            <Text style={styles.btnText}>Add to auto-snipe</Text>
          </TouchableOpacity>
          {watchlist.map((w) => (
            <View key={w.id} style={styles.listItem}>
              <View style={{ flex: 1 }}>
                <Text style={styles.listMain} numberOfLines={1}>{w.ca}</Text>
                <Text style={styles.listSub}>${w.usd} · {w.sniped ? 'sniped ✓' : 'waiting…'}</Text>
              </View>
              <TouchableOpacity onPress={() => removeWatchlist(w.id).then(load)}>
                <Feather name="x" size={18} color="rgba(0,0,0,0.35)" />
              </TouchableOpacity>
            </View>
          ))}
          {!watchlist.length && <Text style={styles.empty}>Add CAs to snipe when they go live</Text>}
        </GlassSurface>
      )}

      {tab === 'copy' && (
        <GlassSurface borderRadius={14} style={styles.section}>
          <ToggleRow
            label="Auto copy-snipe"
            hint="Mirror new buys from tracked wallets (paper/live)"
            value={settings.copySnipeEnabled}
            onChange={(v) => persistSettings({ ...settings, copySnipeEnabled: v })}
          />
          <NumField label="Copy size USD" value={settings.copySnipeUsd} onChange={(v) => persistSettings({ ...settings, copySnipeUsd: parseFloat(v) || 50 })} suffix="USD" />
          <TextInput style={styles.input} placeholder="Whale wallet address" value={copyAddr} onChangeText={setCopyAddr} autoCapitalize="none" />
          <TouchableOpacity
            style={styles.btn}
            onPress={async () => {
              if (!copyAddr.trim()) return
              const chain = copyAddr.startsWith('0x') ? 'bsc' : 'sol'
              await addCopyWallet(copyAddr.trim(), chain)
              setCopyAddr('')
              load()
            }}
          >
            <Text style={styles.btnText}>Track wallet</Text>
          </TouchableOpacity>
          {copyWallets.map((w) => (
            <View key={w.id} style={styles.listItem}>
              <View style={{ flex: 1 }}>
                <Text style={styles.listMain}>{w.label} · {w.chain}</Text>
                <Text style={styles.listSub} numberOfLines={1}>{w.address}</Text>
              </View>
              <TouchableOpacity onPress={() => removeCopyWallet(w.id).then(load)}>
                <Feather name="x" size={18} color="rgba(0,0,0,0.35)" />
              </TouchableOpacity>
            </View>
          ))}
          {!copyWallets.length && <Text style={styles.empty}>Track wallets to copy their new token buys</Text>}
        </GlassSurface>
      )}

      {tab === 'limits' && (
        <GlassSurface borderRadius={14} style={styles.section}>
          <Text style={styles.sectionTitle}>Limit orders</Text>
          <TextInput style={styles.input} placeholder="CA" value={ca} onChangeText={setCa} autoCapitalize="none" />
          <TextInput style={styles.input} placeholder="Target price USD" value={limitPrice} onChangeText={setLimitPrice} keyboardType="decimal-pad" />
          <View style={styles.row}>
            <TouchableOpacity
              style={[styles.btn, styles.btnSec]}
              onPress={async () => {
                if (!ca.trim()) { Alert.alert('Missing CA', 'Enter a token contract address'); return }
                const price = parseFloat(limitPrice)
                if (!price || price <= 0) { Alert.alert('Invalid price', 'Enter a target price'); return }
                await addLimitOrder({ ca: ca.trim(), targetPrice: price, usd: parseFloat(usd) || 50, side: 'buy' })
                load()
              }}
            >
              <Text style={styles.btnSecText}>Limit buy</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.btn}
              onPress={async () => {
                if (!ca.trim()) { Alert.alert('Missing CA', 'Enter a token contract address'); return }
                const price = parseFloat(limitPrice)
                if (!price || price <= 0) { Alert.alert('Invalid price', 'Enter a target price'); return }
                await addLimitOrder({ ca: ca.trim(), targetPrice: price, side: 'sell' })
                load()
              }}
            >
              <Text style={styles.btnText}>Limit sell</Text>
            </TouchableOpacity>
          </View>
          {limitOrders.map((o) => (
            <View key={o.id} style={styles.listItem}>
              <View style={{ flex: 1 }}>
                <Text style={styles.listMain}>{o.side.toUpperCase()} @ {fmtUsd(o.targetPrice)}</Text>
                <Text style={styles.listSub} numberOfLines={1}>{o.ca}</Text>
              </View>
              <TouchableOpacity onPress={() => removeLimitOrder(o.id).then(load)}>
                <Feather name="x" size={18} color="rgba(0,0,0,0.35)" />
              </TouchableOpacity>
            </View>
          ))}
          {!limitOrders.length && <Text style={styles.empty}>No pending limit orders</Text>}
        </GlassSurface>
      )}

      {tab === 'settings' && (
        <GlassSurface borderRadius={14} style={styles.section}>
          <NumField label="Take profit" value={settings.tpPct} onChange={(v) => persistSettings({ ...settings, tpPct: parseFloat(v) || 100 })} suffix="%" />
          <NumField label="Stop loss" value={settings.slPct} onChange={(v) => persistSettings({ ...settings, slPct: parseFloat(v) || 30 })} suffix="%" />
          <NumField label="Slippage" value={settings.slippage} onChange={(v) => persistSettings({ ...settings, slippage: parseFloat(v) || 15 })} suffix="%" />
          <NumField label="Min liquidity" value={settings.minLiquidityUsd} onChange={(v) => persistSettings({ ...settings, minLiquidityUsd: parseFloat(v) || 15000 })} suffix="USD" />
          <NumField label="Max token age" value={settings.maxTokenAgeHours} onChange={(v) => persistSettings({ ...settings, maxTokenAgeHours: parseFloat(v) || 48 })} suffix="hrs" />
          <NumField label="Priority fee" value={settings.priorityFeeGwei} onChange={(v) => persistSettings({ ...settings, priorityFeeGwei: parseFloat(v) || 3 })} suffix="gwei" />
          <ToggleRow label="Anti-rug / honeypot check" value={settings.antiRugEnabled} onChange={(v) => persistSettings({ ...settings, antiRugEnabled: v })} />
          <Text style={styles.settingsNote}>
            Automation runs every 20s — TP/SL, watchlist, limits, copy trades. Live sells need dev build + wallet.
          </Text>
        </GlassSurface>
      )}

      {!!err && <Text style={styles.err}>{err}</Text>}
      {!!note && !err && <Text style={styles.note}>{note}</Text>}
    </View>
  )
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  title: { fontSize: 16, fontWeight: '800', color: '#1a1a1a' },
  modeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  modePaper: { backgroundColor: 'rgba(251,191,36,0.2)' },
  modeLive: { backgroundColor: 'rgba(34,197,94,0.18)' },
  modeText: { fontSize: 10, fontWeight: '800', color: '#b45309' },
  modeTextLive: { color: '#16a34a' },
  sub: { fontSize: 12, color: 'rgba(0,0,0,0.45)', marginBottom: 10, lineHeight: 18 },
  tabRow: { gap: 8, marginBottom: 12 },
  tabChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  tabChipOn: { backgroundColor: 'rgba(108,92,231,0.18)' },
  tabChipText: { fontSize: 12, fontWeight: '600', color: 'rgba(0,0,0,0.45)' },
  tabChipTextOn: { color: '#6c5ce7' },
  alertBox: { padding: 12, marginBottom: 10 },
  alertText: { fontSize: 11, color: '#6c5ce7', marginBottom: 4 },
  form: { padding: 14, marginBottom: 10 },
  section: { padding: 14, marginBottom: 10 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.55)', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 12, fontSize: 15, color: '#1a1a1a', marginBottom: 10,
  },
  presetRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  presetBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: 'rgba(108,92,231,0.12)', alignItems: 'center' },
  presetText: { fontWeight: '800', color: '#6c5ce7', fontSize: 13 },
  row: { flexDirection: 'row', gap: 8 },
  btn: { flex: 1, backgroundColor: '#6c5ce7', paddingVertical: 12, borderRadius: 12, alignItems: 'center', marginBottom: 8 },
  btnText: { color: '#fff', fontWeight: '800' },
  btnSec: { backgroundColor: 'rgba(108,92,231,0.15)' },
  btnSecText: { color: '#6c5ce7', fontWeight: '700' },
  info: { padding: 14, marginBottom: 12 },
  infoSym: { fontSize: 16, fontWeight: '800', color: '#1a1a1a' },
  infoPrice: { fontSize: 22, fontWeight: '800', marginTop: 4 },
  infoMeta: { fontSize: 12, color: 'rgba(0,0,0,0.45)', marginTop: 4 },
  flag: { fontSize: 11, color: '#dc2626', marginTop: 4 },
  listTitle: { fontSize: 14, fontWeight: '700', marginBottom: 8, color: '#1a1a1a' },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#1a1a1a', marginBottom: 8, marginTop: 4 },
  pos: { padding: 14, marginBottom: 8 },
  posHead: { flexDirection: 'row', justifyContent: 'space-between' },
  posSym: { fontSize: 15, fontWeight: '800' },
  posPnl: { fontSize: 14, fontWeight: '700' },
  posMeta: { fontSize: 11, color: 'rgba(0,0,0,0.45)', marginTop: 4 },
  sellBtn: { marginTop: 10, alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 8, backgroundColor: 'rgba(239,68,68,0.12)', borderRadius: 8 },
  sellBtnText: { color: '#ef4444', fontWeight: '700', fontSize: 12 },
  listItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.06)' },
  listMain: { fontSize: 13, fontWeight: '700', color: '#1a1a1a' },
  listSub: { fontSize: 11, color: 'rgba(0,0,0,0.45)', marginTop: 2 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  toggleLabel: { fontSize: 13, fontWeight: '700', color: '#1a1a1a' },
  toggleHint: { fontSize: 11, color: 'rgba(0,0,0,0.45)', marginTop: 2 },
  numField: { marginBottom: 12 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: '#1a1a1a', marginBottom: 6 },
  numRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  numInput: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.55)', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: '#1a1a1a',
  },
  numSuffix: { fontSize: 12, color: 'rgba(0,0,0,0.45)', fontWeight: '600' },
  settingsNote: { fontSize: 11, color: 'rgba(0,0,0,0.45)', lineHeight: 16, marginTop: 8 },
  empty: { fontSize: 13, color: 'rgba(0,0,0,0.45)', textAlign: 'center', paddingVertical: 12 },
  err: { fontSize: 12, color: '#ef4444', textAlign: 'center', marginTop: 8 },
  note: { fontSize: 11, color: 'rgba(0,0,0,0.45)', textAlign: 'center', marginTop: 8, lineHeight: 16 },
})
