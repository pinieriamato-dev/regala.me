import { useEffect, useState, useCallback } from 'react'
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  SafeAreaView, ActivityIndicator, RefreshControl, Alert,
} from 'react-native'
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { COLORS } from '@/constants/colors'
import type { Item } from 'shared'

type ItemWithClaims = Item & { claimed_count: number }

export default function ListScreen() {
  const { id, title, slug, is_surprise } = useLocalSearchParams<{
    id: string; title: string; slug: string; is_surprise: string
  }>()
  const navigation = useNavigation()
  const router = useRouter()
  const [items, setItems]       = useState<ItemWithClaims[]>([])
  const [loading, setLoading]   = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('items')
      .select('*, claims(count)')
      .eq('wishlist_id', id)
      .order('sort_order')

    if (data) {
      setItems(data.map((i: any) => ({
        ...i,
        claimed_count: i.claims?.[0]?.count ?? 0,
      })))
    }
    setLoading(false)
    setRefreshing(false)
  }, [id])

  useEffect(() => {
    navigation.setOptions({ title })
    load()
  }, [navigation, title, load])

  const deleteItem = (itemId: string) => {
    Alert.alert('¿Eliminar ítem?', '', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => {
        await supabase.from('items').delete().eq('id', itemId)
        load()
      }},
    ])
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color={COLORS.primary} /></View>
  }

  const claimed = items.filter(i => i.claimed_count > 0).length

  return (
    <SafeAreaView style={styles.container}>
      {items.length > 0 && (
        <View style={styles.stats}>
          <Text style={styles.statsText}>{claimed}/{items.length} ítems reclamados</Text>
          <View style={styles.progressBg}>
            <View style={[styles.progressFill, { width: `${(claimed / items.length) * 100}%` as any }]} />
          </View>
        </View>
      )}

      <FlatList
        data={items}
        keyExtractor={i => i.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} tintColor={COLORS.primary} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>📝</Text>
            <Text style={styles.emptyTitle}>Lista vacía</Text>
            <Text style={styles.emptySub}>Agregá ítems y luego compartí la lista</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.card, item.claimed_count > 0 && styles.cardClaimed]}
            onLongPress={() => deleteItem(item.id)}
            activeOpacity={0.7}
          >
            <View style={styles.cardBody}>
              <View style={styles.cardRow}>
                <Text style={[styles.cardTitle, item.claimed_count > 0 && styles.cardTitleDone]} numberOfLines={1}>
                  {item.title}
                </Text>
                {item.claimed_count > 0 && (
                  <View style={styles.badge}><Text style={styles.badgeText}>✓ Reclamado</Text></View>
                )}
              </View>
              {item.description ? <Text style={styles.cardDesc} numberOfLines={1}>{item.description}</Text> : null}
              <View style={styles.cardMeta}>
                {item.price ? <Text style={styles.price}>${item.price.toLocaleString()}</Text> : null}
                {item.priority === 3 ? <Text style={styles.essential}>★★★ Esencial</Text> : null}
              </View>
            </View>
          </TouchableOpacity>
        )}
      />

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.shareBtn}
          onPress={() => router.push({ pathname: '/share', params: { wishlistId: id, title, slug } })}
        >
          <Text style={styles.shareBtnText}>💬  Compartir por WhatsApp</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => router.push({ pathname: '/add-item', params: { wishlistId: id } })}
        >
          <Text style={styles.addBtnText}>＋ Agregar ítem</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: COLORS.background },
  center:        { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  stats:         { paddingHorizontal: 24, paddingVertical: 12, gap: 8 },
  statsText:     { fontSize: 13, color: COLORS.textMuted, fontWeight: '600' },
  progressBg:    { height: 4, backgroundColor: COLORS.border, borderRadius: 2, overflow: 'hidden' },
  progressFill:  { height: '100%', backgroundColor: COLORS.primary, borderRadius: 2 },
  list:          { padding: 16, gap: 10, flexGrow: 1 },
  card: {
    backgroundColor: COLORS.card, borderRadius: 18, padding: 18,
    borderWidth: 1, borderColor: COLORS.border,
    shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  cardClaimed:   { backgroundColor: COLORS.successLight, borderColor: '#B7E4C7' },
  cardBody:      { gap: 6 },
  cardRow:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  cardTitle:     { fontSize: 15, fontWeight: '700', color: COLORS.text, flex: 1 },
  cardTitleDone: { color: COLORS.textMuted, textDecorationLine: 'line-through' },
  cardDesc:      { fontSize: 13, color: COLORS.textMuted },
  cardMeta:      { flexDirection: 'row', gap: 12, marginTop: 2 },
  price:         { fontSize: 13, fontWeight: '600', color: COLORS.text },
  essential:     { fontSize: 12, color: COLORS.gold, fontWeight: '600' },
  badge:         { backgroundColor: COLORS.successLight, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText:     { fontSize: 11, color: COLORS.success, fontWeight: '700' },
  empty:         { flex: 1, alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyEmoji:    { fontSize: 48 },
  emptyTitle:    { fontSize: 18, fontWeight: '700', color: COLORS.text },
  emptySub:      { fontSize: 14, color: COLORS.textMuted, textAlign: 'center', paddingHorizontal: 32 },
  footer:        { padding: 16, paddingBottom: 32, gap: 10 },
  shareBtn: {
    backgroundColor: COLORS.whatsapp, borderRadius: 16, paddingVertical: 16, alignItems: 'center',
    shadowColor: COLORS.whatsapp, shadowOpacity: 0.30, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  shareBtnText:  { color: '#fff', fontSize: 16, fontWeight: '700' },
  addBtn:        { backgroundColor: COLORS.card, borderRadius: 16, paddingVertical: 14, alignItems: 'center', borderWidth: 1.5, borderColor: COLORS.primary },
  addBtnText:    { color: COLORS.primary, fontSize: 15, fontWeight: '700' },
})
