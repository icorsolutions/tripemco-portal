// src/pages/AdminBordereau.jsx
import { useState } from 'react'
import Layout from '../../components/Layout'
import { generateBordereau } from '../../lib/bordereau'
import { todayInputValue } from '../../lib/dates'

function firstOfThisMonth() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}-01`
}

function lastOfPriorMonth() {
  const d = new Date()
  d.setDate(0)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function firstOfPriorMonth() {
  const d = new Date()
  d.setDate(1)
  d.setMonth(d.getMonth() - 1)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}-01`
}

export default function AdminBordereau() {
  const [fromDate, setFromDate] = useState(firstOfPriorMonth())
  const [toDate, setToDate] = useState(lastOfPriorMonth())
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  async function handleGenerate() {
    setGenerating(true)
    setError('')
    setResult(null)
    try {
      const r = await generateBordereau({ fromDate, toDate })
      setResult(r)
    } catch (e) {
      setError(e.message || 'Generation failed')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <Layout>
      <div className="ph">
        <div>
          <h1 className="ph-title">Bordereau Report</h1>
          <p className="ph-sub">Generate the monthly Tripemco/Sovereign bordereau (portal-issued policies only — historical book not yet included).</p>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div style={{ maxWidth: 560 }}>
        <div className="frow">
          <div className="fg">
            <label className="fl req">Effective date from</label>
            <input type="date" value={fromDate} max={todayInputValue()} onChange={e => setFromDate(e.target.value)} />
          </div>
          <div className="fg">
            <label className="fl req">Effective date to</label>
            <input type="date" value={toDate} max={todayInputValue()} onChange={e => setToDate(e.target.value)} />
          </div>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={handleGenerate}
          disabled={generating || !fromDate || !toDate || fromDate > toDate}
        >
          {generating ? 'Generating...' : 'Generate Bordereau'}
        </button>

        {result && (
          <div className="alert alert-success" style={{ marginTop: '1.25rem' }}>
            <strong>Report downloaded:</strong> {result.filename}<br />
            <span style={{ fontSize: 13 }}>
              {result.rowCount} policies &middot; Total premium ${result.totalPremium.toLocaleString()} &middot; Total commission ${result.totalCommission.toFixed(2)}
            </span>
          </div>
        )}
      </div>

      <div style={{ marginTop: '2rem', padding: '1rem', background: 'var(--bg2)', borderRadius: 'var(--r)', fontSize: 13, color: 'var(--text2)', maxWidth: 720 }}>
        <strong>Phase 1 scope:</strong> This generator only includes NEW and renewal (REN) policies issued through this portal. Endorsements (paralegal adds/removes), cancellations, and historical policies (Tripemco BMS book) are not yet supported and must continue to be added to the report manually.
      </div>
    </Layout>
  )
}