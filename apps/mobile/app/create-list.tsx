import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Switch, ActivityIndicator, Alert,
} from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { COLORS } from '@/constants/colors'
import { OCCASIONS, CURRENCIES, createSlug } from 'shared'
import type { OccasionId, Currency } from 'shared'

export default function CreateListScreen() {
  const router = useRouter()
  const [occasion, setOccasion] = useState<OccasionId>('birthday')
  const [title, setTitle]       = useState('')
  const [day, setDay]           = useState('')
  const [month, setMonth]       = useState('')
  const [year, setYear]         = useState('')
  const [isSurprise, setIsSurprise] = useState(true)
  const [currency, setCurrency]     = useState<Currency>('ARS')
  const [loading, setLoading]       = useState(false)

  const selectedOccasion = OCCASIONS.find(o => o.id === occasion)

  const handleCreate = async () => {
    if (!title.trim()) { Alert.alert('Falta el nombre', 'Escribí un nombre para la lista.'); return }
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const slug = createSlug(title)
    const occasionDate = day && month && year
      ? `${year.padStart(4, '0')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
      : null

    const { data, error } = await supabase
      .from('wishlists')
      .insert({ owner_id: user.id, title: title.trim(), slug, occasion, occasion_date: occasionDate, is_surprise: isSurprise, currency, privacy_level: 'public' })
      .select()
      .single()

    setLoading(false)
    if (error) { Alert.alert('Error', error.message); return }
    router.replace({ pathname: '/list/[id]', params: { id: data.id, title: data.title, slug: data.slug, is_surprise: String(data.is_surprise) } })
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.label}>Ocasión</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.hScroll}>
        {OCCASIONS.map(o => (
          <TouchableOpacity
            key={o.id}
            style={[styles.occasionChip, occasion === o.id && styles.occasionChipActive]}
            onPress={() => setOccasion(o.id)}
          >
            <Text style={styles.occasionEmoji}>{o.emoji}</Text>
            <Text style={[styles.occasionLabel, occasion === o.id && styles.occasionLabelActive]}>{o.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text style={styles.label}>Nombre de la lista</Text>
      <TextInput
        style={styles.input}
        placeholder={`${selectedOccasion?.emoji} ${selectedOccasion?.label} de...`}
        placeholderTextColor={COLORS.textMuted}
        value={title}
        onChangeText={setTitle}
      />

      <Text style={styles.label}>Fecha del evento</Text>
      <View style={styles.dateRow}>
        <TextInput style={[styles.input, styles.dateInput]} placeholder="DD" placeholderTextColor={COLORS.textMuted}
          value={day} onChangeText={setDay} keyboardType="number-pad" maxLength={2} />
        <Text style={styles.dateSep}>/</Text>
        <TextInput style={[styles.input, styles.dateInput]} placeholder="MM" placeholderTextColor={COLORS.textMuted}
          value={month} onChangeText={setMonth} keyboardType="number-pad" maxLength={2} />
        <Text style={styles.dateSep}>/</Text>
        <TextInput style={[styles.input, { flex: 1 }]} placeholder="AAAA" placeholderTextColor={COLORS.textMuted}
          value={year} onChangeText={setYear} keyboardType="number-pad" maxLength={4} />
      </View>

      <Text style={styles.label}>Moneda</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.hScroll}>
        {CURRENCIES.map(c => (
          <TouchableOpacity
            key={c}
            style={[styles.currencyChip, currency === c && styles.currencyChipActive]}
            onPress={() => setCurrency(c)}
          >
            <Text style={[styles.currencyText, currency === c && styles.currencyTextActive]}>{c}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.switchRow}>
        <View style={styles.switchInfo}>
          <Text style={styles.switchLabel}>Modo sorpresa</Text>
          <Text style={styles.switchSub}>Los que regalan no ven quién reclamó cada ítem</Text>
        </View>
        <Switch value={isSurprise} onValueChange={setIsSurprise}
          trackColor={{ false: COLORS.border, true: COLORS.primary }} thumbColor="#fff" />
      </View>

      <TouchableOpacity style={styles.createBtn} onPress={handleCreate} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.createBtnText}>Crear lista →</Text>}
      </TouchableOpacity>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content:   { padding: 20, gap: 16, paddingBottom: 48 },
  label:     { fontSize: 13, fontWeight: '600', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: COLORS.text,
  },
  hScroll:    { marginHorizontal: -20, paddingHorizontal: 20 },
  occasionChip: {
    alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16,
    backgroundColor: COLORS.card, borderWidth: 1.5, borderColor: COLORS.border, marginRight: 10, gap: 4,
  },
  occasionChipActive:  { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  occasionEmoji:       { fontSize: 24 },
  occasionLabel:       { fontSize: 12, fontWeight: '600', color: COLORS.textMuted },
  occasionLabelActive: { color: COLORS.primary },
  dateRow:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dateInput:{ width: 64, textAlign: 'center' },
  dateSep:  { fontSize: 18, color: COLORS.textMuted },
  currencyChip:       { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12, backgroundColor: COLORS.card, borderWidth: 1.5, borderColor: COLORS.border, marginRight: 8 },
  currencyChipActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  currencyText:       { fontSize: 13, fontWeight: '700', color: COLORS.textMuted },
  currencyTextActive: { color: COLORS.primary },
  switchRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card,
    borderRadius: 16, padding: 18, gap: 16, borderWidth: 1, borderColor: COLORS.border,
  },
  switchInfo:  { flex: 1, gap: 4 },
  switchLabel: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  switchSub:   { fontSize: 12, color: COLORS.textMuted, lineHeight: 16 },
  createBtn: {
    backgroundColor: COLORS.primary, borderRadius: 16, paddingVertical: 18, alignItems: 'center', marginTop: 8,
    shadowColor: COLORS.primary, shadowOpacity: 0.30, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 4,
  },
  createBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
})
