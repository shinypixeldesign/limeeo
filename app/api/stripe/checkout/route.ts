import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripe, STRIPE_PLANS } from '@/lib/stripe'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { planId } = await req.json()
    const plan = STRIPE_PLANS[planId]
    if (!plan) return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })

    // Get or create Stripe customer
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id, full_name')
      .eq('id', user.id)
      .single()

    let customerId = profile?.stripe_customer_id

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: profile?.full_name ?? undefined,
        metadata: { supabase_user_id: user.id },
      })
      customerId = customer.id
      await supabase.from('profiles').update({ stripe_customer_id: customerId }).eq('id', user.id)
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://limeeo-six.vercel.app'

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: plan.priceId, quantity: 1 }],
      success_url: `${appUrl}/upgrade?success=1&plan=${planId}`,
      cancel_url: `${appUrl}/upgrade?canceled=1`,
      metadata: { supabase_user_id: user.id, plan: planId },
      subscription_data: {
        metadata: { supabase_user_id: user.id, plan: planId },
      },
      allow_promotion_codes: true,
      billing_address_collection: 'required',
      locale: 'ro',
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('Stripe checkout error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
