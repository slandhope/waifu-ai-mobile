import { Feather } from '@expo/vector-icons'
import { useState } from 'react'
import {
  Modal, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native'
import { CARD_COLORS } from '../../lib/habitHelpers'

const PICK_COLORS = Object.values(CARD_COLORS)

export default function AddHabitModal({ visible, onClose, onSave }) {
  const [label, setLabel] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState(PICK_COLORS[0])
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!label.trim() || saving) return
    setSaving(true)
    await onSave?.({ label: label.trim(), description: description.trim(), color })
    setLabel('')
    setDescription('')
    setColor(PICK_COLORS[0])
    setSaving(false)
    onClose?.()
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.head}>
            <Text style={styles.title}>New habit</Text>
            <TouchableOpacity onPress={onClose}>
              <Feather name="x" size={22} color="#666" />
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            value={label}
            onChangeText={setLabel}
            placeholder="Read, Floss, Wake up at 7am…"
            placeholderTextColor="rgba(0,0,0,0.3)"
          />

          <Text style={styles.label}>Description (optional)</Text>
          <TextInput
            style={[styles.input, styles.inputMulti]}
            value={description}
            onChangeText={setDescription}
            placeholder="Feet on the floor before the second alarm…"
            placeholderTextColor="rgba(0,0,0,0.3)"
            multiline
          />

          <Text style={styles.label}>Color</Text>
          <View style={styles.colors}>
            {PICK_COLORS.map((c) => (
              <TouchableOpacity
                key={c}
                style={[styles.swatch, { backgroundColor: c }, color === c && styles.swatchOn]}
                onPress={() => setColor(c)}
              />
            ))}
          </View>

          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={!label.trim() || saving}>
            <Text style={styles.saveText}>{saving ? 'Saving…' : 'Add habit'}</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 40,
  },
  head: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: { fontSize: 22, fontWeight: '800', color: '#1a1a1a' },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(0,0,0,0.45)',
    marginBottom: 8,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1a1a1a',
    marginBottom: 16,
  },
  inputMulti: { minHeight: 80, textAlignVertical: 'top' },
  colors: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  swatch: { width: 36, height: 36, borderRadius: 18 },
  swatchOn: { borderWidth: 3, borderColor: '#1a1a1a' },
  saveBtn: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveText: { color: '#fff', fontSize: 16, fontWeight: '700' },
})
