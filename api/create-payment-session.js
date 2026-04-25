export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { amount, applicationId, firmName } = req.body
  if (!amount || !applicationId) return res.status(400).json({ error: 'Missing required fields' })

  const ELAVON_API_URL = process.env.ELAVON_API_URL || 'https://uat.api.converge.eu.elavonaws.com'
  const ELAVON_SECRET_KEY = process.env.ELAVON_SECRET_KEY
  const ELAVON_MERCHANT_ALIAS = process.env.ELAVON_MERCHANT_ALIAS

  if (!ELAVON_SECRET_KEY || !ELAVON_MERCHANT_ALIAS) {
    return res.status(500).json({ error: 'Payment configuration missing - check env vars' })
  }

  const authHeader = 'Basic ' + Buffer.from(ELAVON_MERCHANT_ALIAS + ':' + ELAVON_SECRET_KEY).toString('base64')

  try {
    // Step 1: Create an order
    const orderPayload = {
      totalAmount: Math.round(amount * 100),
      currencyCode: 'CAD',
      merchantOrderReference: 'TRP-' + applicationId.slice(0, 8).toUpperCase(),
      description: 'Tripemco Paralegal E&O Insurance',
    }

    console.log('Creating order at:', ELAVON_API_URL + '/orders')
    console.log('Order payload:', JSON.stringify(orderPayload))

    const orderRes = await fetch(ELAVON_API_URL + '/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify(orderPayload),
    })

    const orderText = await orderRes.text()
    console.log('Order response status:', orderRes.status)
    console.log('Order response:', orderText)

    if (!orderRes.ok) {
      return res.status(502).json({ 
        error: 'Order creation failed', 
        status: orderRes.status,
        details: orderText,
        url: ELAVON_API_URL + '/orders',
        alias: ELAVON_MERCHANT_ALIAS ? 'set' : 'missing',
        key: ELAVON_SECRET_KEY ? 'set' : 'missing',
      })
    }

    const order = JSON.parse(orderText)
    const orderHref = order.href || order.url || order.links?.self || (ELAVON_API_URL + '/orders/' + order.id)

    console.log('Order created:', JSON.stringify(order))

    // Step 2: Create payment session
    const sessionPayload = {
      hppType: 'lightbox',
      originUrl: 'https://tripemco-portal-ciw5.vercel.app',
      order: orderHref,
    }

    const sessionRes = await fetch(ELAVON_API_URL + '/payment-sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify(sessionPayload),
    })

    const sessionText = await sessionRes.text()
    console.log('Session response status:', sessionRes.status)
    console.log('Session response:', sessionText)

    if (!sessionRes.ok) {
      return res.status(502).json({ 
        error: 'Payment session failed',
        status: sessionRes.status,
        details: sessionText,
      })
    }

    const session = JSON.parse(sessionText)
    const sessionId = session.id || session.sessionId

    return res.status(200).json({ sessionId })
  } catch (err) {
    console.error('Payment error:', err)
    return res.status(500).json({ error: err.message, stack: err.stack })
  }
}
