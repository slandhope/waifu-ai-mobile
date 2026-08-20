import AsyncStorage from '@react-native-async-storage/async-storage'
import * as ImagePicker from 'expo-image-picker'
import { useEffect, useState } from 'react'
import { DeviceEventEmitter } from 'react-native'
import { pushExtrasSoon, SYNC_EXTRAS_APPLIED } from '../lib/extrasSync'

export function useProfile() {
  const [avatar, setAvatar] = useState(null)
  const [animalAvatar, setAnimalAvatar] = useState('🦊')
  const [avatarType, setAvatarType] = useState('animal')
  const [name, setName] = useState('')
  const [googlePhoto, setGooglePhoto] = useState(null)
  const [applePhoto, setApplePhoto] = useState(null)

  useEffect(() => {
    loadProfile()
    const sub = DeviceEventEmitter.addListener(SYNC_EXTRAS_APPLIED, () => loadProfile())
    return () => sub.remove()
  }, [])

  const loadProfile = async () => {
    AsyncStorage.getItem('avatar-uri').then(val => { if(val) setAvatar(val) })
    AsyncStorage.getItem('avatar-type').then(val => { if(val) setAvatarType(val) })
    AsyncStorage.getItem('animal-avatar').then(val => { if(val) setAnimalAvatar(val) })
    AsyncStorage.getItem('user-name').then(val => { if(val) setName(val) })
    AsyncStorage.getItem('google-photo').then(val => { if(val) setGooglePhoto(val) })
    AsyncStorage.getItem('apple-photo').then(val => { if(val) setApplePhoto(val) })
  }

  const pickCustomPhoto = async (uri) => {
    if(uri) {
      setAvatar(uri)
      setAvatarType('custom')
      await AsyncStorage.setItem('avatar-uri', uri)
      await AsyncStorage.setItem('avatar-type', 'custom')
      pushExtrasSoon()
      return
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if(status !== 'granted') {
      alert('We need permission to access your photos!')
      return
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    })

    if(!result.canceled) {
      const photoUri = result.assets[0].uri
      setAvatar(photoUri)
      setAvatarType('custom')
      await AsyncStorage.setItem('avatar-uri', photoUri)
      await AsyncStorage.setItem('avatar-type', 'custom')
      pushExtrasSoon()
    }
  }

  const pickAnimalAvatar = async (emoji) => {
    setAnimalAvatar(emoji)
    setAvatarType('animal')
    setAvatar(null)
    await AsyncStorage.setItem('animal-avatar', emoji)
    await AsyncStorage.setItem('avatar-type', 'animal')
    await AsyncStorage.removeItem('avatar-uri')
    pushExtrasSoon()
  }

  const setLoginPhoto = async (uri, type) => {
    if(type === 'google') {
      setGooglePhoto(uri)
      await AsyncStorage.setItem('google-photo', uri)
    } else if(type === 'apple') {
      setApplePhoto(uri)
      await AsyncStorage.setItem('apple-photo', uri)
    }
    setAvatar(uri)
    setAvatarType('custom')
    await AsyncStorage.setItem('avatar-uri', uri)
    await AsyncStorage.setItem('avatar-type', 'custom')
    pushExtrasSoon()
  }

  const reloadProfile = () => loadProfile()

  const currentAvatar = avatarType === 'custom' && avatar ? avatar : null

  return {
    avatar: currentAvatar,
    animalAvatar,
    avatarType,
    name,
    setName,
    googlePhoto,
    applePhoto,
    pickCustomPhoto,
    pickAnimalAvatar,
    setLoginPhoto,
    reloadProfile,
  }
}