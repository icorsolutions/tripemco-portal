import { useState } from 'react'

export default function CertificateGenerator({ application, policy, quote }) {
  const [generating, setGenerating] = useState(false)

  async function generateCertificate() {
    setGenerating(true)
    try {
      const { jsPDF } = await import('jspdf')
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' })

      const firm = application.firms || {}
      const paralegals = (application.application_paralegals || []).map(ap => ap.paralegals).filter(Boolean)

      const effectiveDate = policy?.effective_date
        ? new Date(policy.effective_date + 'T12:00:00').toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })
        : '—'
      const expiryDate = policy?.expiry_date
        ? new Date(policy.expiry_date + 'T12:00:00').toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })
        : '—'
      const issueDate = new Date().toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })
      const certNumber = policy?.certificate_number || policy?.policy_number || '—'
      const basePremium = quote?.subtotal || quote?.eo_base_premium || 0
      const premiumFormatted = '$' + Number(basePremium).toLocaleString('en-CA', { minimumFractionDigits: 2 })
      const address = [firm.address_line1, firm.address_line2, firm.city, firm.province, firm.postal_code].filter(Boolean).join(', ')

      const margin = 14
      const pageW = 215.9
      const contentW = pageW - margin * 2
      const col1 = margin
      const col2 = margin + 48
      const col3 = margin + 110
      const col4 = margin + 148
      const rowH = 6.5

      // Title
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(12)
      doc.setTextColor(26, 39, 68)
      doc.text('Paralegals Errors and Omissions Liability Certificate of Insurance', pageW / 2, 18, { align: 'center' })
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(60, 60, 60)
      doc.text(doc.splitTextToSize('This policy covers only Claims first made against the Insureds and reported to the Insurer during the Policy Period or any applicable extended reporting period.', contentW), pageW / 2, 24, { align: 'center' })
      doc.setFillColor(200, 151, 58)
      doc.rect(margin, 30, contentW, 0.8, 'F')

      let y = 36

      function hdr(text, yp) {
        doc.setFillColor(26, 39, 68)
        doc.rect(col1, yp - 4, contentW, rowH, 'F')
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(8)
        doc.setTextColor(255, 255, 255)
        doc.text(text, col1 + 2, yp)
        return yp + rowH
      }

      function row(lbl, val, yp) {
        doc.setFillColor(245, 246, 248)
        doc.rect(col1, yp - 4, contentW, rowH, 'F')
        doc.setDrawColor(220, 220, 225)
        doc.rect(col1, yp - 4, contentW, rowH)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8)
        doc.setTextColor(100, 100, 120)
        doc.text(lbl, col1 + 2, yp)
        doc.setTextColor(26, 39, 68)
        doc.text(String(val || '—'), col2, yp)
        return yp + rowH
      }

      function row2(l1, v1, l2, v2, yp) {
        doc.setFillColor(245, 246, 248)
        doc.rect(col1, yp - 4, contentW, rowH, 'F')
        doc.setDrawColor(220, 220, 225)
        doc.rect(col1, yp - 4, contentW, rowH)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8)
        doc.setTextColor(100, 100, 120)
        doc.text(l1, col1 + 2, yp)
        doc.setTextColor(26, 39, 68)
        doc.text(String(v1 || '—'), col2, yp)
        doc.setTextColor(100, 100, 120)
        doc.text(l2, col3, yp)
        doc.setTextColor(26, 39, 68)
        doc.text(String(v2 || '—'), col4, yp)
        return yp + rowH
      }

      function multiRow(lbl, lines, yp) {
        const h = Math.max(rowH, lines.length * 5 + 2)
        doc.setFillColor(245, 246, 248)
        doc.rect(col1, yp - 4, contentW, h, 'F')
        doc.setDrawColor(220, 220, 225)
        doc.rect(col1, yp - 4, contentW, h)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8)
        doc.setTextColor(100, 100, 120)
        doc.text(lbl, col1 + 2, yp)
        doc.setTextColor(26, 39, 68)
        lines.forEach((ln, i) => doc.text(ln, col2, yp + i * 5))
        return yp + h
      }

      function wrapRow(lbl, text, yp) {
        const lines = doc.splitTextToSize(text, contentW - 52)
        const h = lines.length * 5 + 6
        doc.setFillColor(245, 246, 248)
        doc.rect(col1, yp - 4, contentW, h, 'F')
        doc.setDrawColor(220, 220, 225)
        doc.rect(col1, yp - 4, contentW, h)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(7.5)
        doc.setTextColor(100, 100, 120)
        if (lbl) doc.text(lbl, col1 + 2, yp)
        doc.setTextColor(40, 40, 40)
        doc.text(lines, lbl ? col2 : col1 + 2, yp)
        return yp + h
      }

      // Header rows
      y = row2('Master Policy Number:', 'MP000005', 'Certificate Number:', certNumber, y)
      y = row('Insured Capacity:', '100% The Sovereign General Insurance Company', y)
      y = row('OPA Member:', firm.is_opa_member ? 'Yes' : 'No', y)
      y += 2

      y = hdr('Item 1.  Named Insured', y)
      y = row('Named Insured:', firm.firm_name || '—', y)
      y = row("Named Insured's Address:", address, y)
      const paraLines = paralegals.length > 0
        ? paralegals.map(p => p.full_name + ' (LSO: ' + p.lso_license_number + ')')
        : ['—']
      y = multiRow('Insured Paralegal(s):', paraLines, y)
      y += 2

      y = hdr('Item 2.  Policy Period', y)
      y = row2('FROM:', effectiveDate, 'TO:', expiryDate, y)
      doc.setFontSize(7)
      doc.setTextColor(100, 100, 100)
      doc.text("Both dates at 12:01 a.m. at standard time at the Named Insured's Address", col1 + 2, y)
      y += rowH

      y = hdr('Item 3.  Limits of Liability', y)
      y = row2('Each Claim:', '$1,000,000', 'Policy Aggregate:', '$2,000,000', y)

      y = hdr('Item 4.  Deductible', y)
      y = row2('Each Claim:', '$1,500', '', '', y)

      y = hdr('Item 5.  Premium', y)
      y = row2('Premium:', premiumFormatted, 'Minimum Retained Premium:', '$300', y)

      y = hdr('Item 6.  Retroactive Date', y)
      y = wrapRow('', 'The Retroactive Date shall be the inception date of the Insured first claims-made errors and omissions policy for the performance of Professional Services, as indicated herein, provided such coverage has been maintained in force and without interruption. In the event of a claim the Insured will have to produce a copy of the declarations page or certificate of insurance evidencing such retroactive date to the Insurer.', y)

      y = hdr('Item 7.  Endorsements', y)
      y = row('', 'Per attached.', y)

      y = hdr('Item 8.  Professional Services', y)
      y = wrapRow('Activities:', 'Activities authorized by The Law Society of Ontario to be engaged in by a Class P1 Licensee and as more fully described in the Policy.', y)

      y = hdr('Item 9.  Brokerage', y)
      y = row('Brokerage:', 'Tripemco Insurance Group Limited', y)
      y = row('Brokerage Address:', '99 Highway No. 8, 2nd Floor, Stoney Creek, ON L8G 1C1', y)

      y = hdr('Item 10.  Certificate Holder', y)
      y = row('Certificate Holder:', 'The Law Society of Ontario', y)
      y = row('Certificate Holder Address:', 'Osgoode Hall, 130 Queen Street West, Toronto, ON M5H 2N6', y)

      y += 4

      // Declaration
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7)
      doc.setTextColor(60, 60, 60)
      const dec1 = 'In reliance upon the statements contained in the application, this duly signed Certificate of Insurance confirms that an Errors & Omissions Insurance Policy has been effected for the Named Insured for the Policy Period indicated above. This Certificate is issued as a matter of information only and does not amend, extend or otherwise alter the coverage afforded by the Policy which contains all the agreed upon terms and conditions of coverage and which are subject to change or termination. Should this Certificate be cancelled before the expiration date, the Insurer will endeavour to provide sixty (60) days advance written notice to The Law Society of Ontario, but failure to do so shall impose no obligation of liability of any kind upon the Insurer, its agents or representatives.'
      const dec1Lines = doc.splitTextToSize(dec1, contentW)
      doc.text(dec1Lines, col1, y)
      y += dec1Lines.length * 3.8 + 3

      const dec2 = 'In witness whereof, the Insurer have duly authorized Tripemco Insurance Group Limited to issue this document on their behalf. In witness whereof, the Insurer has caused this Certificate to be countersigned by a duly authorized representative.'
      const dec2Lines = doc.splitTextToSize(dec2, contentW)
      doc.text(dec2Lines, col1, y)
      y += dec2Lines.length * 3.8 + 8

      // Signature
      doc.setDrawColor(26, 39, 68)
      doc.line(col1, y, col1 + 80, y)
      doc.line(col3, y, col3 + 50, y)
      y += 4
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      doc.setTextColor(26, 39, 68)
      doc.text('Authorized Representative', col1, y)
      doc.text('Date', col3, y)
      y += 4
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7.5)
      doc.text('Tripemco Insurance Group Limited', col1, y)
      doc.text(issueDate, col3, y)

      // Footer
      doc.setFillColor(26, 39, 68)
      doc.rect(0, 267, pageW, 10, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7)
      doc.text('Certificate No. ' + certNumber + '  |  Master Policy No. MP000005  |  Tripemco Insurance Group Limited  |  (800) 461-5083', pageW / 2, 273, { align: 'center' })

      doc.save('Tripemco-Certificate-' + certNumber + '.pdf')
    } catch (e) {
      console.error('Certificate error:', e)
      alert('Failed to generate certificate: ' + e.message)
    } finally {
      setGenerating(false)
    }
  }

  if (!policy) return null

  return (
    <button className="btn btn-ghost" onClick={generateCertificate} disabled={generating}>
      {generating ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Generating…</> : '⬇ Download Certificate'}
    </button>
  )
}
