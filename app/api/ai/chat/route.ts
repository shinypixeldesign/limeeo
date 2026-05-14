import { createClient } from '@/lib/supabase/server'
import { getClaudeClient, AI_MODEL, AI_LIMITS } from '@/lib/claude'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Neautorizat' }, { status: 401 })

    let body: { message?: string; history?: { role: string; content: string }[] }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Body invalid.' }, { status: 400 })
    }

    const { message, history } = body
    if (!message?.trim()) return NextResponse.json({ error: 'Mesaj gol' }, { status: 400 })

    // Verifică planul
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
        error: `Ai folosit toate cele ${limit} mesaje AI din această lună.`
      }, { status: 429 })
    }

    const systemPrompt = `Ești un asistent AI integrat în Limeeo — un CRM pentru freelanceri români.
Ajuți utilizatorul cu: redactarea de email-uri profesionale, propuneri de proiecte, mesaje către clienți, analiză business, sfaturi de pricing și orice altceva relevant pentru activitatea unui freelancer.
Răspunde întotdeauna în română, concis și practic. Astăzi este ${now.toLocaleDateString('ro-RO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}.`

    const recentHistory = (history ?? []).slice(-10).map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }))

    const claude = getClaudeClient()
    let response
    try {
      response = await claude.messages.create({
        model: AI_MODEL,
        max_tokens: 1024,
        system: systemPrompt,
        messages: [...recentHistory, { role: 'user', content: message }],
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error('[AI chat error]', msg)
      return NextResponse.json({ error: `Eroare Claude API: ${msg}` }, { status: 500 })
    }

    const content = response.content[0].type === 'text' ? response.content[0].text : ''

    await Promise.all([
      supabase.from('ai_messages').insert([
        { user_id: user.id, role: 'user', content: message, context_type: 'chat' },
        { user_id: user.id, role: 'assistant', content, context_type: 'chat' },
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
    console.error('[AI chat unhandled error]', msg)
    return NextResponse.json({ error: `Eroare server: ${msg}` }, { status: 500 })
  }
}
