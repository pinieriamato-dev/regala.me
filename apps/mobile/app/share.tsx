import { useState, useEffect } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, Share, Linking, TextInput,
} from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { COLORS } from '@/constants/colors'

export default function ShareScreen() {
  const { wishlistId, title, slug } = useLocalSearchParams<{ wishlistId: string; title: string; slug: string }>()
  const [listUrl, setListUrl]           = useState('')
  const [message, setMessage]           = useState('')
  const [editingMessage, setEditingMessage] = useState(false)

  useEffect(() => {
    async function buildUrl() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .single()

      const username = profile?.username ?? user.id ?? 'user'
      const url = `https://regala.me/${username}/${slug}`
      setListUrl(url)
      setMessage(`Hola! Armé una listita de regalos así no traen lo mismo 😄\n👉 ${url}`)
    }
    buildUrl()
  }, [slug])

  const openWhatsApp = async () => {
    const url = `whatsapp://send?text=${encodeURIComponent(message)}`
    const canOpen = await Linking.canOpenURL(url)
    await Linking.openURL(canOpen ? url : `https://wa.me/?text=${encodeURIComponent(message)}`)
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.celebrate}>🎉</Text>
        <Text style={styles.heading}>¡Tu lista está lista!</Text>
        <Text style={styles.sub}>Compartila con tus invitados</Text>

        <View style={styles.previewCard}>
          <Text style={styles.previewEmoji}>🎁</Text>
          <View style={styles.previewInfo}>
            <Text style={styles.previewTitle} numberOfLines={1}>{title}</Text>
            <Text style={styles.previewUrl} numberOfLines={1}>{listUrl}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.waBtn} onPress={openWhatsApp} activeOpacity={0.85}>
          <Text style={styles.waBtnText}>💬  Compartir por WhatsApp</Text>
        </TouchableOpacity>

        <View style={styles.otherRow}>
          <TouchableOpacity style={styles.otherBtn} onPress={() => Share.share({ message: listUrl })}>
            <Text style={styles.otherBtnText}>🔗 Copiar link</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.otherBtn} onPress={() => Share.share({ message })}>
            <Text style={styles.otherBtnText}>↑ Más opciones</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.msgSection}>
          <View style={styles.msgHeader}>
            <Text style={styles.msgLabel}>Vista previa del mensaje</Text>
            <TouchableOpacity onPress={() => setEditingMessage(v => !v)}>
              <Text style={styles.editToggle}>{editingMessage ? 'Listo' : '✏️ Editar'}</Text>
            </TouchableOpacity>
          </View>
          {editingMessage ? (
            <TextInput style={styles.msgInput} value={message} onChangeText={setMessage}
              multiline numberOfLines={4} textAlignVertical="top" />
          ) : (
            <View style={styles.msgPreview}><Text style={styles.msgText}>{message}</Text></View>
          )}
        </View>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: COLORS.background },
  content:     { flex: 1, padding: 24, gap: 16 },
  celebrate:   { fontSize: 48, textAlign: 'center' },
  heading:     { fontSize: 24, fontWeight: '800', color: COLORS.text, textAlign: 'center' },
  sub:         { fontSize: 14, color: COLORS.textMuted, textAlign: 'center', marginTop: -8 },
  previewCard: {
    backgroundColor: COLORS.card, borderRadius: 20, padding: 18,
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderWidth: 1, borderColor: COLORS.border,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 2,
  },
  previewEmoji:  { fontSize: 28 },
  previewInfo:   { flex: 1, gap: 3 },
  previewTitle:  { fontSize: 15, fontWeight: '700', color: COLORS.text },
  previewUrl:    { fontSize: 12, color: COLORS.primary },
  waBtn: {
    backgroundColor: COLORS.whatsapp, borderRadius: 18, paddingVertical: 18, alignItems: 'center',
    shadowColor: COLORS.whatsapp, shadowOpacity: 0.35, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 4,
  },
  waBtnText:    { color: '#fff', fontSize: 16, fontWeight: '700' },
  otherRow:     { flexDirection: 'row', gap: 12 },
  otherBtn:     { flex: 1, backgroundColor: COLORS.card, borderRadius: 14, paddingVertical: 14, alignItems: 'center', borderWidth: 1.5, borderColor: COLORS.border },
  otherBtnText: { color: COLORS.text, fontSize: 13, fontWeight: '600' },
  msgSection:   { gap: 8 },
  msgHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  msgLabel:     { fontSize: 12, fontWeight: '600', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  editToggle:   { fontSize: 13, color: COLORS.primary, fontWeight: '600' },
  msgPreview:   { backgroundColor: COLORS.card, borderRadius: 16, padding: 18, borderWidth: 1, borderColor: COLORS.border },
  msgText:      { fontSize: 14, color: COLORS.text, lineHeight: 20 },
  msgInput:     { backgroundColor: COLORS.card, borderRadius: 16, padding: 18, borderWidth: 1.5, borderColor: COLORS.primary, fontSize: 14, color: COLORS.text, lineHeight: 20 },
})
