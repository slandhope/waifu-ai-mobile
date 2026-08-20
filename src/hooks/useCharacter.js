import AsyncStorage from '@react-native-async-storage/async-storage'
import { useCallback, useEffect, useState } from 'react'
import { getCharacter } from '../lib/characters'

const STORAGE_KEY = 'waifu-character-id'

export function useCharacter() {
  const [characterId, setCharacterIdState] = useState('asuka')
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((id) => {
      if (id && getCharacter(id)) setCharacterIdState(id)
      setLoaded(true)
    })
  }, [])

  const setCharacterId = useCallback(async (id) => {
    if (!getCharacter(id)) return
    setCharacterIdState(id)
    await AsyncStorage.setItem(STORAGE_KEY, id)
  }, [])

  return {
    characterId,
    character: getCharacter(characterId),
    setCharacterId,
    loaded,
  }
}
