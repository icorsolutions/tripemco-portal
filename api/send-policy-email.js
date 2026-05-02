export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { to, firmName, policyNumber, effectiveDate, expiryDate, premium, paralegalName, lsoNumber } = req.body

  if (!to || !firmName || !policyNumber) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  const RESEND_API_KEY = process.env.RESEND_API_KEY
  if (!RESEND_API_KEY) return res.status(500).json({ error: 'Email configuration missing' })

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Tripemco Insurance Certificate</title>
</head>
<body style="margin:0;padding:0;background:#f5f6f8;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f6f8;padding:40px 20px">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">

          <!-- Header -->
          <tr>
            <td style="background:#1a2744;padding:32px 40px">
              <div style="font-size:22px;font-weight:700;color:#ffffff;letter-spacing:0.5px">Tripemco Insurance Group Ltd.</div>
              <div style="font-size:12px;color:rgba(255,255,255,0.5);margin-top:4px">99 Highway 8, Stoney Creek, ON &nbsp;|&nbsp; (905) 664-2266</div>
              <div style="width:40px;height:3px;background:#c8973a;margin-top:16px;border-radius:2px"></div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px">
              <h1 style="margin:0 0 8px;font-size:24px;color:#1a2744;font-weight:600">Your policy is active</h1>
              <p style="margin:0 0 24px;font-size:15px;color:#4a5568;line-height:1.6">
                Thank you, <strong>${firmName}</strong>. Your Paralegal Errors & Omissions insurance has been bound and your policy is now active.
              </p>

              <!-- Policy card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f3f8;border-radius:8px;padding:24px;margin-bottom:24px">
                <tr>
                  <td>
                    <div style="font-size:11px;color:#9aa5b8;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:16px">Policy Summary</div>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:6px 0;font-size:13px;color:#4a5568;width:50%">Policy Number</td>
                        <td style="padding:6px 0;font-size:13px;color:#1a2744;font-weight:600">${policyNumber}</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;font-size:13px;color:#4a5568;border-top:1px solid #dde2ec">Named Insured</td>
                        <td style="padding:6px 0;font-size:13px;color:#1a2744;font-weight:600;border-top:1px solid #dde2ec">${firmName}</td>
                      </tr>
                      ${paralegalName ? `
                      <tr>
                        <td style="padding:6px 0;font-size:13px;color:#4a5568;border-top:1px solid #dde2ec">Insured Paralegal</td>
                        <td style="padding:6px 0;font-size:13px;color:#1a2744;font-weight:600;border-top:1px solid #dde2ec">${paralegalName}${lsoNumber ? ` (LSO: ${lsoNumber})` : ''}</td>
                      </tr>` : ''}
                      <tr>
                        <td style="padding:6px 0;font-size:13px;color:#4a5568;border-top:1px solid #dde2ec">Effective Date</td>
                        <td style="padding:6px 0;font-size:13px;color:#1a2744;font-weight:600;border-top:1px solid #dde2ec">${effectiveDate}</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;font-size:13px;color:#4a5568;border-top:1px solid #dde2ec">Expiry Date</td>
                        <td style="padding:6px 0;font-size:13px;color:#1a2744;font-weight:600;border-top:1px solid #dde2ec">${expiryDate}</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;font-size:13px;color:#4a5568;border-top:1px solid #dde2ec">Annual Premium</td>
                        <td style="padding:6px 0;font-size:13px;color:#1a2744;font-weight:600;border-top:1px solid #dde2ec">${premium} CAD</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;font-size:13px;color:#4a5568;border-top:1px solid #dde2ec">Coverage</td>
                        <td style="padding:6px 0;font-size:13px;color:#1a2744;font-weight:600;border-top:1px solid #dde2ec">$1,000,000 per claim / $2,000,000 aggregate</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;font-size:13px;color:#4a5568;border-top:1px solid #dde2ec">Underwriter</td>
                        <td style="padding:6px 0;font-size:13px;color:#1a2744;font-weight:600;border-top:1px solid #dde2ec">Sovereign General Insurance Company</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Certificate note -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#e8f4ef;border-radius:8px;padding:20px;margin-bottom:24px;border:1px solid #b8dece">
                <tr>
                  <td>
                    <div style="font-size:13px;color:#1a7a4a;font-weight:600;margin-bottom:6px">⬇ Download your certificate</div>
                    <div style="font-size:13px;color:#2d6a4f;line-height:1.5">
                      Log in to your Tripemco portal to download your certificate of insurance. You will need this for your Law Society of Ontario compliance records.
                    </div>
                    <div style="margin-top:12px">
                      <a href="https://tripemco-portal-ciw5.vercel.app" style="display:inline-block;background:#1a2744;color:#ffffff;padding:10px 20px;border-radius:6px;text-decoration:none;font-size:13px;font-weight:600">Go to portal →</a>
                    </div>
                  </td>
                </tr>
              </table>

              <p style="font-size:13px;color:#4a5568;line-height:1.6;margin:0 0 8px">
                If you have any questions about your coverage, please don't hesitate to contact us.
              </p>
              <p style="font-size:13px;color:#4a5568;line-height:1.6;margin:0">
                <strong>Tripemco Insurance Group Ltd.</strong><br>
                📞 (905) 664-2266<br>
                📧 info@tripemco.com<br>
                🌐 www.tripemco.com
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#1a2744;padding:20px 40px">
              <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.4);line-height:1.6">
                This email was sent by Tripemco Insurance Group Ltd. on behalf of Sovereign General Insurance Company. 
                Coverage is subject to all the terms, conditions, and exclusions of the master policy MP000005. 
                This is not a contract of insurance.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Tripemco Insurance <onboarding@resend.dev>',
        to: [to],
        subject: `Your E&O Insurance Policy is Active — ${policyNumber}`,
        html,
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      return res.status(502).json({ error: 'Email failed', details: err })
    }

    const data = await response.json()
    return res.status(200).json({ success: true, id: data.id })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
