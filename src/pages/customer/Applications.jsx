import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import Layout from '../../components/Layout'

export default function Applications() {
  const { user } = useAuth()
  const [apps, setApps] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    supabase.from('firms').select('id').eq('user_id', user.id).then(({ data: firms }) => {
      const ids = (firms || []).map(f => f.id)
      if (!ids.length) { setLoading(false); return }
      supabase.from('applications').select('*, firms(firm_name)').in('firm_id', ids).order('created_at', { ascending: false }).then(({ data }) => {
        setApps(data || [])
        setLoading(false)
      })
    })
  }, [user])

  const badge = s => <span className={`badge badge-${s}`}>{s}</span>

  return (
    <Layout>
      <div className="ph">
        <div><h1 className="ph-title">Applications</h1><p className="ph-sub">All your E&O insurance applications</p></div>
        <Link to="/applications/new" className="btn btn-primary">+ New Application</Link>
      </div>
      {loading ? <div className="loading" style={{ minHeight: 200 }}><span className="spinner" /></div>
        : apps.length === 0 ? <div className="empty"><h3>No applications yet</h3><p>Submit your first application to get covered.</p><Link to="/applications/new" className="btn btn-primary">Start application</Link></div>
        : <div className="tbl-wrap"><table>
          <thead><tr><th>Firm</th><th>Type</th><th>Status</th><th>Submitted</th><th></th></tr></thead>
          <tbody>{apps.map(a => <tr key={a.id}>
            <td style={{ fontWeight: 500 }}>{a.firms?.firm_name}</td>
            <td style={{ textTransform: 'capitalize' }}>{a.application_type}</td>
            <td>{badge(a.status)}</td>
            <td style={{ fontSize: 13, color: 'var(--text2)' }}>{new Date(a.created_at).toLocaleDateString('en-CA')}</td>
            <td><Link to={`/applications/${a.id}`} className="btn btn-ghost btn-sm">View</Link></td>
          </tr>)}</tbody>
        </table></div>}
    </Layout>
  )
}
