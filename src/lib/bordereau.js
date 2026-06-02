// src/lib/bordereau.js
// Generates the monthly Tripemco/Sovereign bordereau report (Phase 1: portal-issued NEW + REN only).
import * as XLSX from 'xlsx'
import { supabase } from './supabase'
import { getProgramConfig } from './programConfig'
import { formatDateLong, parseLocalDate } from './dates'

const COLUMN_HEADERS = [
  'Policy No.', 'Certifcate No.', 'Prior SOV Renewal Policy No.', 'Transaction Type',
  'Amendment Reason', 'Named Insured', 'Policy Effective Date', 'Policy Expiry Date',
  'Transaction Date', 'Mailing Suite #', 'Mailing Street #', 'Mailing Street Name',
  'Mailing City', 'Mailing Prov', 'Mailing Postal', 'Mailing Country', 'Sovereign IBC CODE',
  'Commission',
  'CGL Limit', 'CGL Deductible', 'CGL Premium', 'SOV Liability Participation',
  'Total Liability Premium', 'SOV Total Liability Premium',
  'E&O Per Claim Limit', 'E&O Claim Limit', 'E&O Deductible', 'E&O Premium',
  'Mediation Premium', 'Third Party Premium', 'SOV Professional Participation',
  'Total Professional Premium', 'SOV Total Professional Premium',
  'Privacy Breach Liability Limit', 'Privacy Breach Liability Premium',
  'Privacy Breach Expense Limit', 'Privacy Breach Expense Premium',
  'Network security Liability Limit', 'Network Security Liability Premium',
  'Digital Assets Limit', 'Digital Assest Premium',
  'E-Media Limit', 'E-Media Premium',
  'CyberExtortion Limit', 'CyberExtortion Premium',
  'Cyber Business Interruption Limit', 'Cyber Business Interruption Premium',
  'SOV Cyber Participation', 'Total Cyber Premium', 'SOV Total Cyber Premium',
  'Total Gross Policy Premium', 'SOV Total (Gross) Policy Premium', 'Total Net Policy Premium',
]

export async function generateBordereau({ fromDate, toDate }) {
  const config = await getProgramConfig()
  const commissionRate = parseFloat(config.commission_rate || '0.225')

  const { data: policies, error } = await supabase
    .from('policies')
    .select(`
      *,
      applications!inner (
        *,
        firms (*),
        coverages (*),
        quotes (*)
      )
    `)
    .gte('effective_date', fromDate)
    .lte('effective_date', toDate)
    .eq('status', 'active')
    .order('effective_date', { ascending: true })

  if (error) throw error
  if (!policies || policies.length === 0) {
    throw new Error(`No bound policies found with effective date between ${fromDate} and ${toDate}.`)
  }

  const rows = []
  let totalPremium = 0
  let totalCommission = 0

  for (const policy of policies) {
    const app = policy.applications
    if (!app) continue
    const firm = app.firms
    const cov = (app.coverages || [])[0] || {}
    const quote = (app.quotes || [])[0]
    if (!firm || !quote) continue

    const eoBase = Number(quote.eo_base_premium || 0)
    const familyLaw = Number(quote.family_law_surcharge || 0)
    const mediation = Number(quote.mediation_premium || 0)
    const tpb = Number(quote.third_party_bond_premium || 0)
    const cgl = Number(quote.cgl_premium || 0)
    const privacy = Number(quote.privacy_breach_premium || 0)

    const eoTotal = eoBase + familyLaw
    const profTotal = eoTotal + mediation + tpb
    const cyberTotal = privacy
    const grossTotal = cgl + profTotal + cyberTotal
    const commissionAmount = grossTotal * commissionRate
    const netTotal = +(grossTotal - commissionAmount).toFixed(2)

    totalPremium += grossTotal
    totalCommission += commissionAmount

    const txnType = app.application_type === 'renewal' ? 'REN' : 'NEW'
    const cglLimitStr = cov.wants_cgl && cov.cgl_limit
      ? `$${Number(cov.cgl_limit).toLocaleString()} / $${Number(cov.cgl_limit).toLocaleString()}`
      : '$0 / $0'

    rows.push([
      config.master_policy_no || 'MP000005',
      policy.certificate_number || policy.policy_number,
      app.prior_policy_number || '',
      txnType,
      '',
      firm.firm_name,
      parseLocalDate(policy.effective_date),
      parseLocalDate(policy.expiry_date),
      new Date(policy.created_at),
      firm.address_line2 || '',
      '',
      firm.address_line1 || '',
      firm.city || '',
      firm.province || 'ON',
      firm.postal_code || '',
      'Canada',
      config.sovereign_ibc_code || '811030',
      `${(commissionRate * 100).toFixed(1)}%`,
      cglLimitStr, 1000, cgl, '100%', cgl, cgl,
      Number(cov.eo_limit_per_claim || 1000000),
      Number(cov.eo_aggregate_limit || 2000000),
      Number(cov.eo_deductible || 1500),
      eoTotal, mediation, tpb, '100%', profTotal, profTotal,
      Number(cov.privacy_breach_limit || 5000), 0,
      Number(cov.privacy_breach_limit || 5000), privacy,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      1, cyberTotal, cyberTotal,
      grossTotal, grossTotal, netTotal,
    ])
  }

  // Build the worksheet
  const aoa = []
  aoa.push([config.broker_name || 'Tripemco'])
  aoa.push([config.broker_address || ''])
  aoa.push([])
  aoa.push(['Bordereau Report Summary'])
  aoa.push(['Product', config.product_name || 'Paralegals Errors & Omissions Insurance'])
  aoa.push(['Effective Date From', parseLocalDate(fromDate)])
  aoa.push(['Effective Date To', parseLocalDate(toDate)])
  aoa.push(['Total Premium', totalPremium])
  aoa.push(['Total Commission', +totalCommission.toFixed(2)])
  aoa.push([]) // row 10

  // Row 11: section headers (will be merged)
  const sectionRow = new Array(53).fill('')
  sectionRow[18] = 'CGL'
  sectionRow[24] = 'Professional'
  sectionRow[33] = 'Cyber'
  aoa.push(sectionRow)

  // Row 12: column headers
  aoa.push(COLUMN_HEADERS)

  // Data rows
  for (const r of rows) aoa.push(r)

  // Totals row
  const totalsRow = new Array(53).fill('')
  totalsRow[0] = 'Totals'
  totalsRow[31] = totalPremium // AF = Total Professional Premium
  totalsRow[32] = totalPremium // AG
  totalsRow[34] = 0
  totalsRow[36] = 0
  totalsRow[40] = 0
  totalsRow[46] = 0
  totalsRow[48] = 0
  totalsRow[49] = 0
  totalsRow[50] = totalPremium // AY = Total Gross
  totalsRow[51] = totalPremium // AZ
  totalsRow[52] = +(totalPremium - totalCommission).toFixed(2) // BA = Total Net
  aoa.push(totalsRow)

  const ws = XLSX.utils.aoa_to_sheet(aoa, { cellDates: true })

  // Merge section headers (row 11 = index 10)
  ws['!merges'] = [
    { s: { r: 10, c: 18 }, e: { r: 10, c: 23 } }, // CGL
    { s: { r: 10, c: 24 }, e: { r: 10, c: 32 } }, // Professional
    { s: { r: 10, c: 33 }, e: { r: 10, c: 49 } }, // Cyber
  ]

  // Column widths (approximate)
  ws['!cols'] = COLUMN_HEADERS.map((h) => ({ wch: Math.max(12, Math.min(28, h.length + 2)) }))

  const wb = XLSX.utils.book_new()
  const today = new Date().toISOString().substring(0, 10)
  XLSX.utils.book_append_sheet(wb, ws, `Bordereau Report-${today}`)

  const filename = `Bordereau_${fromDate}_to_${toDate}_Generated-${today}.xlsx`
  XLSX.writeFile(wb, filename)

  return { rowCount: rows.length, totalPremium, totalCommission, filename }
}