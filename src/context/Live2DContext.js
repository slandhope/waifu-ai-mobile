import { createContext, useCallback, useContext, useMemo } from 'react'
import { getCharacter } from '../lib/characters'
import { useCharacter } from '../hooks/useCharacter'

const Live2DContext = createContext(null)

export function Live2DProvider({ children }) {
  const { characterId, character, setCharacterId, loaded: characterLoaded } = useCharacter()

  const swapCharacter = useCallback(async (id) => {
    if (id === characterId || !getCharacter(id)) return
    await setCharacterId(id)
  }, [characterId, setCharacterId])

  const value = useMemo(
    () => ({ characterId, character, characterLoaded, swapCharacter }),
    [characterId, character, characterLoaded, swapCharacter]
  )

  return <Live2DContext.Provider value={value}>{children}</Live2DContext.Provider>
}

export function useLive2D() {
  const ctx = useContext(Live2DContext)
  if (!ctx) throw new Error('useLive2D must be used within Live2DProvider')
  return ctx
}

export function useLive2DCharacter() {
  return useLive2D()
}
