export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const { amount, applicationId, firmName } = req.body
  if (!amount || !applicationId) return res.status(400).json({ error: 'Missing fields' })
  const BASE = process.env.ELAVON_API_URL || 'https://uat.api.converge.eu.elavonaws.com'
  const SK = process.env.ELAVON_SECRET_KEY
  const MA = process.env.ELAVON_MERCHANT_ALIAS
  if (!SK || !MA) return res.status(500).json({ error: 'Env vars missing' })
  const auth = 'Basic ' + Buffer.from(MA + ':' + SK).toString('base64')
  try {
    const r1 = await fetch(BASE + '/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': auth },
      body: JSON.stringify({
        totalAmount: Math.round(amount * 100),
        currencyCode: 'CAD',
        merchantOrderReference: 'TRP-' + applicationId.slice(0, 8).toUpperCase(),
        description: 'Tripemco Paralegal E&O Insurance',
      }),
    })
    const t1 = await r1.text()
    if (!r1.ok) return res.status(502).json({ error: 'Order failed', status: r1.status, detail: t1 })
    const order = JSON.parse(t1)
    const orderHref = order.href || order.url || (BASE + '/orders/' + order.id)
    const r2 = await fetch(BASE + '/payment-sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': auth },
      body: JSON.stringify({ hppType: 'lightbox', originUrl: 'https://tripemco-portal-ciw5.vercel.app', order: orderHref }),
    })
    const t2 = await r2.text()
    if (!r2.ok) return res.status(502).json({ error: 'Session failed', status: r2.status, detail: t2 })
    const session = JSON.parse(t2)
    return res.status(200).json({ sessionId: session.id || session.sessionId })
  } catch(e) { return res.status(500).json({ error: e.message }) }
}