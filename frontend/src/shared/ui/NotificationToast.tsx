import { useEffect } from 'react'
import type { ForegroundNotification } from '../../notifications/foregroundNotifications'

/** 토스트가 저절로 사라지기까지의 시간. 놓쳐도 종 배지로 남는다. */
const AUTO_DISMISS_MS = 5000

export function NotificationToast({ notification, onDismiss }: {
  notification: ForegroundNotification | null
  onDismiss: () => void
}) {
  useEffect(() => {
    if (!notification) {
      return
    }
    const timer = setTimeout(onDismiss, AUTO_DISMISS_MS)
    return () => clearTimeout(timer)
  }, [notification, onDismiss])

  if (!notification) {
    return null
  }

  return <div className="noti-toast" role="status">
    <span className="noti-toast-body">
      <strong className="noti-toast-title">{notification.title}</strong>
      <span className="noti-toast-message">{notification.body}</span>
    </span>
    <button type="button" className="noti-toast-close" aria-label="알림 닫기" onClick={onDismiss}>✕</button>
  </div>
}
