import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Register() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [f, setF] = useState({ name: '', email: '', phone: '', password: '', confirm: '' })
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)
  const s = (k, v) => setF(p => ({ ...p, [k]: v }))

  const submit = async (e) => {
    e.preventDefault()
    if (f.password !== f.confirm) return setErr('Passwords do not match.')
    if (f.password.length < 8) return setErr('Password must be at least 8 characters.')
    setErr('')
    setLoading(true)
    try {
      await signUp(f.email, f.password, f.name, f.phone)
      setTimeout(() => navigate('/'), 300)
    } catch (e) {
      setErr(e.message || 'Registration failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">Tripemco</div>
        <div className="auth-sub">Paralegal E&O Insurance Portal</div>
        <h2 className="auth-title">Create account</h2>
        {err && <div className="alert alert-danger">{err}</div>}
        <form onSubmit={submit}>
          <div className="fg"><label className="fl req">Full name</label><input type="text" value={f.name} onChange={e => s('name', e.target.value)} placeholder="Jane Smith" required autoFocus /></div>
          <div className="fg"><label className="fl req">Email</label><input type="email" value={f.email} onChange={e => s('email', e.target.value)} placeholder="you@example.com" required /></div>
          <div className="fg"><label className="fl">Phone</label><input type="tel" value={f.phone} onChange={e => s('phone', e.target.value)} placeholder="416-555-0100" /></div>
          <div className="frow">
            <div className="fg"><label className="fl req">Password</label><input type="password" value={f.password} onChange={e => s('password', e.target.value)} placeholder="Min 8 chars" required /></div>
            <div className="fg"><label className="fl req">Confirm</label><input type="password" value={f.confirm} onChange={e => s('confirm', e.target.value)} placeholder="Repeat" required /></div>
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
            {loading ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Creating…</> : 'Create account'}
          </button>
        </form>
        <hr className="divider" />
        <p style={{ fontSize: 14, color: 'var(--text2)', textAlign: 'center' }}>Already registered? <Link to="/login">Sign in</Link></p>
      </div>
    </div>
  )
}
