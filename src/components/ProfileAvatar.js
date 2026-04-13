import { LinearGradient } from 'expo-linear-gradient'
import { Image, StyleSheet, Text, TouchableOpacity } from 'react-native'
import { useTheme } from '../hooks/useTheme'

export default function ProfileAvatar({ profile, size = 36, onPress }) {
  const { accent } = useTheme()

  const renderInner = () => {
    if(!profile) return <Text style={{ fontSize: size * 0.5 }}>🦊</Text>
    if(profile.avatarType === 'custom' && profile.avatar) {
      return (
        <Image
          source={{ uri: profile.avatar }}
          style={{ width: size, height: size, borderRadius: size / 2 }}
        />
      )
    }
    return (
      <LinearGradient
        colors={['#1e1a3a', '#2d2456']}
        style={{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center' }}
      >
        <Text style={{ fontSize: size * 0.5 }}>{profile.animalAvatar}</Text>
      </LinearGradient>
    )
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.wrap, { width: size + 4, height: size + 4, borderRadius: (size + 4) / 2, borderColor: accent.primary }]}
      activeOpacity={0.8}
    >
      {renderInner()}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  wrap: { borderWidth: 2, overflow: 'hidden' },
})