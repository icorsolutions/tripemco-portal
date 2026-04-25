// ─── Auto-Decline Rules ───────────────────────────────────────────────────────
const DECLINE_RULES = [
  {
    code: 'SABS',
    label: 'SABS (Statutory Accident Benefits) exposure',
    check: (a) => a.provides_sabs === true,
  },
  {
    code: 'CRIMINAL',
    label: 'Criminal or fraudulent act investigation, conviction, or charge',
    check: (a) => a.loss_criminal_charges === true,
  },
  {
    code: 'OUTSIDE_CANADA',
    label: 'Offices or services outside Canada',
    check: (a) => a.offices_outside_canada === true,
  },
  {
    code: 'OTHER_SERVICES',
    label: 'Non-eligible services provided',
    check: (a) => a.provides_other_services === true,
  },
  {
    code: 'IMMIGRATION_NON_COMPLIANT',
    label: 'Immigration consulting without ICCRC/CICC compliance',
    check: (a) => a.provides_immigration === true && a.immigration_iccrc_compliant === false,
  },
]

// ─── Auto-Referral Rules ──────────────────────────────────────────────────────
const REFERRAL_RULES = [
  {
    code: 'HIGH_REVENUE',
    label: 'Gross annual revenue exceeds $500,000',
    check: (a) => parseFloat(a.current_revenue || 0) > 500000,
  },
  {
    code: 'RETROACTIVE_DATE',
    label: 'Retroactive date clause not agreed to',
    check: (a) => a.retroactive_date_agreed === false,
  },
  {
    code: 'PRIOR_DECLINED',
    label: 'Prior E&O policy declined, cancelled, or renewal refused',
    check: (a) => a.prior_insurance_declined === true,
  },
  {
    code: 'NEGLIGENCE',
    label: 'Prior allegations of professional negligence',
    check: (a) => a.loss_negligence_allegations === true,
  },
  {
    code: 'CIRCUMSTANCES',
    label: 'Aware of facts or circumstances that may give rise to a claim',
    check: (a) => a.loss_circumstances_aware === true,
  },
  {
    code: 'CLAIMS_5YR',
    label: 'Aware of circumstances that may result in E&O claim (past 5 years)',
    check: (a) => a.loss_claims_past_5yr === true,
  },
  {
    code: 'LICENSE_SUSPENDED',
    label: 'License suspended or terminated by a regulatory authority',
    check: (a) => a.loss_license_suspended === true,
  },
  {
    code: 'DISCIPLINARY',
    label: 'Called before disciplinary committee for professional misconduct',
    check: (a) => a.loss_disciplinary === true,
  },
  {
    code: 'CENSURED',
    label: 'Censured or fined by a regulatory authority',
    check: (a) => a.loss_censured_fined === true,
  },
  {
    code: 'MEDIATION_NOT_CERTIFIED',
    label: 'Mediation services provided without proper certification (40+ hours)',
    check: (a) => a.provides_mediation === true && a.mediation_certified !== true,
  },
  {
    code: 'MEDIATION_REVENUE',
    label: 'Mediation revenue exceeds 20% of gross revenue',
    check: (a) => a.provides_mediation === true && parseFloat(a.mediation_revenue_pct || 0) > 20,
  },
  {
    code: 'TOO_MANY_PARALEGALS',
    label: 'More than 12 paralegals to be insured',
    check: (a, paralegalCount) => paralegalCount > 12,
  },
  {
    code: 'THIRD_PARTY_BOND',
    label: 'Third Party Bond coverage requested',
    check: (a, paralegalCount, coverages) => coverages?.wants_third_party_bond === true,
  },
  {
    code: 'MULTIPLE_BRANCHES',
    label: 'More than one branch office location',
    check: (a) => !!(a.branch_address_2),
  },
  {
    code: 'CGL_HIGH_LIMIT',
    label: 'CGL limit requested above $2,000,000',
    check: (a, paralegalCount, coverages) => coverages?.wants_cgl === true && (coverages?.cgl_limit || 0) > 2000000,
  },
]

// ─── Main Underwriting Function ───────────────────────────────────────────────
export function runUnderwriting(application, paralegalCount, coverages) {
  const declineReasons = DECLINE_RULES
    .filter(r => r.check(application, paralegalCount, coverages))
    .map(r => ({ code: r.code, label: r.label }))

  if (declineReasons.length > 0) {
    return { decision: 'declined', declineReasons, referralReasons: [] }
  }

  const referralReasons = REFERRAL_RULES
    .filter(r => r.check(application, paralegalCount, coverages))
    .map(r => ({ code: r.code, label: r.label }))

  if (referralReasons.length > 0) {
    return { decision: 'referred', declineReasons: [], referralReasons }
  }

  return { decision: 'quoted', declineReasons: [], referralReasons: [] }
}

// ─── Premium Calculation ──────────────────────────────────────────────────────
const OPA_RATES = {
  new_no_experience: { 1: 587, 2: 885, additional: 483 },
  experienced_or_renewal: { 1: 483, 2: 782, additional: 357 },
}

const NON_OPA_RATES = {
  new_no_experience: { 1: 730, 2: 1098, additional: 483 },
  experienced_or_renewal: { 1: 603, 2: 972, additional: 357 },
}

const CGL_PREMIUMS = {
  1000000: 300,
  2000000: 450,
  3000000: 575,
  4000000: 725,
  5000000: 850,
}

const PRIVACY_BREACH_UPGRADES = {
  10000: 75,
  25000: 150,
}

export function calculatePremium({ isOPAMember, paralegalCount, rateCategory, application, coverages }) {
  const rates = isOPAMember ? OPA_RATES : NON_OPA_RATES
  const r = rates[rateCategory] || rates.experienced_or_renewal

  // Base E&O premium
  let base = 0
  if (paralegalCount === 1) base = r[1]
  else if (paralegalCount === 2) base = r[2]
  else base = r.additional * paralegalCount

  // Minimum premium
  base = Math.max(base, 300)

  // Add-ons
  const family_law_surcharge = application?.provides_family_law ? Math.round(base * 0.25) : 0
  const mediation_premium = coverages?.wants_mediation ? 175 : 0
  const third_party_bond_premium = coverages?.wants_third_party_bond
    ? (paralegalCount <= 2 ? 50 : 100) : 0
  const cgl_premium = coverages?.wants_cgl
    ? (CGL_PREMIUMS[coverages.cgl_limit] || 300) : 0
  const privacy_breach_premium = coverages?.wants_privacy_breach_upgrade
    ? (PRIVACY_BREACH_UPGRADES[coverages.privacy_breach_limit] || 0) : 0

  const total_premium = Math.max(
    base + family_law_surcharge + mediation_premium + third_party_bond_premium + cgl_premium + privacy_breach_premium,
    300
  )

  return {
    eo_base_premium: base,
    family_law_surcharge,
    mediation_premium,
    third_party_bond_premium,
    cgl_premium,
    privacy_breach_premium,
    subtotal: total_premium,
    total_premium,
    is_opa_rate: isOPAMember,
    paralegal_count: paralegalCount,
    rate_category: rateCategory,
  }
}
