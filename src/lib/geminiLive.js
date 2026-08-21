import { apiCall } from '../utils/api'

const GEMINI_WS =
  'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent'

const DEFAULT_MODEL = 'gemini-2.0-flash-live-001'

/**
 * Phase 2 — Gemini Live session (video frames + text turns).
 * Falls back gracefully if token fetch fails (guest / no credits).
 */
export class GeminiLiveSession {
  constructor({ onStatus, onReply, onError } = {}) {
    this.ws = null
    this.ready = false
    this.buffer = ''
    this.handlers = { onStatus, onReply, onError }
    this._connectTimer = null
  }

  async connect(systemPrompt) {
    const res = await apiCall('/ai/gemini-token', {
      method: 'POST',
      body: JSON.stringify({ model: DEFAULT_MODEL }),
    })
    const j = await res.json().catch(() => ({}))
    if (!res.ok) {
      const err = new Error(j.message || j.error || 'gemini_token_failed')
      err.code = j.error
      throw err
    }
    const token = j.token
    if (!token) throw new Error('no_gemini_token')

    this.handlers.onStatus?.('Connecting to Gemini Live…')

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(`${GEMINI_WS}?access_tokenkey=${encodeURIComponent(token)}`)
      } catch (e) {
        reject(e)
        return
      }

      this.ws.onopen = () => {
        const setup = {
          setup: {
            model: 'models/' + DEFAULT_MODEL,
            generationConfig: {
              responseModalities: ['TEXT'],
            },
            outputAudioTranscription: {},
            systemInstruction: {
              parts: [{
                text: (systemPrompt || 'You are Asuka, a warm anime companion on mobile.') +
                  '\n\nKeep replies to 1-3 short sentences. You can see through the phone camera when video frames are sent.',
              }],
            },
          },
        }
        this.ws.send(JSON.stringify(setup))
        this._connectTimer = setTimeout(() => {
          if (!this.ready && this.ws?.readyState === WebSocket.OPEN) {
            this.ready = true
            this.handlers.onStatus?.('Live — Asuka can see you')
            resolve(true)
          }
        }, 2500)
      }

      this.ws.onmessage = (event) => {
        let raw = event.data
        if (raw instanceof Blob) {
          raw.text().then((t) => this._handleMessage(t)).catch(() => {})
          return
        }
        this._handleMessage(typeof raw === 'string' ? raw : '')
      }

      this.ws.onerror = () => {
        this.handlers.onError?.('Gemini connection error')
      }

      this.ws.onclose = () => {
        this.ready = false
        if (this._connectTimer) clearTimeout(this._connectTimer)
        this.handlers.onStatus?.('Live ended')
      }
    })
  }

  _handleMessage(raw) {
    if (!raw) return
    try {
      const data = JSON.parse(raw)
      if (data.setupComplete) {
        this.ready = true
        if (this._connectTimer) clearTimeout(this._connectTimer)
        this.handlers.onStatus?.('Live — Asuka can see you')
      }
      if (data.serverContent?.outputTranscription?.text) {
        this.buffer += data.serverContent.outputTranscription.text
      }
      if (data.serverContent?.modelTurn?.parts) {
        for (const part of data.serverContent.modelTurn.parts) {
          if (part.text) this.buffer += part.text
        }
      }
      if (data.serverContent?.turnComplete) {
        const text = this.buffer.trim()
        this.buffer = ''
        if (text) this.handlers.onReply?.(text)
        if (this.ws?.readyState === WebSocket.OPEN) {
          try {
            this.ws.send(JSON.stringify({ realtimeInput: { activityStart: {} } }))
          } catch (_e) {}
        }
      }
    } catch (_e) {}
  }

  sendVideoFrame(base64Jpeg) {
    if (!this.ready || !this.ws || this.ws.readyState !== WebSocket.OPEN || !base64Jpeg) return
    try {
      this.ws.send(JSON.stringify({
        realtimeInput: { video: { data: base64Jpeg, mimeType: 'image/jpeg' } },
      }))
    } catch (_e) {}
  }

  sendText(text, base64Jpeg = null) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return
    const parts = []
    if (base64Jpeg) {
      parts.push({ inlineData: { mimeType: 'image/jpeg', data: base64Jpeg } })
    }
    parts.push({ text: text || 'What do you see? Reply briefly.' })
    try {
      this.ws.send(JSON.stringify({
        clientContent: {
          turns: [{ role: 'user', parts }],
          turnComplete: true,
        },
      }))
    } catch (_e) {}
  }

  disconnect() {
    this.ready = false
    if (this._connectTimer) clearTimeout(this._connectTimer)
    try { this.ws?.close() } catch (_e) {}
    this.ws = null
  }
}
