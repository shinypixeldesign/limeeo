'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { Check, Plus, Calendar, UserPlus, ChevronDown, ChevronRight, X } from 'lucide-react'
import type { ProjectTask, ProjectMember } from '@/types/database'
import {
  createTaskAction,
  toggleTaskAction,
  updateTaskAction,
  deleteTaskAction,
} from '@/app/actions/tasks'

interface TaskListProps {
  projectId: string
  initialTasks: ProjectTask[]
  members: ProjectMember[]
}

/* ─── helpers ─────────────────────────────────────────────── */

function formatDeadline(d: string | null): string | null {
  if (!d) return null
  const date = new Date(d)
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const diff = Math.ceil((date.getTime() - today.getTime()) / 86400000)
  if (diff < 0) return date.toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' })
  if (diff === 0) return 'Azi'
  if (diff === 1) return 'Mâine'
  if (diff <= 7) return `${diff}z`
  return date.toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' })
}

function deadlineCls(d: string | null): string {
  if (!d) return 'text-gray-400 bg-gray-100'
  const diff = Math.ceil((new Date(d).getTime() - new Date().setHours(0, 0, 0, 0)) / 86400000)
  if (diff < 0) return 'text-red-600 bg-red-50'
  if (diff <= 2) return 'text-amber-600 bg-amber-50'
  return 'text-gray-600 bg-gray-100'
}

const AVATAR_COLORS = ['bg-purple-400', 'bg-blue-400', 'bg-emerald-400', 'bg-amber-400', 'bg-rose-400', 'bg-cyan-400']
function avatarColor(email: string) {
  let h = 0
  for (let i = 0; i < email.length; i++) h = email.charCodeAt(i) + ((h << 5) - h)
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}
function initials(email: string) {
  return email.slice(0, 2).toUpperCase()
}

/* ─── Main component ──────────────────────────────────────── */

export default function TaskList({ projectId, initialTasks, members }: TaskListProps) {
  const [tasks, setTasks] = useState<ProjectTask[]>(initialTasks)
  const [, startTransition] = useTransition()
  const [showAddForm, setShowAddForm] = useState(false)

  const parentTasks = tasks
    .filter(t => !t.parent_task_id)
    .sort((a, b) => a.position - b.position)

  function subtasksOf(parentId: string) {
    return tasks.filter(t => t.parent_task_id === parentId).sort((a, b) => a.position - b.position)
  }

  const totalAll = tasks.length
  const doneAll = tasks.filter(t => t.is_completed).length
  const doneParent = parentTasks.filter(t => t.is_completed).length

  /* mutations */
  function optimisticToggle(id: string, completed: boolean) {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, is_completed: completed, completed_at: completed ? new Date().toISOString() : null } : t))
  }
  function optimisticDelete(id: string) {
    setTasks(prev => prev.filter(t => t.id !== id && t.parent_task_id !== id))
  }
  function optimisticAdd(task: ProjectTask) {
    setTasks(prev => [...prev, task])
  }
  function optimisticUpdate(id: string, fields: Partial<ProjectTask>) {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...fields } : t))
  }

  function handleToggle(task: ProjectTask) {
    const newVal = !task.is_completed
    optimisticToggle(task.id, newVal)
    startTransition(async () => { await toggleTaskAction(task.id, projectId, newVal) })
  }
  function handleDelete(id: string) {
    optimisticDelete(id)
    startTransition(async () => { await deleteTaskAction(id, projectId) })
  }
  function handleAddParent(title: string, assigneeEmail: string | null, deadline: string | null) {
    const temp: ProjectTask = {
      id: `temp-${Date.now()}`, project_id: projectId, user_id: '',
      parent_task_id: null, title, is_completed: false,
      position: parentTasks.length, assignee_email: assigneeEmail,
      deadline, completed_at: null,
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    }
    optimisticAdd(temp)
    setShowAddForm(false)
    startTransition(async () => {
      const { id } = await createTaskAction(projectId, title, null, assigneeEmail, deadline)
      if (id) setTasks(prev => prev.map(t => t.id === temp.id ? { ...t, id } : t))
      else setTasks(prev => prev.filter(t => t.id !== temp.id))
    })
  }
  function handleAddSubtask(parentId: string, title: string) {
    const subs = subtasksOf(parentId)
    const temp: ProjectTask = {
      id: `temp-${Date.now()}`, project_id: projectId, user_id: '',
      parent_task_id: parentId, title, is_completed: false,
      position: subs.length, assignee_email: null,
      deadline: null, completed_at: null,
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    }
    optimisticAdd(temp)
    startTransition(async () => {
      const { id } = await createTaskAction(projectId, title, parentId, null, null)
      if (id) setTasks(prev => prev.map(t => t.id === temp.id ? { ...t, id } : t))
      else setTasks(prev => prev.filter(t => t.id !== temp.id))
    })
  }
  function handleUpdate(id: string, fields: { title?: string; assignee_email?: string | null; deadline?: string | null }) {
    optimisticUpdate(id, fields)
    startTransition(async () => { await updateTaskAction(id, projectId, fields) })
  }

  return (
    <div className="bg-white rounded-[24px] shadow-lg shadow-black/5 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
        <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide">Task Engine</h3>
        <span className="text-sm font-medium text-gray-500">
          {doneParent}/{parentTasks.length} main tasks completed
        </span>
      </div>

      <div className="p-5">
        {/* Big Add Task Button */}
        {!showAddForm ? (
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="w-full mb-5 inline-flex items-center justify-center gap-2 py-3.5 bg-[#acff55] hover:bg-[#9fee44] text-black font-bold rounded-full transition-all shadow-md shadow-[#acff55]/30 hover:shadow-lg hover:shadow-[#acff55]/40 text-sm"
          >
            <Plus size={20} />
            Add Main Task
          </button>
        ) : (
          <div className="mb-5">
            <AddMainTaskForm
              members={members}
              onAdd={handleAddParent}
              onCancel={() => setShowAddForm(false)}
            />
          </div>
        )}

        {/* Task list */}
        {parentTasks.length === 0 && !showAddForm && (
          <div className="py-8 text-center">
            <p className="text-sm text-gray-400">Niciun task adăugat încă.</p>
          </div>
        )}

        <div className="space-y-2">
          {parentTasks.map(task => (
            <ParentTaskRow
              key={task.id}
              task={task}
              subtasks={subtasksOf(task.id)}
              members={members}
              onToggle={handleToggle}
              onDelete={handleDelete}
              onUpdate={handleUpdate}
              onAddSubtask={handleAddSubtask}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

/* ─── AddMainTaskForm ─────────────────────────────────────── */

function AddMainTaskForm({
  members,
  onAdd,
  onCancel,
}: {
  members: ProjectMember[]
  onAdd: (title: string, assignee: string | null, deadline: string | null) => void
  onCancel: () => void
}) {
  const [title, setTitle] = useState('')
  const [assignee, setAssignee] = useState('')
  const [deadline, setDeadline] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const available = members.filter(m => m.status !== 'declined')

  useEffect(() => { inputRef.current?.focus() }, [])

  function submit() {
    const t = title.trim()
    if (!t) return
    onAdd(t, assignee || null, deadline || null)
  }

  return (
    <div className="border-2 border-[#acff55] rounded-[16px] p-4 bg-[#acff55]/5">
      <input
        ref={inputRef}
        type="text"
        value={title}
        onChange={e => setTitle(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') onCancel() }}
        placeholder="Titlu task..."
        className="w-full text-sm font-semibold text-gray-900 bg-transparent border-none outline-none placeholder:text-gray-400 mb-3"
      />
      <div className="flex items-center gap-3 flex-wrap">
        {/* Deadline */}
        <div className="flex items-center gap-1.5">
          <Calendar size={14} className="text-gray-400" />
          <input
            type="date"
            value={deadline}
            onChange={e => setDeadline(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white focus:border-[#acff55] focus:outline-none"
          />
        </div>
        {/* Assignee */}
        {available.length > 0 && (
          <select
            value={assignee}
            onChange={e => setAssignee(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white focus:border-[#acff55] focus:outline-none"
          >
            <option value="">👤 Asignează</option>
            {available.map(m => (
              <option key={m.id} value={m.invited_email}>{m.invited_email}</option>
            ))}
          </select>
        )}
        <div className="flex-1" />
        <button type="button" onClick={onCancel} className="text-xs text-gray-400 hover:text-gray-600 transition">
          Anulează
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={!title.trim()}
          className="px-4 py-1.5 bg-[#acff55] hover:bg-[#9fee44] text-black font-bold text-xs rounded-full transition disabled:opacity-40"
        >
          Adaugă
        </button>
      </div>
    </div>
  )
}

/* ─── ParentTaskRow ───────────────────────────────────────── */

function ParentTaskRow({
  task, subtasks, members, onToggle, onDelete, onUpdate, onAddSubtask,
}: {
  task: ProjectTask
  subtasks: ProjectTask[]
  members: ProjectMember[]
  onToggle: (t: ProjectTask) => void
  onDelete: (id: string) => void
  onUpdate: (id: string, f: { title?: string; assignee_email?: string | null; deadline?: string | null }) => void
  onAddSubtask: (parentId: string, title: string) => void
}) {
  const [expanded, setExpanded] = useState(true)
  const [showAddSub, setShowAddSub] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(task.title)

  const hasSubtasks = subtasks.length > 0
  const doneSubs = subtasks.filter(s => s.is_completed).length

  function saveTitle() {
    const t = editTitle.trim()
    if (t && t !== task.title) onUpdate(task.id, { title: t })
    setEditing(false)
  }

  return (
    <div className={`rounded-[16px] border ${task.is_completed ? 'border-gray-100 bg-gray-50/50' : 'border-gray-100 bg-white hover:border-gray-200'} transition-colors`}>
      {/* Main task row */}
      <div className="flex items-center gap-3 px-4 py-3.5 group">
        {/* Expand toggle */}
        <button
          type="button"
          onClick={() => hasSubtasks && setExpanded(v => !v)}
          className={`flex-shrink-0 w-4 h-4 flex items-center justify-center text-gray-300 transition ${!hasSubtasks ? 'invisible' : 'hover:text-gray-500'}`}
        >
          {expanded
            ? <ChevronDown size={14} />
            : <ChevronRight size={14} />}
        </button>

        {/* Checkbox */}
        <button
          type="button"
          onClick={() => onToggle(task)}
          className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
            task.is_completed
              ? 'bg-[#acff55] border-[#acff55]'
              : 'border-gray-300 hover:border-[#acff55]'
          }`}
        >
          {task.is_completed && <Check size={14} className="text-black" strokeWidth={3} />}
        </button>

        {/* Title */}
        <div className="flex-1 min-w-0">
          {editing ? (
            <input
              autoFocus
              type="text"
              value={editTitle}
              onChange={e => setEditTitle(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') saveTitle(); if (e.key === 'Escape') { setEditTitle(task.title); setEditing(false) } }}
              onBlur={saveTitle}
              className="w-full text-sm font-semibold border-b-2 border-[#acff55] bg-transparent focus:outline-none"
            />
          ) : (
            <p
              onDoubleClick={() => { setEditTitle(task.title); setEditing(true) }}
              className={`text-sm font-semibold truncate cursor-pointer select-none ${
                task.is_completed ? 'line-through text-gray-400' : 'text-gray-900'
              }`}
              title="Dublu-click pentru editare"
            >
              {task.title}
              {hasSubtasks && (
                <span className="ml-2 text-xs font-normal text-gray-400">{doneSubs}/{subtasks.length}</span>
              )}
            </p>
          )}
        </div>

        {/* Right side: deadline + assignees + controls */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Deadline badge */}
          <DeadlinePicker task={task} onUpdate={onUpdate} />

          {/* Assignee */}
          <AssigneePicker task={task} members={members} onUpdate={onUpdate} />

          {/* Add subtask + Delete (visible on hover) */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
            <button
              type="button"
              onClick={() => { setShowAddSub(v => !v); setExpanded(true) }}
              className="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:text-black hover:bg-gray-100 transition"
              title="Adaugă subtask"
            >
              <Plus size={14} />
            </button>
            <button
              type="button"
              onClick={() => onDelete(task.id)}
              className="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition"
              title="Șterge task"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Subtasks */}
      {expanded && (hasSubtasks || showAddSub) && (
        <div className="ml-[52px] mr-4 pb-3 border-t border-gray-50">
          <div className="border-l-2 border-gray-100 pl-4 mt-2 space-y-1">
            {subtasks.map(sub => (
              <SubtaskRow
                key={sub.id}
                task={sub}
                onToggle={onToggle}
                onDelete={onDelete}
                onUpdate={onUpdate}
              />
            ))}

            {/* Add subtask inline */}
            {showAddSub && (
              <AddSubtaskForm
                onAdd={(title) => { onAddSubtask(task.id, title); setShowAddSub(false) }}
                onCancel={() => setShowAddSub(false)}
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── SubtaskRow ──────────────────────────────────────────── */

function SubtaskRow({
  task, onToggle, onDelete, onUpdate,
}: {
  task: ProjectTask
  onToggle: (t: ProjectTask) => void
  onDelete: (id: string) => void
  onUpdate: (id: string, f: { title?: string }) => void
}) {
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(task.title)

  function saveTitle() {
    const t = editTitle.trim()
    if (t && t !== task.title) onUpdate(task.id, { title: t })
    setEditing(false)
  }

  return (
    <div className={`flex items-center gap-2.5 py-1.5 group ${task.is_completed ? 'opacity-60' : ''}`}>
      <button
        type="button"
        onClick={() => onToggle(task)}
        className={`flex-shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
          task.is_completed ? 'bg-[#acff55] border-[#acff55]' : 'border-gray-300 hover:border-[#acff55]'
        }`}
      >
        {task.is_completed && <Check size={10} className="text-black" strokeWidth={3} />}
      </button>

      {editing ? (
        <input
          autoFocus
          type="text"
          value={editTitle}
          onChange={e => setEditTitle(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') saveTitle(); if (e.key === 'Escape') { setEditTitle(task.title); setEditing(false) } }}
          onBlur={saveTitle}
          className="flex-1 text-xs border-b border-[#acff55] bg-transparent focus:outline-none"
        />
      ) : (
        <span
          onDoubleClick={() => { setEditTitle(task.title); setEditing(true) }}
          className={`flex-1 text-xs cursor-pointer select-none ${task.is_completed ? 'line-through text-gray-400' : 'text-gray-600'}`}
          title="Dublu-click pentru editare"
        >
          {task.title}
        </span>
      )}

      <button
        type="button"
        onClick={() => onDelete(task.id)}
        className="opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center rounded-full text-gray-300 hover:text-red-400 transition flex-shrink-0"
      >
        <X size={12} />
      </button>
    </div>
  )
}

/* ─── AddSubtaskForm ──────────────────────────────────────── */

function AddSubtaskForm({ onAdd, onCancel }: { onAdd: (title: string) => void; onCancel: () => void }) {
  const [title, setTitle] = useState('')
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => { ref.current?.focus() }, [])

  return (
    <div className="flex items-center gap-2 py-1">
      <div className="w-4 h-4 rounded-full border-2 border-gray-200 flex-shrink-0" />
      <input
        ref={ref}
        type="text"
        value={title}
        onChange={e => setTitle(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter' && title.trim()) onAdd(title.trim())
          if (e.key === 'Escape') onCancel()
        }}
        placeholder="Subtask nou..."
        className="flex-1 text-xs bg-transparent border-b border-[#acff55] focus:outline-none placeholder:text-gray-300 text-gray-700"
      />
      <button type="button" onClick={onCancel} className="text-xs text-gray-400 hover:text-gray-600 flex-shrink-0">
        <X size={13} />
      </button>
    </div>
  )
}

/* ─── DeadlinePicker ──────────────────────────────────────── */

function DeadlinePicker({ task, onUpdate }: { task: ProjectTask; onUpdate: (id: string, f: { deadline?: string | null }) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const label = formatDeadline(task.deadline)
  const cls = deadlineCls(task.deadline)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition ${cls} ${!label ? 'opacity-0 group-hover:opacity-100' : ''}`}
      >
        <Calendar size={12} />
        {label ?? 'Deadline'}
      </button>

      {open && (
        <div className="absolute right-0 top-8 z-30 bg-white rounded-[14px] shadow-xl border border-gray-100 p-3 min-w-[200px]">
          <p className="text-xs font-bold text-gray-700 mb-2">Setează deadline</p>
          <input
            type="date"
            defaultValue={task.deadline ?? ''}
            onChange={e => { onUpdate(task.id, { deadline: e.target.value || null }); setOpen(false) }}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:border-[#acff55] focus:outline-none"
          />
          {task.deadline && (
            <button
              type="button"
              onClick={() => { onUpdate(task.id, { deadline: null }); setOpen(false) }}
              className="mt-2 text-xs text-gray-400 hover:text-red-500 transition block"
            >
              Șterge deadline
            </button>
          )}
        </div>
      )}
    </div>
  )
}

/* ─── AssigneePicker ──────────────────────────────────────── */

function AssigneePicker({ task, members, onUpdate }: {
  task: ProjectTask
  members: ProjectMember[]
  onUpdate: (id: string, f: { assignee_email?: string | null }) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const available = members.filter(m => m.status !== 'declined')

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative flex items-center gap-1">
      {/* Current assignee avatar */}
      {task.assignee_email && (
        <div
          className={`w-7 h-7 rounded-full ${avatarColor(task.assignee_email)} flex items-center justify-center cursor-pointer`}
          onClick={() => setOpen(v => !v)}
          title={task.assignee_email}
        >
          <span className="text-[10px] font-bold text-white">{initials(task.assignee_email)}</span>
        </div>
      )}

      {/* Assign button */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={`w-7 h-7 rounded-full flex items-center justify-center transition ${
          task.assignee_email
            ? 'opacity-0 group-hover:opacity-100 bg-gray-100 hover:bg-gray-200 text-gray-500'
            : 'opacity-0 group-hover:opacity-100 bg-gray-100 hover:bg-gray-200 text-gray-500'
        }`}
        title="Asignează"
      >
        <UserPlus size={13} />
      </button>

      {open && (
        <div className="absolute right-0 top-9 z-30 bg-white rounded-[14px] shadow-xl border border-gray-100 py-2 min-w-[220px]">
          <p className="px-4 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wide">Asignează</p>
          {available.length === 0 ? (
            <p className="px-4 py-2 text-xs text-gray-400">Niciun coleg invitat.</p>
          ) : (
            <>
              {task.assignee_email && (
                <button type="button"
                  onClick={() => { onUpdate(task.id, { assignee_email: null }); setOpen(false) }}
                  className="w-full text-left px-4 py-2 text-xs text-gray-500 hover:bg-gray-50 transition">
                  — Fără asignare
                </button>
              )}
              {available.map(m => (
                <button key={m.id} type="button"
                  onClick={() => { onUpdate(task.id, { assignee_email: m.invited_email }); setOpen(false) }}
                  className={`w-full flex items-center gap-3 px-4 py-2 text-xs transition ${
                    task.assignee_email === m.invited_email ? 'bg-[#acff55]/10 font-semibold' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className={`w-6 h-6 rounded-full ${avatarColor(m.invited_email)} flex items-center justify-center flex-shrink-0`}>
                    <span className="text-[9px] font-bold text-white">{initials(m.invited_email)}</span>
                  </div>
                  <span className="flex-1 truncate text-gray-700">{m.invited_email}</span>
                  {task.assignee_email === m.invited_email && <Check size={13} className="text-[#acff55] flex-shrink-0" strokeWidth={3} />}
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}
