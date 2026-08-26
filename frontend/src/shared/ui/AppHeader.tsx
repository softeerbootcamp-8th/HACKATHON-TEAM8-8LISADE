import logoMark from '../../assets/icons/logo-mark.svg'
import icBell from '../../assets/icons/ic-bell.svg'

export function AppHeader({ showAvatar = false, onBellClick, hasUnread = false }: {
  showAvatar?: boolean
  onBellClick?: () => void
  hasUnread?: boolean
}) {
  return <header className="app-header">
    <div className="app-header-brand"><img src={logoMark} alt="" /><span>두리번</span></div>
    <div className="app-header-actions">
      {onBellClick
        ? <button
          type="button"
          className="header-icon-button"
          aria-label={hasUnread ? '알림 (새 알림 있음)' : '알림'}
          onClick={onBellClick}
        ><img src={icBell} alt="" />{hasUnread && <span className="noti-dot" />}</button>
        : <img src={icBell} alt="" />}
      {showAvatar && <span className="avatar-chip">My</span>}
    </div>
  </header>
}
