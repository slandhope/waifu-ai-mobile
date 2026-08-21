import * as ImagePicker from 'expo-image-picker'

/** Fallback when expo-camera native module is missing — system camera UI, one shot. */
export async function snapCameraBase64() {
  const perm = await ImagePicker.requestCameraPermissionsAsync()
  if (perm.status !== 'granted') {
    throw new Error('Camera permission denied')
  }
  const res = await ImagePicker.launchCameraAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.75,
    base64: true,
  })
  if (res.canceled || !res.assets?.[0]?.base64) return null
  const asset = res.assets[0]
  return { base64: asset.base64, mediaType: asset.mimeType || 'image/jpeg' }
}
