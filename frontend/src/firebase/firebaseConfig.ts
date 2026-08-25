import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getMessaging, getToken, type Messaging } from 'firebase/messaging'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY

let app: FirebaseApp | null = null
let messaging: Messaging | null = null

function getFirebaseMessaging(): Messaging | null {
  if (!firebaseConfig.apiKey || !vapidKey) {
    return null
  }
  if (!messaging) {
    app ??= initializeApp(firebaseConfig)
    messaging = getMessaging(app)
  }
  return messaging
}

export async function requestFcmToken(): Promise<string | null> {
  const messagingInstance = getFirebaseMessaging()
  if (!messagingInstance) {
    return null
  }

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    return null
  }

  await navigator.serviceWorker.register('/firebase-messaging-sw.js')
  const registration = await navigator.serviceWorker.ready
  return getToken(messagingInstance, { vapidKey, serviceWorkerRegistration: registration })
}
