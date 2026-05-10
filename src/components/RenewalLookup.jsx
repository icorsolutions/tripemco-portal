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
      let policy = null
      let app = null
      let firm = null

      // Step 1: Find policy by number or firm name
      const cleanQuery = query.trim()

      // Try by policy number first
      const { data: pols } = await supabase
        .from('policies')
        .select('*')
        .ilike('policy_number', cleanQuery)
        .eq('status', 'active')
        .limit(1)

      if (pols && pols.length > 0) {
        policy = pols[0]
      } else {
        // Try by firm name
        const { data: firms } = await supabase
          .from('firms')
          .select('id')
          .ilike('firm_name', cleanQuery)
          .limit(5)

        if (firms && firms.length > 0) {
          const firmIds = firms.map(f => f.id)
          const { data: apps } = await supabase
            .from('applications')
            .select('id')
            .in('firm_id', firmIds)
            .eq('status', 'bound')
            .order('created_at', { ascending: false })
            .limit(1)

          if (apps && apps.length > 0) {
            const { data: polByApp } = await supabase
              .from('policies')
              .select('*')
              .eq('application_id', apps[0].id)
              .eq('status', 'active')
              .limit(1)

            if (polByApp && polByApp.length > 0) {
              policy = polByApp[0]
            }
          }
        }
      }

      if (!policy) {
        setError('No active policy found. Please check the policy number or firm name — it must match exactly as shown on your certificate.')
        return
      }

      // Step 2: Get the application
      const { data: appData } = await supabase
        .from('applications')
        .select('*')
        .eq('id', policy.application_id)
        .single()

      if (!appData) {
        setError('Policy found but application details could not be retrieved. Please contact Tripemco at (800) 461-5083.')
        return
      }
      app = appData

      // Step 3: Get the firm
      const { data: firmData } = await supabase
        .from('firms')
        .select('*')
        .eq('id', app.firm_id)
        .single()

      if (!firmData) {
        setError('Policy found but firm details could not be retrieved. Please contact Tripemco at (800) 461-5083.')
        return
      }
      firm = firmData

      // Step 4: Get paralegals
      const { data: appParalegals } = await supabase
        .from('application_paralegals')
        .select('*, paralegals(*)')
        .eq('application_id', app.id)

      // Step 5: Get coverages
      const { data: coverages } = await supabase
        .from('coverages')
        .select('*')
        .eq('application_id', app.id)
        .limit(1)

      app.application_paralegals = appParalegals || []
      app.coverages = coverages || []

      setFound({ policy, app, firm })
    } catch (e) {
      console.error('Lookup error:', e)
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
          placeholder="Policy number or firm name"
          style={{ flex: 1 }}
        />
        <button type="button" className="btn btn-primary" onClick={lookup} disabled={loading} style={{ flexShrink: 0 }}>
          {loading ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Looking up…</> : 'Look up policy'}
        </button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {found && (
        <div style={{ background: 'var(--gl)', border: '1px solid #b8dece', borderRadius: 'var(--r)', padding: '1.25rem' }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--green2)', marginBottom: '0.75rem' }}>✓ Policy found — please confirm your details</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 14, marginBottom: '1rem' }}>
            <div>
              <div style={{ color: 'var(--text2)', fontSize: 12, marginBottom: 2 }}>Named Insured</div>
              <strong>{found.firm?.firm_name}</strong>
            </div>
            <div>
              <div style={{ color: 'var(--text2)', fontSize: 12, marginBottom: 2 }}>Policy Number</div>
              <strong>{found.policy?.policy_number}</strong>
            </div>
            <div>
              <div style={{ color: 'var(--text2)', fontSize: 12, marginBottom: 2 }}>Expiry Date</div>
              <strong>{found.policy?.expiry_date ? new Date(found.policy.expiry_date + 'T12:00:00').toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}</strong>
            </div>
            <div>
              <div style={{ color: 'var(--text2)', fontSize: 12, marginBottom: 2 }}>Paralegals</div>
              <strong>{(found.app?.application_paralegals || []).map(ap => ap.paralegals?.full_name).filter(Boolean).join(', ') || '—'}</strong>
            </div>
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
