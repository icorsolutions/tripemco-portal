import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const CUSTOMER_NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: '▦' },
  { to: '/applications', label: 'Applications', icon: '◧' },
  { to: '/policies', label: 'Policies', icon: '◈' },
]

const ADMIN_NAV = [
  { to: '/admin', label: 'Overview', icon: '▦' },
  { to: '/admin/applications', label: 'Applications', icon: '◧' },
  { to: '/admin/referrals', label: 'Referrals', icon: '◎' },
  { to: '/admin/policies', label: 'Policies', icon: '◈' },
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
          <div className="sb-logo-name">Tripemco</div>
          <div className="sb-logo-sub">{isAdmin ? 'Admin Portal' : 'Insurance Portal'}</div>
        </div>

        <nav className="sb-nav">
          {isAdmin && <div className="sb-section">Admin</div>}
          {nav.map(n => (
            <NavLink key={n.to} to={n.to} end={n.to === '/dashboard' || n.to === '/admin'}
              className={({ isActive }) => isActive ? 'active' : ''}>
              <span>{n.icon}</span>{n.label}
            </NavLink>
          ))}
        </nav>

        <div className="sb-footer">
          <div className="sb-user">
            <div className="avatar">{initials}</div>
            <div style={{ minWidth: 0 }}>
              <div className="sb-user-name">{name}</div>
              <button className="sb-signout" onClick={handleSignOut}>Sign out</button>
            </div>
          </div>
        </div>
      </aside>

      <main className="main">{children}</main>
    </div>
  )
}
