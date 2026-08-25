import { useState } from 'react'
import { mockTeacherNotificationStore } from '../../api/teacherNotificationApi'
import type { TeacherNotification, TeacherNotificationCategory } from '../../types/notification'
import chevronLeft from '../../assets/icons/chevron-left.svg'

/** 유형별 배지 라벨/스타일 클래스 (Figma T-07 색상). */
const categoryBadge: Record<TeacherNotificationCategory, { label: string; className: string }> = {
  MISSION_INCOMPLETED: { label: '미완료', className: 'noti-badge-incomplete' },
  RANGE_EXIT: { label: '이탈', className: 'noti-badge-exit' },
  UNREACHABLE: { label: '확인 불가', className: 'noti-badge-unreachable' },
}

export function TeacherNotifications({ tripId, onBack, onSelect }: {
  tripId: string
  onBack: () => void
  onSelect: (notification: TeacherNotification) => void
}) {
  const [notifications] = useState<TeacherNotification[]>(() => mockTeacherNotificationStore.notificationsSnapshot(tripId))

  return <section aria-label="알림">
    <button type="button" className="noti-back" onClick={onBack}><img src={chevronLeft} alt="" />알림</button>
    {notifications.length === 0
      ? <p className="hint">새로운 알림이 없어요.</p>
      : <ul className="noti-list">
          {notifications.map((notification) => {
            const badge = categoryBadge[notification.category]
            return <li key={notification.id}>
              <button className="noti-card" onClick={() => onSelect(notification)}>
                <span className="noti-card-body">
                  <span className={`noti-badge ${badge.className}`}>{badge.label}</span>
                  <span className="noti-card-message">{notification.message}</span>
                </span>
                <span className="noti-card-time">{notification.timeLabel}</span>
              </button>
            </li>
          })}
        </ul>}
  </section>
}
