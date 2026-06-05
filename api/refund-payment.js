export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { sessionId, amount, reason } = req.body || {}
  if (!sessionId || !amount) return res.status(400).json({ error: 'sessionId and amount required' })

  const BASE = process.env.ELAVON_API_URL || 'https://uat.api.converge.eu.elavonaws.com'
  const SK = process.env.ELAVON_SECRET_KEY
  const MA = process.env.ELAVON_MERCHANT_ALIAS
  if (!SK || !MA) return res.status(500).json({ error: 'Env vars missing' })

  const auth = 'Basic ' + Buffer.from(MA + ':' + SK).toString('base64')
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': auth,
    'Accept': 'application/json;charset=UTF-8',
    'Accept-Version': '1'
  }

  try {
    const sessR = await fetch(BASE + '/payment-sessions/' + sessionId, { method: 'GET', headers })
    const sessText = await sessR.text()
    if (!sessR.ok) {
      return res.status(502).json({ error: 'Session lookup failed', status: sessR.status, detail: sessText })
    }
    const session = JSON.parse(sessText)
    const txnUrl = session.transaction
    if (!txnUrl) {
      return res.status(400).json({ error: 'No transaction found for this session', sessionState: { doCreateTransaction: session.doCreateTransaction, hostedCard: session.hostedCard, transaction: session.transaction } })
    }

    const body = {
      type: 'refund',
      parentTransaction: txnUrl,
      total: {
        amount: (Math.round(amount * 100) / 100).toFixed(2),
        currencyCode: 'CAD'
      },
      shopperInteraction: 'ecommerce'
    }
    if (reason) body.description = reason

    const refundR = await fetch(BASE + '/transactions', {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    })
    const refundText = await refundR.text()
    if (!refundR.ok) {
      return res.status(502).json({
        error: 'Refund failed at Elavon',
        status: refundR.status,
        url: BASE + '/transactions',
        requestBody: body,
        detail: refundText
      })
    }
    const refund = JSON.parse(refundText)
    return res.status(200).json({ refundId: refund.id, refund })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}