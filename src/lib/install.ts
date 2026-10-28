/** PWA install + update helpers. */

let deferredPrompt: BeforeInstallPromptEvent | null = null
type BeforeInstallPromptEvent = Event & {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferredPrompt = e as BeforeInstallPromptEvent
  })
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null
  })
}

/** Can the browser install this app right now? */
export function canInstall(): boolean {
  return !!deferredPrompt
}

export function isStandalone(): boolean {
  return (
    typeof window !== 'undefined' &&
    (window.matchMedia?.('(display-mode: standalone)').matches ||
      // iOS Safari
      (navigator as unknown as { standalone?: boolean }).standalone === true)
  )
}

/** Show the install prompt. Returns true if the user accepted. */
export async function promptInstall(): Promise<boolean> {
  if (!deferredPrompt) return false
  await deferredPrompt.prompt()
  const { outcome } = await deferredPrompt.userChoice
  deferredPrompt = null
  return outcome === 'accepted'
}

/** Listen for a waiting service worker; calls back with offlineReady. */
export function update(cb: (offlineReady: boolean) => void): () => void {
  if (typeof window === 'undefined') return () => {}
  const onRegisteredSW = (sw: ServiceWorkerRegistration | undefined) => {
    if (!sw) return
    if (sw.waiting) cb(true)
    sw.addEventListener('updatefound', () => {
      const nw = sw.installing
      if (!nw) return
      nw.addEventListener('statechange', () => {
        if (nw.state === 'installed' && (sw as ServiceWorkerRegistration & { controller?: unknown }).controller) cb(true)
      })
    })
  }
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistration().then(onRegisteredSW)
  }
  return () => {}
}
