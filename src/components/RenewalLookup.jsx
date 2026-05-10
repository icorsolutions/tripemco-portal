// RenewalLookup.jsx
// Drop this into src/components/RenewalLookup.jsx
import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function RenewalLookup({ onFound }) {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [found, setFound] = useState(null)

  async function lookup() {
    if (!query.trim()) return setError('Please enter a policy number or firm name.')
    setLoading(true)
    setError('')
    setFound(null)

    try {
      // Search by policy number first
      let { data: policies } = await supabase
        .from('policies')
        .select(`
          *,
          applications(
            *,
            firms(*),
            application_paralegals(*, paralegals(*)),
            coverages(*)
          )
        `)
        .ilike('policy_number', query.trim())
        .eq('status', 'active')
        .limit(1)

      // If not found by policy number, try firm name
      if (!policies || policies.length === 0) {
        const { data: firms } = await supabase
          .from('firms')
          .select('id, firm_name')
          .ilike('firm_name', query.trim())
          .limit(5)

        if (firms && firms.length > 0) {
          const firmIds = firms.map(f => f.id)
          const { data: appsByFirm } = await supabase
            .from('applications')
            .select(`
              *,
              firms(*),
              application_paralegals(*, paralegals(*)),
              coverages(*)
            `)
            .in('firm_id', firmIds)
            .eq('status', 'bound')
            .order('created_at', { ascending: false })
            .limit(1)

          if (appsByFirm && appsByFirm.length > 0) {
            // Get the policy for this application
            const { data: pol } = await supabase
              .from('policies')
              .select('*')
              .eq('application_id', appsByFirm[0].id)
              .eq('status', 'active')
              .single()

            if (pol) {
              policies = [{ ...pol, applications: [appsByFirm[0]] }]
            }
          }
        }
      }

      if (!policies || policies.length === 0) {
        setError('No active policy found. Please check the policy number or firm name and try again. It must match exactly as shown on your certificate.')
        return
      }

      const policy = policies[0]
      const app = policy.applications?.[0]
      const firm = app?.firms

      if (!app || !firm) {
        setError('Policy found but unable to retrieve full details. Please contact Tripemco at (800) 461-5083.')
        return
      }

      setFound({ policy, app, firm })
    } catch (e) {
      setError('Lookup failed. Please try again or contact Tripemco at (800) 461-5083.')
    } finally {
      setLoading(false)
    }
  }

  function confirm() {
    if (found) onFound(found)
  }

  return (
    <div>
      <div style={{ background: 'var(--bl)', border: '1px solid #b8ccf5', borderRadius: 'var(--r)', padding: '1rem', marginBottom: '1.25rem' }}>
        <p style={{ fontSize: 13, color: 'var(--blue)', lineHeight: 1.5 }}>
          <strong>Looking up your expiring policy?</strong> Enter your policy number (e.g. TRP-MOXB1YN9) or your firm name exactly as it appears on your current certificate of insurance.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: '1rem' }}>
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && lookup()}
          placeholder="Policy number (e.g. TRP-MOXB1YN9) or firm name"
          style={{ flex: 1 }}
        />
        <button
          type="button"
          className="btn btn-primary"
          onClick={lookup}
          disabled={loading}
          style={{ flexShrink: 0 }}
        >
          {loading ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Looking up…</> : 'Look up policy'}
        </button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {found && (
        <div style={{ background: 'var(--gl)', border: '1px solid #b8dece', borderRadius: 'var(--r)', padding: '1.25rem' }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--green2)', marginBottom: '0.75rem' }}>✓ Policy found — confirm your details below</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 14, marginBottom: '1rem' }}>
            <div><span style={{ color: 'var(--text2)', fontSize: 12 }}>Named Insured</span><br /><strong>{found.firm?.firm_name}</strong></div>
            <div><span style={{ color: 'var(--text2)', fontSize: 12 }}>Policy Number</span><br /><strong>{found.policy?.policy_number}</strong></div>
            <div><span style={{ color: 'var(--text2)', fontSize: 12 }}>Expiry Date</span><br /><strong>{found.policy?.expiry_date ? new Date(found.policy.expiry_date + 'T12:00:00').toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}</strong></div>
            <div><span style={{ color: 'var(--text2)', fontSize: 12 }}>Paralegals</span><br /><strong>{(found.app?.application_paralegals || []).map(ap => ap.paralegals?.full_name).filter(Boolean).join(', ') || '—'}</strong></div>
          </div>
          <button type="button" className="btn btn-primary" onClick={confirm}>
            Confirm & pre-fill renewal →
          </button>
          <button type="button" className="btn btn-ghost" style={{ marginLeft: 8 }} onClick={() => { setFound(null); setQuery('') }}>
            Not my policy
          </button>
        </div>
      )}
    </div>
  )
}
