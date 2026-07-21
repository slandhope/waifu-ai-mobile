import { useState, useEffect, useCallback } from 'react'
import { View, Text, FlatList, Image, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

const IDS = ['bitcoin', 'ethereum', 'solana', 'binancecoin', 'ripple', 'dogecoin', 'cardano', 'avalanche-2', 'chainlink', 'polkadot']
const URL =
  'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=' +
  IDS.join(',') +
  '&order=market_cap_desc&price_change_percentage=24h'

function fmt(n) {
  if (n == null) return '—'
  if (n >= 1000) return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 })
  if (n >= 1) return '$' + n.toFixed(2)
  return '$' + n.toFixed(4)
}

export default function TradingScreen() {
  const [coins, setCoins] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [err, setErr] = useState('')

  const load = useCallback(async () => {
    try {
      const res = await fetch(URL)
      const j = await res.json()
      if (Array.isArray(j)) { setCoins(j); setErr('') } else setErr('rate-limited — pull to retry')
    } catch (e) { setErr('offline — pull to retry') }
    finally { setLoading(false); setRefreshing(false) }
  }, [])

  useEffect(() => {
    load()
    const t = setInterval(load, 30000)
    return () => clearInterval(t)
  }, [load])

  const renderItem = ({ item }) => {
    const chg = item.price_change_percentage_24h
    const up = (chg ?? 0) >= 0
    return (
      <View style={styles.row}>
        <Image source={{ uri: item.image }} style={styles.icon} />
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.sym}>{(item.symbol || '').toUpperCase()}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.price}>{fmt(item.current_price)}</Text>
          <Text style={[styles.chg, { color: up ? '#34d399' : '#fb7185' }]}>
            {up ? '▲' : '▼'} {Math.abs(chg ?? 0).toFixed(2)}%
          </Text>
        </View>
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Text style={styles.h1}>Markets</Text>
      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#7f5af0" />
      ) : (
        <FlatList
          data={coins}
          keyExtractor={(c) => c.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} tintColor="#7f5af0" />}
          ListHeaderComponent={
            <View style={styles.portfolio}>
              <Text style={styles.pLabel}>Portfolio</Text>
              <Text style={styles.pValue}>Connect the engine to sync</Text>
              <Text style={styles.pSub}>Live prices work now. Portfolio, paper trades, and allocation buckets need the backend — coming next.</Text>
            </View>
          }
          ListFooterComponent={err ? <Text style={styles.err}>{err}</Text> : null}
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0a0a0f' },
  h1: { color: '#fff', fontSize: 26, fontWeight: '800', paddingHorizontal: 18, paddingTop: 8 },
  portfolio: { backgroundColor: '#171722', borderRadius: 16, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  pLabel: { color: '#8a8a99', fontSize: 12, letterSpacing: 1, textTransform: 'uppercase' },
  pValue: { color: '#fff', fontSize: 20, fontWeight: '700', marginTop: 4 },
  pSub: { color: '#8a8a99', fontSize: 12, lineHeight: 18, marginTop: 8 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#141420', borderRadius: 14, padding: 14, marginBottom: 8 },
  icon: { width: 34, height: 34, borderRadius: 17, marginRight: 12 },
  name: { color: '#fff', fontSize: 15, fontWeight: '600' },
  sym: { color: '#8a8a99', fontSize: 12, marginTop: 2 },
  price: { color: '#fff', fontSize: 15, fontWeight: '700' },
  chg: { fontSize: 12, marginTop: 2, fontWeight: '600' },
  err: { color: '#8a8a99', textAlign: 'center', marginTop: 12, fontSize: 13 },
})
