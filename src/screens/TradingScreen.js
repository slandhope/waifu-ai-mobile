import { Feather } from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator, RefreshControl, ScrollView,
  StyleSheet, Text, TouchableOpacity, View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import GlassSurface from '../components/GlassSurface'
import AllocationEditor from '../components/AllocationEditor'
import MarketsModal, { MarketListItem } from '../components/MarketsModal'
import TabScreenShell from '../components/TabScreenShell'
import TradeEditModal from '../components/TradeEditModal'
import TradingAlertsModal from '../components/TradingAlertsModal'
import ConnectedWalletCard from '../components/ConnectedWalletCard'
import LaunchPanel from '../components/LaunchPanel'
import SniperPanel from '../components/SniperPanel'
import TradingMorePanel from '../components/TradingMorePanel'
import {
  fetchCallerSignals, fetchMarkets, fetchSignals, fetchTrades, fetchTradingStats,
  fmtUsd, pickMarketSnapshot, summarizeTrades, tierColor,
} from '../lib/trading'
import { getHiddenCoins, getWatchlist } from '../lib/watchlist'

function StatPill({ label, value, sub, color }) {
  return (
    <GlassSurface borderRadius={16} style={styles.statPill}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, color ? { color } : null]}>{value}</Text>
      {!!sub && <Text style={styles.statSub}>{sub}</Text>}
    </GlassSurface>
  )
}

function TradeRow({ trade, open, onPress }) {
  const up = (trade.pnl ?? trade.unrealizedPnl ?? 0) >= 0
  const dir = (trade.direction || 'long').toUpperCase()
  const inner = (
    <>
      <View style={styles.tradeTop}>
        <View style={{ flex: 1 }}>
          <Text style={styles.tradeCoin}>{trade.coin || '—'}</Text>
          <Text style={styles.tradeMeta}>{dir} · {trade.leverage || 1}x · {trade.caller || 'Scanner'}</Text>
          {!!trade.groupName && <Text style={styles.tradeGroup}>{trade.groupName}</Text>}
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.tradeEntry}>{fmtUsd(trade.entry)}</Text>
          {open ? (
            <Text style={[styles.tradePnl, { color: up ? '#22c55e' : '#ef4444' }]}>
              {up ? '+' : ''}{fmtUsd(trade.unrealizedPnl ?? trade.pnl ?? 0)}
            </Text>
          ) : (
            <Text style={[styles.tradePnl, { color: up ? '#22c55e' : '#ef4444' }]}>
              {up ? 'WIN' : 'LOSS'} {fmtUsd(trade.pnl)}
            </Text>
          )}
        </View>
      </View>
      {open && (
        <Text style={styles.tradeSl}>TP {fmtUsd(trade.target)} · SL {fmtUsd(trade.stopLoss)}</Text>
      )}
      {open && (
        <Text style={styles.editHint}>Tap to edit or close →</Text>
      )}
    </>
  )
  if (open && onPress) {
    return (
      <TouchableOpacity activeOpacity={0.85} onPress={onPress}>
        <GlassSurface borderRadius={14} style={styles.tradeRow}>{inner}</GlassSurface>
      </TouchableOpacity>
    )
  }
  return <GlassSurface borderRadius={14} style={styles.tradeRow}>{inner}</GlassSurface>
}

function SignalChip({ coin, signal }) {
  const color = tierColor(signal?.tier)
  return (
    <GlassSurface borderRadius={14} style={styles.signalChip}>
      <Text style={styles.signalCoin}>{coin}</Text>
      <Text style={[styles.signalTier, { color }]}>{signal?.tier || '—'}</Text>
      <Text style={styles.signalRsi}>RSI {signal?.rsi ?? '—'}</Text>
    </GlassSurface>
  )
}

function CallerSignalRow({ signal }) {
  const up = (signal.direction || '').toLowerCase() === 'long'
  const when = signal.timestamp ? new Date(signal.timestamp).toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  }) : ''
  return (
    <GlassSurface borderRadius={14} style={styles.callerRow}>
      <View style={styles.callerHead}>
        <Text style={styles.callerName}>@{signal.caller || 'caller'}</Text>
        <Text style={styles.callerTime}>{when}</Text>
      </View>
      <Text style={styles.callerGroup}>{signal.groupName || 'Telegram'}</Text>
      <View style={styles.callerBody}>
        <Text style={[styles.callerDir, { color: up ? '#22c55e' : '#ef4444' }]}>
          {(signal.direction || '').toUpperCase()} {signal.coin}
        </Text>
        <Text style={styles.callerConf}>{signal.confidence ?? '—'}%</Text>
      </View>
      <Text style={styles.callerLevels}>
        Entry {fmtUsd(signal.entry)} → TP {fmtUsd(signal.target)} · SL {fmtUsd(signal.stopLoss)}
      </Text>
    </GlassSurface>
  )
}

function MarketRow({ item, onPress }) {
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress}>
      <MarketListItem item={item} />
    </TouchableOpacity>
  )
}

export default function TradingScreen({ wallpaper, profile }) {
  const insets = useSafeAreaInsets()
  const scrollBottom = 120 + insets.bottom
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [needsAuth, setNeedsAuth] = useState(false)
  const [stats, setStats] = useState(null)
  const [summary, setSummary] = useState(null)
  const [signals, setSignals] = useState([])
  const [callerSignals, setCallerSignals] = useState([])
  const [markets, setMarkets] = useState([])
  const [marketErr, setMarketErr] = useState('')
  const [section, setSection] = useState('overview')
  const [editTrade, setEditTrade] = useState(null)
  const [alertsOpen, setAlertsOpen] = useState(false)
  const [marketsOpen, setMarketsOpen] = useState(false)
  const [watchIds, setWatchIds] = useState([])
  const [hiddenIds, setHiddenIds] = useState([])

  const load = useCallback(async () => {
    const token = await AsyncStorage.getItem('auth-token')
    if (!token) setNeedsAuth(true)

    let marketList = []
    try {
      const wl = await getWatchlist()
      const hidden = await getHiddenCoins()
      setWatchIds(wl)
      setHiddenIds(hidden)
      marketList = await fetchMarkets(wl)
      setMarkets(marketList)
      setMarketErr(marketList.length ? '' : 'Prices loading slowly — pull to retry')
    } catch (_e) {
      setMarketErr('Markets offline')
    }

    const [statsRes, tradesRes, signalsRes, callerRes] = await Promise.all([
      fetchTradingStats(),
      fetchTrades(),
      fetchSignals(),
      fetchCallerSignals(),
    ])

    if (statsRes?.auth === false || tradesRes?.auth === false) setNeedsAuth(true)
    else if (token) setNeedsAuth(false)

    if (statsRes && statsRes.auth !== false) setStats(statsRes)
    if (tradesRes && tradesRes.auth !== false) setSummary(summarizeTrades(tradesRes, marketList))

    if (signalsRes?.auth !== false && signalsRes?.signals) {
      const list = Object.entries(signalsRes.signals).map(([coin, s]) => ({ coin, ...s }))
      setSignals(list)
    }

    if (callerRes?.auth !== false) {
      setCallerSignals(callerRes?.signals || [])
    }

    setLoading(false)
    setRefreshing(false)
  }, [])

  useEffect(() => {
    load()
    const t = setInterval(load, 30000)
    return () => clearInterval(t)
  }, [load])

  const balance = stats?.balance ?? 100000
  const openCount = summary?.open?.length ?? 0
  const winRate = summary?.winRate ?? (stats?.closed ? Math.round((stats.wins / stats.closed) * 100) : 0)
  const totalPnl = summary?.totalPnl ?? 0
  const pnlUp = totalPnl >= 0
  const marketSnapshot = pickMarketSnapshot(markets, watchIds, hiddenIds)

  const SECTIONS = [
    { key: 'overview', label: 'Overview' },
    { key: 'signals', label: 'Signals' },
    { key: 'sniper', label: 'Sniper' },
    { key: 'create', label: 'Create' },
    { key: 'more', label: 'More' },
  ]

  const headerSub = section === 'create'
    ? 'Websites & resumes with AI'
    : section === 'sniper'
      ? 'Snipe setups · sync with PC'
      : 'Paper · close & edit sync with PC'

  return (
    <TabScreenShell wallpaper={wallpaper}>
      <View style={styles.page}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Trading</Text>
          <Text style={styles.sub}>{headerSub}</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={() => setAlertsOpen(true)} style={styles.bellBtn} activeOpacity={0.7}>
            <Feather name="bell" size={18} color="#6c5ce7" />
          </TouchableOpacity>
          <View style={styles.paperBadge}>
            <Text style={styles.paperBadgeText}>SIM</Text>
          </View>
        </View>
      </View>

      {needsAuth && (
        <GlassSurface borderRadius={16} style={styles.authBanner}>
          <Feather name="lock" size={16} color="#6c5ce7" />
          <Text style={styles.authText}>Sign in to manage trades & get caller alerts</Text>
        </GlassSurface>
      )}

      {section !== 'create' && (
        <TouchableOpacity activeOpacity={0.85} onPress={() => setAlertsOpen(true)}>
          <GlassSurface borderRadius={14} style={styles.alertHint}>
            <Feather name="bell" size={14} color="#6c5ce7" />
            <Text style={styles.alertHintText}>Tap bell for alert settings & history · polls every 25s</Text>
          </GlassSurface>
        </TouchableOpacity>
      )}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabScroll}
        contentContainerStyle={styles.tabRow}
      >
        {SECTIONS.map((s) => (
          <TouchableOpacity
            key={s.key}
            onPress={() => setSection(s.key)}
            style={[styles.tabChip, section === s.key && styles.tabChipOn]}
          >
            <Text style={[styles.tabChipText, section === s.key && styles.tabChipTextOn]}>
              {s.key === 'overview' && openCount > 0 ? `Overview · ${openCount} open` : s.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#6c5ce7" />
      ) : (
        <ScrollView
          style={styles.mainScroll}
          contentContainerStyle={[styles.body, { paddingBottom: scrollBottom }]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} tintColor="#6c5ce7" />
          }
          showsVerticalScrollIndicator={false}
        >
          {section === 'overview' && (
            <>
              <ConnectedWalletCard onGoSniper={() => setSection('sniper')} />

              <AllocationEditor />

              <GlassSurface borderRadius={22} style={styles.hero}>
                <Text style={styles.heroLabel}>Paper balance</Text>
                <Text style={styles.heroValue}>{fmtUsd(balance)}</Text>
                <View style={styles.heroRow}>
                  <Text style={[styles.heroPnl, { color: pnlUp ? '#22c55e' : '#ef4444' }]}>
                    {pnlUp ? '+' : ''}{fmtUsd(totalPnl)} total P&L
                  </Text>
                  <Text style={styles.heroMeta}>{openCount} open · {winRate}% win rate</Text>
                </View>
              </GlassSurface>

              <View style={styles.statGrid}>
                <StatPill label="Wins" value={String(summary?.wins ?? stats?.wins ?? 0)} />
                <StatPill label="Losses" value={String(summary?.losses ?? 0)} />
                <StatPill
                  label="Unrealized"
                  value={fmtUsd(summary?.unrealized ?? 0)}
                  color={(summary?.unrealized ?? 0) >= 0 ? '#22c55e' : '#ef4444'}
                />
              </View>

              <Text style={styles.sectionTitle}>Open positions · tap to manage</Text>
              {summary?.open?.length ? (
                summary.open.map((t) => (
                  <TradeRow
                    key={t.id || t.coin + t.openTime}
                    trade={t}
                    open
                    onPress={() => setEditTrade(t)}
                  />
                ))
              ) : (
                <GlassSurface borderRadius={14} style={styles.emptyBox}>
                  <Text style={styles.emptyText}>No open trades right now</Text>
                </GlassSurface>
              )}

              {!!summary?.closed?.length && (
                <>
                  <Text style={styles.sectionTitle}>Recent closed</Text>
                  {summary.closed.map((t) => <TradeRow key={t.id || String(t.closeTime)} trade={t} />)}
                </>
              )}

              <Text style={styles.sectionTitle}>Latest caller pings</Text>
              {callerSignals.slice(0, 3).map((s) => (
                <CallerSignalRow key={'prev-' + String(s.id || s.timestamp)} signal={s} />
              ))}
              {!callerSignals.length ? (
                <GlassSurface borderRadius={14} style={styles.emptyBox}>
                  <Text style={styles.emptyText}>No caller signals yet</Text>
                </GlassSurface>
              ) : (
                <TouchableOpacity onPress={() => setSection('signals')} style={styles.moreBtn}>
                  <Text style={styles.moreBtnText}>See all signals →</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity onPress={() => setMarketsOpen(true)} activeOpacity={0.85}>
                <View style={styles.sectionHeadRow}>
                  <Text style={styles.sectionTitleInline}>Markets</Text>
                  <Text style={styles.sectionLink}>View all →</Text>
                </View>
              </TouchableOpacity>
              {!!marketErr && (
                <GlassSurface borderRadius={14} style={styles.marketErrBox}>
                  <Feather name="wifi-off" size={14} color="#ef4444" />
                  <Text style={styles.marketErrText}>{marketErr}</Text>
                </GlassSurface>
              )}
              {marketSnapshot.map((m) => (
                <MarketRow key={m.id} item={m} onPress={() => setMarketsOpen(true)} />
              ))}
              {!marketSnapshot.length && (
                <TouchableOpacity onPress={() => setMarketsOpen(true)}>
                  <GlassSurface borderRadius={14} style={styles.emptyBox}>
                    <Text style={styles.emptyText}>Tap to open markets & add coins</Text>
                  </GlassSurface>
                </TouchableOpacity>
              )}
            </>
          )}

          {section === 'signals' && (
            <>
              <Text style={styles.sectionTitle}>Caller signals (Telegram)</Text>
              {callerSignals.length ? (
                callerSignals.map((s) => (
                  <CallerSignalRow key={String(s.id || s.timestamp) + s.coin} signal={s} />
                ))
              ) : (
                <GlassSurface borderRadius={14} style={styles.emptyBox}>
                  <Text style={styles.emptyText}>
                    No caller signals yet — they appear when your PC/server monitors Telegram groups
                  </Text>
                </GlassSurface>
              )}

              <Text style={styles.sectionTitle}>Daily RSI signals</Text>
              {signals.length ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.signalRow}>
                  {signals.map((s) => <SignalChip key={s.coin} coin={s.coin} signal={s} />)}
                </ScrollView>
              ) : (
                <GlassSurface borderRadius={14} style={styles.emptyBox}>
                  <Text style={styles.emptyText}>No RSI signals yet today</Text>
                </GlassSurface>
              )}
            </>
          )}

          {section === 'sniper' && <SniperPanel />}

          {section === 'create' && <LaunchPanel wallpaper={wallpaper} profile={profile} />}

          {section === 'more' && <TradingMorePanel />}
        </ScrollView>
      )}

      <TradeEditModal
        trade={editTrade}
        visible={!!editTrade}
        onClose={() => setEditTrade(null)}
        onUpdated={() => load()}
      />

      <TradingAlertsModal visible={alertsOpen} onClose={() => setAlertsOpen(false)} />

      <MarketsModal
        visible={marketsOpen}
        onClose={() => { setMarketsOpen(false); load() }}
        defaultMarkets={markets}
        wallpaper={wallpaper}
      />
      </View>
    </TabScreenShell>
  )
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  mainScroll: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 4,
  },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bellBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(108,92,231,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 28, fontWeight: '800', color: '#1a1a1a', letterSpacing: -0.5 },
  sub: { fontSize: 13, color: 'rgba(0,0,0,0.45)', marginTop: 4 },
  paperBadge: {
    backgroundColor: 'rgba(108,92,231,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  paperBadgeText: { fontSize: 11, fontWeight: '800', color: '#6c5ce7', letterSpacing: 1 },
  authBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 22,
    marginBottom: 8,
    padding: 14,
  },
  authText: { flex: 1, fontSize: 13, color: 'rgba(0,0,0,0.55)', lineHeight: 18 },
  alertHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 22,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  alertHintText: { flex: 1, fontSize: 11, color: 'rgba(0,0,0,0.5)', lineHeight: 16 },
  tabScroll: { maxHeight: 44, marginBottom: 8 },
  tabRow: { paddingHorizontal: 22, gap: 8 },
  tabChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  tabChipOn: { backgroundColor: 'rgba(108,92,231,0.2)' },
  tabChipText: { fontSize: 12, fontWeight: '600', color: 'rgba(0,0,0,0.45)' },
  tabChipTextOn: { color: '#6c5ce7' },
  body: { paddingHorizontal: 22, flexGrow: 1 },
  hero: { padding: 20, marginBottom: 12 },
  heroLabel: { fontSize: 12, color: 'rgba(0,0,0,0.45)', textTransform: 'uppercase', letterSpacing: 1 },
  heroValue: { fontSize: 34, fontWeight: '800', color: '#1a1a1a', marginTop: 4 },
  heroRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  heroPnl: { fontSize: 14, fontWeight: '700' },
  heroMeta: { fontSize: 12, color: 'rgba(0,0,0,0.45)', fontWeight: '600' },
  statGrid: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  statPill: { flex: 1, padding: 12, alignItems: 'center' },
  statLabel: { fontSize: 10, color: 'rgba(0,0,0,0.45)', textTransform: 'uppercase', letterSpacing: 0.5 },
  statValue: { fontSize: 16, fontWeight: '800', color: '#1a1a1a', marginTop: 4 },
  statSub: { fontSize: 10, color: 'rgba(0,0,0,0.35)', marginTop: 2 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1a1a1a', marginBottom: 10, marginTop: 8 },
  sectionHeadRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, marginBottom: 10 },
  sectionTitleInline: { fontSize: 16, fontWeight: '700', color: '#1a1a1a' },
  sectionLink: { fontSize: 13, fontWeight: '600', color: '#6c5ce7' },
  tradeRow: { padding: 14, marginBottom: 8 },
  tradeTop: { flexDirection: 'row', justifyContent: 'space-between' },
  tradeCoin: { fontSize: 16, fontWeight: '800', color: '#1a1a1a' },
  tradeMeta: { fontSize: 11, color: 'rgba(0,0,0,0.45)', marginTop: 2 },
  tradeGroup: { fontSize: 10, color: 'rgba(0,0,0,0.35)', marginTop: 2 },
  tradeEntry: { fontSize: 13, fontWeight: '600', color: '#1a1a1a' },
  tradePnl: { fontSize: 12, fontWeight: '700', marginTop: 2 },
  tradeSl: { fontSize: 11, color: 'rgba(0,0,0,0.4)', marginTop: 8 },
  editHint: { fontSize: 11, color: '#6c5ce7', fontWeight: '600', marginTop: 8 },
  callerRow: { padding: 14, marginBottom: 8 },
  callerHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  callerName: { fontSize: 14, fontWeight: '800', color: '#1a1a1a' },
  callerTime: { fontSize: 10, color: 'rgba(0,0,0,0.4)' },
  callerGroup: { fontSize: 11, color: 'rgba(0,0,0,0.45)', marginTop: 4 },
  callerBody: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  callerDir: { fontSize: 16, fontWeight: '800' },
  callerConf: { fontSize: 13, fontWeight: '700', color: '#6c5ce7' },
  callerLevels: { fontSize: 11, color: 'rgba(0,0,0,0.45)', marginTop: 8, lineHeight: 16 },
  signalRow: { gap: 10, paddingBottom: 8 },
  signalChip: { width: 110, padding: 12, alignItems: 'center' },
  signalCoin: { fontSize: 15, fontWeight: '800', color: '#1a1a1a' },
  signalTier: { fontSize: 11, fontWeight: '700', marginTop: 4, textAlign: 'center' },
  signalRsi: { fontSize: 10, color: 'rgba(0,0,0,0.4)', marginTop: 4 },
  emptyBox: { padding: 18, marginBottom: 8 },
  marketErrBox: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, marginBottom: 8 },
  marketErrText: { flex: 1, fontSize: 13, color: '#ef4444', fontWeight: '600' },
  emptyText: { fontSize: 13, color: 'rgba(0,0,0,0.45)', lineHeight: 20, textAlign: 'center' },
  moreBtn: { alignItems: 'center', paddingVertical: 12 },
  moreBtnText: { fontSize: 14, fontWeight: '600', color: '#6c5ce7' },
  err: { textAlign: 'center', color: 'rgba(0,0,0,0.45)', marginTop: 8, fontSize: 13 },
})
