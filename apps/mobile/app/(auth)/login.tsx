import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native'
import { supabase } from '@/lib/supabase'
import { COLORS } from '@/constants/colors'

export default function LoginScreen() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  const handleAuth = async () => {
    if (!email || !password) return
    setLoading(true)
    setError('')
    const { error: err } = isSignUp
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (err) setError(err.message)
    // Navigation handled by AuthGuard in _layout
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.inner}>
        <Text style={styles.logo}>regala.me</Text>
        <Text style={styles.tagline}>Tu lista de regalos, sin dramas.</Text>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={COLORS.textMuted}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <TextInput
            style={styles.input}
            placeholder="Contraseña"
            placeholderTextColor={COLORS.textMuted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity style={styles.btn} onPress={handleAuth} disabled={loading}>
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnText}>{isSignUp ? 'Crear cuenta' : 'Entrar'}</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity onPress={() => { setIsSignUp(v => !v); setError('') }}>
            <Text style={styles.toggle}>
              {isSignUp ? '¿Ya tenés cuenta? Entrá' : '¿No tenés cuenta? Registrate'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  inner:     { flex: 1, justifyContent: 'center', padding: 28 },
  logo:      { fontSize: 36, fontWeight: '800', color: COLORS.primary, textAlign: 'center', marginBottom: 8 },
  tagline:   { fontSize: 15, color: COLORS.textMuted, textAlign: 'center', marginBottom: 48 },
  form:      { gap: 14 },
  input: {
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 14, paddingHorizontal: 18, paddingVertical: 14,
    fontSize: 16, color: COLORS.text,
  },
  error:    { color: '#E53E3E', fontSize: 13, textAlign: 'center' },
  btn:      { backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 4 },
  btnText:  { color: '#fff', fontSize: 16, fontWeight: '700' },
  toggle:   { color: COLORS.primary, fontSize: 14, textAlign: 'center', marginTop: 4 },
})
