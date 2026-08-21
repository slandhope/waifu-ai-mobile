import { createContext, useCallback, useContext, useMemo, useState } from 'react'

const LiveCameraContext = createContext(null)

export function LiveCameraProvider({ children }) {
  const [visible, setVisible] = useState(false)
  const [config, setConfig] = useState({ mode: 'home' })

  const openLiveCamera = useCallback((mode = 'home', extras = {}) => {
    setConfig({ mode, ...extras })
    setVisible(true)
  }, [])

  const closeLiveCamera = useCallback(() => {
    setVisible(false)
  }, [])

  const value = useMemo(
    () => ({ visible, config, openLiveCamera, closeLiveCamera }),
    [visible, config, openLiveCamera, closeLiveCamera],
  )

  return (
    <LiveCameraContext.Provider value={value}>
      {children}
    </LiveCameraContext.Provider>
  )
}

export function useLiveCamera() {
  const ctx = useContext(LiveCameraContext)
  if (!ctx) throw new Error('useLiveCamera must be used within LiveCameraProvider')
  return ctx
}
