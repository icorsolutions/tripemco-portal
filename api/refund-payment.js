// api/refund-payment.js
// Refund a previous Elavon order. Called by the cancellation/endorsement flows.
// Takes: { orderId, amount, reason? }
// Returns: { refundId, refund } on success; { error, status, url, detail } on failure.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { orderId, amount, reason } = req.body || {}
  if (!orderId || !amount) {
    return res.status(400).json({ error: 'Missing fields: orderId and amount required' })
  }

  const BASE = process.env.ELAVON_API_URL || 'https://uat.api.converge.eu.elavonaws.com'
  const SK = process.env.ELAVON_SECRET_KEY
  const MA = process.env.ELAVON_MERCHANT_ALIAS
  if (!SK || !MA) return res.status(500).json({ error: 'Env vars missing' })

  const auth = 'Basic ' + Buffer.from(MA + ':' + SK).toString('base64')
  const url = BASE + '/orders/' + orderId + '/refunds'
  const refundBody = {
    total: {
      amount: (Math.round(amount * 100) / 100).toFixed(2),
      currencyCode: 'CAD',
    },
    reason: reason || 'Customer requested refund',
  }

  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': auth },
      body: JSON.stringify(refundBody),
    })
    const t = await r.text()
    if (!r.ok) {
      return res.status(502).json({
        error: 'Refund failed at Elavon',
        status: r.status,
        url,
        requestBody: refundBody,
        detail: t,
      })
    }
    const refund = JSON.parse(t)
    return res.status(200).json({
      refundId: refund.id || refund.refundId,
      refund,
    })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}