import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import Layout from '../components/Layout'

export default function ApplicationDetail() {
  const { id } = useParams()
  const { isAdmin } = useAuth()
  const [app, setApp] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('applications').select('*, firms(*), coverages(*), quotes(*)').eq('id', id).single().then(({ data }) => {
      setApp(data)
      setLoading(false)
    })
  }, [id])

  if (loading) return <Layout><div className="loading" style={{ minHeight: 300 }}><span className="spinner" /></div></Layout>
  if (!app) return <Layout><div className="alert alert-danger">Application not found.</div></Layout>

  const badge = s => <span className={`badge badge-${s}`} style={{ fontSize: 14, padding: '5px 14px' }}>{s}</span>
  const quote = app.quotes?.[0]
  const backTo = isAdmin ? '/admin/applications' : '/applications'

  return (
    <Layout>
      <div className="ph">
        <div><h1 className="ph-title">{app.firms?.firm_name}</h1><p className="ph-sub">{app.application_type === 'renewal' ? 'Renewal' : 'New'} Application</p></div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {badge(app.status)}
          <Link to={backTo} className="btn btn-ghost">← Back</Link>
        </div>
      </div>

      {app.status === 'declined' && <div className="alert alert-danger"><strong>⛔ Application Declined</strong><ul style={{ marginTop: 8, paddingLeft: 20 }}>{(app.decline_reasons || []).map((r, i) => <li key={i}>{r.label || r}</li>)}</ul></div>}
      {app.status === 'referred' && <div className="alert alert-warning"><strong>⚠ Under Underwriter Review</strong><ul style={{ marginTop: 8, paddingLeft: 20 }}>{(app.referral_reasons || []).map((r, i) => <li key={i}>{r.label || r}</li>)}</ul><p style={{ marginTop: 8, fontSize: 13 }}>A Tripemco broker will contact you within 2-3 business days.</p></div>}

      {quote && app.status === 'quoted' && (
        <div className="quote-box" style={{ marginBottom: '1.5rem' }}>
          <h4 style={{ fontFamily: 'Cormorant Garamond', fontSize: 18, color: 'var(--green)', marginBottom: '1rem' }}>Your Quote — Ready for Payment</h4>
          {quote.eo_base_premium > 0 && <div className="q-line"><span>E&O Base Premium</span><span>${Number(quote.eo_base_premium).toLocaleString()}</span></div>}
          {quote.family_law_surcharge > 0 && <div className="q-line"><span>Family Law Surcharge</span><span>+${Number(quote.family_law_surcharge)}</span></div>}
          {quote.mediation_premium > 0 && <div className="q-line"><span>Mediation</span><span>+${Number(quote.mediation_premium)}</span></div>}
          {quote.cgl_premium > 0 && <div className="q-line"><span>CGL</span><span>+${Number(quote.cgl_premium)}</span></div>}
          {quote.third_party_bond_premium > 0 && <div className="q-line"><span>Third Party Bond</span><span>+${Number(quote.third_party_bond_premium)}</span></div>}
          {quote.privacy_breach_premium > 0 && <div className="q-line"><span>Privacy Breach Upgrade</span><span>+${Number(quote.privacy_breach_premium)}</span></div>}
          <div className="q-total"><span>Annual Total</span><span>${Number(quote.total_premium).toLocaleString()}</span></div>
          <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '1rem' }} disabled>Proceed to Payment (Coming Soon)</button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div className="card">
          <h4 style={{ fontFamily: 'Cormorant Garamond', fontSize: 16, marginBottom: '0.75rem' }}>Firm Details</h4>
          {[['Firm', app.firms?.firm_name], ['Business form', (app.firms?.business_form || '').replace('_', ' ')], ['OPA member', app.firms?.is_opa_member ? 'Yes' : 'No'], ['City', app.firms?.city]].filter(([, v]) => v).map(([l, v]) => (
            <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid var(--border)', fontSize: 14 }}>
              <span style={{ color: 'var(--text2)' }}>{l}</span><span style={{ textTransform: 'capitalize' }}>{v}</span>
            </div>
          ))}
        </div>
        <div className="card">
          <h4 style={{ fontFamily: 'Cormorant Garamond', fontSize: 16, marginBottom: '0.75rem' }}>Policy Period</h4>
          <div style={{ display: 'flex', gap: '2rem' }}>
            <div><div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Effective</div><div style={{ fontSize: 16, fontWeight: 500, marginTop: 4 }}>{app.effective_date ? new Date(app.effective_date).toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}</div></div>
            <div><div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Expiry</div><div style={{ fontSize: 16, fontWeight: 500, marginTop: 4 }}>{app.expiry_date ? new Date(app.expiry_date).toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}</div></div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
