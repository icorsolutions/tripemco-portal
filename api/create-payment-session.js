// Vercel serverless function - runs server-side, secret key never exposed to browser
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { amount, applicationId, firmName, email } = req.body

  if (!amount || !applicationId) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  const ELAVON_API_URL = process.env.ELAVON_API_URL || 'https://uat.api.converge.eu.elavonaws.com'
  const ELAVON_SECRET_KEY = process.env.ELAVON_SECRET_KEY
  const ELAVON_MERCHANT_ALIAS = process.env.ELAVON_MERCHANT_ALIAS

  if (!ELAVON_SECRET_KEY || !ELAVON_MERCHANT_ALIAS) {
    return res.status(500).json({ error: 'Payment configuration missing' })
  }

  try {
    const response = await fetch(`${ELAVON_API_URL}/payment-sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${ELAVON_MERCHANT_ALIAS}:${ELAVON_SECRET_KEY}`).toString('base64')}`,
      },
      body: JSON.stringify({
        hppType: 'lightbox',
        originUrl: process.env.VITE_APP_URL || 'https://tripemco-portal-ciw5.vercel.app',
        totalAmount: Math.round(amount * 100), // Convert to cents
        currencyCode: 'CAD',
        orderId: `TRP-${applicationId.slice(0, 8).toUpperCase()}`,
        orderDescription: `Tripemco Paralegal E&O Insurance — ${firmName || 'Policy Premium'}`,
        customerEmail: email || '',
        customFields: {
          applicationId,
        },
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error('Elavon session error:', errText)
      return res.status(502).json({ error: 'Failed to create payment session', details: errText })
    }

    const data = await response.json()
    return res.status(200).json({ sessionId: data.id || data.sessionId, sessionToken: data })
  } catch (err) {
    console.error('Payment session error:', err)
    return res.status(500).json({ error: err.message })
  }
}
