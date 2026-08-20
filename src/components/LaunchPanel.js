import { Feather } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator, Image, Modal, ScrollView, StyleSheet, Text, TextInput,
  TouchableOpacity, View,
} from 'react-native'
import { WebView } from 'react-native-webview'
import {
  CREATE_MODES, generateLogo, generateMarketingPack, generateSite, WEBSITE_TYPES,
} from '../lib/launch'
import { deletePdf, generateResumePdf, sharePdf } from '../lib/resumePdf'
import {
  addCreateHistory,
  getProfileHints,
  loadCreateHistory,
  loadResumeProfile,
  loadWebsiteDraft,
  removeCreateHistory,
  resumeFromHistory,
  saveResumeProfile,
  saveWebsiteDraft,
  websiteFromHistory,
} from '../lib/resumeStore'
import GlassSurface from './GlassSurface'
import WallpaperBackground from './WallpaperBackground'

const WEBSITE_ICONS = {
  coin: 'zap',
  business: 'briefcase',
  portfolio: 'layers',
  event: 'calendar',
}

function StepDot({ n, label, active, done }) {
  return (
    <View style={styles.stepItem}>
      <View style={[styles.stepCircle, (active || done) && styles.stepCircleOn]}>
        {done ? (
          <Feather name="check" size={12} color="#fff" />
        ) : (
          <Text style={[styles.stepNum, (active || done) && styles.stepNumOn]}>{n}</Text>
        )}
      </View>
      <Text style={[styles.stepLabel, active && styles.stepLabelOn]}>{label}</Text>
    </View>
  )
}

function Field({ label, hint, ...props }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {!!hint && <Text style={styles.fieldHint}>{hint}</Text>}
      <TextInput
        style={[styles.input, props.multiline && styles.textArea]}
        placeholderTextColor="rgba(0,0,0,0.35)"
        {...props}
      />
    </View>
  )
}

function formatWhen(ts) {
  if (!ts) return ''
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function HistoryCard({ item, onLoad, onPreview, onShare, onDelete }) {
  const isResume = item.mode === 'resume'
  const badge = item.isDraft ? 'Saved draft' : (isResume ? 'PDF' : item.form?.siteType || 'Website')
  const canPreview = !!(item.pdfUri || item.html)
  return (
    <GlassSurface borderRadius={14} style={styles.historyCard}>
      <TouchableOpacity activeOpacity={0.85} onPress={() => onLoad(item)} style={styles.historyMain}>
        <View style={styles.historyIcon}>
          <Feather name={isResume ? 'file-text' : 'globe'} size={16} color="#6c5ce7" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.historyTitle} numberOfLines={1}>{item.title || 'Untitled'}</Text>
          <Text style={styles.historyMeta}>{formatWhen(item.createdAt || item.updatedAt)} · {badge}</Text>
          {!!item.subtitle && (
            <Text style={styles.historySub} numberOfLines={1}>{item.subtitle}</Text>
          )}
        </View>
      </TouchableOpacity>
      <View style={styles.historyActions}>
        {canPreview && (
          <TouchableOpacity
            onPress={() => onPreview(item)}
            style={styles.historyBtn}
            hitSlop={8}
          >
            <Feather name="eye" size={15} color="#6c5ce7" />
          </TouchableOpacity>
        )}
        {!!item.pdfUri && (
          <TouchableOpacity onPress={() => onShare(item.pdfUri)} style={styles.historyBtn} hitSlop={8}>
            <Feather name="share-2" size={15} color="#6c5ce7" />
          </TouchableOpacity>
        )}
        {!item.isDraft && (
          <TouchableOpacity onPress={() => onDelete(item)} style={styles.historyBtn} hitSlop={8}>
            <Feather name="trash-2" size={15} color="rgba(0,0,0,0.35)" />
          </TouchableOpacity>
        )}
      </View>
    </GlassSurface>
  )
}

export default function LaunchPanel({ wallpaper, profile }) {
  const [mode, setMode] = useState('website')
  const [siteType, setSiteType] = useState('business')
  const [name, setName] = useState('')
  const [symbol, setSymbol] = useState('')
  const [tagline, setTagline] = useState('')
  const [brief, setBrief] = useState('')
  const [experience, setExperience] = useState('')
  const [skills, setSkills] = useState('')
  const [education, setEducation] = useState('')
  const [contact, setContact] = useState('')
  const [ca, setCa] = useState('')
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [note, setNote] = useState('')
  const [logoUri, setLogoUri] = useState(null)
  const [marketing, setMarketing] = useState(null)
  const [previewHtml, setPreviewHtml] = useState(null)
  const [previewPdfUri, setPreviewPdfUri] = useState(null)
  const [history, setHistory] = useState([])
  const [savedResume, setSavedResume] = useState(null)
  const [hydrated, setHydrated] = useState(false)
  const resumeSaveTimer = useRef(null)
  const websiteSaveTimer = useRef(null)
  const autoLoadedResume = useRef(false)

  const applyResumeFields = useCallback((data) => {
    if (!data) return
    if (data.name) setName(data.name)
    if (data.tagline) setTagline(data.tagline)
    if (data.experience) setExperience(data.experience)
    if (data.skills) setSkills(data.skills)
    if (data.education) setEducation(data.education)
    if (data.contact) setContact(data.contact)
  }, [])

  const applyWebsiteFields = useCallback((data) => {
    if (!data) return
    if (data.siteType) setSiteType(data.siteType)
    if (data.name) setName(data.name)
    if (data.symbol) setSymbol(data.symbol)
    if (data.tagline) setTagline(data.tagline)
    if (data.brief) setBrief(data.brief)
    if (data.ca) setCa(data.ca)
  }, [])

  useEffect(() => {
    let alive = true
    ;(async () => {
      const [resume, webDraft, list] = await Promise.all([
        loadResumeProfile(),
        loadWebsiteDraft(),
        loadCreateHistory(),
      ])
      if (!alive) return
      setSavedResume(resume)
      setHistory(list)
      if (webDraft?.name) applyWebsiteFields(webDraft)
      setHydrated(true)
    })()
    return () => { alive = false }
  }, [applyWebsiteFields])

  useEffect(() => {
    if (!hydrated || mode !== 'resume' || autoLoadedResume.current) return
    autoLoadedResume.current = true
    if (savedResume?.name && !name.trim()) applyResumeFields(savedResume)
  }, [hydrated, mode, savedResume, name, applyResumeFields])

  useEffect(() => {
    if (!hydrated || mode !== 'resume') return
    if (resumeSaveTimer.current) clearTimeout(resumeSaveTimer.current)
    resumeSaveTimer.current = setTimeout(() => {
      const hasContent = name || tagline || experience || skills || education || contact
      if (!hasContent) return
      saveResumeProfile({ name, tagline, experience, skills, education, contact }).then(setSavedResume)
    }, 900)
    return () => { if (resumeSaveTimer.current) clearTimeout(resumeSaveTimer.current) }
  }, [hydrated, mode, name, tagline, experience, skills, education, contact])

  useEffect(() => {
    if (!hydrated || mode !== 'website') return
    if (websiteSaveTimer.current) clearTimeout(websiteSaveTimer.current)
    websiteSaveTimer.current = setTimeout(() => {
      const hasContent = name || tagline || brief || symbol
      if (!hasContent) return
      saveWebsiteDraft({ siteType, name, symbol, tagline, brief, ca })
    }, 900)
    return () => { if (websiteSaveTimer.current) clearTimeout(websiteSaveTimer.current) }
  }, [hydrated, mode, siteType, name, symbol, tagline, brief, ca])

  const step = name.trim() ? (mode === 'resume' ? 3 : (tagline.trim() ? 3 : 2)) : 1
  const showMarketing = mode === 'website' && (siteType === 'coin' || siteType === 'business')
  const showLogo = mode === 'website'

  const resumeHistory = [
    savedResume?.name ? { id: 'saved-resume', isDraft: true, mode: 'resume', title: savedResume.name, subtitle: savedResume.tagline, form: savedResume, updatedAt: savedResume.updatedAt } : null,
    ...history.filter((h) => h.mode === 'resume'),
  ].filter(Boolean)

  const websiteHistory = [
    ...history.filter((h) => h.mode === 'website'),
  ]

  const visibleHistory = mode === 'resume' ? resumeHistory : websiteHistory

  const form = () => {
    if (mode === 'resume') {
      return {
        siteType: 'resume',
        name: name.trim(),
        tagline: tagline.trim(),
        experience: experience.trim(),
        skills: skills.trim(),
        education: education.trim(),
        contact: contact.trim(),
        customBrief: [experience, skills, education, contact].filter(Boolean).join('\n\n'),
      }
    }
    return {
      siteType,
      name: name.trim(),
      symbol: symbol.trim(),
      tagline: tagline.trim(),
      customBrief: brief.trim(),
      ca: ca.trim(),
      vibe: 'animated',
      logoDataUri: logoUri,
    }
  }

  async function fillFromProfile() {
    const hints = await getProfileHints()
    const profileName = profile?.name || hints.name
    const profileEmail = hints.email
    if (profileName && !name.trim()) setName(profileName)
    if (profileEmail && !contact.trim()) setContact(profileEmail)
    setNote(profileName ? 'Filled from your app profile' : 'Add your name in Settings to auto-fill')
  }

  async function saveDraftNow() {
    if (mode === 'resume') {
      const saved = await saveResumeProfile({ name, tagline, experience, skills, education, contact })
      setSavedResume(saved)
      setNote('Resume draft saved on this device')
    } else {
      await saveWebsiteDraft({ siteType, name, symbol, tagline, brief, ca })
      setNote('Website draft saved on this device')
    }
  }

  function loadHistoryItem(item) {
    setError('')
    setNote(item.isDraft ? 'Loaded your saved resume' : 'Loaded previous build — edit & regenerate anytime')
    if (item.mode === 'resume') {
      setMode('resume')
      applyResumeFields(resumeFromHistory(item) || item.form)
    } else {
      setMode('website')
      applyWebsiteFields(websiteFromHistory(item) || item.form)
    }
  }

  function previewHistoryItem(item) {
    if (item.pdfUri) {
      setPreviewHtml(null)
      setPreviewPdfUri(item.pdfUri)
    } else if (item.html) {
      setPreviewPdfUri(null)
      setPreviewHtml(item.html)
    }
  }

  async function shareHistoryPdf(uri) {
    try {
      await sharePdf(uri)
    } catch (e) {
      setError(e?.message || 'Could not share PDF')
    }
  }

  async function deleteHistoryItem(item) {
    if (item.pdfUri) await deletePdf(item.pdfUri)
    if (item.id === 'saved-resume') return
    const next = await removeCreateHistory(item.id)
    setHistory(next)
  }

  async function run(action, fn) {
    if (!name.trim()) {
      setError(mode === 'resume' ? 'Your name is required' : 'Project name is required')
      return
    }
    setBusy(action)
    setError('')
    setNote('')
    const payload = form()
    const r = await fn(payload)
    setBusy('')
    if (action === 'logo' && r?.success && r.dataUri) {
      setLogoUri(r.dataUri)
      if (r.note) setNote(r.note)
    } else if (action === 'marketing' && r?.success) {
      setMarketing(r.pack)
      if (r.note) setNote(r.note)
    } else if (action === 'site' && r?.success && (r.pdfUri || r.html)) {
      if (r.pdfUri) {
        setPreviewHtml(null)
        setPreviewPdfUri(r.pdfUri)
      } else {
        setPreviewPdfUri(null)
        setPreviewHtml(r.html)
      }
      if (r.note) setNote(r.note)
      const entry = mode === 'resume'
        ? {
          mode: 'resume',
          title: payload.name,
          subtitle: payload.tagline,
          form: payload,
          pdfUri: r.pdfUri || null,
          html: r.html,
        }
        : {
          mode: 'website',
          title: payload.name,
          subtitle: payload.tagline || payload.symbol,
          form: payload,
          html: r.html,
        }
      const next = await addCreateHistory(entry)
      setHistory(next)
    } else if (!r?.success) {
      setError(r?.error || 'Generation failed')
    }
  }

  function closePreview() {
    setPreviewHtml(null)
    setPreviewPdfUri(null)
  }

  const wp = wallpaper?.currentWallpaper ?? wallpaper
  const primaryLabel = mode === 'resume' ? 'Export PDF' : 'Generate website'

  return (
    <View>
      <LinearGradient
        colors={['rgba(108,92,231,0.35)', 'rgba(0,212,255,0.12)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <Text style={styles.heroEyebrow}>Create Studio</Text>
        <Text style={styles.heroTitle}>Build something{'\n'}worth sharing</Text>
        <Text style={styles.heroSub}>
          Resumes export as PDF files on your device. Websites still preview in the browser.
        </Text>
      </LinearGradient>

      {!!visibleHistory.length && (
        <>
          <Text style={styles.blockTitle}>
            {mode === 'resume' ? 'Your resumes' : 'Previous projects'}
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.historyRow}
          >
            {visibleHistory.map((item) => (
              <HistoryCard
                key={item.id}
                item={item}
                onLoad={loadHistoryItem}
                onPreview={previewHistoryItem}
                onShare={shareHistoryPdf}
                onDelete={deleteHistoryItem}
              />
            ))}
          </ScrollView>
        </>
      )}

      <View style={styles.steps}>
        <StepDot n={1} label="Type" active={step === 1} done={step > 1} />
        <View style={styles.stepLine} />
        <StepDot n={2} label="Details" active={step === 2} done={step > 2} />
        <View style={styles.stepLine} />
        <StepDot n={3} label="Generate" active={step === 3} done={false} />
      </View>

      <Text style={styles.blockTitle}>What are you building?</Text>
      <View style={styles.modeRow}>
        {CREATE_MODES.map((m) => {
          const on = mode === m.id
          const icon = m.id === 'website' ? 'globe' : 'file-text'
          return (
            <TouchableOpacity
              key={m.id}
              activeOpacity={0.85}
              onPress={() => { setMode(m.id); setError(''); setMarketing(null) }}
              style={[styles.modeCard, on && styles.modeCardOn]}
            >
              <View style={[styles.modeIcon, on && styles.modeIconOn]}>
                <Feather name={icon} size={20} color={on ? '#fff' : '#6c5ce7'} />
              </View>
              <Text style={[styles.modeLabel, on && styles.modeLabelOn]}>{m.label}</Text>
              <Text style={styles.modeDesc}>{m.desc}</Text>
            </TouchableOpacity>
          )
        })}
      </View>

      {mode === 'website' && (
        <>
          <Text style={styles.blockTitle}>Website style</Text>
          <View style={styles.typeGrid}>
            {WEBSITE_TYPES.map((t) => {
              const on = siteType === t.id
              return (
                <TouchableOpacity
                  key={t.id}
                  activeOpacity={0.85}
                  onPress={() => setSiteType(t.id)}
                  style={[styles.typeCard, on && styles.typeCardOn]}
                >
                  <Feather
                    name={WEBSITE_ICONS[t.id] || 'box'}
                    size={18}
                    color={on ? '#6c5ce7' : 'rgba(0,0,0,0.4)'}
                  />
                  <Text style={[styles.typeLabel, on && styles.typeLabelOn]}>{t.label}</Text>
                  <Text style={styles.typeDesc} numberOfLines={2}>{t.desc}</Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </>
      )}

      <View style={styles.blockHead}>
        <Text style={styles.blockTitleInline}>{mode === 'resume' ? 'Your profile' : 'Project details'}</Text>
        {mode === 'resume' && (
          <View style={styles.quickRow}>
            <TouchableOpacity style={styles.quickChip} onPress={fillFromProfile} activeOpacity={0.85}>
              <Feather name="user" size={12} color="#6c5ce7" />
              <Text style={styles.quickChipText}>Use profile</Text>
            </TouchableOpacity>
            {!!savedResume?.name && (
              <TouchableOpacity
                style={styles.quickChip}
                onPress={() => loadHistoryItem({ mode: 'resume', form: savedResume, isDraft: true })}
                activeOpacity={0.85}
              >
                <Feather name="rotate-ccw" size={12} color="#6c5ce7" />
                <Text style={styles.quickChipText}>Saved draft</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      <GlassSurface borderRadius={18} style={styles.form}>
        {mode === 'resume' ? (
          <>
            <Field label="Full name" placeholder="Alex Chen" value={name} onChangeText={setName} />
            <Field
              label="Professional title"
              hint="Headline under your name"
              placeholder="Senior Product Designer"
              value={tagline}
              onChangeText={setTagline}
            />
            <Field
              label="Experience"
              hint="Past roles, companies, dates — add as much as you want"
              placeholder={'Product Designer · Acme Co · 2021–present\nLed mobile redesign…\n\nJunior Dev · Startup · 2019–2021'}
              value={experience}
              onChangeText={setExperience}
              multiline
            />
            <Field
              label="Skills"
              hint="Comma-separated works best"
              placeholder="Figma, React, UX research, prototyping"
              value={skills}
              onChangeText={setSkills}
            />
            <Field
              label="Education"
              placeholder="B.A. Design · State University · 2019"
              value={education}
              onChangeText={setEducation}
              multiline
            />
            <Field
              label="Contact"
              placeholder="email@you.com · linkedin.com/in/you"
              value={contact}
              onChangeText={setContact}
              autoCapitalize="none"
            />
          </>
        ) : (
          <>
            <Field
              label="Name"
              placeholder={siteType === 'coin' ? 'MoonCat' : 'Acme Studio'}
              value={name}
              onChangeText={setName}
            />
            {siteType === 'coin' && (
              <>
                <Field
                  label="Ticker"
                  placeholder="MOON"
                  value={symbol}
                  onChangeText={setSymbol}
                  autoCapitalize="characters"
                />
                <Field
                  label="Contract (optional)"
                  placeholder="0x…"
                  value={ca}
                  onChangeText={setCa}
                  autoCapitalize="none"
                />
              </>
            )}
            <Field
              label="Tagline"
              placeholder="One line that sells the vibe"
              value={tagline}
              onChangeText={setTagline}
            />
            <Field
              label="About / brief"
              hint="Extra context for the AI builder"
              placeholder="What should visitors know?"
              value={brief}
              onChangeText={setBrief}
              multiline
            />
            {!!logoUri && (
              <View style={styles.logoWrap}>
                <Image source={{ uri: logoUri }} style={styles.logo} />
                <Text style={styles.logoCaption}>Logo attached</Text>
              </View>
            )}
          </>
        )}

        <TouchableOpacity
          style={styles.btnGhost}
          onPress={saveDraftNow}
          disabled={!!busy}
          activeOpacity={0.85}
        >
          <Feather name="save" size={14} color="#6c5ce7" />
          <Text style={styles.btnGhostText}>Save draft on device</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.btnPrimary}
          onPress={() => run('site', mode === 'resume' ? generateResumePdf : generateSite)}
          disabled={!!busy}
          activeOpacity={0.85}
        >
          {busy === 'site' ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Feather name={mode === 'resume' ? 'download' : 'zap'} size={16} color="#fff" />
              <Text style={styles.btnPrimaryText}>{primaryLabel}</Text>
            </>
          )}
        </TouchableOpacity>

        {(showLogo || showMarketing) && (
          <View style={styles.btnRow}>
            {showLogo && (
              <TouchableOpacity
                style={styles.btnSec}
                onPress={() => run('logo', generateLogo)}
                disabled={!!busy}
              >
                {busy === 'logo' ? (
                  <ActivityIndicator color="#6c5ce7" />
                ) : (
                  <>
                    <Feather name="image" size={14} color="#6c5ce7" />
                    <Text style={styles.btnSecText}>Logo</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
            {showMarketing && (
              <TouchableOpacity
                style={styles.btnSec}
                onPress={() => run('marketing', generateMarketingPack)}
                disabled={!!busy}
              >
                {busy === 'marketing' ? (
                  <ActivityIndicator color="#6c5ce7" />
                ) : (
                  <>
                    <Feather name="message-circle" size={14} color="#6c5ce7" />
                    <Text style={styles.btnSecText}>Marketing</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}

        {!!error && <Text style={styles.err}>{error}</Text>}
        {!!note && !error && <Text style={styles.note}>{note}</Text>}
      </GlassSurface>

      {!!marketing && (
        <GlassSurface borderRadius={18} style={styles.pack}>
          <View style={styles.packHead}>
            <Feather name="volume-2" size={16} color="#6c5ce7" />
            <Text style={styles.packTitle}>Marketing pack</Text>
          </View>
          {(marketing.thread || []).slice(0, 3).map((t, i) => (
            <Text key={i} style={styles.packItem}>🐦 {t}</Text>
          ))}
          {!!marketing.tgAnnouncement && (
            <Text style={styles.packItem}>📢 {marketing.tgAnnouncement.slice(0, 140)}…</Text>
          )}
        </GlassSurface>
      )}

      <Modal visible={!!(previewHtml || previewPdfUri)} animationType="slide" onRequestClose={closePreview}>
        <WallpaperBackground wallpaper={wp}>
          <View style={styles.previewWrap}>
            <View style={styles.previewBar}>
              <TouchableOpacity onPress={closePreview} style={styles.previewBack} activeOpacity={0.7}>
                <Feather name="arrow-left" size={20} color="#6c5ce7" />
                <Text style={styles.previewClose}>Back</Text>
              </TouchableOpacity>
              <Text style={styles.previewTitle}>{previewPdfUri ? 'Resume PDF' : 'Preview'}</Text>
              {previewPdfUri ? (
                <TouchableOpacity
                  onPress={() => shareHistoryPdf(previewPdfUri)}
                  style={styles.previewShare}
                  activeOpacity={0.7}
                >
                  <Feather name="share-2" size={18} color="#6c5ce7" />
                </TouchableOpacity>
              ) : (
                <View style={{ width: 72 }} />
              )}
            </View>
            {previewPdfUri ? (
              <WebView originWhitelist={['*']} source={{ uri: previewPdfUri }} style={styles.webview} />
            ) : previewHtml ? (
              <WebView originWhitelist={['*']} source={{ html: previewHtml }} style={styles.webview} />
            ) : null}
          </View>
        </WallpaperBackground>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  hero: {
    borderRadius: 20,
    padding: 22,
    marginBottom: 16,
  },
  heroEyebrow: {
    fontSize: 11,
    fontWeight: '800',
    color: '#6c5ce7',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1a1a1a',
    marginTop: 6,
    lineHeight: 32,
    letterSpacing: -0.5,
  },
  heroSub: {
    fontSize: 13,
    color: 'rgba(0,0,0,0.5)',
    marginTop: 10,
    lineHeight: 20,
  },
  historyRow: { gap: 10, paddingBottom: 4, marginBottom: 14 },
  historyCard: {
    width: 220,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  historyIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(108,92,231,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyTitle: { fontSize: 14, fontWeight: '800', color: '#1a1a1a' },
  historyMeta: { fontSize: 10, color: 'rgba(0,0,0,0.4)', marginTop: 2 },
  historySub: { fontSize: 11, color: 'rgba(0,0,0,0.45)', marginTop: 2 },
  historyActions: { flexDirection: 'row', gap: 4, marginLeft: 6 },
  historyBtn: { padding: 6 },
  steps: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    paddingHorizontal: 8,
  },
  stepItem: { alignItems: 'center', width: 72 },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  stepCircleOn: { backgroundColor: '#6c5ce7', borderColor: '#6c5ce7' },
  stepNum: { fontSize: 12, fontWeight: '800', color: 'rgba(0,0,0,0.35)' },
  stepNumOn: { color: '#fff' },
  stepLabel: { fontSize: 10, color: 'rgba(0,0,0,0.35)', marginTop: 4, fontWeight: '600' },
  stepLabelOn: { color: '#6c5ce7' },
  stepLine: { flex: 1, height: 1, backgroundColor: 'rgba(0,0,0,0.08)', marginBottom: 16 },
  blockTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 10,
  },
  blockHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 8,
  },
  blockTitleInline: { fontSize: 14, fontWeight: '700', color: '#1a1a1a' },
  quickRow: { flexDirection: 'row', gap: 6, flexShrink: 1, flexWrap: 'wrap', justifyContent: 'flex-end' },
  quickChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(108,92,231,0.12)',
  },
  quickChipText: { fontSize: 11, fontWeight: '700', color: '#6c5ce7' },
  modeRow: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  modeCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.45)',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  modeCardOn: {
    backgroundColor: 'rgba(108,92,231,0.12)',
    borderColor: 'rgba(108,92,231,0.35)',
  },
  modeIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(108,92,231,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  modeIconOn: { backgroundColor: '#6c5ce7' },
  modeLabel: { fontSize: 15, fontWeight: '800', color: '#1a1a1a' },
  modeLabelOn: { color: '#6c5ce7' },
  modeDesc: { fontSize: 11, color: 'rgba(0,0,0,0.45)', marginTop: 4, lineHeight: 16 },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 18,
  },
  typeCard: {
    width: '48%',
    flexGrow: 1,
    minWidth: '46%',
    padding: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.45)',
    borderWidth: 1.5,
    borderColor: 'transparent',
    gap: 4,
  },
  typeCardOn: {
    backgroundColor: 'rgba(108,92,231,0.1)',
    borderColor: 'rgba(108,92,231,0.3)',
  },
  typeLabel: { fontSize: 13, fontWeight: '700', color: '#1a1a1a', marginTop: 4 },
  typeLabelOn: { color: '#6c5ce7' },
  typeDesc: { fontSize: 10, color: 'rgba(0,0,0,0.4)', lineHeight: 14 },
  form: { padding: 16, marginBottom: 12 },
  field: { marginBottom: 12 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: '#1a1a1a', marginBottom: 2 },
  fieldHint: { fontSize: 10, color: 'rgba(0,0,0,0.4)', marginBottom: 6 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1a1a1a',
  },
  textArea: { minHeight: 88, textAlignVertical: 'top' },
  logoWrap: { alignItems: 'center', marginBottom: 12 },
  logo: { width: 72, height: 72, borderRadius: 36 },
  logoCaption: { fontSize: 10, color: 'rgba(0,0,0,0.4)', marginTop: 6 },
  btnGhost: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    marginBottom: 8,
  },
  btnGhostText: { color: '#6c5ce7', fontWeight: '700', fontSize: 12 },
  btnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#6c5ce7',
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 4,
  },
  btnPrimaryText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  btnRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  btnSec: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(108,92,231,0.12)',
    paddingVertical: 12,
    borderRadius: 12,
  },
  btnSecText: { color: '#6c5ce7', fontWeight: '700', fontSize: 13 },
  err: { marginTop: 12, fontSize: 12, color: '#ef4444', textAlign: 'center', lineHeight: 18 },
  note: { marginTop: 12, fontSize: 11, color: 'rgba(0,0,0,0.45)', textAlign: 'center', lineHeight: 16 },
  pack: { padding: 16, marginBottom: 12 },
  packHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  packTitle: { fontWeight: '800', fontSize: 14, color: '#1a1a1a' },
  packItem: { fontSize: 12, color: 'rgba(0,0,0,0.55)', marginBottom: 6, lineHeight: 18 },
  previewWrap: { flex: 1, paddingTop: 48 },
  previewBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  previewBack: { flexDirection: 'row', alignItems: 'center', gap: 6, width: 72 },
  previewClose: { fontWeight: '700', color: '#6c5ce7', fontSize: 16 },
  previewShare: { width: 72, alignItems: 'flex-end', paddingRight: 4 },
  previewTitle: { fontSize: 15, fontWeight: '700', color: '#1a1a1a' },
  webview: { flex: 1, backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16 },
})
