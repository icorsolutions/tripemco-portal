import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import Layout from '../../components/Layout'

export default function AdminApplications() {
  const [apps, setApps] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('applications').select('*, firms(firm_name)').order('created_at', { ascending: false }).then(({ data }) => {
      setApps(data || [])
      setLoading(false)
    })
  }, [])

  const badge = s => <span className={`badge badge-${s}`}>{s}</span>

  return (
    <Layout>
      <div className="ph"><div><h1 className="ph-title">All Applications</h1><p className="ph-sub">Every application across all customers</p></div></div>
      {loading ? <div className="loading" style={{ minHeight: 200 }}><span className="spinner" /></div>
        : <div className="tbl-wrap"><table>
          <thead><tr><th>Firm</th><th>Type</th><th>Status</th><th>Revenue</th><th>Submitted</th><th></th></tr></thead>
          <tbody>{apps.map(a => <tr key={a.id}>
            <td style={{ fontWeight: 500 }}>{a.firms?.firm_name}</td>
            <td style={{ textTransform: 'capitalize' }}>{a.application_type}</td>
            <td>{badge(a.status)}</td>
            <td style={{ fontSize: 13 }}>{a.current_revenue ? `$${Number(a.current_revenue).toLocaleString()}` : '—'}</td>
            <td style={{ fontSize: 13, color: 'var(--text2)' }}>{new Date(a.created_at).toLocaleDateString('en-CA')}</td>
            <td><Link to={`/admin/applications/${a.id}`} className="btn btn-ghost btn-sm">View</Link></td>
          </tr>)}</tbody>
        </table></div>}
    </Layout>
  )
}
