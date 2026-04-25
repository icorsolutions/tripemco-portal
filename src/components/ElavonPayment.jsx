import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const PK = 'pk_h9w3pwbpyrvddfhmdm498bxtfgq9'
const SCRIPT = 'https://uat.hpp.converge.eu.elavonaws.com/client/library.js'

export default function ElavonPayment({ application, quote, onSuccess }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (document.querySelector('script[src="' + SCRIPT + '"]')) { setReady(true); return }
    const s = document.createElement('script')
    s.src = SCRIPT
    s.onload = () => setReady(true)
    s.onerror = () => setError('Failed to load payment form.')
    document.head.appendChild(s)
  }, [])

  async function pay() {
    setLoading(true); setError('')
    try {
      const r = await fetch('/api/create-payment-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: quote.total_premium, applicationId: application.id, firmName: application.firms?.firm_name })
      })
      if (!r.ok) { const e = await r.json(); throw new Error(e.error) }
      const res = await r.json()
      const sid = res.sessionId
      const lb = new window.ElavonLightbox({
        sessionId: sid,
        publicKey: PK,
        onReady: (e) => {
          if (e) { setError('Payment form error'); setLoading(false) }
          else { lb.show(); setLoading(false) }
        },
        messageHandler: async (msg, def) => {
  console.log('Elavon message received:', JSON.stringify(msg))
  const successTypes = ['transactionCreated', 'TRANSACTION_CREATED', 'sale', 'success']
  if (successTypes.includes(msg.type) || msg.sessionId) {
    const eff = new Date().toISOString().split('T')[0]
    const exp = new Date(Date.now() + 365 * 864e5).toISOString().split('T')[0]
    const { data: pol } = await supabase.from('policies').insert({
      application_id: application.id,
      firm_id: application.firm_id,
      policy_number: 'TRP-' + Date.now().toString(36).toUpperCase(),
      status: 'active',
      effective_date: eff,
      expiry_date: exp,
      total_premium: quote.total_premium
    }).select().single()
    await supabase.from('applications').update({ status: 'bound' }).eq('id', application.id)
    await supabase.from('payments').insert({
      application_id: application.id,
      policy_id: pol?.id,
      amount: quote.total_premium,
      currency: 'CAD',
      status: 'completed',
      payment_method: 'credit_card',
      transaction_id: msg.sessionId,
      paid_at: new Date().toISOString()
    })
    onSuccess?.(pol)
  }
  def()
}
      })
    } catch(e) { setError(e.message); setLoading(false) }
  }

  const fmt = v => v ? '$' + Number(v).toLocaleString('en-CA', { minimumFractionDigits: 2 }) : '-'

  return (
    <div>
      {error && <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>{error}</div>}
      <div style={{ background: 'rgba(26,39,68,0.04)', border: '1px solid rgba(26,39,68,0.15)', borderRadius: 14, padding: '1.5rem' }}>
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ fontSize: 12, color: '#9aa5b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Annual Premium Due</div>
          <div style={{ fontFamily: 'Cormorant Garamond', fontSize: 32, fontWeight: 500, color: '#1a2744' }}>{fmt(quote?.total_premium)}</div>
          <div style={{ fontSize: 12, color: '#4a5568', marginTop: 4 }}>CAD · Annual · Due on binding</div>
        </div>
        <button
          className="btn btn-primary"
          style={{ width: '100%', justifyContent: 'center', padding: '12px 20px', fontSize: 15 }}
          onClick={pay}
          disabled={loading || !ready}
        >
          {loading ? 'Preparing...' : !ready ? 'Loading...' : 'Pay ' + fmt(quote?.total_premium) + ' and Bind Policy'}
        </button>
        <p style={{ fontSize: 11, color: '#9aa5b8', textAlign: 'center', marginTop: '0.75rem' }}>
          Secured by Elavon Converge · PCI DSS Compliant
        </p>
      </div>
    </div>
  )
}
