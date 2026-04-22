import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import Layout from '../../components/Layout'

export default function CustomerDashboard() {
  const { user, profile } = useAuth()
  const [stats, setStats] = useState({ apps: 0, policies: 0, referred: 0, quoted: 0 })
  const [recent, setRecent] = useState([])
  const [loading, setLoading] = useState(true)
  const name = profile?.full_name?.split(' ')[0] || 'there'

  useEffect(() => { if (user) load() }, [user])

  async function load() {
    try {
      const { data: firms } = await supabase.from('firms').select('id').eq('user_id', user.id)
      const ids = (firms || []).map(f => f.id)
      if (!ids.length) { setLoading(false); return }
      const [
        { count: apps }, { count: policies }, { count: referred }, { count: quoted },
        { data: recentApps }
      ] = await Promise.all([
        supabase.from('applications').select('*', { count: 'exact', head: true }).in('firm_id', ids),
        supabase.from('policies').select('*', { count: 'exact', head: true }),
        supabase.from('applications').select('*', { count: 'exact', head: true }).in('firm_id', ids).eq('status', 'referred'),
        supabase.from('applications').select('*', { count: 'exact', head: true }).in('firm_id', ids).eq('status', 'quoted'),
        supabase.from('applications').select('*, firms(firm_name)').in('firm_id', ids).order('created_at', { ascending: false }).limit(5),
      ])
      setStats({ apps: apps || 0, policies: policies || 0, referred: referred || 0, quoted: quoted || 0 })
      setRecent(recentApps || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const badge = s => <span className={`badge badge-${s}`}>{s}</span>

  return (
    <Layout>
      <div className="ph">
        <div><h1 className="ph-title">Good morning, {name}</h1><p className="ph-sub">Welcome to your Tripemco insurance portal</p></div>
        <Link to="/applications/new" className="btn btn-primary">+ New Application</Link>
      </div>

      <div className="stats">
        <div className="stat"><div className="stat-n">{stats.apps}</div><div className="stat-l">Applications</div></div>
        <div className="stat"><div className="stat-n">{stats.policies}</div><div className="stat-l">Active Policies</div></div>
        <div className="stat"><div className="stat-n" style={{ color: 'var(--amber)' }}>{stats.referred}</div><div className="stat-l">Under Review</div></div>
        <div className="stat"><div className="stat-n" style={{ color: 'var(--green2)' }}>{stats.quoted}</div><div className="stat-l">Awaiting Payment</div></div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: 18 }}>Recent applications</h3>
          <Link to="/applications" style={{ fontSize: 13, color: 'var(--text2)' }}>View all →</Link>
        </div>
        {loading ? <div style={{ textAlign: 'center', padding: '2rem' }}><span className="spinner" /></div>
          : recent.length === 0 ? (
            <div className="empty">
              <h3>No applications yet</h3>
              <p>Start your first E&O insurance application.</p>
              <Link to="/applications/new" className="btn btn-primary">Apply now</Link>
            </div>
          ) : (
            <div className="tbl-wrap">
              <table>
                <thead><tr><th>Firm</th><th>Type</th><th>Status</th><th>Date</th><th></th></tr></thead>
                <tbody>
                  {recent.map(a => (
                    <tr key={a.id}>
                      <td style={{ fontWeight: 500 }}>{a.firms?.firm_name}</td>
                      <td style={{ textTransform: 'capitalize' }}>{a.application_type}</td>
                      <td>{badge(a.status)}</td>
                      <td style={{ color: 'var(--text2)', fontSize: 13 }}>{new Date(a.created_at).toLocaleDateString('en-CA')}</td>
                      <td><Link to={`/applications/${a.id}`} className="btn btn-ghost btn-sm">View</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </div>

      <div className="card" style={{ marginTop: '1rem', background: 'var(--green-light)', border: '1px solid #b8dece' }}>
        <h3 style={{ fontSize: 18, color: 'var(--green)', marginBottom: 8 }}>Paralegal E&O Program</h3>
        <p style={{ fontSize: 14, color: 'var(--text2)', marginBottom: '1rem' }}>
          Coverage underwritten by <strong>Sovereign General Insurance Company</strong>. Minimum $1,000,000 / $2,000,000 aggregate as required by the Law Society of Ontario.
        </p>
        <Link to="/applications/new" className="btn btn-primary btn-sm">Apply now</Link>
      </div>
    </Layout>
  )
}
