import { Feather } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator, Image, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native'
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler'
import { runOnJS } from 'react-native-reanimated'
import Swipeable from 'react-native-gesture-handler/Swipeable'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import GlassSurface from './GlassSurface'
import WallpaperBackground from './WallpaperBackground'
import { fetchMarkets, fmtUsd, searchCoins } from '../lib/trading'
import {
  addToWatchlist, clearWatchlist, getHiddenCoins, getWatchlist, hideCoin,
  removeFromWatchlist, sortByWatchOrder,
} from '../lib/watchlist'

function MarketRowContent({ item, onPin, pinned }) {
  const chg = item.price_change_percentage_24h
  const up = (chg ?? 0) >= 0
  return (
    <GlassSurface borderRadius={14} style={styles.row}>
      <Image source={{ uri: item.image || item.thumb }} style={styles.icon} />
      <View style={{ flex: 1 }}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.sym}>{(item.symbol || '').toUpperCase()}</Text>
      </View>
      <View style={{ alignItems: 'flex-end', marginRight: 8 }}>
        <Text style={styles.price}>{fmtUsd(item.current_price)}</Text>
        <Text style={[styles.chg, { color: up ? '#22c55e' : '#ef4444' }]}>
          {up ? '▲' : '▼'} {Math.abs(chg ?? 0).toFixed(2)}%
        </Text>
      </View>
      {pinned && <Feather name="star" size={14} color="#6c5ce7" style={{ marginRight: 6 }} />}
      {onPin && !pinned && (
        <TouchableOpacity onPress={() => onPin(item.id)} hitSlop={8} style={styles.actionBtn}>
          <Feather name="plus" size={18} color="#6c5ce7" />
        </TouchableOpacity>
      )}
    </GlassSurface>
  )
}

function SwipeMarketRow({ item, onRemove, removeLabel, onPin, pinned }) {
  const ref = useRef(null)

  function handleRemove() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    ref.current?.close()
    onRemove(item.id)
  }

  const renderRightActions = () => (
    <TouchableOpacity style={styles.deleteAction} onPress={handleRemove} activeOpacity={0.9}>
      <Feather name="trash-2" size={20} color="#fff" />
      <Text style={styles.deleteLabel}>{removeLabel || 'Remove'}</Text>
    </TouchableOpacity>
  )

  return (
    <Swipeable
      ref={ref}
      renderRightActions={renderRightActions}
      overshootRight={false}
      friction={2}
      rightThreshold={80}
      onSwipeableOpen={() => handleRemove()}
    >
      <MarketRowContent item={item} onPin={onPin} pinned={pinned} />
    </Swipeable>
  )
}

export function MarketListItem({ item, onRemove, onPin, pinned }) {
  if (onRemove) {
    return (
      <SwipeMarketRow
        item={item}
        onRemove={onRemove}
        removeLabel={pinned ? 'Unpin' : 'Hide'}
        onPin={onPin}
        pinned={pinned}
      />
    )
  }
  return <MarketRowContent item={item} onPin={onPin} pinned={pinned} />
}

export default function MarketsModal({ visible, onClose, defaultMarkets = [], wallpaper }) {
  const insets = useSafeAreaInsets()
  const wp = wallpaper?.currentWallpaper ?? wallpaper
  const [watchIds, setWatchIds] = useState([])
  const [hiddenIds, setHiddenIds] = useState([])
  const [allMarkets, setAllMarkets] = useState([])
  const [query, setQuery] = useState('')
  const [searchHits, setSearchHits] = useState([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  const dismiss = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    onClose()
  }, [onClose])

  const edgeBack = Gesture.Pan()
    .activeOffsetX(20)
    .failOffsetY([-15, 15])
    .onEnd((e) => {
      if (e.translationX > 72 || e.velocityX > 400) {
        runOnJS(dismiss)()
      }
    })

  const headerBack = Gesture.Pan()
    .activeOffsetX(20)
    .failOffsetY([-20, 20])
    .onEnd((e) => {
      if (e.translationX > 72 || e.velocityX > 400) {
        runOnJS(dismiss)()
      }
    })

  const load = useCallback(async () => {
    setLoading(true)
    setErr('')
    const [wl, hidden] = await Promise.all([getWatchlist(), getHiddenCoins()])
    setWatchIds(wl)
    setHiddenIds(hidden)
    const list = await fetchMarkets(wl)
    setAllMarkets(list.length ? list : defaultMarkets)
    setLoading(false)
    if (!list.length && !defaultMarkets.length) setErr('Could not load prices — pull down on Overview to retry')
  }, [defaultMarkets])

  useEffect(() => {
    if (visible) load()
  }, [visible, load])

  useEffect(() => {
    if (!query.trim()) { setSearchHits([]); return undefined }
    const t = setTimeout(async () => {
      setSearchHits(await searchCoins(query))
    }, 350)
    return () => clearTimeout(t)
  }, [query])

  const watchSet = new Set(watchIds)
  const hiddenSet = new Set(hiddenIds)
  const yourCoins = sortByWatchOrder(allMarkets, watchIds)
  const topCoins = allMarkets.filter((m) => !watchSet.has(m.id) && !hiddenSet.has(m.id))

  async function onAdd(id) {
    const next = await addToWatchlist(id)
    setWatchIds(next)
    setQuery('')
    setSearchHits([])
    await load()
  }

  async function onRemovePinned(id) {
    const next = await removeFromWatchlist(id)
    setWatchIds(next)
    await load()
  }

  async function onRemoveTop(id) {
    const next = await hideCoin(id)
    setHiddenIds(next)
    await load()
  }

  async function onClearAll() {
    await clearWatchlist()
    setWatchIds([])
    await load()
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={dismiss} presentationStyle="fullScreen">
      <GestureHandlerRootView style={{ flex: 1 }}>
        <WallpaperBackground wallpaper={wp}>
          <SafeAreaView style={styles.wrap} edges={['top', 'bottom']}>
            <GestureDetector gesture={edgeBack}>
              <View style={styles.edgeStrip} />
            </GestureDetector>

            <View style={styles.inner}>
              <GestureDetector gesture={headerBack}>
                <View style={styles.head}>
                  <TouchableOpacity onPress={dismiss} style={styles.backBtn} activeOpacity={0.7}>
                    <Feather name="chevron-left" size={26} color="#6c5ce7" />
                    <Text style={styles.backText}>Back</Text>
                  </TouchableOpacity>
                  <Text style={styles.title}>Markets</Text>
                  <View style={styles.headSpacer} />
                </View>
              </GestureDetector>

                  <Text style={styles.swipeHint}>Swipe from left edge to go back · swipe coin left to remove</Text>

                  <GlassSurface borderRadius={14} style={styles.searchBox}>
                    <Feather name="search" size={16} color="rgba(0,0,0,0.35)" />
                    <TextInput
                      style={styles.searchInput}
                      placeholder="Add coin — appears at top (PEPE, ARB…)"
                      placeholderTextColor="rgba(0,0,0,0.35)"
                      value={query}
                      onChangeText={setQuery}
                      autoCapitalize="characters"
                      autoCorrect={false}
                    />
                  </GlassSurface>

                  {!!searchHits.length && (
                    <View style={styles.searchResults}>
                      {searchHits.map((c) => (
                        <TouchableOpacity key={c.id} style={styles.searchHit} onPress={() => onAdd(c.id)}>
                          {!!c.thumb && <Image source={{ uri: c.thumb }} style={styles.hitIcon} />}
                          <Text style={styles.hitName}>{c.name}</Text>
                          <Text style={styles.hitSym}>{c.symbol?.toUpperCase()}</Text>
                          <Feather name="plus-circle" size={18} color="#6c5ce7" />
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 24 }}
                    showsVerticalScrollIndicator={false}
                  >
                    {loading ? (
                      <ActivityIndicator color="#6c5ce7" style={{ marginTop: 24 }} />
                    ) : (
                      <>
                        {!!yourCoins.length && (
                          <>
                            <View style={styles.sectionRow}>
                              <Text style={styles.section}>Your coins · top of list</Text>
                              <TouchableOpacity onPress={onClearAll}>
                                <Text style={styles.clearAll}>Remove all</Text>
                              </TouchableOpacity>
                            </View>
                            {yourCoins.map((m) => (
                              <MarketListItem key={m.id} item={m} pinned onRemove={onRemovePinned} />
                            ))}
                          </>
                        )}

                        <Text style={styles.section}>{yourCoins.length ? 'Other coins' : 'Top coins'}</Text>
                        <Text style={styles.hint}>Tap + to pin · swipe left on a row to remove</Text>
                        {topCoins.map((m) => (
                          <MarketListItem key={m.id} item={m} onPin={onAdd} onRemove={onRemoveTop} />
                        ))}

                        {!yourCoins.length && !topCoins.length && (
                          <Text style={styles.empty}>{err || 'No market data — pull to refresh on Overview'}</Text>
                        )}
                      </>
                    )}
                  </ScrollView>
            </View>
          </SafeAreaView>
        </WallpaperBackground>
      </GestureHandlerRootView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  edgeStrip: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 28,
    zIndex: 10,
  },
  inner: { flex: 1 },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    marginBottom: 4,
    marginTop: 4,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingRight: 12, minWidth: 88 },
  backText: { fontSize: 17, fontWeight: '600', color: '#6c5ce7', marginLeft: -4 },
  title: { flex: 1, fontSize: 18, fontWeight: '800', color: '#1a1a1a', textAlign: 'center' },
  headSpacer: { minWidth: 88 },
  swipeHint: {
    fontSize: 11,
    color: 'rgba(0,0,0,0.38)',
    textAlign: 'center',
    marginBottom: 8,
    paddingHorizontal: 20,
  },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 20, marginBottom: 8, paddingHorizontal: 14, paddingVertical: 10 },
  searchInput: { flex: 1, fontSize: 15, color: '#1a1a1a' },
  searchResults: { marginHorizontal: 20, marginBottom: 8, backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 12, overflow: 'hidden' },
  searchHit: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(0,0,0,0.06)' },
  hitIcon: { width: 24, height: 24, borderRadius: 12 },
  hitName: { flex: 1, fontSize: 14, fontWeight: '600', color: '#1a1a1a' },
  hitSym: { fontSize: 12, color: 'rgba(0,0,0,0.45)', marginRight: 8 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, marginBottom: 8 },
  section: { fontSize: 14, fontWeight: '700', color: '#1a1a1a', marginTop: 12, marginBottom: 4 },
  clearAll: { fontSize: 12, fontWeight: '600', color: '#ef4444' },
  hint: { fontSize: 11, color: 'rgba(0,0,0,0.4)', marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', padding: 14, marginBottom: 8, backgroundColor: 'rgba(255,255,255,0.55)' },
  actionBtn: { padding: 4 },
  deleteAction: {
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
    width: 88,
    marginBottom: 8,
    borderRadius: 14,
    paddingHorizontal: 8,
  },
  deleteLabel: { color: '#fff', fontSize: 11, fontWeight: '700', marginTop: 4 },
  icon: { width: 34, height: 34, borderRadius: 17, marginRight: 12 },
  name: { fontSize: 15, fontWeight: '600', color: '#1a1a1a' },
  sym: { fontSize: 12, color: 'rgba(0,0,0,0.45)', marginTop: 2 },
  price: { fontSize: 15, fontWeight: '700', color: '#1a1a1a' },
  chg: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  empty: { textAlign: 'center', color: 'rgba(0,0,0,0.45)', marginTop: 32, fontSize: 14 },
})
