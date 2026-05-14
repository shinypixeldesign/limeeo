import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { stripe, getPlanFromPriceId } from '@/lib/stripe'
import Stripe from 'stripe'

// Supabase service role client (bypasses RLS — safe only in server webhook)
function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig!, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    console.error('Webhook signature error:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = getServiceClient()

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        if (session.mode !== 'subscription') break

        // userId is stored in session.metadata (set when creating checkout) or subscription metadata
        const subscription = await stripe.subscriptions.retrieve(session.subscription as string)
        const userId = subscription.metadata?.supabase_user_id
          ?? (session.metadata as Record<string,string> | null)?.supabase_user_id

        const priceId = subscription.items.data[0]?.price.id
        const plan = getPlanFromPriceId(priceId)

        if (userId) {
          await supabase.from('profiles').update({
            plan: plan as 'solo' | 'pro' | 'team',
            stripe_subscription_id: subscription.id,
            stripe_price_id: priceId,
            subscription_status: subscription.status,
            current_period_end: new Date((subscription as any).current_period_end * 1000).toISOString(),
          }).eq('id', userId)
        }
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const userId = subscription.metadata?.supabase_user_id

        const priceId = subscription.items.data[0]?.price.id
        const plan = getPlanFromPriceId(priceId)

        if (userId) {
          await supabase.from('profiles').update({
            plan: plan as 'solo' | 'pro' | 'team',
            stripe_price_id: priceId,
            subscription_status: subscription.status,
            current_period_end: new Date((subscription as any).current_period_end * 1000).toISOString(),
          }).eq('id', userId)
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const userId = subscription.metadata?.supabase_user_id

        if (userId) {
          await supabase.from('profiles').update({
            plan: 'free',
            stripe_subscription_id: null,
            stripe_price_id: null,
            subscription_status: 'canceled',
            current_period_end: null,
          }).eq('id', userId)
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = invoice.customer as string
        // Optionally: send notification email or mark as past_due
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single()
        if (profile) {
          await supabase.from('profiles').update({
            subscription_status: 'past_due',
          }).eq('id', profile.id)
        }
        break
      }
    }
  } catch (err) {
    console.error('Webhook processing error:', err)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
