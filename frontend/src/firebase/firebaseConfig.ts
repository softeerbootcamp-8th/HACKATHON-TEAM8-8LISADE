import { initializeApp, type FirebaseApp } from 'firebase/app'
import { deleteToken, getMessaging, getToken, onMessage, type Messaging } from 'firebase/messaging'

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

export async function deleteFcmToken(): Promise<void> {
  const messagingInstance = getFirebaseMessaging()
  if (!messagingInstance) {
    return
  }
  await deleteToken(messagingInstance)
}

/**
 * 포그라운드 push를 화면으로 넘긴다. OS 알림은 띄우지 않는다 —
 * 탭을 보고 있는 상태에서는 인앱 토스트와 내용이 겹치기 때문이다(#41).
 * 백그라운드 알림은 service worker가 그대로 담당한다.
 */
export function listenForForegroundMessages(handler: (notification: { title: string; body: string }) => void): void {
  const messagingInstance = getFirebaseMessaging()
  if (!messagingInstance) {
    return
  }
  onMessage(messagingInstance, (payload) => {
    const { title, body } = payload.notification ?? {}
    if (title) {
      handler({ title, body: body ?? '' })
    }
  })
}
