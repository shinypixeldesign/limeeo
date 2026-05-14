'use client'

import { deleteProjectAction } from '@/app/actions/projects'
import { Trash2 } from 'lucide-react'
import { useState } from 'react'

interface DeleteProjectButtonProps {
  projectId: string
  projectName: string
}

export default function DeleteProjectButton({ projectId, projectName }: DeleteProjectButtonProps) {
  const [confirming, setConfirming] = useState(false)

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">Ștergi <strong>{projectName}</strong>?</span>
        <form action={deleteProjectAction} className="inline">
          <input type="hidden" name="id" value={projectId} />
          <button type="submit"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white font-semibold text-sm rounded-full transition-all">
            Da, șterge
          </button>
        </form>
        <button onClick={() => setConfirming(false)}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white border border-gray-200 hover:border-gray-300 text-gray-700 font-semibold text-sm rounded-full transition-all shadow-sm">
          Anulează
        </button>
      </div>
    )
  }

  return (
    <button onClick={() => setConfirming(true)}
      className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 hover:border-red-200 hover:text-red-600 text-gray-900 font-semibold text-sm rounded-full transition-all shadow-sm hover:shadow">
      <Trash2 size={16} />
      Șterge
    </button>
  )
}
