import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { Platform, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native'
import { WebView } from 'react-native-webview'
import * as FileSystem from 'expo-file-system/legacy'
import { useLive2D } from '../context/Live2DContext'
import { resolveLive2DBundle } from '../lib/localLive2d'

const LOAD_TIMEOUT_MS = 180000
const INJECT_CHUNK = 80000

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
  const [status, setStatus] = useState('')
  const win = useWindowDimensions()
  const [box, setBox] = useState({ w: 0, h: 0 })
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
    setStatus(`${character?.name || 'Waifu'} is waking up~`)

    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => {
      if (!cancelled && !readyRef.current) {
        setLoadError('Timed out — tap retry.')
      }
    }, LOAD_TIMEOUT_MS)

    ;(async () => {
      try {
        const resolved = await resolveLive2DBundle(character, ({ label }) => {
          if (!cancelled && label) setStatus(label)
        })
        if (cancelled) return
        console.log('[AsukaLive2D] bundle html', !!resolved?.html, 'uri', resolved?.source?.uri, 'vf', resolved?.vfB64?.length)
        setBundle(resolved)
        setStatus(`Opening ${character?.name || 'waifu'}…`)
      } catch (e) {
        console.log('[AsukaLive2D] resolve error', e?.message || e)
        if (!cancelled) setLoadError(e.message || 'Could not load character')
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
    if (!bundle?.vfB64 || bootedRef.current) return
    bootedRef.current = true
    setStatus('Loading model…')
    try {
      await injectVfAndBoot(webRef, bundle.vfB64)
    } catch (e) {
      setLoadError(e.message || 'Could not load character data')
    }
  }

  const stageW = box.w > 8 ? box.w : win.width
  const stageH = box.h > 8 ? box.h : Math.max(320, win.height * 0.46)
  const source = bundle?.html
    ? { html: bundle.html, baseUrl: bundle.baseUrl || FileSystem.documentDirectory }
    : bundle?.source?.uri
      ? { uri: bundle.source.uri }
      : null

  return (
    <View
      style={[styles.wrap, style]}
      collapsable={false}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout
        if (width !== box.w || height !== box.h) {
          console.log('[AsukaLive2D] layout', width, height)
          setBox({ w: width, h: height })
        }
      }}
    >
      {!ready && (
        <View style={styles.placeholder} pointerEvents="none">
          <Text style={styles.placeholderEmoji}>{character?.emoji || '💜'}</Text>
          <Text style={styles.placeholderName}>{character?.name || 'Waifu'}</Text>
          <Text style={styles.placeholderStatus}>
            {loadError || status || `${character?.name || 'She'} is waking up~`}
          </Text>
          {!!loadError && (
            <TouchableOpacity onPress={retry} style={styles.retryBtn} activeOpacity={0.85}>
              <Text style={styles.retryText}>Tap to retry</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
      {source && !loadError ? (
        <WebView
          key={`${character.id}-${retryKey}`}
          ref={webRef}
          originWhitelist={['*', 'file://*', 'http://*', 'https://*']}
          source={source}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: stageW,
            height: stageH,
            backgroundColor: 'transparent',
            opacity: 0.99,
          }}
          containerStyle={{ backgroundColor: 'transparent', overflow: 'hidden' }}
          scrollEnabled={false}
          javaScriptEnabled
          domStorageEnabled
          cacheEnabled={false}
          mixedContentMode="always"
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          backgroundColor="transparent"
          allowingReadAccessToURL={
            Platform.OS === 'ios' ? (FileSystem.documentDirectory || undefined) : undefined
          }
          onLoadEnd={() => {
            console.log('[AsukaLive2D] load end')
            onWebReady()
          }}
          onError={(e) => {
            setLoadError('WebView error — tap retry.')
            console.log('[AsukaLive2D] webview error', e.nativeEvent)
          }}
          onHttpError={(e) => {
            console.log('[AsukaLive2D] http error', e.nativeEvent)
          }}
          onMessage={(e) => {
            const d = String(e.nativeEvent.data)
            console.log('[AsukaLive2D] msg', d.slice(0, 120))
            if (d === 'READY') {
              onWebReady()
              return
            }
            if (d.startsWith('PROGRESS:')) {
              setStatus(d.replace(/^PROGRESS:\s*/, ''))
              return
            }
            if (d === 'LIVE2D_OK') {
              readyRef.current = true
              if (timeoutRef.current) clearTimeout(timeoutRef.current)
              setLoadError(null)
              setReady(true)
              setTimeout(() => {
                webRef.current?.injectJavaScript('try{window.dispatchEvent(new Event("resize"));}catch(e){}; true;')
              }, 80)
            } else if (d.startsWith('ERR')) {
              setReady(false)
              setLoadError(d.replace(/^ERR:\s*/, ''))
            }
          }}
        />
      ) : null}
    </View>
  )
})

export default AsukaLive2D

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: 'transparent',
    overflow: 'hidden',
    opacity: 0.99,
  },
  placeholder: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    zIndex: 2,
  },
  placeholderEmoji: { fontSize: 72, marginBottom: 8 },
  placeholderName: { fontSize: 26, fontWeight: '800', color: '#1a1a1a', marginBottom: 8 },
  placeholderStatus: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(0,0,0,0.55)',
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: 14,
    backgroundColor: '#6c5ce7',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
  },
  retryText: { fontSize: 14, fontWeight: '700', color: '#fff' },
})
