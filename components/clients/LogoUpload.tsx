'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  currentUrl: string | null
  clientName: string
  onUploaded: (url: string) => void
}

export default function LogoUpload({ currentUrl, clientName, onUploaded }: Props) {
  const [preview, setPreview] = useState<string | null>(currentUrl)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    if (!file.type.startsWith('image/')) {
      setError('Selectează un fișier imagine (JPG, PNG, WebP, SVG).')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('Dimensiunea maximă este 2MB.')
      return
    }

    setError(null)
    setUploading(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Neautorizat.'); setUploading(false); return }

    const ext  = file.name.split('.').pop() ?? 'png'
    const path = `${user.id}/${Date.now()}.${ext}`

    const { error: upErr } = await supabase.storage
      .from('client-logos')
      .upload(path, file, { upsert: true, contentType: file.type })

    if (upErr) { setError(upErr.message); setUploading(false); return }

    const { data: { publicUrl } } = supabase.storage
      .from('client-logos')
      .getPublicUrl(path)

    setPreview(publicUrl)
    onUploaded(publicUrl)
    setUploading(false)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  function handleRemove() {
    setPreview(null)
    onUploaded('')
    if (inputRef.current) inputRef.current.value = ''
  }

  const initials = clientName
    ? clientName.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : '?'

  return (
    <div className="flex items-center gap-5">
      {/* Avatar preview */}
      <div className="shrink-0">
        {preview ? (
          <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="Logo" className="w-full h-full object-contain p-1" />
            <button
              type="button"
              onClick={handleRemove}
              className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition"
              title="Elimină logo"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ) : (
          <div className="w-20 h-20 rounded-xl bg-indigo-100 flex items-center justify-center border-2 border-dashed border-indigo-200">
            <span className="text-2xl font-bold text-indigo-400">{initials}</span>
          </div>
        )}
      </div>

      {/* Upload zone */}
      <div className="flex-1">
        <div
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          onClick={() => inputRef.current?.click()}
          className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-200 rounded-xl p-5 cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition group"
        >
          {uploading ? (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <svg className="animate-spin w-4 h-4 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Se încarcă...
            </div>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-slate-300 group-hover:text-indigo-400 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              <p className="text-sm text-slate-500 group-hover:text-indigo-600 transition text-center">
                <span className="font-medium">Click</span> sau trage logo-ul aici
              </p>
              <p className="text-xs text-slate-400">PNG, JPG, WebP, SVG · max 2MB</p>
            </>
          )}
        </div>
        {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/svg+xml"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
        />
      </div>
    </div>
  )
}
