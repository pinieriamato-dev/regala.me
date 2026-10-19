'use client'

import { useEffect, useState } from 'react'

// Chrome/Edge/Android fire this when the manifest makes the app installable.
// iOS Safari never fires it, so the button simply doesn't render there.
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function InstallAppButton() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    const onBeforeInstall = (e: Event) => {
      e.preventDefault()
      setInstallEvent(e as BeforeInstallPromptEvent)
    }
    const onInstalled = () => setInstallEvent(null)

    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  if (!installEvent) return null

  return (
    <button
      type="button"
      className="rg-mono"
      onClick={async () => {
        await installEvent.prompt()
        await installEvent.userChoice
        setInstallEvent(null)
      }}
      style={{
        background: 'var(--yellow)', border: '2px solid var(--ink)', borderRadius: 4,
        padding: '4px 8px', cursor: 'pointer', fontSize: 10, color: 'var(--ink)',
        boxShadow: '2px 2px 0 0 #0F0F0F', whiteSpace: 'nowrap',
      }}
    >
      INSTALAR APP
    </button>
  )
}
