import logoMark from '../../assets/icons/logo-mark.svg'
import icBell from '../../assets/icons/ic-bell.svg'

export function AppHeader({ showAvatar = false, onBellClick }: { showAvatar?: boolean; onBellClick?: () => void }) {
  return <header className="app-header">
    <div className="app-header-brand"><img src={logoMark} alt="" /><span>두리번</span></div>
    <div className="app-header-actions">
      {onBellClick
        ? <button type="button" className="header-icon-button" aria-label="알림" onClick={onBellClick}><img src={icBell} alt="" /></button>
        : <img src={icBell} alt="" />}
      {showAvatar && <span className="avatar-chip">My</span>}
    </div>
  </header>
}
