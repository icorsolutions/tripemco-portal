import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const CUSTOMER_NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: '▦' },
  { to: '/applications', label: 'Applications', icon: '◧' },
]

const ADMIN_NAV = [
  { to: '/admin', label: 'Overview', icon: '▦' },
  { to: '/admin/applications', label: 'Applications', icon: '◧' },
  { to: '/admin/users', label: 'Users', icon: '◉' },
]

export default function Layout({ children }) {
  const { user, profile, isAdmin, signOut } = useAuth()
  const navigate = useNavigate()

  const nav = isAdmin ? ADMIN_NAV : CUSTOMER_NAV
  const name = profile?.full_name || user?.email || ''
  const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?'

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sb-logo">
          <div className="sb-logo-name">Tripem<span style={{ color: 'var(--gold)' }}>co</span></div>
          <div className="sb-logo-sub">{isAdmin ? 'Admin Portal' : 'Insurance Portal'}</div>
          <div className="sb-logo-divider"></div>
        </div>

        <nav className="sb-nav">
          {isAdmin && <div className="sb-section">Admin</div>}
          {!isAdmin && <div className="sb-section">My Account</div>}
          {nav.map(n => (
            <NavLink key={n.to} to={n.to} end={n.to === '/dashboard' || n.to === '/admin'}
              className={({ isActive }) => `sb-nav-item${isActive ? ' active' : ''}`}>
              <span style={{ fontSize: 14 }}>{n.icon}</span>{n.label}
            </NavLink>
          ))}
        </nav>

        <div className="sb-footer">
          <div className="sb-user">
            <div className="avatar">{initials}</div>
            <div style={{ minWidth: 0 }}>
              <div className="sb-name">{name}</div>
              <button className="sb-signout" onClick={handleSignOut}>Sign out</button>
            </div>
          </div>
        </div>
      </aside>

      <main className="main">{children}</main>
    </div>
  )
}
