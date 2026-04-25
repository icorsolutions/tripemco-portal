export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" })
  const { amount, applicationId, firmName, email } = req.body
  if (!amount || !applicationId) return res.status(400).json({ error: "Missing required fields" })
  const ELAVON_API_URL = process.env.ELAVON_API_URL || "https://uat.api.converge.eu.elavonaws.com"
  const ELAVON_SECRET_KEY = process.env.ELAVON_SECRET_KEY
  const ELAVON_MERCHANT_ALIAS = process.env.ELAVON_MERCHANT_ALIAS
  if (!ELAVON_SECRET_KEY || !ELAVON_MERCHANT_ALIAS) return res.status(500).json({ error: "Payment configuration missing" })
  try {
    const creds = Buffer.from(ELAVON_MERCHANT_ALIAS + ":" + ELAVON_SECRET_KEY).toString("base64")
    const response = await fetch(ELAVON_API_URL + "/payment-sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Basic " + creds },
      body: JSON.stringify({
        hppType: "lightbox",
        originUrl: "https://tripemco-portal-ciw5.vercel.app",
        totalAmount: Math.round(amount * 100),
        currencyCode: "CAD",
        orderId: "TRP-" + applicationId.slice(0, 8).toUpperCase(),
        orderDescription: "Tripemco Paralegal E&O Insurance",
        customerEmail: email || "",
        customFields: { applicationId },
      }),
    })
    if (!response.ok) { const t = await response.text(); return res.status(502).json({ error: "Session failed", details: t }) }
    const data = await response.json()
    const sid = data.id || data.sessionId
    return res.status(200).json({ sessionId: sid })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
