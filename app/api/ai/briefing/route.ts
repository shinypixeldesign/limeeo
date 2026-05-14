import { createClient } from '@/lib/supabase/server'
import { getClaudeClient, AI_MODEL, AI_LIMITS } from '@/lib/claude'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Neautorizat' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('plan, ai_messages_used, ai_messages_reset_at')
      .eq('id', user.id)
      .single()

    const plan = profile?.plan ?? 'free'
    const limit = AI_LIMITS[plan] ?? 0

    if (limit === 0) {
      return NextResponse.json({
        error: 'AI Assistant nu este disponibil pe planul Free. Fă upgrade la Solo sau Pro.'
      }, { status: 403 })
    }

    const resetAt = new Date(profile?.ai_messages_reset_at ?? 0)
    const now = new Date()
    const isNewMonth = now.getMonth() !== resetAt.getMonth() || now.getFullYear() !== resetAt.getFullYear()

    let messagesUsed = profile?.ai_messages_used ?? 0
    if (isNewMonth) {
      messagesUsed = 0
      await supabase.from('profiles').update({
        ai_messages_used: 0,
        ai_messages_reset_at: now.toISOString(),
      }).eq('id', user.id)
    }

    const isUnlimited = limit === Infinity
    if (!isUnlimited && messagesUsed >= limit) {
      return NextResponse.json({
        error: `Ai folosit toate cele ${limit} mesaje AI din această lună. Reîncarcă luna viitoare sau fă upgrade la Pro.`
      }, { status: 429 })
    }

    const [clientsRes, projectsRes, invoicesRes] = await Promise.all([
      supabase.from('clients').select('name, status, health_score').eq('user_id', user.id),
      supabase.from('projects').select('name, status, deadline, budget, currency').eq('user_id', user.id).eq('status', 'active'),
      supabase.from('invoices').select('number, total, currency, status, due_date').eq('user_id', user.id).in('status', ['sent', 'overdue']),
    ])

    const clients = clientsRes.data ?? []
    const projects = projectsRes.data ?? []
    const invoices = invoicesRes.data ?? []

    const overdueInvoices = invoices.filter(i => i.status === 'overdue')
    const upcomingDeadlines = projects.filter(p => {
      if (!p.deadline) return false
      const daysLeft = Math.ceil((new Date(p.deadline).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      return daysLeft >= 0 && daysLeft <= 14
    })

    const context = `Ești un asistent AI pentru freelanceri, integrat în Limeeo CRM. Astăzi este ${now.toLocaleDateString('ro-RO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}.`

DATE CURENTE ALE UTILIZATORULUI:
- Clienți activi: ${clients.filter(c => c.status === 'active').length} din ${clients.length} total
- Proiecte active: ${projects.length}
- Facturi neîncasate: ${invoices.length} (total: ${invoices.reduce((s, i) => s + (i.total ?? 0), 0).toLocaleString('ro-RO')} RON)
- Facturi restante: ${overdueInvoices.length}
${upcomingDeadlines.length > 0 ? `- Deadline-uri în 14 zile: ${upcomingDeadlines.map(p => `${p.name} (${new Date(p.deadline!).toLocaleDateString('ro-RO')})`).join(', ')}` : ''}
${overdueInvoices.length > 0 ? `- Facturi restante: ${overdueInvoices.map(i => `${i.number} - ${i.total} ${i.currency}`).join(', ')}` : ''}`.trim()

    const prompt = `Pe baza datelor de mai sus, generează un briefing zilnic concis și util pentru acest freelancer.
Structurează răspunsul astfel:
1. **Salut și rezumat rapid** (1-2 propoziții cu ce e mai important azi)
2. **Prioritățile zilei** (maxim 3 acțiuni concrete, cu bullets)
3. **Alertă** (dacă există deadline-uri urgente sau facturi restante — dacă nu există, omite secțiunea)
4. **Sfat al zilei** (un sfat scurt relevant pentru situația lor)

Fii concis, practic și în română. Nu repeta datele, transformă-le în acțiuni.`

    const claude = getClaudeClient()
    let message
    try {
      message = await claude.messages.create({
        model: AI_MODEL,
        max_tokens: 600,
        system: context,
        messages: [{ role: 'user', content: prompt }],
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error('[AI briefing Claude error]', msg)
      return NextResponse.json({ error: `Eroare Claude API: ${msg}` }, { status: 500 })
    }

    const content = message.content[0].type === 'text' ? message.content[0].text : ''

    await Promise.all([
      supabase.from('ai_messages').insert([
        { user_id: user.id, role: 'user', content: 'Generează briefing zilnic', context_type: 'briefing' },
        { user_id: user.id, role: 'assistant', content, context_type: 'briefing' },
      ]),
      supabase.from('profiles').update({
        ai_messages_used: messagesUsed + 1,
      }).eq('id', user.id),
    ])

    const newUsed = messagesUsed + 1
    return NextResponse.json({
      content,
      messagesUsed: newUsed,
      limit: isUnlimited ? 999999 : limit,
    })

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[AI briefing unhandled error]', msg)
    return NextResponse.json({ error: `Eroare server: ${msg}` }, { status: 500 })
  }
}
