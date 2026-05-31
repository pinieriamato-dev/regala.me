import { useEffect, useState, useCallback } from 'react'
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  SafeAreaView, ActivityIndicator, RefreshControl,
} from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { COLORS } from '@/constants/colors'
import { occasionEmoji, daysUntil } from 'shared'
import type { OccasionId, Currency } from 'shared'

type ListRow = {
  id: string
  title: string
  slug: string
  occasion: OccasionId | null
  occasion_date: string | null
  is_surprise: boolean
  currency: Currency
  item_count: number
  claimed_count: number
}

export default function ListsScreen() {
  const router = useRouter()
  const [lists, setLists]         = useState<ListRow[]>([])
  const [loading, setLoading]     = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: wishlists } = await supabase
      .from('wishlists')
      .select('id, title, slug, occasion, occasion_date, is_surprise, currency')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false })

    if (!wishlists) { setLoading(false); setRefreshing(false); return }

    // Count items and claims per list
    const rows = await Promise.all(wishlists.map(async w => {
      const { count: itemCount } = await supabase
        .from('items').select('id', { count: 'exact', head: true }).eq('wishlist_id', w.id)

      const { data: itemIds } = await supabase
        .from('items').select('id').eq('wishlist_id', w.id)

      const ids = itemIds?.map(i => i.id) ?? []
      const { count: claimedCount } = ids.length
        ? await supabase.from('claims').select('id', { count: 'exact', head: true }).in('item_id', ids)
        : { count: 0 }

      return {
        ...w,
        occasion: w.occasion as OccasionId | null,
        currency: (w.currency ?? 'ARS') as Currency,
        item_count: itemCount ?? 0,
        claimed_count: claimedCount ?? 0,
      }
    }))

    setLists(rows)
    setLoading(false)
    setRefreshing(false)
  }, [])

  useEffect(() => { load() }, [load])

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color={COLORS.primary} size="large" /></View>
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logo}>regala.me</Text>
        <TouchableOpacity onPress={signOut}>
          <Text style={styles.signOut}>Salir</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={lists}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} tintColor={COLORS.primary} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🎁</Text>
            <Text style={styles.emptyTitle}>Todavía no tenés listas</Text>
            <Text style={styles.emptySub}>Creá tu primera lista y compartila por WhatsApp</Text>
          </View>
        }
        renderItem={({ item }) => {
          const progress = item.item_count > 0 ? item.claimed_count / item.item_count : 0
          const days = daysUntil(item.occasion_date)
          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() => router.push({ pathname: '/list/[id]', params: { id: item.id, title: item.title, slug: item.slug, is_surprise: String(item.is_surprise) } })}
              activeOpacity={0.7}
            >
              <Text style={styles.emoji}>{occasionEmoji(item.occasion)}</Text>
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                {days && <Text style={styles.cardDate}>{days}</Text>}
                <View style={styles.progressRow}>
                  <View style={styles.progressBg}>
                    <View style={[styles.progressFill, { width: `${progress * 100}%` as any }]} />
                  </View>
                  <Text style={styles.progressLabel}>{item.claimed_count}/{item.item_count}</Text>
                </View>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          )
        }}
      />

      <View style={styles.footer}>
        <TouchableOpacity style={styles.newBtn} onPress={() => router.push('/create-list')} activeOpacity={0.85}>
          <Text style={styles.newBtnText}>＋  Nueva lista de regalos</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: COLORS.background },
  center:       { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  header:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 16 },
  logo:         { fontSize: 24, fontWeight: '800', color: COLORS.primary },
  signOut:      { fontSize: 14, color: COLORS.textMuted },
  list:         { padding: 16, gap: 12, flexGrow: 1 },
  card: {
    backgroundColor: COLORS.card, borderRadius: 20, padding: 18,
    flexDirection: 'row', alignItems: 'center', gap: 14,
    shadowColor: COLORS.primary, shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  emoji:        { fontSize: 30 },
  cardBody:     { flex: 1, gap: 4 },
  cardTitle:    { fontSize: 15, fontWeight: '700', color: COLORS.text },
  cardDate:     { fontSize: 12, color: COLORS.textMuted },
  progressRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  progressBg:   { flex: 1, height: 5, backgroundColor: COLORS.border, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 3 },
  progressLabel:{ fontSize: 11, color: COLORS.textMuted, minWidth: 28 },
  chevron:      { fontSize: 22, color: COLORS.textMuted, fontWeight: '300' },
  empty:        { flex: 1, alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyEmoji:   { fontSize: 52 },
  emptyTitle:   { fontSize: 18, fontWeight: '700', color: COLORS.text },
  emptySub:     { fontSize: 14, color: COLORS.textMuted, textAlign: 'center', paddingHorizontal: 32 },
  footer:       { padding: 16, paddingBottom: 32 },
  newBtn: {
    backgroundColor: COLORS.primary, borderRadius: 16, paddingVertical: 18, alignItems: 'center',
    shadowColor: COLORS.primary, shadowOpacity: 0.30, shadowRadius: 14, shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  newBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
})
