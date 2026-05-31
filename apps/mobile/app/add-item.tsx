import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { COLORS } from '@/constants/colors'
import { CURRENCIES } from 'shared'
import type { Currency, Priority } from 'shared'

const PRIORITY_OPTIONS: { value: Priority; stars: string; label: string }[] = [
  { value: 1, stars: '★',   label: 'Opcional' },
  { value: 2, stars: '★★',  label: 'Normal' },
  { value: 3, stars: '★★★', label: 'Esencial' },
]

export default function AddItemScreen() {
  const { wishlistId } = useLocalSearchParams<{ wishlistId: string }>()
  const router = useRouter()
  const [title, setTitle]           = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice]           = useState('')
  const [currency, setCurrency]     = useState<Currency>('ARS')
  const [url, setUrl]               = useState('')
  const [priority, setPriority]     = useState<Priority>(2)
  const [loading, setLoading]       = useState(false)

  const handleAdd = async () => {
    if (!title.trim()) { Alert.alert('Falta el nombre', '¿Qué querés recibir?'); return }
    setLoading(true)
    const { error } = await supabase.from('items').insert({
      wishlist_id: wishlistId,
      title: title.trim(),
      description: description.trim() || null,
      price: price ? parseFloat(price.replace(/\./g, '').replace(',', '.')) : null,
      currency,
      url: url.trim() || null,
      priority,
      sort_order: Date.now(),
    })
    setLoading(false)
    if (error) { Alert.alert('Error', error.message); return }
    router.back()
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.label}>¿Qué es?</Text>
      <TextInput style={styles.input} placeholder="Zapatillas Nike Air Max talle 39"
        placeholderTextColor={COLORS.textMuted} value={title} onChangeText={setTitle} />

      <Text style={styles.label}>Descripción <Text style={styles.optional}>(opcional)</Text></Text>
      <TextInput style={[styles.input, styles.multiline]} placeholder="Color, talle, modelo..."
        placeholderTextColor={COLORS.textMuted} value={description} onChangeText={setDescription}
        multiline numberOfLines={2} />

      <Text style={styles.label}>Precio <Text style={styles.optional}>(opcional)</Text></Text>
      <View style={styles.priceRow}>
        <TextInput style={[styles.input, styles.priceInput]} placeholder="85.000"
          placeholderTextColor={COLORS.textMuted} value={price} onChangeText={setPrice} keyboardType="decimal-pad" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.currencyScroll}>
          {CURRENCIES.map(c => (
            <TouchableOpacity key={c} style={[styles.chip, currency === c && styles.chipActive]} onPress={() => setCurrency(c)}>
              <Text style={[styles.chipText, currency === c && styles.chipTextActive]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <Text style={styles.label}>Link <Text style={styles.optional}>(opcional)</Text></Text>
      <TextInput style={styles.input} placeholder="mercadolibre.com/..."
        placeholderTextColor={COLORS.textMuted} value={url} onChangeText={setUrl}
        autoCapitalize="none" keyboardType="url" />

      <Text style={styles.label}>Prioridad</Text>
      <View style={styles.priorityRow}>
        {PRIORITY_OPTIONS.map(opt => (
          <TouchableOpacity key={opt.value} style={[styles.priorityCard, priority === opt.value && styles.priorityCardActive]}
            onPress={() => setPriority(opt.value)}>
            <Text style={[styles.priorityStars, priority === opt.value && styles.priorityStarsActive]}>{opt.stars}</Text>
            <Text style={[styles.priorityLabel, priority === opt.value && styles.priorityLabelActive]}>{opt.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.addBtn} onPress={handleAdd} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.addBtnText}>＋ Agregar ítem</Text>}
      </TouchableOpacity>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content:   { padding: 20, gap: 14, paddingBottom: 48 },
  label:     { fontSize: 13, fontWeight: '600', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  optional:  { textTransform: 'none', letterSpacing: 0, fontWeight: '400', fontSize: 12 },
  input: {
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: COLORS.text,
  },
  multiline:     { minHeight: 72, textAlignVertical: 'top', paddingTop: 14 },
  priceRow:      { flexDirection: 'row', gap: 12, alignItems: 'center' },
  priceInput:    { width: 120 },
  currencyScroll:{ flex: 1 },
  chip:          { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, marginRight: 8, backgroundColor: COLORS.card, borderWidth: 1.5, borderColor: COLORS.border },
  chipActive:    { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  chipText:      { fontSize: 12, fontWeight: '700', color: COLORS.textMuted },
  chipTextActive:{ color: COLORS.primary },
  priorityRow:   { flexDirection: 'row', gap: 10 },
  priorityCard:  { flex: 1, alignItems: 'center', padding: 14, borderRadius: 16, backgroundColor: COLORS.card, borderWidth: 1.5, borderColor: COLORS.border, gap: 4 },
  priorityCardActive:  { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  priorityStars:       { fontSize: 18, color: COLORS.textMuted },
  priorityStarsActive: { color: COLORS.gold },
  priorityLabel:       { fontSize: 11, fontWeight: '600', color: COLORS.textMuted },
  priorityLabelActive: { color: COLORS.primary },
  addBtn: {
    backgroundColor: COLORS.primary, borderRadius: 16, paddingVertical: 18, alignItems: 'center', marginTop: 8,
    shadowColor: COLORS.primary, shadowOpacity: 0.30, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 4,
  },
  addBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
})
