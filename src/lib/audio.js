import {
  AudioModule,
  RecordingPresets,
  createAudioPlayer,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
} from 'expo-audio'

let player = null

export async function requestMic() {
  const { granted } = await requestRecordingPermissionsAsync()
  return !!granted
}

export async function startMic() {
  await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true })
  const rec = new AudioModule.AudioRecorder(RecordingPresets.HIGH_QUALITY)
  await rec.prepareToRecordAsync()
  rec.record()
  return rec
}

export async function stopMic(rec) {
  if (!rec) return null
  await rec.stop()
  await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true })
  return rec.uri || null
}

export function playUri(uri) {
  if (!uri) return null
  try { player?.remove() } catch (_e) {}
  player = createAudioPlayer({ uri })
  player.play()
  return player
}
