// src/lib/prorate.js
// Premium prorating helpers for endorsements (daily) and cancellations (short-rate).
import { parseLocalDate } from './dates'

export function daysBetween(fromDateStr, toDateStr) {
  const from = parseLocalDate(fromDateStr)
  const to = parseLocalDate(toDateStr)
  if (!from || !to) return 0
  return Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24))
}

export function prorateDaily(annualAmount, effectiveDateStr, policyEffectiveStr, policyExpiryStr) {
  const totalDays = daysBetween(policyEffectiveStr, policyExpiryStr)
  if (totalDays <= 0) return 0
  const remainingDays = Math.max(0, daysBetween(effectiveDateStr, policyExpiryStr))
  return Math.round((annualAmount * remainingDays / totalDays) * 100) / 100
}

export function shortRateRefund(annualAmount, cancelDateStr, policyEffectiveStr, policyExpiryStr, shortRateFactor = 0.9) {
  const totalDays = daysBetween(policyEffectiveStr, policyExpiryStr)
  if (totalDays <= 0) return 0
  const remainingDays = Math.max(0, daysBetween(cancelDateStr, policyExpiryStr))
  const proRataAmount = annualAmount * remainingDays / totalDays
  return Math.round(proRataAmount * shortRateFactor * 100) / 100
}

export function validateEndorsementDate(effectiveDateStr) {
  const eff = parseLocalDate(effectiveDateStr)
  if (!eff) return { valid: false, error: 'Invalid date' }
  const today = new Date()
  today.setHours(12, 0, 0, 0)
  const minDate = new Date(today); minDate.setDate(minDate.getDate() - 90)
  const maxDate = new Date(today); maxDate.setDate(maxDate.getDate() + 30)
  if (eff < minDate) return { valid: false, error: 'Effective date cannot be more than 90 days in the past' }
  if (eff > maxDate) return { valid: false, error: 'Effective date cannot be more than 30 days in the future' }
  return { valid: true }
}