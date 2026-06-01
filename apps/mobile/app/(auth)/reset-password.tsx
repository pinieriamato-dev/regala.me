import { useState, useEffect } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import type { EmailOtpType } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { COLORS } from '@/constants/colors'

export default function ResetPasswordScreen() {
  const { token_hash, type } = useLocalSearchParams<{ token_hash?: string; type?: string }>()
  const router = useRouter()
  const [password, setPassword]   = useState('')
  const [confirm, setConfirm]     = useState('')
  const [loading, setLoading]     = useState(false)
  const [verifying, setVerifying] = useState(true)
  const [error, setError]         = useState('')

  useEffect(() => {
    const verify = async () => {
      if (token_hash && type) {
        const { error: err } = await supabase.auth.verifyOtp({
          token_hash,
          type: type as EmailOtpType,
        })
        if (err) setError('El link expiró o no es válido. Pedí uno nuevo.')
      } else {
        setError('Link inválido. Pedí un nuevo link de recuperación.')
      }
      setVerifying(false)
    }
    verify()
  }, [token_hash, type])

  const handleReset = async () => {
    if (password !== confirm) { setError('Las contraseñas no coinciden.'); return }
    if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres.'); return }
    setLoading(true)
    setError('')
    const { error: err } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (err) { setError(err.message); return }
    router.replace('/(tabs)')
  }

  if (verifying) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={COLORS.primary} />
      </View>
    )
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.inner}>
        <Text style={styles.logo}>regala.me</Text>
        <Text style={styles.title}>Nueva contraseña</Text>

        {error && !password ? (
          <>
            <Text style={styles.error}>{error}</Text>
            <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
              <Text style={styles.link}>← Volver al login</Text>
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder="Nueva contraseña"
              placeholderTextColor={COLORS.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            <TextInput
              style={styles.input}
              placeholder="Repetir contraseña"
              placeholderTextColor={COLORS.textMuted}
              value={confirm}
              onChangeText={setConfirm}
              secureTextEntry
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <TouchableOpacity style={styles.btn} onPress={handleReset} disabled={loading}>
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.btnText}>Guardar contraseña</Text>
              }
            </TouchableOpacity>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  inner:     { flex: 1, justifyContent: 'center', padding: 28 },
  logo:      { fontSize: 36, fontWeight: '800', color: COLORS.primary, textAlign: 'center', marginBottom: 8 },
  title:     { fontSize: 22, fontWeight: '700', color: COLORS.text, textAlign: 'center', marginBottom: 32 },
  form:      { gap: 14 },
  input: {
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 14, paddingHorizontal: 18, paddingVertical: 14,
    fontSize: 16, color: COLORS.text,
  },
  error: { color: '#E53E3E', fontSize: 13, textAlign: 'center' },
  btn:   { backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 4 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  link:  { color: COLORS.primary, fontSize: 14, textAlign: 'center', marginTop: 16 },
})
