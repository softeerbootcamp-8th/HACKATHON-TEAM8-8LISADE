import { useEffect, useState } from 'react'
import { teacherNotificationApi } from '../../api/teacherNotificationApi'
import type { TeacherNotification } from '../../types/notification'
import { formatKoreanNotificationTime } from '../../shared/dateTime'
import chevronLeft from '../../assets/icons/chevron-left.svg'

/** 유형별 배지 라벨/스타일 (Figma T-07). 서버가 새 유형을 보내면 fallback으로 안전 처리. */
const badgeByType: Record<string, { label: string; className: string }> = {
  RANGE_EXIT: { label: '이탈', className: 'noti-badge-exit' },
  MISSION_INCOMPLETED: { label: '미완료', className: 'noti-badge-incomplete' },
  MISSION_CREATED: { label: '새 미션', className: 'noti-badge-info' },
  UNREACHABLE: { label: '확인 불가', className: 'noti-badge-unreachable' },
}
const fallbackBadge = { label: '알림', className: 'noti-badge-unreachable' }

export function TeacherNotifications({ onBack, onSelect }: {
  onBack: () => void
  onSelect: (notification: TeacherNotification) => void
}) {
  const [notifications, setNotifications] = useState<TeacherNotification[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    teacherNotificationApi.list()
      .then((list) => { if (active) setNotifications(list) })
      .catch((caught) => { if (active) setError(caught instanceof Error ? caught.message : '알림을 불러오지 못했습니다.') })
    return () => { active = false }
  }, [])

  return <section aria-label="알림">
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
}
