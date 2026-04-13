import AsyncStorage from '@react-native-async-storage/async-storage'
import * as ImagePicker from 'expo-image-picker'
import { useEffect, useState } from 'react'

export function useProfile() {
  const [avatar, setAvatar] = useState(null) // custom photo uri
  const [animalAvatar, setAnimalAvatar] = useState('🦊') // animal emoji
  const [avatarType, setAvatarType] = useState('animal') // 'animal' | 'custom'
  const [name, setName] = useState('')

  useEffect(() => {
   AsyncStorage.getItem('avatar-uri').then(val => { if(val) setAvatar(val) })
AsyncStorage.getItem('avatar-type').then(val => { if(val) setAvatarType(val) })
AsyncStorage.getItem('animal-avatar').then(val => { if(val) setAnimalAvatar(val) })
AsyncStorage.getItem('user-name').then(val => { if(val) setName(val) })
  }, [])

  const pickCustomPhoto = async () => {
    // ask permission
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if(status !== 'granted') {
      alert('We need permission to access your photos!')
      return
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1], // square crop
      quality: 0.8,
    })

    if(!result.canceled) {
      const uri = result.assets[0].uri
      setAvatar(uri)
      setAvatarType('custom')
      await AsyncStorage.setItem('avatar-uri', uri)
      await AsyncStorage.setItem('avatar-type', 'custom')
    }
  }

  const pickAnimalAvatar = async (emoji) => {
    setAnimalAvatar(emoji)
    setAvatarType('animal')
    await AsyncStorage.setItem('animal-avatar', emoji)
    await AsyncStorage.setItem('avatar-type', 'animal')
  }

  return {
    avatar,
    animalAvatar,
    avatarType,
    name,
    setName,
    pickCustomPhoto,
    pickAnimalAvatar,
  }
}