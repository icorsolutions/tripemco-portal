import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import Layout from '../../components/Layout'

export default function AdminUsers() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  function load() {
    supabase.from('users').select('*').order('created_at', { ascending: false }).then(({ data }) => {
      setUsers(data || [])
      setLoading(false)
    })
  }

  useEffect(() => { load() }, [])

  function toggleRole(id, role) {
    supabase.from('users').update({ role: role === 'admin' ? 'customer' : 'admin' }).eq('id', id).then(load)
  }

  return (
    <Layout>
      <div className="ph"><div><h1 className="ph-title">Users</h1><p className="ph-sub">Manage customer accounts and admin access</p></div></div>
      <div className="alert alert-info" style={{ marginBottom: '1.5rem' }}>To add admin staff: go to <strong>Supabase → Authentication → Users → Invite</strong>, then set their role to Admin here.</div>
      {loading ? <div className="loading" style={{ minHeight: 200 }}><span className="spinner" /></div>
        : <div className="tbl-wrap"><table>
          <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Joined</th><th></th></tr></thead>
          <tbody>{users.map(u => <tr key={u.id}>
            <td style={{ fontWeight: 500 }}>{u.full_name || '—'}</td>
            <td style={{ fontSize: 13 }}>{u.email}</td>
            <td><span className={`badge badge-${u.role || 'customer'}`}>{u.role || 'customer'}</span></td>
            <td style={{ fontSize: 13, color: 'var(--text2)' }}>{new Date(u.created_at).toLocaleDateString('en-CA')}</td>
            <td><button className="btn btn-ghost btn-sm" onClick={() => toggleRole(u.id, u.role)}>Make {u.role === 'admin' ? 'Customer' : 'Admin'}</button></td>
          </tr>)}</tbody>
        </table></div>}
    </Layout>
  )
}
