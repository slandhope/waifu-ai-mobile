import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { WebView } from 'react-native-webview'
import { useLive2D } from '../context/Live2DContext'
import { resolveLive2DBundle } from '../lib/localLive2d'

const LOAD_TIMEOUT_MS = 180000
const INJECT_CHUNK = 80000

const WAKE_LINES = [
  (name) => `${name} is waking up~`,
  (name) => `Your waifu is coming…`,
  (name) => `${name} is getting ready for you`,
  (name) => `Hold on — ${name} is on her way`,
  () => `Waifu loading…`,
]

function WakeUpHint({ name }) {
  const [idx, setIdx] = useState(0)
  const displayName = name || 'She'

  useEffect(() => {
    const id = setInterval(() => setIdx((i) => (i + 1) % WAKE_LINES.length), 3200)
    return () => clearInterval(id)
  }, [])

  return (
    <View style={styles.hintWrap} pointerEvents="none">
      <Text style={styles.hintEmoji}>{displayName === 'She' ? '✨' : '💤'}</Text>
      <Text style={styles.hintText}>{WAKE_LINES[idx](displayName)}</Text>
    </View>
  )
}

async function injectJs(webRef, js) {
  return new Promise((resolve) => {
    webRef.current?.injectJavaScript(`${js}; true;`)
    setTimeout(resolve, 8)
  })
}

async function injectVfAndBoot(webRef, vfB64) {
  await injectJs(webRef, 'window.__VF_B64=""')
  for (let i = 0; i < vfB64.length; i += INJECT_CHUNK) {
    const part = JSON.stringify(vfB64.slice(i, i + INJECT_CHUNK))
    await injectJs(webRef, `window.__VF_B64+=${part}`)
  }
  await injectJs(webRef, 'window.startBoot&&window.startBoot()')
}

const AsukaLive2D = forwardRef(function AsukaLive2D({ style }, ref) {
  const { character, characterLoaded } = useLive2D()
  const webRef = useRef(null)
  const bootedRef = useRef(false)
  const [ready, setReady] = useState(false)
  const [loadError, setLoadError] = useState(null)
  const [bundle, setBundle] = useState(null)
  const [retryKey, setRetryKey] = useState(0)
  const readyRef = useRef(false)
  const timeoutRef = useRef(null)

  useEffect(() => {
    if (!characterLoaded) return undefined

    let cancelled = false
    readyRef.current = false
    bootedRef.current = false
    setReady(false)
    setLoadError(null)
    setBundle(null)

    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => {
      if (!cancelled && !readyRef.current) {
        setLoadError('Timed out — tap retry.')
      }
    }, LOAD_TIMEOUT_MS)

    ;(async () => {
      try {
        const resolved = await resolveLive2DBundle(character)
        if (cancelled) return
        setBundle(resolved)
      } catch (e) {
        if (!cancelled) {
          setLoadError(e.message || 'Could not load character')
        }
      }
    })()

    return () => {
      cancelled = true
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [characterLoaded, character.id, character.scale, character.name, retryKey])

  useImperativeHandle(ref, () => ({
    speak(dataUrl) {
      webRef.current?.injectJavaScript('window.__speak(' + JSON.stringify(dataUrl) + '); true;')
    },
    setExpression(exprId) {
      if (!exprId) return
      webRef.current?.injectJavaScript(
        `try{if(window.__model&&window.__model.expression){window.__model.expression(${JSON.stringify(exprId)});}}catch(e){}; true;`
      )
    },
    applyEquipped(equipped, characterId) {
      if (!equipped) return
      const cats = ['outfit', 'hair', 'accessory']
      const ids = cats.map((c) => equipped[c]).filter(Boolean)
      if (!ids.length) return
      webRef.current?.injectJavaScript(
        `try{var ids=${JSON.stringify(ids)};if(window.__model&&window.__model.expression){ids.forEach(function(id){try{window.__model.expression(id);}catch(e){}});}}catch(e){}; true;`
      )
    },
  }))

  const retry = () => {
    setLoadError(null)
    setReady(false)
    setBundle(null)
    setRetryKey((k) => k + 1)
  }

  const onWebReady = async () => {
    if (!bundle?.useInject || !bundle.vfB64 || bootedRef.current) return
    bootedRef.current = true
    try {
      await injectVfAndBoot(webRef, bundle.vfB64)
    } catch (e) {
      setLoadError(e.message || 'Could not load character data')
    }
  }

  if (!characterLoaded || !bundle) {
    return (
      <View style={[styles.wrap, style]}>
        {!loadError && <WakeUpHint name={character?.name} />}
        {loadError && (
          <View style={styles.errorWrap}>
            <Text style={styles.errText}>{loadError}</Text>
            <TouchableOpacity onPress={retry} style={styles.retryBtn} activeOpacity={0.85}>
              <Text style={styles.retryText}>Tap to retry</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    )
  }

  return (
    <View style={[styles.wrap, style]}>
      {!ready && !loadError && <WakeUpHint name={character.name} />}
      {loadError && (
        <View style={styles.errorWrap}>
          <Text style={styles.errText}>{loadError}</Text>
          <TouchableOpacity onPress={retry} style={styles.retryBtn} activeOpacity={0.85}>
            <Text style={styles.retryText}>Tap to retry</Text>
          </TouchableOpacity>
        </View>
      )}
      <WebView
        key={`${character.id}-${retryKey}`}
        ref={webRef}
        originWhitelist={['*']}
        source={{ uri: `${bundle.source.uri}?t=${retryKey}` }}
        style={[styles.web, !ready && styles.webHidden]}
        scrollEnabled={false}
        javaScriptEnabled
        domStorageEnabled
        cacheEnabled={false}
        mixedContentMode="always"
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        backgroundColor="transparent"
        allowingReadAccessToURL={
          Platform.OS === 'ios' ? bundle.readAccessDir : undefined
        }
        {...(Platform.OS === 'android'
          ? { allowingUniversalAccessFromFileURLs: true, allowFileAccess: true }
          : {})}
        onError={(e) => {
          setLoadError('WebView error — tap retry.')
          console.log('[AsukaLive2D] webview error', e.nativeEvent)
        }}
        onMessage={(e) => {
          const d = String(e.nativeEvent.data)
          if (d === 'READY') {
            onWebReady()
            return
          }
          if (d === 'LIVE2D_OK') {
            readyRef.current = true
            if (timeoutRef.current) clearTimeout(timeoutRef.current)
            setLoadError(null)
            setReady(true)
          } else if (d.startsWith('ERR')) {
            setReady(false)
            setLoadError(d.replace(/^ERR:\s*/, ''))
            console.log('[AsukaLive2D]', d)
          }
        }}
      />
    </View>
  )
})

export default AsukaLive2D

const styles = StyleSheet.create({
  wrap: { ...StyleSheet.absoluteFillObject, backgroundColor: 'transparent' },
  web: { flex: 1, backgroundColor: 'transparent' },
  webHidden: { opacity: 0 },
  hintWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    zIndex: 2,
  },
  hintEmoji: { fontSize: 28, marginBottom: 10, opacity: 0.85 },
  hintText: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(0,0,0,0.45)',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  errorWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    paddingHorizontal: 28,
  },
  errText: { fontSize: 13, color: 'rgba(0,0,0,0.65)', marginBottom: 10, textAlign: 'center', fontWeight: '600' },
  retryBtn: {
    backgroundColor: 'rgba(108,92,231,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  retryText: { fontSize: 14, fontWeight: '600', color: '#6c5ce7' },
})
