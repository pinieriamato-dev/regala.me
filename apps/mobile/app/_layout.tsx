import { useEffect } from 'react'
import { Stack, useRouter, useSegments, SplashScreen } from 'expo-router'
import * as WebBrowser from 'expo-web-browser'
import { useAuth } from '@/hooks/useAuth'
import { COLORS } from '@/constants/colors'

WebBrowser.maybeCompleteAuthSession()
SplashScreen.preventAutoHideAsync()

function AuthGuard() {
  const { session, loading } = useAuth()
  const router = useRouter()
  const segments = useSegments()

  useEffect(() => {
    if (loading) return
    SplashScreen.hideAsync()
    const inAuth = segments[0] === '(auth)'
    if (!session && !inAuth) router.replace('/(auth)/login')
    else if (session && inAuth) router.replace('/(tabs)')
  }, [session, loading, segments])

  return null
}

export default function RootLayout() {
  return (
    <>
      <AuthGuard />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: COLORS.background },
          headerTintColor: COLORS.text,
          headerTitleStyle: { fontWeight: '700' },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: COLORS.background },
        }}
      >
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="list/[id]" options={{ title: '' }} />
        <Stack.Screen name="create-list" options={{ presentation: 'modal', title: 'Nueva lista' }} />
        <Stack.Screen name="add-item" options={{ presentation: 'modal', title: 'Agregar ítem' }} />
        <Stack.Screen name="share" options={{ presentation: 'modal', title: 'Compartir' }} />
      </Stack>
    </>
  )
}
