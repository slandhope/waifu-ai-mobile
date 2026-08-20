import * as FileSystem from 'expo-file-system/legacy'
import { generateSite } from './launch'
import { isExpoGo } from '../utils/isExpoGo'

const RESUME_DIR = `${FileSystem.documentDirectory}resumes/`

function safeFilename(name) {
  return String(name || 'resume').replace(/[^\w\-]+/g, '_').slice(0, 48)
}

async function loadPrintModule() {
  if (isExpoGo()) return null
  try {
    return await import('expo-print')
  } catch (_e) {
    return null
  }
}

async function loadSharingModule() {
  if (isExpoGo()) return null
  try {
    return await import('expo-sharing')
  } catch (_e) {
    return null
  }
}

export async function isPdfExportAvailable() {
  const Print = await loadPrintModule()
  return !!Print?.printToFileAsync
}

export async function saveHtmlAsPdf(html, basename) {
  await FileSystem.makeDirectoryAsync(RESUME_DIR, { intermediates: true })
  const Print = await loadPrintModule()

  if (!Print?.printToFileAsync) {
    const filename = `${safeFilename(basename)}_${Date.now()}.html`
    const dest = `${RESUME_DIR}${filename}`
    await FileSystem.writeAsStringAsync(dest, html)
    const err = new Error(
      'PDF export needs a dev build with expo-print. Run: npx expo run:ios (or run:android). Saved as HTML for now.',
    )
    err.code = 'pdf_unavailable'
    err.htmlUri = dest
    throw err
  }

  const filename = `${safeFilename(basename)}_${Date.now()}.pdf`
  const dest = `${RESUME_DIR}${filename}`

  const { uri } = await Print.printToFileAsync({
    html,
    width: 612,
    height: 792,
  })

  await FileSystem.copyAsync({ from: uri, to: dest })
  try { await FileSystem.deleteAsync(uri, { idempotent: true }) } catch (_e) {}

  return dest
}

export async function generateResumePdf(form) {
  const siteResult = await generateSite(form)
  if (!siteResult?.success || !siteResult.html) {
    return siteResult?.success === false
      ? siteResult
      : { success: false, error: 'Resume content generation failed' }
  }

  try {
    const pdfUri = await saveHtmlAsPdf(siteResult.html, form.name)
    return {
      success: true,
      pdfUri,
      html: siteResult.html,
      via: siteResult.via,
      note: siteResult.note
        ? `${siteResult.note} · Saved as PDF`
        : 'Resume saved as PDF on this device',
    }
  } catch (e) {
    if (e.code === 'pdf_unavailable' && e.htmlUri) {
      return {
        success: true,
        htmlUri: e.htmlUri,
        html: siteResult.html,
        pdfUri: null,
        via: siteResult.via,
        note: e.message,
      }
    }
    return { success: false, error: e?.message || 'PDF export failed' }
  }
}

export async function sharePdf(uri, title = 'Share resume PDF') {
  const Sharing = await loadSharingModule()
  if (!Sharing?.isAvailableAsync) {
    throw new Error('Sharing needs a dev build — run: npx expo run:ios')
  }
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Sharing is not available on this device')
  }
  const isHtml = uri.endsWith('.html')
  await Sharing.shareAsync(uri, {
    mimeType: isHtml ? 'text/html' : 'application/pdf',
    UTI: isHtml ? 'public.html' : 'com.adobe.pdf',
    dialogTitle: title,
  })
}

export async function deletePdf(uri) {
  if (!uri?.startsWith(RESUME_DIR)) return
  try { await FileSystem.deleteAsync(uri, { idempotent: true }) } catch (_e) {}
}
