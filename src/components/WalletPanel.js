import { Feather } from '@expo/vector-icons'
import { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native'
import GlassSurface from './GlassSurface'
import {
  addTrackedWallet, detectChain, fetchWalletPortfolio, getTrackedWallets, openWalletApp, removeTrackedWallet,
} from '../lib/wallet'

function WalletCard({ wallet, onRemove }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [unavailable, setUnavailable] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const r = await fetchWalletPortfolio(wallet.chain, wallet.address)
    setLoading(false)
    if (r?.unavailable) { setUnavailable(true); return }
    if (r) setData(r)
  }, [wallet.chain, wallet.address])

  useEffect(() => { load() }, [load])

  const short = `${wallet.address.slice(0, 6)}…${wallet.address.slice(-4)}`

  return (
    <GlassSurface borderRadius={14} style={styles.card}>
      <View style={styles.cardHead}>
        <View>
          <Text style={styles.cardLabel}>{wallet.label}</Text>
          <Text style={styles.cardAddr}>{short} · {wallet.chain.toUpperCase()}</Text>
        </View>
        <TouchableOpacity onPress={() => onRemove(wallet.id)}>
          <Feather name="trash-2" size={16} color="rgba(0,0,0,0.35)" />
        </TouchableOpacity>
      </View>
      {loading ? (
        <ActivityIndicator style={{ marginTop: 8 }} color="#6c5ce7" />
      ) : unavailable ? (
        <Text style={styles.unavail}>Wallet API not on server yet — redeploy scanner-server with /wallet endpoint</Text>
      ) : data ? (
        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={styles.statVal}>${Number(data.totalUsd || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</Text>
            <Text style={styles.statLbl}>Total</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statVal}>{(data.tokens || []).length}</Text>
            <Text style={styles.statLbl}>Tokens</Text>
          </View>
          <View style={styles.stat}>
            <Text style={[styles.statVal, { color: (data.pnl24h || 0) >= 0 ? '#22c55e' : '#ef4444' }]}>
              {(data.pnl24h || 0) >= 0 ? '+' : ''}{Number(data.pnl24h || 0).toFixed(1)}%
            </Text>
            <Text style={styles.statLbl}>24h</Text>
          </View>
        </View>
      ) : (
        <Text style={styles.unavail}>Could not load — check address or network</Text>
      )}
    </GlassSurface>
  )
}

export default function WalletPanel() {
  const [wallets, setWallets] = useState([])
  const [address, setAddress] = useState('')
  const [label, setLabel] = useState('')
  const [err, setErr] = useState('')

  const load = useCallback(async () => {
    setWallets(await getTrackedWallets())
  }, [])

  useEffect(() => { load() }, [load])

  async function onAdd() {
    setErr('')
    const chain = detectChain(address)
    if (!chain) { setErr('Paste a valid ETH (0x…) or Solana address'); return }
    const r = await addTrackedWallet({ address, chain, label: label || 'My wallet' })
    if (r.error) { setErr(r.error); return }
    setAddress('')
    setLabel('')
    await load()
  }

  return (
    <View>
      <Text style={styles.sectionTitle}>👛 Wallet tracker</Text>
      <Text style={styles.sub}>
        Track wallets by address (Moralis) or open MetaMask/Trust to connect on phone. Full WalletConnect signing syncs with PC.
      </Text>

      <View style={styles.wcRow}>
        <TouchableOpacity style={styles.wcBtn} onPress={() => openWalletApp('metamask')}>
          <Text style={styles.wcBtnText}>Open MetaMask</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.wcBtn} onPress={() => openWalletApp('trust')}>
          <Text style={styles.wcBtnText}>Open Trust</Text>
        </TouchableOpacity>
      </View>

      <GlassSurface borderRadius={14} style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Wallet address (0x… or Solana)"
          placeholderTextColor="rgba(0,0,0,0.35)"
          value={address}
          onChangeText={setAddress}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TextInput
          style={styles.input}
          placeholder="Label (optional)"
          placeholderTextColor="rgba(0,0,0,0.35)"
          value={label}
          onChangeText={setLabel}
        />
        <TouchableOpacity style={styles.addBtn} onPress={onAdd}>
          <Feather name="plus" size={18} color="#fff" />
          <Text style={styles.addBtnText}>Track wallet</Text>
        </TouchableOpacity>
        {!!err && <Text style={styles.err}>{err}</Text>}
      </GlassSurface>

      {wallets.length ? wallets.map((w) => (
        <WalletCard key={w.id} wallet={w} onRemove={async (id) => { await removeTrackedWallet(id); await load() }} />
      )) : (
        <Text style={styles.empty}>No wallets yet — paste an address from MetaMask, Phantom, or any explorer</Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1a1a1a', marginBottom: 4 },
  sub: { fontSize: 12, color: 'rgba(0,0,0,0.45)', marginBottom: 12, lineHeight: 18 },
  wcRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  wcBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: 'rgba(108,92,231,0.12)', alignItems: 'center' },
  wcBtnText: { fontSize: 12, fontWeight: '700', color: '#6c5ce7' },
  form: { padding: 14, marginBottom: 12 },
  input: { backgroundColor: 'rgba(255,255,255,0.55)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, fontSize: 15, color: '#1a1a1a', marginBottom: 10 },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#6c5ce7', paddingVertical: 12, borderRadius: 12 },
  addBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  err: { marginTop: 8, fontSize: 12, color: '#ef4444', textAlign: 'center' },
  card: { padding: 14, marginBottom: 10 },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardLabel: { fontSize: 15, fontWeight: '700', color: '#1a1a1a' },
  cardAddr: { fontSize: 11, color: 'rgba(0,0,0,0.45)', marginTop: 2 },
  stats: { flexDirection: 'row', marginTop: 12, gap: 8 },
  stat: { flex: 1, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.4)', borderRadius: 10, paddingVertical: 10 },
  statVal: { fontSize: 16, fontWeight: '800', color: '#1a1a1a' },
  statLbl: { fontSize: 10, color: 'rgba(0,0,0,0.4)', marginTop: 2 },
  unavail: { fontSize: 12, color: 'rgba(0,0,0,0.45)', marginTop: 8, lineHeight: 18 },
  empty: { fontSize: 13, color: 'rgba(0,0,0,0.45)', textAlign: 'center', paddingVertical: 24, lineHeight: 20 },
})
