export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { amount, applicationId, firmName } = req.body
  if (!amount || !applicationId) return res.status(400).json({ error: 'Missing required fields' })

  const ELAVON_API_URL = process.env.ELAVON_API_URL || 'https://uat.api.converge.eu.elavonaws.com'
  const ELAVON_SECRET_KEY = process.env.ELAVON_SECRET_KEY
  const ELAVON_MERCHANT_ALIAS = process.env.ELAVON_MERCHANT_ALIAS

  if (!ELAVON_SECRET_KEY || !ELAVON_MERCHANT_ALIAS) {
    return res.status(500).json({ error: 'Payment configuration missing' })
  }

  const authHeader = 'Basic ' + Buffer.from(ELAVON_MERCHANT_ALIAS + ':' + ELAVON_SECRET_KEY).toString('base64')

  try {
    // Step 1: Create an order
    const orderRes = await fetch(ELAVON_API_URL + '/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify({
        totalAmount: Math.round(amount * 100),
        currencyCode: 'CAD',
        orderId: 'TRP-' + applicationId.slice(0, 8).toUpperCase(),
        orderDescription: 'Tripemco Paralegal E&O Insurance - ' + (firmName || 'Policy Premium'),
      }),
    })

    if (!orderRes.ok) {
      const errText = await orderRes.text()
      console.error('Order creation failed:', errText)
      return res.status(502).json({ error: 'Order creation failed', details: errText })
    }

    const order = await orderRes.json()
    const orderUrl = order.href || order.url || (ELAVON_API_URL + '/orders/' + order.id)

    // Step 2: Create a payment session from the order
    const sessionRes = await fetch(ELAVON_API_URL + '/payment-sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify({
        hppType: 'lightbox',
        originUrl: 'https://tripemco-portal-ciw5.vercel.app',
        order: orderUrl,
      }),
    })

    if (!sessionRes.ok) {
      const errText = await sessionRes.text()
      console.error('Payment session failed:', errText)
      return res.status(502).json({ error: 'Payment session failed', details: errText })
    }

    const session = await sessionRes.json()
    const sessionId = session.id || session.sessionId

    return res.status(200).json({ sessionId })
  } catch (err) {
    console.error('Payment error:', err)
    return res.status(500).json({ error: err.message })
  }
}
