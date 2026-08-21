let cached = undefined

/** Lazy-load expo-camera; returns null if native module missing (old Expo Go / dev client). */
export async function loadCameraModule() {
  if (cached !== undefined) return cached
  try {
    cached = await import('expo-camera')
    return cached
  } catch (e) {
    console.warn('[camera] expo-camera unavailable:', e?.message)
    cached = null
    return null
  }
}

export async function isCameraModuleAvailable() {
  return (await loadCameraModule()) != null
}
