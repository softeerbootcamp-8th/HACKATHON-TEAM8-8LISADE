import { useEffect, useState } from 'react'

/** 포그라운드 push 한 건. 서버가 아직 data payload에 type을 싣지 않아 제목/본문만 다룬다. */
export interface ForegroundNotification {
  title: string
  body: string
}

type Listener = (notification: ForegroundNotification) => void

/**
 * 전역 상태 라이브러리가 없어 모듈 수준 구독 저장소로 화면과 FCM 수신을 잇는다.
 * 발행은 로그인 시점의 `pushNotifications.register()`가, 구독은 React 화면이 담당한다.
 */
export function createForegroundNotifications() {
  const listeners = new Set<Listener>()

  function subscribe(listener: Listener): () => void {
    listeners.add(listener)
    return () => { listeners.delete(listener) }
  }

  function publish(notification: ForegroundNotification): void {
    listeners.forEach((listener) => listener(notification))
  }

  function useForegroundNotifications() {
    const [toast, setToast] = useState<ForegroundNotification | null>(null)
    const [hasUnread, setHasUnread] = useState(false)

    useEffect(() => subscribe((notification) => {
      setToast(notification)
      setHasUnread(true)
    }), [])

    return {
      toast,
      hasUnread,
      /** 토스트만 닫는다. 놓친 알림은 종 배지로 남는다. */
      dismissToast: () => setToast(null),
      /** 알림 목록을 열어 확인한 시점. 서버에 읽음 필드가 없어 세션 한정으로 처리한다. */
      markRead: () => { setToast(null); setHasUnread(false) },
    }
  }

  return { subscribe, publish, useForegroundNotifications }
}

export const foregroundNotifications = createForegroundNotifications()
export const useForegroundNotifications = foregroundNotifications.useForegroundNotifications
