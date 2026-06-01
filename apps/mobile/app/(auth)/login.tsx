import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native'
import * as WebBrowser from 'expo-web-browser'
import { makeRedirectUri } from 'expo-auth-session'
import { supabase } from '@/lib/supabase'
import { COLORS } from '@/constants/colors'

export default function LoginScreen() {
  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [isSignUp, setIsSignUp]   = useState(false)
  const [isForgot, setIsForgot]   = useState(false)
  const [loading, setLoading]     = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError]         = useState('')
  const [success, setSuccess]     = useState('')

  const handleForgot = async () => {
    if (!email) { setError('Ingresá tu email.'); return }
    setLoading(true)
    setError('')
    const redirectTo = makeRedirectUri({ scheme: 'regalame', path: 'auth/reset-password' })
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
    setLoading(false)
    if (err) setError(err.message)
    else setSuccess('Si ese email tiene una cuenta, vas a recibir un link para crear una nueva contraseña.')
  }

  const handleGoogleAuth = async () => {
    setGoogleLoading(true)
    setError('')
    const redirectTo = makeRedirectUri({ scheme: 'regalame', path: 'auth/callback' })
    const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo, skipBrowserRedirect: true },
    })
    if (oauthError || !data.url) {
      setError(oauthError?.message ?? 'Error al conectar con Google')
      setGoogleLoading(false)
      return
    }
    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo)
    if (result.type === 'success') {
      await supabase.auth.exchangeCodeForSession(result.url)
    }
    setGoogleLoading(false)
  }

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

        {isForgot ? (
          <View style={styles.form}>
            {success ? (
              <Text style={styles.successText}>{success}</Text>
            ) : (
              <>
                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  placeholderTextColor={COLORS.textMuted}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
                {error ? <Text style={styles.error}>{error}</Text> : null}
                <TouchableOpacity style={styles.btn} onPress={handleForgot} disabled={loading}>
                  {loading
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={styles.btnText}>Enviar link</Text>
                  }
                </TouchableOpacity>
              </>
            )}
            <TouchableOpacity onPress={() => { setIsForgot(false); setError(''); setSuccess('') }}>
              <Text style={styles.toggle}>← Volver al login</Text>
            </TouchableOpacity>
          </View>
        ) : (
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
            {!isSignUp && (
              <TextInput
                style={styles.input}
                placeholder="Contraseña"
                placeholderTextColor={COLORS.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            )}
            {isSignUp && (
              <TextInput
                style={styles.input}
                placeholder="Contraseña"
                placeholderTextColor={COLORS.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            )}
            {error ? <Text style={styles.error}>{error}</Text> : null}

            {!isSignUp && (
              <TouchableOpacity onPress={() => { setIsForgot(true); setError('') }}>
                <Text style={[styles.toggle, { textAlign: 'right', marginTop: -6 }]}>¿Olvidaste tu contraseña?</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.btn} onPress={handleAuth} disabled={loading}>
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.btnText}>{isSignUp ? 'Crear cuenta' : 'Entrar'}</Text>
              }
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>O TAMBIÉN</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity style={styles.googleBtn} onPress={handleGoogleAuth} disabled={googleLoading}>
              {googleLoading
                ? <ActivityIndicator color={COLORS.text} />
                : <Text style={styles.googleBtnText}>Continuar con Google</Text>
              }
            </TouchableOpacity>

            <TouchableOpacity onPress={() => { setIsSignUp(v => !v); setError('') }}>
              <Text style={styles.toggle}>
                {isSignUp ? '¿Ya tenés cuenta? Entrá' : '¿No tenés cuenta? Registrate'}
              </Text>
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
  divider:  { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  dividerText: { fontSize: 11, color: COLORS.textMuted, fontWeight: '600', letterSpacing: 1 },
  googleBtn: {
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 14, paddingVertical: 14, alignItems: 'center',
  },
  googleBtnText: { color: COLORS.text, fontSize: 15, fontWeight: '600' },
  successText: { color: COLORS.text, fontSize: 14, lineHeight: 22, textAlign: 'center' },
})
