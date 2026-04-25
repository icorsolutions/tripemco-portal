import { useState } from 'react'

export default function CertificateGenerator({ application, policy, quote }) {
  const [generating, setGenerating] = useState(false)

  async function generateCertificate() {
    setGenerating(true)
    try {
      // Dynamically load jsPDF
      const { jsPDF } = await import('jspdf')
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' })

      const firm = application.firms || {}
      const cov = application.coverages?.[0] || {}
      const effectiveDate = policy?.effective_date ? new Date(policy.effective_date).toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'
      const expiryDate = policy?.expiry_date ? new Date(policy.expiry_date).toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'
      const policyNumber = policy?.policy_number || '—'
      const masterPolicy = 'MP000005'
      const totalPremium = quote?.total_premium ? `$${Number(quote.total_premium).toLocaleString('en-CA', { minimumFractionDigits: 2 })}` : '—'

      const margin = 20
      const pageW = 215.9
      const contentW = pageW - margin * 2

      // ── Navy header bar ──────────────────────────────────────────
      doc.setFillColor(26, 39, 68)
      doc.rect(0, 0, pageW, 35, 'F')

      doc.setTextColor(255, 255, 255)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(18)
      doc.text('TRIPEMCO INSURANCE GROUP LTD.', margin, 15)

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.text('99 Highway 8, Stoney Creek, ON  |  Tel: (905) 664-2266  |  www.tripemco.com', margin, 22)

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.text('CERTIFICATE OF INSURANCE', margin, 30)

      // ── Gold accent line ──────────────────────────────────────────
      doc.setFillColor(200, 151, 58)
      doc.rect(0, 35, pageW, 2, 'F')

      // ── Certificate title ─────────────────────────────────────────
      let y = 48
      doc.setTextColor(26, 39, 68)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(13)
      doc.text('PARALEGAL ERRORS & OMISSIONS LIABILITY INSURANCE', pageW / 2, y, { align: 'center' })

      y += 6
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(80, 80, 80)
      doc.text('Underwritten by Sovereign General Insurance Company', pageW / 2, y, { align: 'center' })
      doc.text(`Master Policy No. ${masterPolicy}`, pageW / 2, y + 5, { align: 'center' })

      // ── Section helper ────────────────────────────────────────────
      function sectionHeader(title, yPos) {
        doc.setFillColor(26, 39, 68)
        doc.rect(margin, yPos, contentW, 6, 'F')
        doc.setTextColor(255, 255, 255)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(8)
        doc.text(title.toUpperCase(), margin + 3, yPos + 4)
        return yPos + 10
      }

      function row(label, value, yPos, bold = false) {
        doc.setTextColor(80, 80, 80)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8.5)
        doc.text(label, margin + 2, yPos)
        doc.setTextColor(26, 39, 68)
        doc.setFont('helvetica', bold ? 'bold' : 'normal')
        doc.text(value || '—', margin + 65, yPos)
        return yPos + 6
      }

      function twoCol(label1, val1, label2, val2, yPos) {
        const col2 = margin + contentW / 2
        doc.setTextColor(80, 80, 80)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8.5)
        doc.text(label1, margin + 2, yPos)
        doc.setTextColor(26, 39, 68)
        doc.setFont('helvetica', 'bold')
        doc.text(val1 || '—', margin + 55, yPos)
        doc.setTextColor(80, 80, 80)
        doc.setFont('helvetica', 'normal')
        doc.text(label2, col2 + 2, yPos)
        doc.setTextColor(26, 39, 68)
        doc.setFont('helvetica', 'bold')
        doc.text(val2 || '—', col2 + 55, yPos)
        return yPos + 6
      }

      // ── Named insured ─────────────────────────────────────────────
      y = 68
      y = sectionHeader('Named Insured', y)
      y = row('Full Name / Firm Name:', firm.firm_name || '—', y, true)
      if (firm.operating_name) y = row('Operating Name:', firm.operating_name, y)
      y = row('Business Form:', (firm.business_form || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()), y)
      y = row('Address:', [firm.address_line1, firm.city, firm.province, firm.postal_code].filter(Boolean).join(', '), y)
      y = row('OPA Member:', firm.is_opa_member ? 'Yes' : 'No', y)
      y += 2

      // ── Policy details ────────────────────────────────────────────
      y = sectionHeader('Policy Details', y)
      y = twoCol('Policy Number:', policyNumber, 'Application Type:', (application.application_type || '').toUpperCase(), y)
      y = twoCol('Effective Date:', effectiveDate, 'Expiry Date:', expiryDate, y)
      y = row('Annual Premium:', totalPremium, y, true)
      y += 2

      // ── Coverage ──────────────────────────────────────────────────
      y = sectionHeader('Coverage Summary', y)
      y = twoCol('E&O Limit Per Claim:', '$1,000,000', 'Aggregate Limit:', '$2,000,000', y)
      y = twoCol('Deductible:', '$1,500 per claim', 'Identity Fraud Expense:', '$5,000', y)
      if (cov.wants_mediation) y = row('Mediation Services:', 'Included', y)
      if (cov.wants_cgl) y = twoCol('CGL Coverage:', 'Included', 'CGL Limit:', `$${Number(cov.cgl_limit || 0).toLocaleString()}`, y)
      if (cov.wants_privacy_breach_upgrade) y = twoCol('Privacy Breach Upgrade:', 'Included', 'Limit:', `$${Number(cov.privacy_breach_limit || 0).toLocaleString()}`, y)
      if (cov.wants_third_party_bond) y = row('Third Party Bond:', 'Included', y)
      y += 2

      // ── Insured paralegals ────────────────────────────────────────
      if application.application_paralegals.forEach(ap => {
          const p = ap.paralegals
          y = twoCol('Name:', p?.full_name, 'LSO License:', p?.lso_license_number, y)
        })
        y += 2
      }

      // ── Conditions ────────────────────────────────────────────────
      y = sectionHeader('Important Conditions', y)
      doc.setTextColor(60, 60, 60)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7.5)
      const conditions = [
        '1. This certificate is issued as a matter of information only and confers no rights upon the certificate holder.',
        '2. Coverage is subject to all the terms, conditions, and exclusions of the master policy.',
        '3. This certificate does not amend, extend, or alter the coverage afforded by the policy.',
        '4. The Retroactive Date is the inception date of the Named Insured\'s first claims-made professional liability policy.',
        '5. A 90-day Extended Reporting Period is included as standard.',
        '6. This policy is issued pursuant to the Law Society of Ontario paralegal insurance requirements.',
      ]
      conditions.forEach(c => {
        doc.text(c, margin + 2, y, { maxWidth: contentW - 4 })
        y += 5
      })
      y += 2

      // ── Underwriter ───────────────────────────────────────────────
      y = sectionHeader('Underwriter', y)
      y = row('Insurance Company:', 'Sovereign General Insurance Company', y, true)
      y = row('Managing Broker:', 'Tripemco Insurance Group Ltd.', y)
      y = row('Broker License:', 'RIBO Licensed', y)

      // ── Footer ────────────────────────────────────────────────────
      doc.setFillColor(26, 39, 68)
      doc.rect(0, 267, pageW, 12, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7)
      doc.text(
        `This certificate was issued electronically on ${new Date().toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })} | Policy No. ${policyNumber} | Tripemco Insurance Group Ltd.`,
        pageW / 2, 274, { align: 'center' }
      )

      // ── Save ──────────────────────────────────────────────────────
      const filename = `Tripemco-Certificate-${policyNumber}-${firm.firm_name?.replace(/\s+/g, '-') || 'Policy'}.pdf`
      doc.save(filename)
    } catch (e) {
      console.error('Certificate generation error:', e)
      alert('Failed to generate certificate: ' + e.message)
    } finally {
      setGenerating(false)
    }
  }

  if (!policy) return null

  return (
    <button
      className="btn btn-ghost"
      onClick={generateCertificate}
      disabled={generating}
      style={{ display: 'flex', alignItems: 'center', gap: 8 }}
    >
      {generating
        ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Generating…</>
        : '⬇ Download Certificate'}
    </button>
  )
}
