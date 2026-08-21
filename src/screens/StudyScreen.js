import { useEffect, useRef, useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Switch,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
  Modal, Alert,
} from 'react-native'
import { Feather } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import TabScreenShell from '../components/TabScreenShell'
import { useLiveCamera } from '../context/LiveCameraContext'
import AsukaLive2D from '../components/AsukaLive2D'
import GlassSurface from '../components/GlassSurface'
import {
  loadLibrary, saveLesson, removeLesson, getStudyStreak, recordLessonFinished,
  loadStudyPrefs, saveStudyPrefs, cardsDueCount, cardsNext, gradeCard,
  addFlashcardsFromLesson, normalizeSteps,
} from '../lib/study'
import {
  synthesize, trySwitch, handleTeaching, buildLesson, checkWork, solvePhoto,
  buildQuiz, classroomAsk, setTutorMode,
} from '../lib/waifu'

const TOPIC_PLACEHOLDER = 'Teach me… (e.g. Japanese particles, RSI)'

export default function StudyScreen({ wallpaper }) {
  const asuka = useRef(null)
  const { openLiveCamera } = useLiveCamera()
  const lesson = useRef({ steps: [], idx: 0, title: '', topic: '' })
  const history = useRef([])

  const [mode, setMode] = useState('setup') // setup | scene | library
  const [busy, setBusy] = useState(false)
  const [loadingMsg, setLoadingMsg] = useState('')
  const [streak, setStreak] = useState(0)
  const [cardsDue, setCardsDue] = useState({ due: 0, total: 0 })
  const [prefs, setPrefs] = useState({ tutorStyle: 'direct', voiceOn: true, whiteboardOn: true })

  const [materials, setMaterials] = useState([])
  const [topicInput, setTopicInput] = useState('')
  const [pasteModal, setPasteModal] = useState(false)
  const [pasteName, setPasteName] = useState('')
  const [pasteText, setPasteText] = useState('')

  const [boardTitle, setBoardTitle] = useState('STUDY WITH ASUKA')
  const [boardContent, setBoardContent] = useState('')
  const [lineText, setLineText] = useState('Ready when you are~ what are we learning today?')
  const [progress, setProgress] = useState(0)
  const [showNext, setShowNext] = useState(false)
  const [showAsk, setShowAsk] = useState(false)
  const [askInput, setAskInput] = useState('')
  const [library, setLibrary] = useState({ lessons: [] })

  const [checkModal, setCheckModal] = useState(false)
  const [checkText, setCheckText] = useState('')
  const [quiz, setQuiz] = useState(null)
  const [quizIdx, setQuizIdx] = useState(0)
  const [flashcard, setFlashcard] = useState(null)
  const [fcReveal, setFcReveal] = useState(false)

  useEffect(() => {
    refreshMeta()
    import('../lib/studySync').then((m) => m.pullStudyFromCloud().then(() => refreshMeta())).catch(() => {})
  }, [])

  async function refreshMeta() {
    const [s, due, p, lib] = await Promise.all([
      getStudyStreak(), cardsDueCount(), loadStudyPrefs(), loadLibrary(),
    ])
    setStreak(s)
    setCardsDue(due)
    setPrefs(p)
    setLibrary(lib)
    setTutorMode(p.tutorStyle === 'tutor')
  }

  async function speak(t) {
    if (!prefs.voiceOn) return
    try {
      const a = await synthesize(t)
      asuka.current?.speak(a)
    } catch (_e) {}
  }

  async function startLesson(topic, steps, source = 'topic') {
    const normalized = normalizeSteps(steps)
    if (!normalized.length) {
      Alert.alert('Hmm', 'Could not build that lesson — try rephrasing?')
      return
    }
    lesson.current = { steps: normalized, idx: 0, title: (topic || 'LESSON').toUpperCase(), topic }
    setMode('scene')
    setShowAsk(false)
    setQuiz(null)
    await showStep(0)
  }

  async function showStep(i) {
    const l = lesson.current
    const step = l.steps[i]
    if (!step) return
    l.idx = i
    setBoardTitle(step.boardTitle || l.title || 'LESSON')
    setBoardContent(step.board || '')
    setLineText(step.say || '')
    setProgress(((i + 1) / l.steps.length) * 100)
    setShowNext(i < l.steps.length - 1)
    speak(step.say || '')
  }

  async function finishLesson() {
    const l = lesson.current
    await saveLesson({ topic: l.topic || l.title, steps: l.steps, source: 'lesson' })
    const s = await recordLessonFinished(l.topic)
    setStreak(s)
    await addFlashcardsFromLesson(l.topic, l.steps).catch(() => {})
    const due = await cardsDueCount()
    setCardsDue(due)
    setLineText("That's the lesson! 🌸 Want a quick quiz?")
    setShowNext(false)
    setProgress(100)
    const questions = await buildQuiz(l.topic, l.steps).catch(() => [])
    if (questions.length) setQuiz({ questions, topic: l.topic })
  }

  function handleNext() {
    const l = lesson.current
    if (l.idx < l.steps.length - 1) showStep(l.idx + 1)
    else finishLesson()
  }

  function handleBack() {
    const l = lesson.current
    if (l.idx > 0) showStep(l.idx - 1)
  }

  async function runWithLoading(msg, fn) {
    setLoadingMsg(msg)
    setBusy(true)
    try {
      return await fn()
    } finally {
      setBusy(false)
      setLoadingMsg('')
    }
  }

  function addPastedMaterial() {
    const text = pasteText.trim()
    if (!text) return
    const name = pasteName.trim() || ('Notes ' + (materials.length + 1))
    setMaterials((m) => [...m, { id: 'mat_' + Date.now(), name, text }].slice(0, 5))
    setPasteName('')
    setPasteText('')
    setPasteModal(false)
  }

  async function startFromMaterials() {
    if (!materials.length) return
    await runWithLoading('Preparing your lesson…', async () => {
      const text = materials.map((m) => '--- ' + m.name + ' ---\n' + m.text).join('\n\n')
      const topic = materials.map((m) => m.name).join(', ').slice(0, 80) || 'Your material'
      const l = await buildLesson(topic, { text, style: prefs.tutorStyle })
      if (!l) throw new Error('lesson failed')
      await startLesson(l.title || topic, l.steps, 'document')
    }).catch((e) => Alert.alert('Error', e?.message || 'Could not build lesson'))
  }

  async function startFromTopic(text) {
    const msg = (text ?? topicInput).trim()
    if (!msg) return
    setTopicInput('')
    await runWithLoading('Preparing your lesson…', async () => {
      const sw = trySwitch(msg)
      if (sw != null) {
        setMode('scene')
        setBoardTitle('ASUKA')
        setBoardContent(sw)
        setLineText(sw)
        setProgress(0)
        setShowNext(false)
        speak(sw)
        return
      }
      const taught = await handleTeaching(history.current, msg)
      if (taught != null) {
        setMode('scene')
        const title = /^\u{1F4DD}/u.test(taught) ? 'GRADED' : /^\u{1F3AF}/u.test(taught) ? 'PRACTICE' : 'ASUKA'
        setBoardTitle(title)
        setBoardContent(taught)
        setLineText(taught.length < 160 ? taught : 'Here you go — check the board.')
        setShowNext(false)
        setProgress(0)
        if (taught.length < 240 && prefs.voiceOn) speak(taught)
        return
      }
      const l = await buildLesson(msg.replace(/^teach me\s*/i, ''), { style: prefs.tutorStyle })
      if (!l) throw new Error('lesson failed')
      history.current = [...history.current, { role: 'user', content: msg }].slice(-8)
      await startLesson(l.title || msg, l.steps, 'topic')
    }).catch((e) => Alert.alert('Error', e?.message || 'Could not build lesson'))
  }

  async function pickPhotoSolve() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (perm.status !== 'granted') {
      Alert.alert('Permission needed', 'Allow photo access to solve problems from images.')
      return
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      base64: true,
    })
    if (res.canceled || !res.assets?.[0]?.base64) return
    const asset = res.assets[0]
    await runWithLoading('Reading your photo…', async () => {
      const beats = await solvePhoto(asset.base64, asset.mimeType || 'image/jpeg')
      await startLesson('📷 Your problem', beats, 'photo')
    }).catch((e) => Alert.alert('Error', e?.message || 'Could not read photo'))
  }

  function openLiveCameraSolve() {
    openLiveCamera('study', {
      onStudyBeats: async (beats) => {
        await runWithLoading('Building lesson…', async () => {
          await startLesson('📷 Live problem', beats, 'photo')
        }).catch((e) => Alert.alert('Error', e?.message || 'Could not read camera'))
      },
    })
  }

  async function submitCheckWork() {
    const t = checkText.trim()
    if (!t) return
    setCheckModal(false)
    await runWithLoading('Checking your work…', async () => {
      const r = await checkWork(t)
      const beats = [
        { say: r.overall || 'Checked it!', boardTitle: 'Your work', board: (r.issues || []).length ? '**' + r.issues.length + ' thing(s) to fix**' : '**All correct!** 🎉' },
        ...(r.issues || []).map((x, i) => ({
          say: 'Issue ' + (i + 1) + ': ' + x.wrong,
          boardTitle: x.where || ('Issue ' + (i + 1)),
          board: '❌ ' + x.wrong + '\n✅ **' + x.fix + '**',
        })),
      ]
      await startLesson('✅ Work check', beats, 'check')
      setCheckText('')
    }).catch((e) => Alert.alert('Error', e?.message || 'Check failed'))
  }

  async function toggleTutor() {
    const next = prefs.tutorStyle === 'tutor' ? 'direct' : 'tutor'
    await saveStudyPrefs({ tutorStyle: next })
    setPrefs((p) => ({ ...p, tutorStyle: next }))
    setTutorMode(next === 'tutor')
  }

  async function togglePref(key) {
    const next = { ...prefs, [key]: !prefs[key] }
    await saveStudyPrefs(next)
    setPrefs(next)
  }

  async function openFlashcards() {
    const r = await cardsNext()
    if (!r) {
      Alert.alert('All caught up', 'Nothing due right now — come back later 🌸')
      return
    }
    setMode('scene')
    setFlashcard(r)
    setFcReveal(false)
    setBoardTitle(r.card.topic || 'Flashcard')
    setBoardContent(r.card.q)
    setLineText("What's the answer? Tap below when ready.")
    setProgress(0)
    setShowNext(false)
  }

  async function replayLesson(entry) {
    setMode('setup')
    await startLesson(entry.topic, entry.steps, 'library')
  }

  async function submitAsk() {
    const q = askInput.trim()
    if (!q) return
    setAskInput('')
    setBusy(true)
    try {
      const l = lesson.current
      const recent = l.steps.slice(Math.max(0, l.idx - 2), l.idx + 1)
      const ans = await classroomAsk(recent, q)
      setLineText(ans)
      speak(ans)
    } catch (e) {
      setLineText('(' + (e?.message || 'ask failed') + ')')
    } finally {
      setBusy(false)
    }
  }

  function renderToggle(label, sub, on, onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={{ flex: 1 }}>
        <GlassSurface borderRadius={16} style={[styles.toggle, on && styles.toggleOn]}>
          <Switch value={on} onValueChange={onPress} trackColor={{ false: 'rgba(0,0,0,0.12)', true: '#6c5ce7' }} thumbColor="#fff" />
          <View style={{ flex: 1 }}>
            <Text style={styles.toggleTitle}>{label}</Text>
            <Text style={styles.toggleSub}>{sub}</Text>
          </View>
        </GlassSurface>
      </TouchableOpacity>
    )
  }

  if (mode === 'library') {
    return (
      <TabScreenShell wallpaper={wallpaper}>
        <ScrollView contentContainerStyle={styles.setupScroll}>
          <View style={styles.libHead}>
            <Text style={styles.pageTitle}>📚 My Library</Text>
            <TouchableOpacity onPress={() => setMode('setup')}>
              <Text style={styles.linkBtn}>← Back</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.sub}>{library.lessons?.length || 0} saved lessons</Text>
          {(library.lessons || []).map((l) => (
            <GlassSurface key={l.id} borderRadius={18} style={styles.libItem}>
              <TouchableOpacity onPress={() => replayLesson(l)} style={{ flex: 1 }}>
                <Text style={styles.libTopic}>{l.topic}</Text>
                <Text style={styles.libMeta}>{l.steps?.length || 0} steps · {new Date(l.date).toLocaleDateString()}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={async () => { await removeLesson(l.id); await refreshMeta(); setLibrary(await loadLibrary()) }}>
                <Feather name="trash-2" size={18} color="#e74c3c" />
              </TouchableOpacity>
            </GlassSurface>
          ))}
          <View style={{ height: 120 }} />
        </ScrollView>
      </TabScreenShell>
    )
  }

  if (mode === 'scene') {
    return (
      <TabScreenShell wallpaper={wallpaper}>
        <View style={styles.body}>
          <View style={styles.sceneTop}>
            <TouchableOpacity onPress={() => { setMode('setup'); setFlashcard(null); setQuiz(null) }}>
              <Text style={styles.linkBtn}>← Setup</Text>
            </TouchableOpacity>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progress}%` }]} />
            </View>
          </View>

          <View style={styles.main} pointerEvents="box-none">
            <GlassSurface borderRadius={22} style={[styles.board, prefs.whiteboardOn && styles.boardGreen]}>
              <Text style={[styles.boardTitle, prefs.whiteboardOn && styles.boardTitleGreen]}>{boardTitle}</Text>
              <ScrollView style={styles.boardScroll} showsVerticalScrollIndicator={false}>
                <Text style={[styles.boardContent, prefs.whiteboardOn && styles.boardContentGreen]}>{boardContent}</Text>
              </ScrollView>
            </GlassSurface>
            <View style={styles.asukaWrap} pointerEvents="none">
              <AsukaLive2D ref={asuka} style={styles.asuka} />
            </View>
          </View>

          <GlassSurface borderRadius={20} style={styles.dialogue}>
            <View style={styles.speakerPill}><Text style={styles.speaker}>Asuka</Text></View>
            <Text style={styles.line}>{lineText}</Text>
            {flashcard && (
              <View style={styles.fcBtns}>
                {!fcReveal ? (
                  <TouchableOpacity onPress={() => { setFcReveal(true); setBoardContent(flashcard.card.q + '\n\n— ' + flashcard.card.a); setLineText('Did you know it?') }}>
                    <GlassSurface borderRadius={14} style={styles.smallBtn}><Text style={styles.smallBtnText}>Show answer</Text></GlassSurface>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.fcRow}>
                    <TouchableOpacity onPress={async () => { await gradeCard(flashcard.i, false); openFlashcards() }}>
                      <GlassSurface borderRadius={14} style={[styles.smallBtn, styles.fcBad]}><Text style={styles.fcBadText}>Again</Text></GlassSurface>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={async () => { await gradeCard(flashcard.i, true); openFlashcards() }}>
                      <GlassSurface borderRadius={14} style={[styles.smallBtn, styles.fcGood]}><Text style={styles.fcGoodText}>Got it</Text></GlassSurface>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
            {!flashcard && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.ctrlRow}>
                <TouchableOpacity onPress={handleBack}><GlassSurface borderRadius={20} style={styles.ctrl}><Text style={styles.ctrlText}>◀ Back</Text></GlassSurface></TouchableOpacity>
                <TouchableOpacity onPress={() => setShowAsk(!showAsk)}><GlassSurface borderRadius={20} style={styles.ctrl}><Text style={styles.ctrlText}>✋ Ask</Text></GlassSurface></TouchableOpacity>
                {showNext && (
                  <TouchableOpacity onPress={handleNext}><GlassSurface borderRadius={20} style={styles.ctrl}><Text style={styles.ctrlText}>Next ▶</Text></GlassSurface></TouchableOpacity>
                )}
                {!showNext && !quiz && !flashcard && (
                  <TouchableOpacity onPress={finishLesson}><GlassSurface borderRadius={20} style={styles.ctrl}><Text style={styles.ctrlText}>Finish</Text></GlassSurface></TouchableOpacity>
                )}
              </ScrollView>
            )}
            {showAsk && (
              <View style={styles.askRow}>
                <GlassSurface borderRadius={20} style={{ flex: 1 }}>
                  <TextInput style={styles.askInput} value={askInput} onChangeText={setAskInput} placeholder="Ask about this step…" placeholderTextColor="rgba(0,0,0,0.35)" onSubmitEditing={submitAsk} />
                </GlassSurface>
                <TouchableOpacity onPress={submitAsk}><GlassSurface borderRadius={20} style={styles.askSend}><Text style={styles.askSendText}>Ask</Text></GlassSurface></TouchableOpacity>
              </View>
            )}
          </GlassSurface>

          {quiz && !flashcard && (
            <GlassSurface borderRadius={20} style={styles.quizBox}>
              <Text style={styles.quizTitle}>Quiz — {quiz.topic}</Text>
              {quiz.questions[quizIdx] && (
                <>
                  <Text style={styles.quizQ}>{quiz.questions[quizIdx].q}</Text>
                  {quiz.questions[quizIdx].options.map((opt, i) => (
                    <TouchableOpacity key={i} onPress={() => {
                      const correct = quiz.questions[quizIdx].correct === i
                      if (quizIdx + 1 >= quiz.questions.length) {
                        setQuiz(null)
                        setLineText(correct ? 'Perfect on the last one! 🎉' : 'Good try — review the board and flashcards.')
                      } else {
                        setQuizIdx(quizIdx + 1)
                        setLineText(correct ? 'Nice! Next one…' : 'Not quite — keep going!')
                      }
                    }}>
                      <GlassSurface borderRadius={14} style={styles.quizOpt}><Text style={styles.quizOptText}>{opt}</Text></GlassSurface>
                    </TouchableOpacity>
                  ))}
                </>
              )}
            </GlassSurface>
          )}

          <View style={{ height: 100 }} />
        </View>
      </TabScreenShell>
    )
  }

  return (
    <TabScreenShell wallpaper={wallpaper}>
      <ScrollView contentContainerStyle={styles.setupScroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.pageTitle}>Study with Asuka 🌸</Text>
        <Text style={styles.sub}>Add notes or a topic — she'll teach it on the board, step by step.</Text>

        {streak > 0 && (
          <GlassSurface borderRadius={20} style={styles.streakBadge}>
            <Text style={styles.streakText}>🔥 {streak}-day study streak</Text>
          </GlassSurface>
        )}

        <TouchableOpacity onPress={() => setPasteModal(true)} activeOpacity={0.85}>
          <GlassSurface borderRadius={18} style={styles.dropZone}>
            <Text style={styles.dropTitle}>📄 Add study material</Text>
            <Text style={styles.dropSub}>Paste notes or text — up to 5 blocks</Text>
          </GlassSurface>
        </TouchableOpacity>

        {materials.map((m) => (
          <GlassSurface key={m.id} borderRadius={14} style={styles.fileChip}>
            <Text style={styles.fileName} numberOfLines={1}>📄 {m.name}</Text>
            <TouchableOpacity onPress={() => setMaterials(materials.filter((x) => x.id !== m.id))}>
              <Feather name="x" size={18} color="#e74c3c" />
            </TouchableOpacity>
          </GlassSurface>
        ))}

        <View style={styles.toggleRow}>
          {renderToggle('Whiteboard', 'Formulas & notes', prefs.whiteboardOn, () => togglePref('whiteboardOn'))}
          {renderToggle('Voice', 'Read aloud', prefs.voiceOn, () => togglePref('voiceOn'))}
        </View>

        <TouchableOpacity onPress={startFromMaterials} disabled={!materials.length || busy} activeOpacity={0.85}>
          <GlassSurface borderRadius={28} style={[styles.primaryBtn, !materials.length && styles.primaryDisabled]}>
            <Text style={styles.primaryText}>Start the lesson</Text>
          </GlassSurface>
        </TouchableOpacity>

        <View style={styles.orRow}>
          <View style={styles.orLine} />
          <Text style={styles.orText}>OR — NO FILE NEEDED</Text>
          <View style={styles.orLine} />
        </View>

        <View style={styles.topicRow}>
          <GlassSurface borderRadius={16} style={{ flex: 1 }}>
            <TextInput style={styles.topicInput} value={topicInput} onChangeText={setTopicInput} placeholder={TOPIC_PLACEHOLDER} placeholderTextColor="rgba(0,0,0,0.35)" onSubmitEditing={() => startFromTopic()} />
          </GlassSurface>
          <TouchableOpacity onPress={() => startFromTopic()} activeOpacity={0.85}>
            <GlassSurface borderRadius={24} style={styles.teachBtn}>
              <Text style={styles.teachBtnText}>Teach me</Text>
            </GlassSurface>
          </TouchableOpacity>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity style={{ flex: 1 }} onPress={openLiveCameraSolve} activeOpacity={0.85}>
            <GlassSurface borderRadius={14} style={styles.actionChip}><Text style={styles.actionChipText}>📹 Live camera</Text></GlassSurface>
          </TouchableOpacity>
          <TouchableOpacity style={{ flex: 1 }} onPress={pickPhotoSolve} activeOpacity={0.85}>
            <GlassSurface borderRadius={14} style={styles.actionChip}><Text style={styles.actionChipText}>📷 Photo library</Text></GlassSurface>
          </TouchableOpacity>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setCheckModal(true)} activeOpacity={0.85}>
            <GlassSurface borderRadius={14} style={styles.actionChip}><Text style={styles.actionChipText}>✅ Check my work</Text></GlassSurface>
          </TouchableOpacity>
          <TouchableOpacity style={{ flex: 1 }} onPress={toggleTutor} activeOpacity={0.85}>
            <GlassSurface borderRadius={14} style={[styles.actionChip, prefs.tutorStyle === 'tutor' && styles.tutorOn]}>
              <Text style={styles.actionChipText}>🎓 Tutor: {prefs.tutorStyle === 'tutor' ? 'ON' : 'off'}</Text>
            </GlassSurface>
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => setMode('library')} activeOpacity={0.85}>
          <GlassSurface borderRadius={24} style={styles.ghostBtn}>
            <Text style={styles.ghostText}>📚 My Library — manage textbooks</Text>
          </GlassSurface>
        </TouchableOpacity>

        {cardsDue.total > 0 && (
          <TouchableOpacity onPress={openFlashcards} activeOpacity={0.85}>
            <GlassSurface borderRadius={24} style={styles.ghostBtn}>
              <Text style={styles.ghostText}>🃏 Review flashcards — {cardsDue.due} due</Text>
            </GlassSurface>
          </TouchableOpacity>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      <Modal visible={pasteModal} transparent animationType="slide">
        <View style={styles.modalWrap}>
          <GlassSurface borderRadius={24} style={styles.modalCard}>
            <Text style={styles.modalTitle}>📄 Add study material</Text>
            <Text style={styles.modalSub}>Paste chapter notes, homework, or any text you want Asuka to teach.</Text>
            <GlassSurface borderRadius={16} style={{ marginBottom: 10 }}>
              <TextInput style={styles.pasteNameInput} value={pasteName} onChangeText={setPasteName} placeholder="Label (optional)" placeholderTextColor="rgba(0,0,0,0.35)" />
            </GlassSurface>
            <GlassSurface borderRadius={16} style={{ marginBottom: 12 }}>
              <TextInput style={styles.checkInput} value={pasteText} onChangeText={setPasteText} multiline placeholder="Paste your text here…" placeholderTextColor="rgba(0,0,0,0.35)" />
            </GlassSurface>
            <TouchableOpacity onPress={addPastedMaterial} activeOpacity={0.85}>
              <GlassSurface borderRadius={20} style={styles.primaryBtn}><Text style={styles.primaryText}>Add material</Text></GlassSurface>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setPasteModal(false)} style={{ marginTop: 12, alignItems: 'center' }}>
              <Text style={styles.linkBtn}>Cancel</Text>
            </TouchableOpacity>
          </GlassSurface>
        </View>
      </Modal>

      <Modal visible={checkModal} transparent animationType="slide">
        <View style={styles.modalWrap}>
          <GlassSurface borderRadius={24} style={styles.modalCard}>
            <Text style={styles.modalTitle}>✅ Check my work</Text>
            <Text style={styles.modalSub}>Paste your work — Asuka will find mistakes.</Text>
            <GlassSurface borderRadius={16} style={{ marginBottom: 12 }}>
              <TextInput style={styles.checkInput} value={checkText} onChangeText={setCheckText} multiline placeholder="Paste your answers here…" placeholderTextColor="rgba(0,0,0,0.35)" />
            </GlassSurface>
            <TouchableOpacity onPress={submitCheckWork} activeOpacity={0.85}>
              <GlassSurface borderRadius={20} style={styles.primaryBtn}><Text style={styles.primaryText}>Check it</Text></GlassSurface>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setCheckModal(false)} style={{ marginTop: 12, alignItems: 'center' }}>
              <Text style={styles.linkBtn}>Cancel</Text>
            </TouchableOpacity>
          </GlassSurface>
        </View>
      </Modal>

      <Modal visible={busy} transparent animationType="fade">
        <View style={styles.loadingWrap}>
          <GlassSurface borderRadius={24} style={styles.loadingCard}>
            <ActivityIndicator color="#6c5ce7" size="large" />
            <Text style={styles.loadingText}>{loadingMsg || 'Working…'}</Text>
          </GlassSurface>
        </View>
      </Modal>
    </TabScreenShell>
  )
}

const styles = StyleSheet.create({
  setupScroll: { paddingHorizontal: 20, paddingTop: 8 },
  body: { flex: 1, paddingHorizontal: 20 },
  pageTitle: { fontSize: 26, fontWeight: '700', color: '#1a1a1a', letterSpacing: -0.4, marginBottom: 6 },
  sub: { fontSize: 14, lineHeight: 21, color: 'rgba(0,0,0,0.55)', marginBottom: 16 },
  streakBadge: { alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 8, marginBottom: 14 },
  streakText: { color: '#e08b2a', fontWeight: '700', fontSize: 13 },
  dropZone: { paddingVertical: 28, paddingHorizontal: 16, alignItems: 'center', marginBottom: 10, borderStyle: 'dashed' },
  dropTitle: { fontSize: 16, fontWeight: '700', color: '#1a1a1a', marginBottom: 4 },
  dropSub: { fontSize: 12, color: 'rgba(0,0,0,0.45)' },
  fileChip: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, marginBottom: 8 },
  fileName: { flex: 1, fontSize: 13, color: '#1a1a1a', marginRight: 8 },
  toggleRow: { flexDirection: 'row', gap: 10, marginVertical: 14 },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 },
  toggleOn: { borderColor: 'rgba(108,92,231,0.4)' },
  toggleTitle: { fontSize: 13, fontWeight: '700', color: '#1a1a1a' },
  toggleSub: { fontSize: 11, color: 'rgba(0,0,0,0.45)' },
  primaryBtn: { backgroundColor: 'rgba(108,92,231,0.9)', paddingVertical: 16, alignItems: 'center', marginBottom: 8 },
  primaryDisabled: { opacity: 0.45 },
  primaryText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  orRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 14 },
  orLine: { flex: 1, height: 1, backgroundColor: 'rgba(0,0,0,0.08)' },
  orText: { fontSize: 10, color: 'rgba(0,0,0,0.4)', fontWeight: '700' },
  topicRow: { flexDirection: 'row', gap: 8, marginBottom: 10, alignItems: 'center' },
  topicInput: { paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#1a1a1a' },
  teachBtn: { backgroundColor: 'rgba(108,92,231,0.9)', paddingHorizontal: 16, paddingVertical: 14 },
  teachBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  actionRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  actionChip: { paddingVertical: 12, paddingHorizontal: 8, alignItems: 'center' },
  actionChipText: { fontSize: 11, fontWeight: '600', color: '#1a1a1a', textAlign: 'center' },
  tutorOn: { borderColor: 'rgba(108,92,231,0.45)' },
  ghostBtn: { paddingVertical: 14, alignItems: 'center', marginBottom: 10 },
  ghostText: { fontSize: 13, fontWeight: '600', color: 'rgba(0,0,0,0.55)' },
  linkBtn: { color: '#6c5ce7', fontWeight: '600', fontSize: 14 },
  libHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  libItem: { flexDirection: 'row', alignItems: 'center', padding: 16, marginBottom: 10, gap: 12 },
  libTopic: { fontSize: 16, fontWeight: '700', color: '#1a1a1a' },
  libMeta: { fontSize: 12, color: 'rgba(0,0,0,0.45)', marginTop: 2 },
  sceneTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  progressTrack: { flex: 1, height: 4, backgroundColor: 'rgba(0,0,0,0.06)', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#6c5ce7' },
  main: { flex: 1, minHeight: 200, marginBottom: 12 },
  board: { flex: 1, marginRight: 88, padding: 16, minHeight: 160 },
  boardGreen: { backgroundColor: 'rgba(20,52,43,0.92)' },
  boardTitle: { fontSize: 11, letterSpacing: 1.5, fontWeight: '700', color: 'rgba(0,0,0,0.45)', marginBottom: 10, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  boardTitleGreen: { color: 'rgba(159,238,238,0.85)' },
  boardScroll: { flex: 1 },
  boardContent: { fontSize: 15, lineHeight: 22, color: '#1a1a1a', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  boardContentGreen: { color: '#eafff5' },
  asukaWrap: { position: 'absolute', right: -12, bottom: -20, width: 150, height: 220, zIndex: 2 },
  asuka: { flex: 1, backgroundColor: 'transparent' },
  dialogue: { padding: 16, marginBottom: 12 },
  speakerPill: { alignSelf: 'flex-start', backgroundColor: 'rgba(108,92,231,0.2)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, marginBottom: 8 },
  speaker: { fontSize: 12, fontWeight: '700', color: '#6c5ce7' },
  line: { fontSize: 15, lineHeight: 22, color: '#1a1a1a' },
  ctrlRow: { marginTop: 12, flexDirection: 'row', gap: 8 },
  ctrl: { paddingHorizontal: 14, paddingVertical: 8 },
  ctrlText: { fontSize: 12, fontWeight: '600', color: '#1a1a1a' },
  askRow: { flexDirection: 'row', gap: 8, marginTop: 10, alignItems: 'center' },
  askInput: { paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: '#1a1a1a' },
  askSend: { backgroundColor: '#6c5ce7', paddingHorizontal: 16, paddingVertical: 12 },
  askSendText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  fcBtns: { marginTop: 12 },
  fcRow: { flexDirection: 'row', gap: 10 },
  smallBtn: { paddingHorizontal: 16, paddingVertical: 10 },
  smallBtnText: { fontSize: 13, fontWeight: '600', color: '#1a1a1a' },
  fcBad: { borderColor: 'rgba(231,76,60,0.35)' },
  fcBadText: { color: '#e74c3c', fontWeight: '700' },
  fcGood: { borderColor: 'rgba(22,163,74,0.35)' },
  fcGoodText: { color: '#16a34a', fontWeight: '700' },
  quizBox: { padding: 16, marginBottom: 12 },
  quizTitle: { fontSize: 14, fontWeight: '700', color: '#6c5ce7', marginBottom: 8 },
  quizQ: { fontSize: 15, fontWeight: '600', color: '#1a1a1a', marginBottom: 10 },
  quizOpt: { padding: 12, marginBottom: 8 },
  quizOptText: { fontSize: 14, color: '#1a1a1a' },
  modalWrap: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.25)', padding: 16 },
  modalCard: { padding: 20, marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#1a1a1a', marginBottom: 6 },
  modalSub: { fontSize: 14, color: 'rgba(0,0,0,0.55)', marginBottom: 12 },
  checkInput: { minHeight: 120, padding: 14, fontSize: 14, color: '#1a1a1a', textAlignVertical: 'top' },
  pasteNameInput: { padding: 14, fontSize: 14, color: '#1a1a1a' },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.35)' },
  loadingCard: { padding: 28, alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 14, color: 'rgba(0,0,0,0.55)' },
})
