export const DECLINE_RULES = [
  { code: 'SABS', label: 'SABS Exposure', check: (a) => a.provides_sabs === true },
  { code: 'CRIMINAL', label: 'Criminal or Fraudulent Act', check: (a) => a.loss_criminal_charges === true },
  { code: 'OUTSIDE_CANADA', label: 'Offices or Services Outside Canada', check: (a) => a.offices_outside_canada === true },
  { code: 'OTHER_SERVICES', label: 'Non-Eligible Services', check: (a) => a.provides_other_services === true },
]

export const REFERRAL_RULES = [
  { code: 'HIGH_REVENUE', label: 'Revenue Exceeds $500,000', check: (a) => (a.current_revenue || 0) > 500000 },
  { code: 'RETROACTIVE_DATE', label: 'Retroactive Date Disagreement', check: (a) => a.retroactive_date_agreed === false },
  { code: 'PRIOR_DECLINED', label: 'Prior E&O Declined/Cancelled', check: (a) => a.prior_insurance_declined === true },
  { code: 'NEGLIGENCE', label: 'Prior Negligence Allegations', check: (a) => a.loss_negligence_allegations === true },
  { code: 'CIRCUMSTANCES', label: 'Aware of Potential Claims', check: (a) => a.loss_circumstances_aware === true },
  { code: 'CLAIMS_5YR', label: 'Claims Awareness Past 5 Years', check: (a) => a.loss_claims_past_5yr === true },
  { code: 'LICENSE_SUSPENDED', label: 'License Suspended/Terminated', check: (a) => a.loss_license_suspended === true },
  { code: 'DISCIPLINARY', label: 'Disciplinary Proceedings', check: (a) => a.loss_disciplinary === true },
  { code: 'CENSURED', label: 'Censured or Fined', check: (a) => a.loss_censured_fined === true },
  { code: 'MEDIATION_CERT', label: 'Mediation Not Certified', check: (a) => a.provides_mediation && !a.mediation_certified },
  { code: 'MEDIATION_REV', label: 'Mediation Revenue Over 20%', check: (a) => a.provides_mediation && (a.mediation_revenue_pct || 0) > 20 },
  { code: 'TOO_MANY', label: 'More Than 12 Paralegals', check: (a, n) => n > 12 },
  { code: 'THIRD_PARTY_BOND', label: 'Third Party Bond Requested', check: (a, n, c) => c?.wants_third_party_bond },
  { code: 'MULTIPLE_BRANCHES', label: 'More Than 1 Branch Office', check: (a) => !!a.branch_address_2 },
]

export function runUnderwriting(app, paralegalCount, coverages) {
  const declineReasons = DECLINE_RULES.filter(r => r.check(app, paralegalCount, coverages)).map(r => ({ code: r.code, label: r.label }))
  if (declineReasons.length > 0) return { decision: 'declined', declineReasons, referralReasons: [] }
  const referralReasons = REFERRAL_RULES.filter(r => r.check(app, paralegalCount, coverages)).map(r => ({ code: r.code, label: r.label }))
  if (referralReasons.length > 0) return { decision: 'referred', declineReasons: [], referralReasons }
  return { decision: 'quoted', declineReasons: [], referralReasons: [] }
}

const OPA = { new_no_exp: { 1: 587, 2: 885, pp: 483 }, exp: { 1: 483, 2: 782, pp: 357 } }
const NON = { new_no_exp: { 1: 730, 2: 1098, pp: 483 }, exp: { 1: 603, 2: 972, pp: 357 } }
const CGL_P = { 1000000: 300, 2000000: 450, 3000000: 575, 4000000: 725, 5000000: 850 }
const PB_P = { 5000: 0, 10000: 75, 25000: 150 }

export function calculatePremium({ isOPA, count, category, app, cov }) {
  const rates = isOPA ? OPA : NON
  const r = rates[category] || rates.exp
  const base = count === 1 ? r[1] : count === 2 ? r[2] : r.pp * count
  const familyLaw = app.provides_family_law ? Math.round(base * 0.25) : 0
  const mediation = cov?.wants_mediation ? 175 : 0
  const bond = cov?.wants_third_party_bond ? (count <= 2 ? 50 : 100) : 0
  const cgl = cov?.wants_cgl ? (CGL_P[cov.cgl_limit] || 300) : 0
  const privacy = cov?.wants_privacy_breach_upgrade ? (PB_P[cov.privacy_breach_limit] || 0) : 0
  const total = Math.max(base + familyLaw + mediation + bond + cgl + privacy, 300)
  return { base, familyLaw, mediation, bond, cgl, privacy, total, isOPA, count, category }
}
