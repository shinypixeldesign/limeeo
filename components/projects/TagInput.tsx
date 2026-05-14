'use client'

import { useState, KeyboardEvent } from 'react'

interface TagInputProps {
  defaultTags?: string[]
  name?: string
  placeholder?: string
}

const TAG_COLORS = [
  'bg-indigo-100 text-indigo-700',
  'bg-violet-100 text-violet-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-cyan-100 text-cyan-700',
]

function tagColor(tag: string) {
  let hash = 0
  for (let i = 0; i < tag.length; i++) hash = tag.charCodeAt(i) + ((hash << 5) - hash)
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length]
}

export default function TagInput({ defaultTags = [], name = 'tags', placeholder = 'Adaugă etichetă...' }: TagInputProps) {
  const [tags, setTags] = useState<string[]>(defaultTags)
  const [input, setInput] = useState('')

  function addTag(raw: string) {
    const tag = raw.trim().toLowerCase().replace(/\s+/g, '-')
    if (!tag || tags.includes(tag) || tags.length >= 10) return
    setTags(prev => [...prev, tag])
    setInput('')
  }

  function removeTag(tag: string) {
    setTags(prev => prev.filter(t => t !== tag))
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(input)
    } else if (e.key === 'Backspace' && !input && tags.length > 0) {
      setTags(prev => prev.slice(0, -1))
    }
  }

  return (
    <div>
      {/* Hidden input cu valoarea serializată */}
      <input type="hidden" name={name} value={JSON.stringify(tags)} />

      <div className="flex flex-wrap gap-1.5 p-2 min-h-[44px] rounded-lg border border-slate-300 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent transition bg-white">
        {tags.map(tag => (
          <span
            key={tag}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${tagColor(tag)}`}
          >
            #{tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="opacity-60 hover:opacity-100 transition ml-0.5"
              aria-label={`Elimină ${tag}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </span>
        ))}
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => input && addTag(input)}
          placeholder={tags.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[120px] text-sm text-slate-900 placeholder:text-slate-400 outline-none bg-transparent py-0.5 px-1"
        />
      </div>
      <p className="text-xs text-slate-400 mt-1">Enter sau virgulă pentru a adăuga · max 10 etichete</p>
    </div>
  )
}
