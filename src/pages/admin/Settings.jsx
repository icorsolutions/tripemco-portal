// src/pages/AdminSettings.jsx
import { useEffect, useState } from 'react'
import Layout from '../../components/Layout'
import { getProgramConfig, updateProgramConfig } from '../../lib/programConfig'

const FIELD_META = {
  master_policy_no: { label: 'Master Policy No', hint: 'Appears on every bordereau row (e.g. MP000005)' },
  sovereign_ibc_code: { label: 'Sovereign IBC Code', hint: 'Insurance Bureau of Canada code (e.g. 811030)' },
  commission_rate: { label: 'Commission Rate (decimal)', hint: 'e.g. 0.225 for 22.5%' },
  broker_name: { label: 'Broker Name', hint: 'Shown in bordereau header' },
  broker_address: { label: 'Broker Address', hint: 'Use \\n for line breaks' },
  product_name: { label: 'Product Name', hint: 'Shown in bordereau summary' },
}

export default function AdminSettings() {
  const [config, setConfig] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    loadConfig()
  }, [])

  async function loadConfig() {
    try {
      setLoading(true)
      const c = await getProgramConfig()
      setConfig(c)
    } catch (e) {
      setError(e.message || 'Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  async function handleSave(key) {
    try {
      setSaving(key)
      setError('')
      setSuccess('')
      await updateProgramConfig(key, config[key])
      setSuccess(`Saved ${FIELD_META[key]?.label || key}`)
      setTimeout(() => setSuccess(''), 2000)
    } catch (e) {
      setError(e.message || 'Save failed')
    } finally {
      setSaving('')
    }
  }

  if (loading) return <Layout><p>Loading settings...</p></Layout>

  return (
    <Layout>
      <div className="ph">
        <div>
          <h1 className="ph-title">Program Settings</h1>
          <p className="ph-sub">Configuration values used by the bordereau report and elsewhere.</p>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div style={{ maxWidth: 720 }}>
        {Object.keys(FIELD_META).map(key => {
          const meta = FIELD_META[key]
          const isMultiline = key === 'broker_address'
          return (
            <div key={key} className="fg" style={{ marginBottom: '1.25rem' }}>
              <label className="fl">{meta.label}</label>
              {isMultiline ? (
                <textarea
                  rows={3}
                  value={config[key] || ''}
                  onChange={e => setConfig(c => ({ ...c, [key]: e.target.value }))}
                  style={{ width: '100%' }}
                />
              ) : (
                <input
                  type="text"
                  value={config[key] || ''}
                  onChange={e => setConfig(c => ({ ...c, [key]: e.target.value }))}
                />
              )}
              {meta.hint && <div className="fhint">{meta.hint}</div>}
              <button
                type="button"
                className="btn btn-primary btn-sm"
                style={{ marginTop: 8 }}
                onClick={() => handleSave(key)}
                disabled={saving === key}
              >
                {saving === key ? 'Saving...' : 'Save'}
              </button>
            </div>
          )
        })}
      </div>
    </Layout>
  )
}