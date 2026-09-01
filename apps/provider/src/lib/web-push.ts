/**
 * Web Push / FCM — yalnız public env olduqda aktiv.
 * Token: Firebase messaging.getToken (FCM registration token).
 */

export function isWebPushConfigured(): boolean {
  const vapid = process.env.NEXT_PUBLIC_FCM_VAPID_KEY?.trim();
  const apiKey = process.env.NEXT_PUBLIC_FCM_API_KEY?.trim();
  const projectId = process.env.NEXT_PUBLIC_FCM_PROJECT_ID?.trim();
  const appId = process.env.NEXT_PUBLIC_FCM_APP_ID?.trim();
  const messagingSenderId =
    process.env.NEXT_PUBLIC_FCM_MESSAGING_SENDER_ID?.trim();
  return Boolean(vapid && apiKey && projectId && appId && messagingSenderId);
}

/**
 * Brauzer Notification icazəsi + FCM getToken.
 * Credentials natamamdırsa null.
 */
export async function registerWebPushToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  if (!('Notification' in window) || !('serviceWorker' in navigator)) {
    return null;
  }
  if (!isWebPushConfigured()) return null;

  const permission =
    Notification.permission === 'granted'
      ? 'granted'
      : await Notification.requestPermission();

  if (permission !== 'granted') {
    throw new Error('Bildiriş icazəsi verilmədi');
  }

  const vapidKey = process.env.NEXT_PUBLIC_FCM_VAPID_KEY!.trim();
  const apiKey = process.env.NEXT_PUBLIC_FCM_API_KEY!.trim();
  const projectId = process.env.NEXT_PUBLIC_FCM_PROJECT_ID!.trim();
  const appId = process.env.NEXT_PUBLIC_FCM_APP_ID!.trim();
  const messagingSenderId =
    process.env.NEXT_PUBLIC_FCM_MESSAGING_SENDER_ID!.trim();

  const registration = await navigator.serviceWorker.ready;

  try {
    const { initializeApp, getApps } = await import('firebase/app');
    const { getMessaging, getToken, isSupported } = await import(
      'firebase/messaging'
    );

    if (!(await isSupported())) {
      return null;
    }

    const firebaseConfig = {
      apiKey,
      projectId,
      appId,
      messagingSenderId,
    };

    const app =
      getApps().length > 0 ? getApps()[0]! : initializeApp(firebaseConfig);
    const messaging = getMessaging(app);

    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: registration,
    });

    return token && token.length >= 32 ? token : null;
  } catch {
    return null;
  }
}
