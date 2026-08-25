import logoMark from '../../assets/icons/logo-mark.svg'
import icBell from '../../assets/icons/ic-bell.svg'

export function AppHeader({ showAvatar = false }: { showAvatar?: boolean }) {
  return <header className="app-header">
    <div className="app-header-brand"><img src={logoMark} alt="" /><span>두리번</span></div>
    <div className="app-header-actions">
      <img src={icBell} alt="" />
      {showAvatar && <span className="avatar-chip">My</span>}
    </div>
  </header>
}
