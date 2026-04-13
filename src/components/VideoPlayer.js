import React from 'react'
import { Linking } from 'react-native'

export default function VideoPlayer({ videoId, onClose }) {
  React.useEffect(() => {
    Linking.openURL(`https://www.youtube.com/watch?v=${videoId}`)
    onClose()
  }, [])

  return null
}