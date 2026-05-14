import { createClient } from '@/lib/supabase/server'
import UpgradeCTASection from '@/components/billing/UpgradeCTASection'

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    period: 'pentru totdeauna',
    description: 'Perfect pentru a testa platforma.',
    borderColor: 'border-slate-200',
    highlight: false,
    badge: null,
    badgeColor: '',
    features: [
      { text: '3 clienți', ok: true },
      { text: '2 proiecte', ok: true },
      { text: 'Facturi & oferte nelimitate', ok: true },
      { text: 'Preview & PDF', ok: true },
      { text: 'AI Assistant', ok: false },
      { text: 'Trimitere email facturi', ok: false },
      { text: 'Export date', ok: false },
      { text: 'Suport prioritar', ok: false },
    ],
  },
  {
    id: 'solo',
    name: 'Solo',
    price: 9,
    period: '/ lună',
    description: 'Pentru freelanceri activi care vor să crească.',
    borderColor: 'border-indigo-500',
    highlight: true,
    badge: 'Recomandat',
    badgeColor: 'bg-indigo-600 text-white',
    features: [
      { text: 'Clienți nelimitați', ok: true },
      { text: 'Proiecte nelimitate', ok: true },
      { text: 'Facturi & oferte nelimitate', ok: true },
      { text: 'Preview & PDF', ok: true },
      { text: '100 mesaje AI / lună', ok: true },
      { text: 'Trimitere email facturi', ok: true },
      { text: 'Export date', ok: false },
      { text: 'Suport prioritar', ok: false },
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 19,
    period: '/ lună',
    description: 'Pentru agenții mici și freelanceri cu volum mare.',
    borderColor: 'border-violet-400',
    highlight: false,
    badge: 'Popular',
    badgeColor: 'bg-violet-600 text-white',
    features: [
      { text: 'Clienți nelimitați', ok: true },
      { text: 'Proiecte nelimitate', ok: true },
      { text: 'Facturi & oferte nelimitate', ok: true },
      { text: 'Preview & PDF', ok: true },
      { text: 'Mesaje AI nelimitate', ok: true },
      { text: 'Trimitere email facturi', ok: true },
      { text: 'Export date (CSV)', ok: true },
      { text: 'Suport prioritar', ok: false },
    ],
  },
  {
    id: 'team',
    name: 'Team',
    price: 49,
    period: '/ lună',
    description: 'Pentru echipe și agenții cu nevoi avansate.',
    borderColor: 'border-amber-400',
    highlight: false,
    badge: null,
    badgeColor: '',
    features: [
      { text: 'Clienți nelimitați', ok: true },
      { text: 'Proiecte nelimitate', ok: true },
      { text: 'Facturi & oferte nelimitate', ok: true },
      { text: 'Preview & PDF', ok: true },
      { text: 'Mesaje AI nelimitate', ok: true },
      { text: 'Trimitere email facturi', ok: true },
      { text: 'Export date (CSV)', ok: true },
      { text: 'Suport prioritar', ok: true },
    ],
  },
]

export default async function UpgradePage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; canceled?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('plan, stripe_subscription_id, subscription_status, current_period_end')
    .eq('id', user!.id)
    .single()

  const currentPlan = (profile?.plan ?? 'free') as string
  const hasActiveSubscription = !!profile?.stripe_subscription_id && profile.subscription_status !== 'canceled'
  const periodEnd = profile?.current_period_end
    ? new Date(profile.current_period_end).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' })
    : null
  const subStatus = profile?.subscription_status

  return (
    <div className="p-8 max-w-6xl mx-auto">

      {/* Success banner */}
      {params.success && (
        <div className="mb-8 bg-emerald-50 border border-emerald-200 rounded-2xl p-6 flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center shrink-0">
            <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <p className="font-bold text-emerald-800 text-lg">Abonament activat cu succes!</p>
            <p className="text-emerald-600 text-sm mt-0.5">
              Planul tău a fost actualizat. Funcționalitățile sunt deja active în contul tău.
            </p>
          </div>
        </div>
      )}

      {/* Canceled banner */}
      {params.canceled && (
        <div className="mb-8 bg-amber-50 border border-amber-200 rounded-2xl p-5 text-sm font-medium text-amber-800">
          Plata a fost anulată. Nu a fost efectuată nicio taxare.
        </div>
      )}

      {/* Header */}
      <div className="text-center mb-12 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
          ✨ Upgrade plan
        </div>
        <h1 className="text-3xl font-bold text-slate-900 mb-3">
          Alege planul potrivit pentru tine
        </h1>
        <p className="text-slate-500">
          Fără contracte. Plătești lunar, anulezi oricând.
          <br />Prețuri în EUR, facturare lunară prin card.
        </p>
      </div>

      {/* Active subscription bar */}
      {hasActiveSubscription && currentPlan !== 'free' && (
        <div className="max-w-5xl mx-auto mb-8 bg-white rounded-xl border border-slate-200 px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className={`w-2.5 h-2.5 rounded-full ${subStatus === 'active' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
            <div>
              <p className="text-sm font-semibold text-slate-800">
                Abonament{' '}
                <span className="capitalize">{currentPlan}</span>
                {' — '}
                <span className={subStatus === 'active' ? 'text-emerald-600' : 'text-amber-600'}>
                  {subStatus === 'active' ? 'activ' : subStatus === 'past_due' ? 'plată restantă' : subStatus}
                </span>
              </p>
              {periodEnd && (
                <p className="text-xs text-slate-400 mt-0.5">
                  Se reînnoiește pe {periodEnd}
                </p>
              )}
            </div>
          </div>
          <UpgradeCTASection currentPlan={currentPlan} portalMode />
        </div>
      )}

      {/* Plan cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 max-w-5xl mx-auto mb-14">
        {PLANS.map(plan => (
          <div
            key={plan.id}
            className={`relative bg-white rounded-2xl border-2 p-6 flex flex-col ${plan.borderColor} ${
              plan.highlight ? 'ring-2 ring-indigo-500 shadow-lg shadow-indigo-100' : ''
            }`}
          >
            {plan.badge && (
              <div className={`absolute -top-3.5 left-1/2 -translate-x-1/2 text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap ${plan.badgeColor}`}>
                {plan.badge}
              </div>
            )}

            <div className="mb-5">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">{plan.name}</p>
              <div className="flex items-end gap-1 mb-2">
                <span className="text-4xl font-bold text-slate-900">€{plan.price}</span>
                <span className="text-slate-400 text-sm mb-1.5">{plan.period}</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">{plan.description}</p>
            </div>

            <ul className="space-y-2.5 flex-1 mb-6">
              {plan.features.map((f, i) => (
                <li key={i} className="flex items-center gap-2 text-sm">
                  {f.ok ? (
                    <svg className="w-4 h-4 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 text-slate-200 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                  <span className={f.ok ? 'text-slate-700' : 'text-slate-400'}>{f.text}</span>
                </li>
              ))}
            </ul>

            <UpgradeCTASection currentPlan={currentPlan} planId={plan.id} />
          </div>
        ))}
      </div>

      {/* Stripe badge */}
      <div className="flex justify-center mb-10">
        <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-50 border border-slate-200 rounded-full px-4 py-2">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z"/>
          </svg>
          Plăți procesate securizat prin Stripe • SSL encrypted
        </div>
      </div>

      {/* FAQ */}
      <div className="max-w-2xl mx-auto">
        <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6 space-y-4">
          <h3 className="font-semibold text-slate-900 mb-2">Întrebări frecvente</h3>
          {[
            { q: 'Cum plătesc?', a: 'Prin card bancar (Visa, Mastercard, Amex). Plata se procesează securizat prin Stripe, nu stocăm datele cardului.' },
            { q: 'Pot anula oricând?', a: 'Da, fără penalități. Anulezi direct din portalul de abonament (butonul "Gestionează abonamentul"). Accesul rămâne activ până la finalul perioadei plătite.' },
            { q: 'Ce se întâmplă cu datele la downgrade?', a: 'Datele existente sunt păstrate complet. Funcționalitățile planului superior nu mai sunt accesibile, dar nimic nu se șterge.' },
            { q: 'Există discount anual?', a: 'Momentan facturăm lunar. Reducere anuală (2 luni gratuit) — în curând disponibilă.' },
            { q: 'Emiteți factură fiscală?', a: 'Da, Stripe emite automat o factură după fiecare plată, trimisă pe adresa de email înregistrată.' },
          ].map((item, i) => (
            <div key={i} className="border-t border-slate-200 pt-4 first:border-0 first:pt-0">
              <p className="text-sm font-semibold text-slate-800 mb-1">{item.q}</p>
              <p className="text-sm text-slate-500">{item.a}</p>
            </div>
          ))}
        </div>
        <p className="text-center text-xs text-slate-400 mt-6">
          Ai întrebări? Scrie-ne la{' '}
          <a href="mailto:contact@freelio.ro" className="text-indigo-500 hover:underline">contact@freelio.ro</a>
        </p>
      </div>
    </div>
  )
}
