import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? 'sk_test_placeholder', {
  apiVersion: '2026-04-22.dahlia',
  typescript: true,
})

export const STRIPE_PLANS: Record<string, { priceId: string; name: string; amount: number }> = {
  solo: {
    priceId: process.env.STRIPE_PRICE_SOLO ?? '',
    name: 'Solo',
    amount: 900, // €9 in cents
  },
  pro: {
    priceId: process.env.STRIPE_PRICE_PRO ?? '',
    name: 'Pro',
    amount: 1900,
  },
  team: {
    priceId: process.env.STRIPE_PRICE_TEAM ?? '',
    name: 'Team',
    amount: 4900,
  },
}

export function getPlanFromPriceId(priceId: string): string {
  for (const [plan, cfg] of Object.entries(STRIPE_PLANS)) {
    if (cfg.priceId && cfg.priceId === priceId) return plan
  }
  return 'free'
}
