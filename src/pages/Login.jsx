import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setErr('')
    setLoading(true)
    try {
      await signIn(email, password)
      // Let auth state update then redirect
      setTimeout(() => navigate('/'), 300)
    } catch (e) {
      setErr(e.message || 'Invalid email or password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">Tripemco</div>
        <div className="auth-sub">Paralegal E&O Insurance Portal</div>
        <h2 className="auth-title">Sign in</h2>
        {err && <div className="alert alert-danger">{err}</div>}
        <form onSubmit={submit}>
          <div className="fg">
            <label className="fl req">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required autoFocus />
          </div>
          <div className="fg">
            <label className="fl req">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
            {loading ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Signing in…</> : 'Sign in'}
          </button>
        </form>
        <hr className="divider" />
        <p style={{ fontSize: 14, color: 'var(--text2)', textAlign: 'center' }}>
          No account? <Link to="/register">Register here</Link>
        </p>
      </div>
    </div>
  )
}
