import { useEffect, useState } from 'react'
import { studentNotificationApi } from '../../api/studentNotificationApi'
import type { StudentNotification } from '../../types/notification'
import { formatKoreanNotificationTime } from '../../shared/dateTime'
import { AppHeader } from '../../shared/ui/AppHeader'
import { ScreenCard } from '../../shared/ui/ScreenCard'
import chevronLeft from '../../assets/icons/chevron-left.svg'

/** 유형별 배지 라벨/스타일 (Figma S-06 §6.2). 서버가 새 유형을 보내면 fallback으로 안전 처리. */
const badgeByType: Record<string, { label: string; className: string }> = {
  RANGE_EXIT: { label: '위치 이탈', className: 'noti-badge-exit' },
  MISSION_CREATED: { label: '새 미션', className: 'noti-badge-new' },
  DEADLINE_IMMINENT: { label: '마감 임박', className: 'noti-badge-deadline' },
  MISSION_REJECTED: { label: '다시 하기', className: 'noti-badge-redo' },
}
const fallbackBadge = { label: '알림', className: 'noti-badge-unreachable' }

export function StudentNotifications({ onBack, onSelect }: {
  onBack: () => void
  onSelect: (notification: StudentNotification) => void
}) {
  const [notifications, setNotifications] = useState<StudentNotification[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    studentNotificationApi.list()
      .then((list) => { if (active) setNotifications(list) })
      .catch((caught) => { if (active) setError(caught instanceof Error ? caught.message : '알림을 불러오지 못했습니다.') })
    return () => { active = false }
  }, [])

  return <ScreenCard title="알림">
    <AppHeader />
    <section aria-label="알림" className="screen-pad">
      <button type="button" className="noti-back" onClick={onBack}><img src={chevronLeft} alt="" />알림</button>
      {error && <p className="error" role="alert">{error}</p>}
      {!error && notifications === null && <p className="hint">알림을 불러오는 중…</p>}
      {!error && notifications !== null && notifications.length === 0 && <p className="hint">새로운 알림이 없어요.</p>}
      {notifications !== null && notifications.length > 0 && <ul className="noti-list">
        {notifications.map((notification) => {
          const badge = badgeByType[notification.type] ?? fallbackBadge
          return <li key={notification.id}>
            <button className="noti-card" onClick={() => onSelect(notification)}>
              <span className="noti-card-body">
                <span className={`noti-badge ${badge.className}`}>{badge.label}</span>
                <span className="noti-card-message">{notification.message}</span>
              </span>
              <span className="noti-card-time">{formatKoreanNotificationTime(notification.createdAt)}</span>
            </button>
          </li>
        })}
      </ul>}
    </section>
  </ScreenCard>
}
