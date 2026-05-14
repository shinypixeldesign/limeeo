'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export type AuthState =
  | { error?: string; message?: string }
  | undefined

export async function signIn(state: AuthState, formData: FormData): Promise<AuthState> {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: 'Email și parola sunt obligatorii.' }
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { error: 'Email sau parolă incorectă. Verifică datele și încearcă din nou.' }
  }

  redirect('/dashboard')
}

export async function signUp(state: AuthState, formData: FormData): Promise<AuthState> {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const fullName = formData.get('full_name') as string

  if (!email || !password || !fullName) {
    return { error: 'Toate câmpurile sunt obligatorii.' }
  }

  if (password.length < 8) {
    return { error: 'Parola trebuie să aibă cel puțin 8 caractere.' }
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
    },
  })

  if (error) {
    if (error.message.toLowerCase().includes('already registered')) {
      return { error: 'Există deja un cont cu acest email.' }
    }
    return { error: 'A apărut o eroare. Încearcă din nou.' }
  }

  // Dacă sesiunea e null înseamnă că Supabase așteaptă confirmare email
  if (!data.session) {
    return {
      message: 'Cont creat! Verifică emailul și apasă pe linkul de confirmare înainte să te autentifici.',
    }
  }

  redirect('/dashboard')
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
