import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { runUnderwriting, calculatePremium } from '../lib/underwriting'
import Layout from '../components/Layout'

const STEPS = [
  'Application Type',
  'Firm Information',
  'Paralegals',
  'Services',
  'Business Practice',
  'Prior Insurance',
  'Loss Experience',
  'Coverage Selection',
  'Review & Submit',
]

const YN = ({ value, onChange }) => (
  <div className="yn-group">
    <button type="button" className={`yn-btn ${value === true ? 'yes' : ''}`} onClick={() => onChange(true)}>Yes</button>
    <button type="button" className={`yn-btn ${value === false ? 'no' : ''}`} onClick={() => onChange(false)}>No</button>
  </div>
)

const Field = ({ label, required, hint, children }) => (
  <div className="form-group">
    <label className={`form-label${required ? ' required' : ''}`}>{label}</label>
    {children}
    {hint && <div className="form-hint">{hint}</div>}
  </div>
)

export default function NewApplication() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Form state
  const [appType, setAppType] = useState('new')
  const [priorPolicyNumber, setPriorPolicyNumber] = useState('')

  const [firm, setFirm] = useState({
    firm_name: '', operating_name: '', business_form: 'sole_proprietorship',
    website: '', is_opa_member: null, opa_membership_number: '',
    operations_start_date: '', office_type: 'home',
    address_line1: '', address_line2: '', city: '', province: 'Ontario', postal_code: '',
    branch_address_1: '', other_legal_entities: false,
  })

  const [paralegals, setParalegals] = useState([{
    full_name: '', lso_license_number: '', title_and_duties: 'Paralegal',
    education: '', years_experience: '', is_opa_member: null,
    retroactive_date_agreed: null,
  }])

  const [services, setServices] = useState({
    employee_count: 1, contractor_count: 0, hires_subcontractors: false,
    provides_immigration: false, provides_notary: false, provides_mediation: false,
    mediation_certified: null, mediation_hours_completed: '', mediation_revenue_pct: '',
    provides_family_law: false, provides_sabs: false, provides_other_services: false,
    other_services_description: '', offices_outside_canada: false,
    current_revenue: '', prior_revenue: '',
  })

  const [bizPractice, setBiz] = useState({
    practice_client_records: false, practice_written_retainer: false,
    practice_file_audits: false, practice_professional_dev: false,
    practice_calendaring: false, practice_lso_compliance: false,
    practice_conflict_checks: false, revenue_single_client_over_50pct: null,
    has_written_retainer: null, retainer_pct: '',
    contract_hold_harmless_own: false, contract_hold_harmless_client: false,
    contract_guarantees: false, contract_service_description: false,
    contract_payment_terms: false, cheque_countersignature: null,
    cheque_endorsement_deposit_only: null, bank_reconciliation: null,
    sole_owner_signing: false, internal_accounting_controls: false,
    dual_auth_banking: false, electronic_payments: false,
    owner_manages_multiple_tasks: false, segregation_of_duties: null,
  })

  const [priorIns, setPriorIns] = useState({
    has_prior_eo_insurance: null,
    prior_policies: [],
    prior_insurance_declined: null,
  })

  const [lossExp, setLoss] = useState({
    loss_criminal_charges: null, loss_negligence_allegations: null,
    loss_circumstances_aware: null, loss_claims_past_5yr: null,
    loss_license_suspended: null, loss_disciplinary: null,
    loss_censured_fined: null,
  })

  const [coverages, setCov] = useState({
    eo_limit_per_claim: 1000000, eo_aggregate_limit: 2000000, eo_deductible: 1500,
    wants_mediation: false, wants_notary: false, wants_third_party_bond: false,
    wants_cgl: false, cgl_limit: 1000000,
    wants_privacy_breach_upgrade: false, privacy_breach_limit: 5000,
  })

  const setFirmField = (k, v) => setFirm(f => ({ ...f, [k]: v }))
  const setSvcField = (k, v) => setServices(s => ({ ...s, [k]: v }))
  const setBizField = (k, v) => setBiz(b => ({ ...b, [k]: v }))
  const setCovField = (k, v) => setCov(c => ({ ...c, [k]: v }))

  const addParalegal = () => setParalegals(p => [...p, {
    full_name: '', lso_license_number: '', title_and_duties: 'Paralegal',
    education: '', years_experience: '', is_opa_member: null, retroactive_date_agreed: null,
  }])
  const updateParalegal = (i, k, v) => setParalegals(p => p.map((x, idx) => idx === i ? { ...x, [k]: v } : x))
  const removeParalegal = (i) => setParalegals(p => p.filter((_, idx) => idx !== i))

  const isOPAMember = firm.is_opa_member || paralegals.some(p => p.is_opa_member)
  const paralegalCount = paralegals.length

  // Calculate underwriting decision
  const appData = { ...services, ...bizPractice, ...priorIns, ...lossExp, retroactive_date_agreed: paralegals.every(p => p.retroactive_date_agreed), branch_address_2: firm.branch_address_2 }
  const uwResult = step >= 8 ? runUnderwriting(appData, paralegalCount, coverages) : null
  const rateCategory = appType === 'renewal' || (priorIns.has_prior_eo_insurance && appType === 'new') ? 'experienced_or_renewal' : 'new_no_experience'
  const quote = uwResult?.decision === 'quoted' ? calculatePremium({ isOPAMember, paralegalCount, rateCategory, application: appData, coverages }) : null

  async function handleSubmit() {
    setSaving(true)
    setError('')
    try {
      // Upsert firm
      const { data: firmData, error: firmErr } = await supabase.from('firms').insert({
        user_id: user.id, ...firm, is_opa_member: firm.is_opa_member === true,
      }).select().single()
      if (firmErr) throw firmErr

      // Insert paralegals
      const paralegalRecords = await Promise.all(paralegals.map(p =>
        supabase.from('paralegals').insert({ firm_id: firmData.id, ...p, is_opa_member: p.is_opa_member === true, retroactive_date_agreed: p.retroactive_date_agreed === true, years_experience: parseInt(p.years_experience) || 0 }).select().single()
      ))
      const paralegalIds = paralegalRecords.map(r => r.data.id)

      // Insert application
      const { data: appData2, error: appErr } = await supabase.from('applications').insert({
        firm_id: firmData.id,
        application_type: appType,
        prior_policy_number: priorPolicyNumber || null,
        status: uwResult?.decision === 'declined' ? 'declined'
          : uwResult?.decision === 'referred' ? 'referred'
          : uwResult?.decision === 'quoted' ? 'quoted' : 'submitted',
        decline_reasons: uwResult?.declineReasons || [],
        referral_reasons: uwResult?.referralReasons || [],
        ...services,
        current_revenue: parseFloat(services.current_revenue) || 0,
        prior_revenue: parseFloat(services.prior_revenue) || 0,
        ...bizPractice,
        ...priorIns,
        ...lossExp,
        retroactive_date_agreed: paralegals.every(p => p.retroactive_date_agreed === true),
        effective_date: new Date().toISOString().split('T')[0],
        expiry_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      }).select().single()
      if (appErr) throw appErr

      // Link paralegals
      await supabase.from('application_paralegals').insert(paralegalIds.map(pid => ({ application_id: appData2.id, paralegal_id: pid })))

      // Insert coverages
      await supabase.from('coverages').insert({ application_id: appData2.id, ...coverages })

      // Insert quote if approved
      if (quote) {
        await supabase.from('quotes').insert({ application_id: appData2.id, ...quote })
      }

      // Create referral record if needed
      if (uwResult?.decision === 'referred') {
        await supabase.from('referrals').insert({
          application_id: appData2.id,
          referred_reasons: uwResult.referralReasons,
          status: 'pending',
        })
      }

      navigate(`/applications/${appData2.id}`)
    } catch (e) {
      setError(e.message || 'Submission failed. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const renderStep = () => {
    switch (step) {
      case 0: return (
        <div>
          <h2 className="step-title">Application type</h2>
          <p className="step-sub">Are you applying for new coverage or renewing an existing policy?</p>
          <div style={{ display: 'flex', gap: 12, marginBottom: '1.5rem' }}>
            {['new', 'renewal'].map(t => (
              <button key={t} type="button" onClick={() => setAppType(t)}
                className="btn"
                style={{ flex: 1, justifyContent: 'center', padding: '1.5rem', flexDirection: 'column', gap: 8,
                  background: appType === t ? 'var(--accent-light)' : 'var(--bg2)',
                  border: `1px solid ${appType === t ? 'var(--accent2)' : 'var(--border2)'}`,
                  color: appType === t ? 'var(--accent)' : 'var(--text2)' }}>
                <span style={{ fontSize: 24 }}>{t === 'new' ? '◧' : '↺'}</span>
                <span style={{ fontWeight: 500, textTransform: 'capitalize' }}>{t === 'new' ? 'New Application' : 'Renewal'}</span>
                <span style={{ fontSize: 12, fontWeight: 400 }}>{t === 'new' ? 'First-time coverage' : 'Renew existing policy'}</span>
              </button>
            ))}
          </div>
          {appType === 'renewal' && (
            <Field label="Prior policy number" hint="Found on your previous certificate of insurance">
              <input type="text" value={priorPolicyNumber} onChange={e => setPriorPolicyNumber(e.target.value)} placeholder="e.g. TRP-2025-00377" />
            </Field>
          )}
        </div>
      )

      case 1: return (
        <div>
          <h2 className="step-title">Firm information</h2>
          <p className="step-sub">Tell us about your paralegal practice.</p>
          <div className="form-row">
            <Field label="Firm / Full name" required>
              <input type="text" value={firm.firm_name} onChange={e => setFirmField('firm_name', e.target.value)} placeholder="Jane Smith" required />
            </Field>
            <Field label="Operating name" hint="Leave blank if same as above">
              <input type="text" value={firm.operating_name} onChange={e => setFirmField('operating_name', e.target.value)} placeholder="Traffic Ticket Hotline" />
            </Field>
          </div>
          <div className="form-row">
            <Field label="Business form" required>
              <select value={firm.business_form} onChange={e => setFirmField('business_form', e.target.value)}>
                <option value="sole_proprietorship">Individual or Sole Proprietorship</option>
                <option value="partnership">Partnership</option>
                <option value="corporation">Corporation</option>
              </select>
            </Field>
            <Field label="Operations start date" required>
              <input type="date" value={firm.operations_start_date} onChange={e => setFirmField('operations_start_date', e.target.value)} />
            </Field>
          </div>
          <Field label="Are you an OPA member?" required>
            <YN value={firm.is_opa_member} onChange={v => setFirmField('is_opa_member', v)} />
          </Field>
          {firm.is_opa_member && (
            <Field label="OPA membership number">
              <input type="text" value={firm.opa_membership_number} onChange={e => setFirmField('opa_membership_number', e.target.value)} />
            </Field>
          )}
          <hr className="section-divider" />
          <h4 style={{ fontFamily: 'Cormorant Garamond', fontSize: 16, fontWeight: 500, marginBottom: '1rem' }}>Main office address</h4>
          <Field label="Office type" required>
            <select value={firm.office_type} onChange={e => setFirmField('office_type', e.target.value)}>
              <option value="home">Home-Based</option>
              <option value="owned">Owned</option>
              <option value="leased">Leased</option>
            </select>
          </Field>
          <Field label="Address line 1" required>
            <input type="text" value={firm.address_line1} onChange={e => setFirmField('address_line1', e.target.value)} placeholder="123 Main Street" />
          </Field>
          <div className="form-row-3">
            <Field label="City" required>
              <input type="text" value={firm.city} onChange={e => setFirmField('city', e.target.value)} placeholder="Toronto" />
            </Field>
            <Field label="Province" required>
              <input type="text" value={firm.province} onChange={e => setFirmField('province', e.target.value)} />
            </Field>
            <Field label="Postal code" required>
              <input type="text" value={firm.postal_code} onChange={e => setFirmField('postal_code', e.target.value)} placeholder="M5V 1A1" />
            </Field>
          </div>
          <Field label="Branch office address" hint="Note: more than 1 branch office requires underwriter review">
            <input type="text" value={firm.branch_address_1} onChange={e => setFirmField('branch_address_1', e.target.value)} placeholder="Optional" />
          </Field>
        </div>
      )

      case 2: return (
        <div>
          <h2 className="step-title">Licensed paralegals</h2>
          <p className="step-sub">List all paralegals to be insured under this policy. Maximum 12 without referral.</p>
          {paralegals.map((p, i) => (
            <div key={i} className="card" style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h4 style={{ fontFamily: 'Cormorant Garamond', fontSize: 16, fontWeight: 500 }}>Paralegal {i + 1}</h4>
                {i > 0 && <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeParalegal(i)}>Remove</button>}
              </div>
              <div className="form-row">
                <Field label="Full name" required>
                  <input type="text" value={p.full_name} onChange={e => updateParalegal(i, 'full_name', e.target.value)} placeholder="Jane Smith" />
                </Field>
                <Field label="LSO license number" required hint="e.g. P01234">
                  <input type="text" value={p.lso_license_number} onChange={e => updateParalegal(i, 'lso_license_number', e.target.value)} placeholder="P01234" />
                </Field>
              </div>
              <div className="form-row">
                <Field label="Title and duties">
                  <input type="text" value={p.title_and_duties} onChange={e => updateParalegal(i, 'title_and_duties', e.target.value)} />
                </Field>
                <Field label="Years of experience" required>
                  <input type="number" min="0" value={p.years_experience} onChange={e => updateParalegal(i, 'years_experience', e.target.value)} />
                </Field>
              </div>
              <Field label="Highest education">
                <input type="text" value={p.education} onChange={e => updateParalegal(i, 'education', e.target.value)} placeholder="e.g. Paralegal Diploma, BSc" />
              </Field>
              <Field label="Is this paralegal an OPA member?" required>
                <YN value={p.is_opa_member} onChange={v => updateParalegal(i, 'is_opa_member', v)} />
              </Field>
              <Field label="I have read and understand the Retroactive Date clause" required hint="Coverage begins from the inception date of your first uninterrupted claims-made policy.">
                <YN value={p.retroactive_date_agreed} onChange={v => updateParalegal(i, 'retroactive_date_agreed', v)} />
              </Field>
            </div>
          ))}
          {paralegals.length < 12 && (
            <button type="button" className="btn btn-ghost" onClick={addParalegal}>+ Add another paralegal</button>
          )}
        </div>
      )

      case 3: return (
        <div>
          <h2 className="step-title">Services & revenue</h2>
          <p className="step-sub">Tell us about the services your firm provides.</p>
          <div className="form-row">
            <Field label="Gross annual revenue — prior period" required>
              <input type="number" min="0" value={services.prior_revenue} onChange={e => setSvcField('prior_revenue', e.target.value)} placeholder="$0" />
            </Field>
            <Field label="Gross annual revenue — current period" required>
              <input type="number" min="0" value={services.current_revenue} onChange={e => setSvcField('current_revenue', e.target.value)} placeholder="$0" />
            </Field>
          </div>
          <div className="form-row">
            <Field label="Total employees (including owner)" required>
              <input type="number" min="1" value={services.employee_count} onChange={e => setSvcField('employee_count', parseInt(e.target.value))} />
            </Field>
            <Field label="Independent contractors">
              <input type="number" min="0" value={services.contractor_count} onChange={e => setSvcField('contractor_count', parseInt(e.target.value))} />
            </Field>
          </div>
          <hr className="section-divider" />
          {[
            { key: 'provides_sabs', label: 'Do you earn fees from SABS (Statutory Accident Benefits) claims?', warning: true },
            { key: 'offices_outside_canada', label: 'Do you have offices or perform services outside of Canada?', warning: true },
            { key: 'provides_immigration', label: 'Do you provide immigration consulting services?' },
            { key: 'provides_notary', label: 'Do you provide notary services?' },
            { key: 'provides_mediation', label: 'Do you provide mediation services?' },
            { key: 'provides_family_law', label: 'Do you provide family law services?', hint: 'Note: 25% premium surcharge applies' },
            { key: 'provides_other_services', label: 'Do you provide any other services outside paralegal, immigration, notary, or mediation?', warning: true },
            { key: 'hires_subcontractors', label: 'Do you hire subcontractors?' },
          ].map(({ key, label, hint, warning }) => (
            <div key={key} style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 500 }}>{label}</p>
                  {hint && <p style={{ fontSize: 12, color: 'var(--warning)', marginTop: 2 }}>{hint}</p>}
                  {warning && services[key] === true && (
                    <p style={{ fontSize: 12, color: 'var(--danger)', marginTop: 2 }}>⚠ This may affect your eligibility for coverage.</p>
                  )}
                </div>
                <YN value={services[key]} onChange={v => setSvcField(key, v)} />
              </div>
              {key === 'provides_mediation' && services.provides_mediation && (
                <div style={{ marginTop: 12, paddingLeft: 16, borderLeft: '2px solid var(--border)' }}>
                  <div className="form-row">
                    <Field label="Have you completed certification and 40+ hours of training?">
                      <YN value={services.mediation_certified} onChange={v => setSvcField('mediation_certified', v)} />
                    </Field>
                    <Field label="Hours of mediation training completed">
                      <input type="number" min="0" value={services.mediation_hours_completed} onChange={e => setSvcField('mediation_hours_completed', e.target.value)} />
                    </Field>
                  </div>
                  <Field label="Mediation fees as % of total revenue" hint="Must be 20% or less">
                    <input type="number" min="0" max="100" value={services.mediation_revenue_pct} onChange={e => setSvcField('mediation_revenue_pct', e.target.value)} placeholder="%" />
                  </Field>
                </div>
              )}
            </div>
          ))}
        </div>
      )

      case 4: return (
        <div>
          <h2 className="step-title">Business practice</h2>
          <p className="step-sub">Tell us about your risk management practices.</p>
          <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: '1rem' }}>Select all risk management practices your firm employs:</p>
          {[
            { key: 'practice_client_records', label: 'Maintain detailed client communication records and documentation' },
            { key: 'practice_written_retainer', label: 'Use a standard written contract or retainer agreement' },
            { key: 'practice_file_audits', label: 'Conduct regular internal file audits and reviews' },
            { key: 'practice_professional_dev', label: 'Stay current with legal updates through ongoing professional development' },
            { key: 'practice_calendaring', label: 'Implement strict calendaring and deadline-tracking systems' },
            { key: 'practice_lso_compliance', label: 'Ensure full compliance with Law Society of Ontario (LSO) regulations' },
            { key: 'practice_conflict_checks', label: 'Carry out conflict checks prior to accepting new clients' },
          ].map(({ key, label }) => (
            <div key={key} className="checkbox-group">
              <input type="checkbox" id={key} checked={bizPractice[key]} onChange={e => setBizField(key, e.target.checked)} />
              <label htmlFor={key}>{label}</label>
            </div>
          ))}
          <hr className="section-divider" />
          <Field label="Were more than 50% of your total billings for any one year from a single client?" required>
            <YN value={bizPractice.revenue_single_client_over_50pct} onChange={v => setBizField('revenue_single_client_over_50pct', v)} />
          </Field>
          <Field label="Does your firm use a standard written retainer for every project?" required>
            <YN value={bizPractice.has_written_retainer} onChange={v => setBizField('has_written_retainer', v)} />
          </Field>
          {bizPractice.has_written_retainer && (
            <Field label="Percentage of revenue where retainer is used">
              <input type="number" min="0" max="100" value={bizPractice.retainer_pct} onChange={e => setBizField('retainer_pct', e.target.value)} placeholder="%" />
            </Field>
          )}
          <hr className="section-divider" />
          <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: '1rem' }}>Do your contracts contain any of the following?</p>
          {[
            { key: 'contract_hold_harmless_own', label: 'Hold harmless or indemnification clauses in your favour' },
            { key: 'contract_hold_harmless_client', label: 'Hold harmless or indemnification clauses in your client\'s favour' },
            { key: 'contract_guarantees', label: 'Guarantees or warranties' },
            { key: 'contract_service_description', label: 'A specific description of the services you will provide' },
            { key: 'contract_payment_terms', label: 'Payment terms' },
          ].map(({ key, label }) => (
            <div key={key} className="checkbox-group">
              <input type="checkbox" id={key} checked={bizPractice[key]} onChange={e => setBizField(key, e.target.checked)} />
              <label htmlFor={key}>{label}</label>
            </div>
          ))}
          <hr className="section-divider" />
          <Field label="Is there countersignature of cheques?" required>
            <YN value={bizPractice.cheque_countersignature} onChange={v => setBizField('cheque_countersignature', v)} />
          </Field>
          <Field label="Is there a formal segregation of duties program?" required>
            <YN value={bizPractice.segregation_of_duties} onChange={v => setBizField('segregation_of_duties', v)} />
          </Field>
          {[
            { key: 'sole_owner_signing', label: 'Business operated by sole owner with full signing authority' },
            { key: 'internal_accounting_controls', label: 'Internal controls and accounting software provide transaction oversight' },
          ].map(({ key, label }) => (
            <div key={key} className="checkbox-group">
              <input type="checkbox" id={key} checked={bizPractice[key]} onChange={e => setBizField(key, e.target.checked)} />
              <label htmlFor={key}>{label}</label>
            </div>
          ))}
        </div>
      )

      case 5: return (
        <div>
          <h2 className="step-title">Prior insurance</h2>
          <p className="step-sub">Tell us about your previous E&O insurance coverage.</p>
          <Field label="Have you previously purchased E&O liability insurance?" required>
            <YN value={priorIns.has_prior_eo_insurance} onChange={v => setPriorIns(p => ({ ...p, has_prior_eo_insurance: v }))} />
          </Field>
          <Field label="Has any E&O policy on your behalf ever been declined, cancelled, or renewal refused?" required>
            <YN value={priorIns.prior_insurance_declined} onChange={v => setPriorIns(p => ({ ...p, prior_insurance_declined: v }))} />
          </Field>
          {priorIns.prior_insurance_declined && (
            <div className="alert alert-warning">Your application will require review by the Sovereign underwriting team.</div>
          )}
        </div>
      )

      case 6: return (
        <div>
          <h2 className="step-title">Loss experience</h2>
          <p className="step-sub">Please answer all questions truthfully. Any yes answer will require underwriter review.</p>
          {[
            { key: 'loss_criminal_charges', label: 'Has anyone in your firm ever been investigated, convicted, or charged with a criminal or fraudulent act regarding professional services?', isDecline: true },
            { key: 'loss_negligence_allegations', label: 'Has anyone in your firm ever been subject to any allegations of professional negligence in writing or verbally?' },
            { key: 'loss_circumstances_aware', label: 'Are you aware of any facts, circumstances, or situations which may reasonably give rise to a claim?' },
            { key: 'loss_claims_past_5yr', label: 'In the past 5 years, are you aware of any circumstance, allegation, or incident which may potentially result in an E&O claim?' },
            { key: 'loss_license_suspended', label: 'Has anyone in your firm had their license suspended or terminated by a regulatory authority?' },
            { key: 'loss_disciplinary', label: 'Has anyone in your firm ever been called before an investigative committee for disciplinary proceedings?' },
            { key: 'loss_censured_fined', label: 'Has anyone in your firm been censured or fined by a regulatory authority?' },
          ].map(({ key, label, isDecline }) => (
            <div key={key} style={{ marginBottom: '1.25rem', padding: '1rem', background: 'var(--bg2)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                <p style={{ fontSize: 14, lineHeight: 1.5 }}>{label}</p>
                <YN value={lossExp[key]} onChange={v => setLoss(l => ({ ...l, [key]: v }))} />
              </div>
              {lossExp[key] === true && (
                <div className={`alert ${isDecline ? 'alert-danger' : 'alert-warning'}`} style={{ marginTop: 10, marginBottom: 0 }}>
                  {isDecline ? '⛔ This will result in an automatic decline.' : '⚠ This will require underwriter review.'}
                </div>
              )}
            </div>
          ))}
        </div>
      )

      case 7: return (
        <div>
          <h2 className="step-title">Coverage selection</h2>
          <p className="step-sub">All policies include E&O, Identity Fraud ($5,000), and 90-day Extended Reporting Period as standard.</p>

          <div className="card" style={{ marginBottom: '1rem' }}>
            <h4 style={{ fontFamily: 'Cormorant Garamond', fontSize: 17, marginBottom: '0.75rem' }}>E&O Coverage — Mandatory</h4>
            <p style={{ fontSize: 13, color: 'var(--text2)' }}>Limit: <strong>$1,000,000 per claim / $2,000,000 aggregate</strong> — Required by Law Society of Ontario</p>
            <p style={{ fontSize: 13, color: 'var(--text2)' }}>Deductible: <strong>$1,500 per claim</strong></p>
          </div>

          <div className="card" style={{ marginBottom: '1rem' }}>
            <h4 style={{ fontFamily: 'Cormorant Garamond', fontSize: 17, marginBottom: '0.75rem' }}>Optional Coverages</h4>

            {services.provides_notary && (
              <div className="checkbox-group" style={{ marginBottom: '1rem' }}>
                <input type="checkbox" id="notary" checked={coverages.wants_notary} onChange={e => setCovField('wants_notary', e.target.checked)} />
                <label htmlFor="notary"><strong>Notary Services</strong> — Extends E&O to cover notary activities <span style={{ color: 'var(--text3)' }}>(included)</span></label>
              </div>
            )}

            {services.provides_mediation && (
              <div className="checkbox-group" style={{ marginBottom: '1rem' }}>
                <input type="checkbox" id="med" checked={coverages.wants_mediation} onChange={e => setCovField('wants_mediation', e.target.checked)} />
                <label htmlFor="med"><strong>Mediation Services</strong> — +$175</label>
              </div>
            )}

            <div className="checkbox-group" style={{ marginBottom: '1rem' }}>
              <input type="checkbox" id="tpb" checked={coverages.wants_third_party_bond} onChange={e => setCovField('wants_third_party_bond', e.target.checked)} />
              <label htmlFor="tpb">
                <strong>Third Party Bond</strong> — Protects client fees from employee theft
                {paralegalCount <= 2 ? ' · $5,000 limit · $50' : ' · $10,000 limit · $100'}
                <span style={{ color: 'var(--warning)', fontSize: 12, display: 'block' }}>Note: Requires underwriter referral</span>
              </label>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <div className="checkbox-group">
                <input type="checkbox" id="cgl" checked={coverages.wants_cgl} onChange={e => setCovField('wants_cgl', e.target.checked)} />
                <label htmlFor="cgl"><strong>Commercial General Liability (CGL)</strong> — From $300</label>
              </div>
              {coverages.wants_cgl && (
                <div style={{ marginLeft: 26, marginTop: 8 }}>
                  <Field label="CGL limit">
                    <select value={coverages.cgl_limit} onChange={e => setCovField('cgl_limit', parseInt(e.target.value))}>
                      <option value={1000000}>$1,000,000 — $300</option>
                      <option value={2000000}>$2,000,000 — $450</option>
                      <option value={3000000}>$3,000,000 — $575</option>
                      <option value={4000000}>$4,000,000 — $725</option>
                      <option value={5000000}>$5,000,000 — $850</option>
                    </select>
                  </Field>
                </div>
              )}
            </div>

            <div>
              <div className="checkbox-group">
                <input type="checkbox" id="priv" checked={coverages.wants_privacy_breach_upgrade} onChange={e => setCovField('wants_privacy_breach_upgrade', e.target.checked)} />
                <label htmlFor="priv"><strong>Enhanced Privacy Breach Expense</strong> — Standard $5,000 included, upgrade available</label>
              </div>
              {coverages.wants_privacy_breach_upgrade && (
                <div style={{ marginLeft: 26, marginTop: 8 }}>
                  <Field label="Privacy breach limit">
                    <select value={coverages.privacy_breach_limit} onChange={e => setCovField('privacy_breach_limit', parseInt(e.target.value))}>
                      <option value={10000}>$10,000 — +$75</option>
                      <option value={25000}>$25,000 — +$150</option>
                    </select>
                  </Field>
                </div>
              )}
            </div>
          </div>
        </div>
      )

      case 8: return (
        <div>
          <h2 className="step-title">Review & submit</h2>
          <p className="step-sub">Please review your application before submitting. By submitting you declare all information is accurate.</p>

          {error && <div className="alert alert-danger">{error}</div>}

          {uwResult?.decision === 'declined' && (
            <div className="alert alert-danger">
              <strong>⛔ Application cannot be processed.</strong>
              <p style={{ marginTop: 8 }}>Based on your answers, we are unable to offer coverage at this time:</p>
              <ul style={{ marginTop: 8, paddingLeft: 20 }}>
                {uwResult.declineReasons.map(r => <li key={r.code} style={{ marginBottom: 4 }}>{r.label} — {r.description}</li>)}
              </ul>
            </div>
          )}

          {uwResult?.decision === 'referred' && (
            <div className="alert alert-warning">
              <strong>⚠ Underwriter review required.</strong>
              <p style={{ marginTop: 8 }}>Your application will be sent to the Sovereign underwriting team for review:</p>
              <ul style={{ marginTop: 8, paddingLeft: 20 }}>
                {uwResult.referralReasons.map(r => <li key={r.code} style={{ marginBottom: 4 }}>{r.label}</li>)}
              </ul>
              <p style={{ marginTop: 8, fontSize: 13 }}>You will be contacted within 2-3 business days.</p>
            </div>
          )}

          {quote && (
            <div className="quote-box">
              <h4 style={{ fontFamily: 'Cormorant Garamond', fontSize: 18, fontWeight: 500, marginBottom: '1rem', color: 'var(--accent)' }}>
                Your premium quote
              </h4>
              {quote.eo_base_premium > 0 && <div className="quote-line"><span>E&O Coverage ({paralegalCount} paralegal{paralegalCount > 1 ? 's' : ''} · {isOPAMember ? 'OPA' : 'Non-OPA'} · {rateCategory === 'new_no_experience' ? 'New' : 'Experienced/Renewal'})</span><span>${quote.eo_base_premium.toLocaleString()}</span></div>}
              {quote.family_law_surcharge > 0 && <div className="quote-line"><span>Family Law surcharge (25%)</span><span>+${quote.family_law_surcharge.toLocaleString()}</span></div>}
              {quote.mediation_premium > 0 && <div className="quote-line"><span>Mediation Services</span><span>+${quote.mediation_premium}</span></div>}
              {quote.third_party_bond_premium > 0 && <div className="quote-line"><span>Third Party Bond</span><span>+${quote.third_party_bond_premium}</span></div>}
              {quote.cgl_premium > 0 && <div className="quote-line"><span>CGL — ${coverages.cgl_limit.toLocaleString()} limit</span><span>+${quote.cgl_premium}</span></div>}
              {quote.privacy_breach_premium > 0 && <div className="quote-line"><span>Enhanced Privacy Breach</span><span>+${quote.privacy_breach_premium}</span></div>}
              <div className="quote-total"><span>Annual Premium</span><span>${quote.total_premium.toLocaleString()}</span></div>
            </div>
          )}

          <div className="card" style={{ marginTop: '1.5rem' }}>
            <h4 style={{ fontSize: 16, fontFamily: 'Cormorant Garamond', marginBottom: '0.75rem' }}>Declaration</h4>
            <p style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.7 }}>
              I hereby declare that the above statements and particulars are true and that I have not suppressed or misstated any material facts.
              I agree that this application shall form part of the insurance policy. I acknowledge that I am obligated to report any changes
              that could affect the disclosures in this application that occur after the date of signature, but prior to the effective date of coverage.
            </p>
            <p style={{ fontSize: 13, color: 'var(--text3)', marginTop: '0.75rem' }}>
              By clicking "Submit Application" you are electronically signing this application.
            </p>
          </div>
        </div>
      )
      default: return null
    }
  }

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h1 className="page-title">New Application</h1>
          <p className="page-subtitle">Paralegal Errors & Omissions Insurance Program</p>
        </div>
      </div>

      <div className="step-form">
        <div className="step-indicators" style={{display:"flex",overflowX:"auto",borderBottom:"1px solid var(--border)",marginBottom:"2rem"}}>
          {STEPS.map((s, i) => (
            <div key={i} className={`step-ind ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`}>
              <span className="step-num">{i < step ? '✓' : i + 1}</span>
              {s}
            </div>
          ))}
        </div>

        {renderStep()}

        <div className="step-actions">
          <button type="button" className="btn btn-ghost" onClick={() => setStep(s => s - 1)} disabled={step === 0}>
            ← Previous
          </button>
          {step < STEPS.length - 1 ? (
            <button type="button" className="btn btn-primary" onClick={() => setStep(s => s + 1)}>
              Next →
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={saving || uwResult?.decision === 'declined'}
            >
              {saving ? <><span className="spinner" style={{width:16,height:16}} /> Submitting…</> : 'Submit Application'}
            </button>
          )}
        </div>
      </div>
    </Layout>
  )
}
