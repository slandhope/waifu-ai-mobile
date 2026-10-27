import { useEffect, useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, ScrollView,
} from 'react-native'
import {
  refreshLikeness, setLikeness, editLikenessMemory, clearLikeness,
  importLikenessChats, chooseLikenessSpeaker, cloneLikenessVoice,
  pickChatFiles, pickVoiceClips,
} from '../lib/likeness'

export default function ClonePanel() {
  const [like, setLike] = useState(null)
  const [speakers, setSpeakers] = useState([])
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState('')
  const [name, setName] = useState('')
  const [fact, setFact] = useState('')

  useEffect(() => {
    refreshLikeness()
      .then((L) => { setLike(L); setName(L?.name || '') })
      .catch((e) => setStatus(e.message || 'could not load clone'))
  }, [])

  const on = !!like?.enabled
  const done = like?.completeness || {}
  const facts = (like?.style && like.style.facts) || []

  const apply = (next) => {
    if (next) {
      setLike(next)
      if (next.name) setName(next.name)
    }
  }

  return (
    <ScrollView style={{ maxHeight: 420 }} keyboardShouldPersistTaps="handled">
      <View style={styles.row}>
        <Text style={styles.blurb}>Private replica of her — same chats and voice as the Mac. Live2D stays Asuka.</Text>
        <TouchableOpacity
          style={[styles.switch, on && styles.switchOn]}
          onPress={async () => {
            if (busy) return
            setBusy('set')
            try { apply(await setLikeness({ enabled: !on })) } catch (e) { setStatus(e.message) }
            finally { setBusy('') }
          }}
          disabled={!!busy}
        >
          <View style={[styles.knob, on && styles.knobOn]} />
        </TouchableOpacity>
      </View>

      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        onEndEditing={async () => {
          const v = name.trim()
          if (!v || busy) return
          setBusy('name')
          try { apply(await setLikeness({ name: v })) } catch (e) { setStatus(e.message) }
          finally { setBusy('') }
        }}
        placeholder="Her name"
        placeholderTextColor="rgba(0,0,0,0.35)"
        maxLength={48}
      />

      <View style={styles.layers}>
        <Layer on={!!done.voice} title="Voice" hint="upload clips" />
        <Layer on={!!done.mind} title="Mind" hint="import chats" />
        <Layer on={!!done.memory} title="Memory" hint="how you met" />
      </View>

      <View style={styles.acts}>
        <TouchableOpacity
          style={styles.act}
          disabled={!!busy}
          onPress={async () => {
            if (busy) return
            try {
              const picked = await pickVoiceClips()
              if (picked.cancelled) return
              setBusy('voice')
              setStatus('Cloning voice — stay here…')
              const label = (name.trim() || like?.name || 'custom-voice').slice(0, 40)
              const cloned = await cloneLikenessVoice(label, picked.samples)
              if (!cloned?.voiceId) { setStatus('Clone failed'); return }
              apply(await setLikeness({ enabled: true, voiceId: cloned.voiceId, voiceLabel: label }))
              setStatus('Voice cloned. Talk on Home — she answers as her.')
            } catch (e) { setStatus(e.message || 'Clone failed') }
            finally { setBusy('') }
          }}
        >
          {busy === 'voice' ? <ActivityIndicator color="#fff" /> : <Text style={styles.actText}>Upload voice</Text>}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actGhost}
          disabled={!!busy}
          onPress={async () => {
            if (busy) return
            try {
              const picked = await pickChatFiles()
              if (picked.cancelled) return
              setBusy('import')
              setStatus('Reading chats…')
              const r = await importLikenessChats(picked.files)
              setSpeakers(r.speakers || [])
              setStatus('Found ' + r.total + ' messages. Pick whose texts to learn.')
            } catch (e) { setStatus(e.message || 'Could not read those files') }
            finally { setBusy('') }
          }}
        >
          {busy === 'import' ? <ActivityIndicator color="#333" /> : <Text style={styles.actGhostText}>Import chats</Text>}
        </TouchableOpacity>
      </View>

      {!!speakers.length && (
        <View style={{ marginTop: 12 }}>
          <Text style={styles.hint}>Whose messages should she learn?</Text>
          <View style={styles.chips}>
            {speakers.map((s) => (
              <TouchableOpacity
                key={s.name}
                style={styles.chip}
                disabled={!!busy}
                onPress={async () => {
                  setBusy('learn')
                  setStatus('Learning her — stay on this screen…')
                  try {
                    const r = await chooseLikenessSpeaker(s.name)
                    apply(r.likeness)
                    setSpeakers([])
                    setStatus('Mind is on. Home talk is now ' + (r.likeness?.name || s.name) + '.')
                  } catch (e) { setStatus(e.message || 'Could not learn that speaker') }
                  finally { setBusy('') }
                }}
              >
                <Text style={styles.chipText}>{s.name} · {s.count}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {busy === 'learn' ? (
        <View style={styles.learn}>
          <ActivityIndicator color="#6c5ce7" />
          <Text style={styles.hint}>Building her mind from the chats…</Text>
        </View>
      ) : null}

      {!!status && <Text style={styles.status}>{status}</Text>}

      {(on || facts.length) ? (
        <View style={{ marginTop: 14 }}>
          <Text style={styles.hint}>Memories she should not forget</Text>
          {facts.slice(-10).map((f, i) => {
            const idx = facts.length - Math.min(10, facts.length) + i
            return (
              <View key={idx + f} style={styles.fact}>
                <Text style={styles.factText}>{f}</Text>
                <TouchableOpacity
                  onPress={async () => {
                    if (busy) return
                    setBusy('fact')
                    try { apply(await editLikenessMemory({ removeFact: idx })) } catch (e) { setStatus(e.message) }
                    finally { setBusy('') }
                  }}
                  hitSlop={8}
                >
                  <Text style={styles.x}>×</Text>
                </TouchableOpacity>
              </View>
            )
          })}
          <TextInput
            style={styles.input}
            value={fact}
            onChangeText={setFact}
            placeholder="Add a memory (how you met, a trip…)"
            placeholderTextColor="rgba(0,0,0,0.35)"
            maxLength={180}
            returnKeyType="done"
            onSubmitEditing={async () => {
              const v = fact.trim()
              if (v.length < 4 || busy) return
              setBusy('fact')
              try {
                apply(await editLikenessMemory({ addFact: v }))
                setFact('')
              } catch (e) { setStatus(e.message) }
              finally { setBusy('') }
            }}
          />
        </View>
      ) : null}

      <TouchableOpacity
        style={{ marginTop: 16, minHeight: 44, justifyContent: 'center' }}
        onPress={() => {
          Alert.alert('Clear replica', 'Removes her mind and voice from this account.', [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Clear',
              style: 'destructive',
              onPress: async () => {
                setBusy('clear')
                try {
                  apply(await clearLikeness())
                  setSpeakers([])
                  setStatus('Replica cleared')
                } catch (e) { setStatus(e.message) }
                finally { setBusy('') }
              },
            },
          ])
        }}
      >
        <Text style={styles.clear}>Clear replica</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

function Layer({ on, title, hint }) {
  return (
    <View style={[styles.layer, on && styles.layerOn]}>
      <Text style={[styles.layerTitle, on && { color: '#6c5ce7' }]}>{title}</Text>
      <Text style={styles.layerHint}>{hint}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  blurb: { flex: 1, fontSize: 13, lineHeight: 18, color: 'rgba(0,0,0,0.55)' },
  switch: {
    width: 52, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.08)',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', paddingHorizontal: 3,
  },
  switchOn: { backgroundColor: '#6c5ce7', justifyContent: 'flex-end' },
  knob: { width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.25)' },
  knobOn: { backgroundColor: '#fff' },
  input: {
    marginTop: 10, backgroundColor: 'rgba(255,255,255,0.55)', borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: '#1a1a1a',
  },
  layers: { flexDirection: 'row', gap: 8, marginTop: 12 },
  layer: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.45)', borderRadius: 14, padding: 10, minHeight: 58,
  },
  layerOn: { borderWidth: 1, borderColor: 'rgba(108,92,231,0.45)' },
  layerTitle: { fontSize: 13, fontWeight: '700', color: '#1a1a1a' },
  layerHint: { fontSize: 11, color: 'rgba(0,0,0,0.45)', marginTop: 4 },
  acts: { flexDirection: 'row', gap: 8, marginTop: 14 },
  act: {
    flex: 1, minHeight: 48, borderRadius: 999, backgroundColor: '#6c5ce7',
    alignItems: 'center', justifyContent: 'center',
  },
  actText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  actGhost: {
    flex: 1, minHeight: 48, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.55)',
    alignItems: 'center', justifyContent: 'center',
  },
  actGhostText: { color: '#1a1a1a', fontWeight: '600', fontSize: 14 },
  hint: { fontSize: 12, color: 'rgba(0,0,0,0.5)', lineHeight: 17, marginBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    minHeight: 44, paddingHorizontal: 14, borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.55)', justifyContent: 'center',
  },
  chipText: { fontSize: 13, fontWeight: '600', color: '#1a1a1a' },
  learn: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  status: { marginTop: 12, fontSize: 13, lineHeight: 18, color: 'rgba(0,0,0,0.55)' },
  fact: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.45)', borderRadius: 12, padding: 10, marginBottom: 6,
  },
  factText: { flex: 1, fontSize: 13, lineHeight: 18, color: '#1a1a1a' },
  x: { fontSize: 18, color: 'rgba(0,0,0,0.4)', width: 24, textAlign: 'center' },
  clear: { fontSize: 13, color: 'rgba(0,0,0,0.45)' },
})
