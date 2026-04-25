import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import Layout from '../components/Layout'
import ElavonPayment from '../components/ElavonPayment'
import CertificateGenerator from '../components/CertificateGenerator'

export default function ApplicationDetail() {
  const { id } = useParams()
  const { isAdmin } = useAuth()
  const navigate = useNavigate()
  const [app, setApp] = useState(null)
  const [loading, setLoading] = useState(true)

  async function loadApp() {
    const { data } = await supabase
      .from('applications')
      .select('*, firms(*), coverages(*), quotes(*), policies(*)')
      .eq('id', id)
      .single()
    setApp(data)
    setLoading(false)
  }

  useEffect(() => { loadApp() }, [id])

  function handlePaymentSuccess(policy) {
    loadApp() // Refresh to show bound status and policy
  }

  if (loading) return <Layout><div className="loading" style={{ minHeight: 300 }}><span className="spinner" /></div></Layout>
  if (!app) return <Layout><div className="alert alert-danger">Application not found.</div></Layout>

  const badge = (s) => {
    const colors = {
      draft: 'var(--text2)', submitted: '#1a56c4', quoted: 'var(--green2)',
      referred: 'var(--amber)', declined: 'var(--red)', bound: 'var(--green2)', active: 'var(--green2)'
    }
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', padding: '4px 14px',
        borderRadius: 99, fontSize: 13, fontWeight: 500,
        background: `${colors[s] || 'var(--text2)'}18`,
        color: colors[s] || 'var(--text2)',
        border: `1px solid ${colors[s] || 'var(--text2)'}30`,
        textTransform: 'capitalize'
      }}>{s}</span>
    )
  }

  const quote = app.quotes?.[0]
  const policy = app.policies?.[0]
  const backTo = isAdmin ? '/admin/applications' : '/applications'

  return (
    <Layout>
      <div className="ph">
        <div>
          <h1 className="ph-title">{app.firms?.firm_name}</h1>
          <p className="ph-sub" style={{ textTransform: 'capitalize' }}>
            {app.application_type} Application · Submitted {new Date(app.created_at).toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {badge(app.status)}
          <Link to={backTo} className="btn btn-ghost">← Back</Link>
        </div>
      </div>

      {/* Status banners */}
      {app.status === 'declined' && (
        <div className="alert alert-danger">
          <strong>⛔ Application Declined</strong>
          <ul style={{ marginTop: 8, paddingLeft: 20 }}>
            {(app.decline_reasons || []).map((r, i) => <li key={i} style={{ marginBottom: 4 }}>{r.label || r}</li>)}
          </ul>
          <p style={{ marginTop: 12, fontSize: 13 }}>
            Please contact Tripemco directly at <strong>(905) 664-2266</strong> or <a href="mailto:info@tripemco.com">info@tripemco.com</a> for assistance.
          </p>
        </div>
      )}

      {app.status === 'referred' && (
        <div className="alert alert-warning">
          <strong>⚠ Application Under Underwriter Review</strong>
          <ul style={{ marginTop: 8, paddingLeft: 20 }}>
            {(app.referral_reasons || []).map((r, i) => <li key={i} style={{ marginBottom: 4 }}>{r.label || r}</li>)}
          </ul>
          <p style={{ marginTop: 10, fontSize: 13 }}>
            A Tripemco broker will contact you within 2–3 business days. Questions? Call <strong>(905) 664-2266</strong>.
          </p>
        </div>
      )}

      {app.status === 'bound' && policy && (
        <div className="alert alert-success">
          <strong>✓ Policy Active</strong>
          <p style={{ marginTop: 6, fontSize: 13 }}>
            Policy <strong>{policy.policy_number}</strong> is active from {new Date(policy.effective_date).toLocaleDateString('en-CA')} to {new Date(policy.expiry_date).toLocaleDateString('en-CA')}.
          </p>
        </div>
      )}
{app.status === 'bound' && policy && (
  <div style={{ marginTop: '0.75rem' }}>
    <CertificateGenerator application={app} policy={policy} quote={quote} />
  </div>
)}
      <div style={{ display: 'grid', gridTemplateColumns: quote && app.status === 'quoted' ? '1fr 380px' : '1fr', gap: '1.5rem', alignItems: 'start' }}>
        <div>
          {/* Quote summary */}
          {quote && (
            <div className="card" style={{ marginBottom: '1rem' }}>
              <h4 style={{ fontFamily: 'Cormorant Garamond', fontSize: 18, fontWeight: 500, color: 'var(--navy)', marginBottom: '1rem' }}>
                Premium Breakdown
              </h4>
              <div className="q-line"><span>E&O Base Premium</span><span>${Number(quote.eo_base_premium || 0).toLocaleString()}</span></div>
              {quote.family_law_surcharge > 0 && <div className="q-line"><span>Family Law surcharge (25%)</span><span>+${Number(quote.family_law_surcharge).toLocaleString()}</span></div>}
              {quote.mediation_premium > 0 && <div className="q-line"><span>Mediation Services</span><span>+${Number(quote.mediation_premium)}</span></div>}
              {quote.third_party_bond_premium > 0 && <div className="q-line"><span>Third Party Bond</span><span>+${Number(quote.third_party_bond_premium)}</span></div>}
              {quote.cgl_premium > 0 && <div className="q-line"><span>Commercial General Liability</span><span>+${Number(quote.cgl_premium)}</span></div>}
              {quote.privacy_breach_premium > 0 && <div className="q-line"><span>Enhanced Privacy Breach</span><span>+${Number(quote.privacy_breach_premium)}</span></div>}
              <div className="q-total"><span>Annual Total</span><span>${Number(quote.total_premium).toLocaleString()}</span></div>
            </div>
          )}

          {/* Firm details */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="card">
              <h4 style={{ fontFamily: 'Cormorant Garamond', fontSize: 16, fontWeight: 500, marginBottom: '0.75rem', color: 'var(--navy)' }}>Firm Details</h4>
              {[
                ['Firm name', app.firms?.firm_name],
                ['Business form', (app.firms?.business_form || '').replace(/_/g, ' ')],
                ['OPA member', app.firms?.is_opa_member ? 'Yes' : 'No'],
                ['City', app.firms?.city],
                ['Province', app.firms?.province],
              ].filter(([, v]) => v).map(([l, v]) => (
                <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid var(--border)', fontSize: 14 }}>
                  <span style={{ color: 'var(--text2)' }}>{l}</span>
                  <span style={{ textTransform: 'capitalize', fontWeight: 500 }}>{v}</span>
                </div>
              ))}
            </div>

            <div className="card">
              <h4 style={{ fontFamily: 'Cormorant Garamond', fontSize: 16, fontWeight: 500, marginBottom: '0.75rem', color: 'var(--navy)' }}>Policy Period</h4>
              <div style={{ display: 'flex', gap: '1.5rem' }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Effective</div>
                  <div style={{ fontSize: 15, fontWeight: 500, marginTop: 4 }}>
                    {app.effective_date ? new Date(app.effective_date).toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Expiry</div>
                  <div style={{ fontSize: 15, fontWeight: 500, marginTop: 4 }}>
                    {app.expiry_date ? new Date(app.expiry_date).toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
                  </div>
                </div>
              </div>

              {policy && (
                <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Policy Number</div>
                  <div style={{ fontSize: 15, fontWeight: 500, marginTop: 4, fontFamily: 'monospace', color: 'var(--navy)' }}>{policy.policy_number}</div>
                </div>
              )}
            </div>
          </div>

          {/* Coverage summary */}
          {app.coverages?.[0] && (
            <div className="card" style={{ marginTop: '1rem' }}>
              <h4 style={{ fontFamily: 'Cormorant Garamond', fontSize: 16, fontWeight: 500, marginBottom: '0.75rem', color: 'var(--navy)' }}>Coverage Summary</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[
                  ['E&O Limit per claim', `$${Number(app.coverages[0].eo_limit_per_claim || 1000000).toLocaleString()}`],
                  ['Aggregate limit', `$${Number(app.coverages[0].eo_aggregate_limit || 2000000).toLocaleString()}`],
                  ['Deductible', `$${Number(app.coverages[0].eo_deductible || 1500).toLocaleString()}`],
                  ['Identity Fraud Expense', '$5,000'],
                  app.coverages[0].wants_mediation && ['Mediation', 'Included'],
                  app.coverages[0].wants_cgl && ['CGL', `$${Number(app.coverages[0].cgl_limit || 0).toLocaleString()}`],
                  app.coverages[0].wants_privacy_breach_upgrade && ['Privacy Breach', `$${Number(app.coverages[0].privacy_breach_limit || 0).toLocaleString()}`],
                ].filter(Boolean).map(([l, v]) => (
                  <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                    <span style={{ color: 'var(--text2)' }}>{l}</span>
                    <span style={{ fontWeight: 500 }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Payment panel - only show for quoted applications */}
        {app.status === 'quoted' && quote && (
          <div>
            <div style={{ position: 'sticky', top: '2rem' }}>
              <h3 style={{ fontFamily: 'Cormorant Garamond', fontSize: 20, fontWeight: 500, color: 'var(--navy)', marginBottom: '1rem' }}>
                Complete Your Purchase
              </h3>
              <ElavonPayment
                application={app}
                quote={quote}
                onSuccess={handlePaymentSuccess}
              />
              <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: '0.75rem', lineHeight: 1.5 }}>
                Questions about your quote? Contact Tripemco at <strong>(905) 664-2266</strong> before proceeding.
              </p>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
