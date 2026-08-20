import { Feather } from '@expo/vector-icons'
import { useState } from 'react'
import {
  ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native'
import { useConnectedWallet } from '../hooks/useConnectedWallet'
import { hasWalletConnectProjectId } from '../lib/walletConnect'
import { openWalletApp } from '../lib/wallet'
import GlassSurface from './GlassSurface'

function shortAddr(a) {
  if (!a || a.length < 12) return a || '—'
  return `${a.slice(0, 6)}…${a.slice(-4)}`
}

export default function ConnectedWalletCard({ onGoSniper }) {
  const {
    wallet, loading, connecting, error,
    connectEvm, connectSol, disconnect, isEvm, isSolana, address,
  } = useConnectedWallet()
  const [solInput, setSolInput] = useState('')
  const [showSolPaste, setShowSolPaste] = useState(false)
  const [localErr, setLocalErr] = useState('')

  const wcReady = hasWalletConnectProjectId()

  async function onConnectSol() {
    setLocalErr('')
    const a = solInput.trim()
    if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(a)) {
      setLocalErr('Paste a valid Solana address from Phantom')
      return
    }
    await connectSol(a)
    setSolInput('')
    setShowSolPaste(false)
  }

  return (
    <GlassSurface borderRadius={18} style={styles.card}>
      <View style={styles.head}>
        <View style={styles.headLeft}>
          <View style={styles.iconWrap}>
            <Feather name="credit-card" size={18} color="#6c5ce7" />
          </View>
          <View>
            <Text style={styles.title}>Connected wallet</Text>
            <Text style={styles.sub}>Required for live sniper · Maestro-style</Text>
          </View>
        </View>
        {wallet && (
          <View style={[styles.liveBadge, wallet.live && styles.liveBadgeOn]}>
            <Text style={[styles.liveText, wallet.live && styles.liveTextOn]}>
              {wallet.live ? 'LIVE' : 'STALE'}
            </Text>
          </View>
        )}
      </View>

      {loading ? (
        <ActivityIndicator color="#6c5ce7" style={{ marginVertical: 12 }} />
      ) : wallet?.address ? (
        <View>
          <Text style={styles.addr}>{shortAddr(wallet.address)}</Text>
          <Text style={styles.meta}>
            {isSolana ? 'Solana · Phantom' : `${wallet.peer || 'WalletConnect'} · ${wallet.chainId || 'EVM'}`}
          </Text>
          <View style={styles.row}>
            {!!onGoSniper && (
              <TouchableOpacity style={styles.btnPrimary} onPress={onGoSniper} activeOpacity={0.85}>
                <Feather name="crosshair" size={14} color="#fff" />
                <Text style={styles.btnPrimaryText}>Open sniper</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.btnGhost} onPress={disconnect} activeOpacity={0.85}>
              <Text style={styles.btnGhostText}>Disconnect</Text>
            </TouchableOpacity>
          </View>
          {!wallet.live && isEvm && (
            <Text style={styles.hint}>Session expired — reconnect MetaMask or Trust</Text>
          )}
        </View>
      ) : (
        <View>
          {!wcReady && (
            <Text style={styles.warn}>
              Add WALLETCONNECT_PROJECT_ID to src/secrets.js to connect MetaMask / Trust (free at cloud.reown.com)
            </Text>
          )}
          <View style={styles.connectRow}>
            <TouchableOpacity
              style={[styles.wcBtn, !wcReady && styles.wcBtnOff]}
              onPress={() => connectEvm('metamask')}
              disabled={connecting || !wcReady}
            >
              {connecting ? (
                <ActivityIndicator color="#6c5ce7" />
              ) : (
                <Text style={styles.wcBtnText}>MetaMask</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.wcBtn, !wcReady && styles.wcBtnOff]}
              onPress={() => connectEvm('trust')}
              disabled={connecting || !wcReady}
            >
              <Text style={styles.wcBtnText}>Trust</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.wcBtn} onPress={() => openWalletApp('metamask')}>
              <Text style={styles.wcBtnText}>Open app</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={styles.phantomRow}
            onPress={() => setShowSolPaste((v) => !v)}
            activeOpacity={0.85}
          >
            <Text style={styles.phantomText}>Solana — link Phantom address</Text>
            <Feather name={showSolPaste ? 'chevron-up' : 'chevron-down'} size={16} color="#6c5ce7" />
          </TouchableOpacity>
          {showSolPaste && (
            <View style={styles.solBox}>
              <TextInput
                style={styles.input}
                placeholder="Paste Solana pubkey from Phantom"
                placeholderTextColor="rgba(0,0,0,0.35)"
                value={solInput}
                onChangeText={setSolInput}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity style={styles.btnPrimary} onPress={onConnectSol}>
                <Text style={styles.btnPrimaryText}>Link for live snipes</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {(error || localErr) ? (
        <Text style={styles.err}>{error || localErr}</Text>
      ) : null}
    </GlassSurface>
  )
}

const styles = StyleSheet.create({
  card: { padding: 16, marginBottom: 12 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  headLeft: { flexDirection: 'row', gap: 10, flex: 1 },
  iconWrap: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(108,92,231,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 15, fontWeight: '800', color: '#1a1a1a' },
  sub: { fontSize: 11, color: 'rgba(0,0,0,0.45)', marginTop: 2 },
  liveBadge: {
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  liveBadgeOn: { backgroundColor: 'rgba(34,197,94,0.15)' },
  liveText: { fontSize: 10, fontWeight: '800', color: 'rgba(0,0,0,0.35)' },
  liveTextOn: { color: '#16a34a' },
  addr: { fontSize: 20, fontWeight: '800', color: '#1a1a1a', letterSpacing: -0.3 },
  meta: { fontSize: 12, color: 'rgba(0,0,0,0.45)', marginTop: 4, marginBottom: 12 },
  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  connectRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  wcBtn: {
    flex: 1, paddingVertical: 11, borderRadius: 12,
    backgroundColor: 'rgba(108,92,231,0.12)', alignItems: 'center',
  },
  wcBtnOff: { opacity: 0.45 },
  wcBtnText: { fontSize: 12, fontWeight: '700', color: '#6c5ce7' },
  phantomRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 10,
  },
  phantomText: { fontSize: 12, fontWeight: '600', color: '#6c5ce7' },
  solBox: { gap: 8, marginBottom: 4 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.55)', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 12, fontSize: 14, color: '#1a1a1a',
  },
  btnPrimary: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#6c5ce7', paddingVertical: 11, paddingHorizontal: 14, borderRadius: 12,
  },
  btnPrimaryText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  btnGhost: {
    paddingVertical: 11, paddingHorizontal: 14, borderRadius: 12,
    backgroundColor: 'rgba(108,92,231,0.1)',
  },
  btnGhostText: { color: '#6c5ce7', fontWeight: '700', fontSize: 13 },
  warn: { fontSize: 11, color: '#b45309', lineHeight: 16, marginBottom: 10 },
  hint: { fontSize: 11, color: 'rgba(0,0,0,0.45)', marginTop: 10 },
  err: { fontSize: 11, color: '#ef4444', marginTop: 10, textAlign: 'center' },
})
