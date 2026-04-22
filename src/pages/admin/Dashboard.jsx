import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import Layout from '../../components/Layout'

export default function AdminDashboard() {
  const [stats, setStats] = useState({ total: 0, quoted: 0, referred: 0, declined: 0, policies: 0 })
  const [apps, setApps] = useState([])
  const [refs, setRefs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    try {
      const [
        { count: total }, { count: quoted }, { count: referred },
        { count: declined }, { count: policies },
        { data: recentApps }, { data: pendingRefs }
      ] = await Promise.all([
        supabase.from('applications').select('*', { count: 'exact', head: true }),
        supabase.from('applications').select('*', { count: 'exact', head: true }).eq('status', 'quoted'),
        supabase.from('applications').select('*', { count: 'exact', head: true }).eq('status', 'referred'),
        supabase.from('applications').select('*', { count: 'exact', head: true }).eq('status', 'declined'),
        supabase.from('policies').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('applications').select('*, firms(firm_name)').order('created_at', { ascending: false }).limit(10),
        supabase.from('referrals').select('*, applications(firms(firm_name))').eq('status', 'pending').order('referred_at', { ascending: false }),
      ])
      setStats({ total: total||0, quoted: quoted||0, referred: referred||0, declined: declined||0, policies: policies||0 })
      setApps(recentApps || [])
      setRefs(pendingRefs || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const badge = s => <span className={`badge badge-${s}`}>{s}</span>

  return (
    <Layout>
      <div className="ph">
        <div><h1 className="ph-title">Admin Overview</h1><p className="ph-sub">Tripemco Paralegal E&O Program — Sovereign General Insurance</p></div>
      </div>

      <div className="stats">
        <div className="stat"><div className="stat-n">{stats.total}</div><div className="stat-l">Total Applications</div></div>
        <div className="stat"><div className="stat-n" style={{ color: 'var(--green2)' }}>{stats.policies}</div><div className="stat-l">Active Policies</div></div>
        <div className="stat"><div className="stat-n" style={{ color: 'var(--green2)' }}>{stats.quoted}</div><div className="stat-l">Awaiting Payment</div></div>
        <div className="stat"><div className="stat-n" style={{ color: 'var(--amber)' }}>{stats.referred}</div><div className="stat-l">Pending Referrals</div></div>
        <div className="stat"><div className="stat-n" style={{ color: 'var(--red)' }}>{stats.declined}</div><div className="stat-l">Declined</div></div>
      </div>

      {refs.length > 0 && (
        <div className="card" style={{ marginBottom: '1.5rem', background: 'var(--amber-light)', borderColor: '#f5ddb8' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: 18, color: 'var(--amber)' }}>⚠ Pending Referrals ({refs.length})</h3>
            <Link to="/admin/referrals" style={{ fontSize: 13, color: 'var(--amber)' }}>View all →</Link>
          </div>
          <div className="tbl-wrap">
            <table>
              <thead><tr><th>Firm</th><th>Reasons</th><th>Date</th><th></th></tr></thead>
              <tbody>
                {refs.slice(0, 5).map(r => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 500 }}>{r.applications?.firms?.firm_name}</td>
                    <td style={{ fontSize: 13, color: 'var(--text2)' }}>{(r.referred_reasons||[]).slice(0,2).map(x=>x.label).join(', ')}</td>
                    <td style={{ fontSize: 13 }}>{new Date(r.referred_at).toLocaleDateString('en-CA')}</td>
                    <td><Link to={`/admin/applications/${r.application_id}`} className="btn btn-ghost btn-sm">Review</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: 18 }}>Recent applications</h3>
          <Link to="/admin/applications" style={{ fontSize: 13, color: 'var(--text2)' }}>View all →</Link>
        </div>
        {loading ? <div style={{ textAlign: 'center', padding: '2rem' }}><span className="spinner" /></div> : (
          <div className="tbl-wrap">
            <table>
              <thead><tr><th>Firm</th><th>Type</th><th>Status</th><th>Revenue</th><th>Submitted</th><th></th></tr></thead>
              <tbody>
                {apps.map(a => (
                  <tr key={a.id}>
                    <td style={{ fontWeight: 500 }}>{a.firms?.firm_name}</td>
                    <td style={{ textTransform: 'capitalize' }}>{a.application_type}</td>
                    <td>{badge(a.status)}</td>
                    <td style={{ fontSize: 13 }}>{a.current_revenue ? `$${Number(a.current_revenue).toLocaleString()}` : '—'}</td>
                    <td style={{ fontSize: 13, color: 'var(--text2)' }}>{new Date(a.created_at).toLocaleDateString('en-CA')}</td>
                    <td><Link to={`/admin/applications/${a.id}`} className="btn btn-ghost btn-sm">View</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  )
}
