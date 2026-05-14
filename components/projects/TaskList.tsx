'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
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

/* ─── helpers ──────────────────────────────────────────────── */

function formatDeadline(d: string | null): string | null {
  if (!d) return null
  const date = new Date(d)
  const today = new Date(); today.setHours(0,0,0,0)
  const diff = Math.ceil((date.getTime() - today.getTime()) / 86400000)
  if (diff < 0) return `Expirat (${date.toLocaleDateString('ro-RO', { day:'numeric', month:'short' })})`
  if (diff === 0) return 'Azi'
  if (diff === 1) return 'Mâine'
  if (diff <= 7) return `${diff}z`
  return date.toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' })
}

function deadlineColor(d: string | null): string {
  if (!d) return 'text-slate-400'
  const today = new Date(); today.setHours(0,0,0,0)
  const diff = Math.ceil((new Date(d).getTime() - today.getTime()) / 86400000)
  if (diff < 0) return 'text-red-500'
  if (diff <= 2) return 'text-amber-500'
  return 'text-slate-400'
}

function memberInitials(email: string): string {
  return email.slice(0, 2).toUpperCase()
}

const AVATAR_COLORS = ['bg-indigo-500','bg-violet-500','bg-emerald-500','bg-amber-500','bg-rose-500']
function avatarColor(email: string): string {
  let h = 0
  for (let i = 0; i < email.length; i++) h = email.charCodeAt(i) + ((h << 5) - h)
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}

/* ─── Main component ────────────────────────────────────────── */

export default function TaskList({ projectId, initialTasks, members }: TaskListProps) {
  const [tasks, setTasks] = useState<ProjectTask[]>(initialTasks)
  const [, startTransition] = useTransition()

  // Split into parent tasks and subtasks
  const parentTasks = tasks
    .filter(t => !t.parent_task_id)
    .sort((a, b) => a.position - b.position)

  function subtasksOf(parentId: string) {
    return tasks
      .filter(t => t.parent_task_id === parentId)
      .sort((a, b) => a.position - b.position)
  }

  const totalParent = parentTasks.length
  const doneParent  = parentTasks.filter(t => t.is_completed).length
  const totalAll    = tasks.length
  const doneAll     = tasks.filter(t => t.is_completed).length
  const pct         = totalAll > 0 ? Math.round((doneAll / totalAll) * 100) : 0

  /* ── mutations ── */

  function optimisticToggle(id: string, completed: boolean) {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, is_completed: completed, completed_at: completed ? new Date().toISOString() : null } : t))
  }

  function optimisticDelete(id: string) {
    // remove task AND its subtasks
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
    startTransition(async () => {
      await toggleTaskAction(task.id, projectId, newVal)
    })
  }

  function handleDelete(id: string) {
    optimisticDelete(id)
    startTransition(async () => {
      await deleteTaskAction(id, projectId)
    })
  }

  function handleAddParent(title: string, assigneeEmail: string | null, deadline: string | null) {
    const temp: ProjectTask = {
      id: `temp-${Date.now()}`,
      project_id: projectId,
      user_id: '',
      parent_task_id: null,
      title,
      is_completed: false,
      position: parentTasks.length,
      assignee_email: assigneeEmail,
      deadline,
      completed_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    optimisticAdd(temp)
    startTransition(async () => {
      const { id } = await createTaskAction(projectId, title, null, assigneeEmail, deadline)
      if (id) setTasks(prev => prev.map(t => t.id === temp.id ? { ...t, id } : t))
      else setTasks(prev => prev.filter(t => t.id !== temp.id))
    })
  }

  function handleAddSubtask(parentId: string, title: string, assigneeEmail: string | null, deadline: string | null) {
    const subs = subtasksOf(parentId)
    const temp: ProjectTask = {
      id: `temp-${Date.now()}`,
      project_id: projectId,
      user_id: '',
      parent_task_id: parentId,
      title,
      is_completed: false,
      position: subs.length,
      assignee_email: assigneeEmail,
      deadline,
      completed_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    optimisticAdd(temp)
    startTransition(async () => {
      const { id } = await createTaskAction(projectId, title, parentId, assigneeEmail, deadline)
      if (id) setTasks(prev => prev.map(t => t.id === temp.id ? { ...t, id } : t))
      else setTasks(prev => prev.filter(t => t.id !== temp.id))
    })
  }

  function handleUpdate(id: string, fields: { title?: string; assignee_email?: string | null; deadline?: string | null }) {
    optimisticUpdate(id, fields)
    startTransition(async () => {
      await updateTaskAction(id, projectId, fields)
    })
  }

  /* ── render ── */

  return (
    <div className="bg-white rounded-[24px] shadow-lg shadow-black/5 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide">Task Engine</h3>
          {totalAll > 0 && (
            <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
              {doneAll}/{totalAll}
            </span>
          )}
        </div>
        {totalAll > 0 && (
          <span className={`text-xs font-bold ${pct === 100 ? 'text-emerald-600' : 'text-gray-400'}`}>
            {pct}%
          </span>
        )}
      </div>

      {/* Progress bar */}
      {totalAll > 0 && (
        <div className="h-1 bg-gray-100">
          <div
            className={`h-1 transition-all duration-500 ${pct === 100 ? 'bg-emerald-500' : 'bg-[#acff55]'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}

      {/* Task list */}
      <div className="divide-y divide-gray-50">
        {totalParent === 0 && (
          <div className="px-6 py-10 text-center">
            <p className="text-sm text-gray-400">Niciun task încă. Adaugă primul task mai jos.</p>
          </div>
        )}

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

      {/* Add parent task */}
      <div className="border-t border-gray-100 bg-gray-50/50 px-6 py-4">
        <AddTaskForm
          placeholder="Adaugă task nou..."
          members={members}
          onAdd={handleAddParent}
          buttonLabel="+ Task"
          compact={false}
        />
      </div>
    </div>
  )
}

/* ─── ParentTaskRow ─────────────────────────────────────────── */

function ParentTaskRow({
  task,
  subtasks,
  members,
  onToggle,
  onDelete,
  onUpdate,
  onAddSubtask,
}: {
  task: ProjectTask
  subtasks: ProjectTask[]
  members: ProjectMember[]
  onToggle: (t: ProjectTask) => void
  onDelete: (id: string) => void
  onUpdate: (id: string, f: { title?: string; assignee_email?: string | null; deadline?: string | null }) => void
  onAddSubtask: (parentId: string, title: string, assignee: string | null, deadline: string | null) => void
}) {
  const [expanded, setExpanded] = useState(true)
  const [showAddSub, setShowAddSub] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(task.title)

  const doneCount = subtasks.filter(s => s.is_completed).length
  const hasSubtasks = subtasks.length > 0

  function saveTitle() {
    const t = editTitle.trim()
    if (t && t !== task.title) onUpdate(task.id, { title: t })
    setEditing(false)
  }

  return (
    <div className={`${task.is_completed ? 'opacity-60' : ''}`}>
      {/* Parent row */}
      <div className="flex items-start gap-2.5 px-6 py-3 group hover:bg-gray-50 transition">
        {/* Expand toggle (only if has subtasks) */}
        <button
          type="button"
          onClick={() => setExpanded(v => !v)}
          className={`mt-0.5 shrink-0 w-4 h-4 flex items-center justify-center text-slate-300 hover:text-slate-500 transition ${!hasSubtasks ? 'invisible' : ''}`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`w-3 h-3 transition-transform ${expanded ? 'rotate-90' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Checkbox */}
        <button
          type="button"
          onClick={() => onToggle(task)}
          className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition ${
            task.is_completed ? 'bg-[#acff55] border-[#acff55] text-black' : 'border-gray-300 hover:border-[#acff55]'
          }`}
        >
          {task.is_completed && (
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {editing ? (
            <input
              autoFocus
              type="text"
              value={editTitle}
              onChange={e => setEditTitle(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') saveTitle(); if (e.key === 'Escape') { setEditTitle(task.title); setEditing(false) } }}
              onBlur={saveTitle}
              className="w-full text-sm font-medium border border-indigo-300 rounded-lg px-2.5 py-1 focus:outline-none focus:ring-2 focus:border-[#acff55] bg-white"
            />
          ) : (
            <p
              className={`text-sm font-medium cursor-pointer ${task.is_completed ? 'line-through text-gray-400' : 'text-gray-800 hover:text-black'} transition`}
              onDoubleClick={() => { setEditTitle(task.title); setEditing(true) }}
              title="Dublu-click pentru editare"
            >
              {task.title}
              {hasSubtasks && (
                <span className="ml-2 text-[10px] font-normal text-slate-400">{doneCount}/{subtasks.length}</span>
              )}
            </p>
          )}

          {/* Meta row: assignee + deadline */}
          <TaskMeta task={task} members={members} onUpdate={onUpdate} />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition shrink-0 mt-0.5">
          <button
            type="button"
            onClick={() => { setShowAddSub(v => !v); setExpanded(true) }}
            className="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:text-black hover:bg-gray-100 transition"
            title="Adaugă subtask"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => onDelete(task.id)}
            className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:text-red-500 hover:bg-red-50 transition"
            title="Șterge task"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Subtasks */}
      {expanded && (
        <div className="ml-11 border-l-2 border-slate-100">
          {subtasks.map(sub => (
            <SubtaskRow
              key={sub.id}
              task={sub}
              members={members}
              onToggle={onToggle}
              onDelete={onDelete}
              onUpdate={onUpdate}
            />
          ))}

          {/* Inline add subtask */}
          {showAddSub && (
            <div className="pl-4 pr-6 py-2">
              <AddTaskForm
                placeholder="Adaugă subtask..."
                members={members}
                onAdd={(title, assignee, deadline) => {
                  onAddSubtask(task.id, title, assignee, deadline)
                  setShowAddSub(false)
                }}
                onCancel={() => setShowAddSub(false)}
                buttonLabel="Adaugă"
                compact={true}
              />
            </div>
          )}

          {/* "add subtask" hint when collapsed form */}
          {!showAddSub && (
            <button
              type="button"
              onClick={() => setShowAddSub(true)}
              className="w-full text-left pl-4 pr-6 py-1.5 text-xs text-gray-400 hover:text-black hover:bg-gray-50 transition flex items-center gap-1.5"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              subtask
            </button>
          )}
        </div>
      )}
    </div>
  )
}

/* ─── SubtaskRow ────────────────────────────────────────────── */

function SubtaskRow({
  task,
  members,
  onToggle,
  onDelete,
  onUpdate,
}: {
  task: ProjectTask
  members: ProjectMember[]
  onToggle: (t: ProjectTask) => void
  onDelete: (id: string) => void
  onUpdate: (id: string, f: { title?: string; assignee_email?: string | null; deadline?: string | null }) => void
}) {
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(task.title)

  function saveTitle() {
    const t = editTitle.trim()
    if (t && t !== task.title) onUpdate(task.id, { title: t })
    setEditing(false)
  }

  return (
    <div className={`flex items-start gap-2.5 pl-4 pr-6 py-2.5 group hover:bg-gray-50/70 transition ${task.is_completed ? 'opacity-60' : ''}`}>
      {/* Checkbox */}
      <button
        type="button"
        onClick={() => onToggle(task)}
        className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition ${
          task.is_completed ? 'bg-[#acff55] border-[#acff55] text-black' : 'border-gray-300 hover:border-[#acff55]'
        }`}
      >
        {task.is_completed && (
          <svg xmlns="http://www.w3.org/2000/svg" className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {editing ? (
          <input
            autoFocus
            type="text"
            value={editTitle}
            onChange={e => setEditTitle(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') saveTitle(); if (e.key === 'Escape') { setEditTitle(task.title); setEditing(false) } }}
            onBlur={saveTitle}
            className="w-full text-xs border border-indigo-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:border-[#acff55] bg-white"
          />
        ) : (
          <p
            className={`text-xs cursor-pointer ${task.is_completed ? 'line-through text-gray-400' : 'text-gray-700 hover:text-black'} transition`}
            onDoubleClick={() => { setEditTitle(task.title); setEditing(true) }}
            title="Dublu-click pentru editare"
          >
            {task.title}
          </p>
        )}
      </div>

      {/* Delete */}
      <button
        type="button"
        onClick={() => onDelete(task.id)}
        className="mt-0.5 w-5 h-5 flex items-center justify-center rounded text-slate-300 hover:text-red-500 hover:bg-red-50 transition opacity-0 group-hover:opacity-100 shrink-0"
        title="Șterge subtask"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}

/* ─── TaskMeta (assignee + deadline) ────────────────────────── */

function TaskMeta({
  task,
  members,
  onUpdate,
  small = false,
}: {
  task: ProjectTask
  members: ProjectMember[]
  onUpdate: (id: string, f: { assignee_email?: string | null; deadline?: string | null }) => void
  small?: boolean
}) {
  const [assigneeOpen, setAssigneeOpen] = useState(false)
  const [deadlineOpen, setDeadlineOpen] = useState(false)
  const assigneeRef = useRef<HTMLDivElement>(null)
  const deadlineRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (assigneeRef.current && !assigneeRef.current.contains(e.target as Node)) setAssigneeOpen(false)
      if (deadlineRef.current && !deadlineRef.current.contains(e.target as Node)) setDeadlineOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  // Toți membrii (accepted + pending) — pending apar cu indicator vizual
  const allMembers = members.filter(m => m.status !== 'declined')
  const deadlineLabel = formatDeadline(task.deadline)
  const dlColor = deadlineColor(task.deadline)

  return (
    <div className="flex items-center gap-2 mt-1 flex-wrap">
      {/* Assignee picker */}
      <div ref={assigneeRef} className="relative">
        <button
          type="button"
          onClick={() => { setAssigneeOpen(v => !v); setDeadlineOpen(false) }}
          className="flex items-center gap-1 hover:opacity-80 transition"
          title={task.assignee_email ?? 'Atribuie un membru'}
        >
          {task.assignee_email ? (
            <span className={`w-5 h-5 rounded-full ${avatarColor(task.assignee_email)} flex items-center justify-center`}>
              <span className="text-[9px] font-bold text-white">{memberInitials(task.assignee_email)}</span>
            </span>
          ) : (
            <span className={`flex items-center gap-0.5 text-slate-300 hover:text-indigo-400 transition ${small ? 'text-[10px]' : 'text-xs'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </span>
          )}
        </button>

        {assigneeOpen && (
          <div className="absolute top-7 left-0 z-30 bg-white border border-slate-200 rounded-xl shadow-xl py-1.5 min-w-[220px]">
            {allMembers.length === 0 ? (
              <p className="px-3 py-2 text-xs text-slate-400">Niciun coleg invitat pe acest proiect.</p>
            ) : (
              <>
                {task.assignee_email && (
                  <button
                    type="button"
                    onClick={() => { onUpdate(task.id, { assignee_email: null }); setAssigneeOpen(false) }}
                    className="w-full text-left px-3 py-1.5 text-xs text-slate-500 hover:bg-gray-50 transition"
                  >
                    — Fără asignare
                  </button>
                )}
                {allMembers.map(m => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => { onUpdate(task.id, { assignee_email: m.invited_email }); setAssigneeOpen(false) }}
                    className={`w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 hover:bg-gray-50 transition ${task.assignee_email === m.invited_email ? 'text-black font-medium bg-[#acff55]/10' : 'text-slate-700'}`}
                  >
                    <span className={`w-5 h-5 rounded-full ${avatarColor(m.invited_email)} flex items-center justify-center shrink-0`}>
                      <span className="text-[9px] font-bold text-white">{memberInitials(m.invited_email)}</span>
                    </span>
                    <span className="truncate flex-1">{m.invited_email}</span>
                    {m.status === 'pending' && (
                      <span className="text-[9px] font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full shrink-0">
                        invitat
                      </span>
                    )}
                    {task.assignee_email === m.invited_email && (
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 shrink-0 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                ))}
              </>
            )}
          </div>
        )}
      </div>

      {/* Deadline picker */}
      <div ref={deadlineRef} className="relative">
        <button
          type="button"
          onClick={() => { setDeadlineOpen(v => !v); setAssigneeOpen(false) }}
          className={`flex items-center gap-0.5 ${dlColor} hover:opacity-80 transition ${small ? 'text-[10px]' : 'text-xs'}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          {deadlineLabel ?? <span className="text-slate-300">deadline</span>}
        </button>

        {deadlineOpen && (
          <div className="absolute top-7 left-0 z-30 bg-white border border-slate-200 rounded-xl shadow-xl p-3">
            <input
              type="date"
              defaultValue={task.deadline ?? ''}
              onChange={e => { onUpdate(task.id, { deadline: e.target.value || null }); setDeadlineOpen(false) }}
              className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:border-[#acff55]"
            />
            {task.deadline && (
              <button
                type="button"
                onClick={() => { onUpdate(task.id, { deadline: null }); setDeadlineOpen(false) }}
                className="block mt-2 text-xs text-slate-400 hover:text-red-500 transition"
              >
                Șterge deadline
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── AddTaskForm ────────────────────────────────────────────── */

function AddTaskForm({
  placeholder,
  members,
  onAdd,
  onCancel,
  buttonLabel,
  compact,
}: {
  placeholder: string
  members: ProjectMember[]
  onAdd: (title: string, assignee: string | null, deadline: string | null) => void
  onCancel?: () => void
  buttonLabel: string
  compact: boolean
}) {
  const [title, setTitle] = useState('')
  const [assignee, setAssignee] = useState<string>('')
  const [deadline, setDeadline] = useState<string>('')
  const [showExtra, setShowExtra] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const availableMembers = members.filter(m => m.status !== 'declined')

  function submit() {
    const t = title.trim()
    if (!t) return
    onAdd(t, assignee || null, deadline || null)
    setTitle('')
    setAssignee('')
    setDeadline('')
    setShowExtra(false)
    inputRef.current?.focus()
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') submit()
            if (e.key === 'Escape' && onCancel) onCancel()
          }}
          placeholder={placeholder}
          className={`flex-1 border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:border-[#acff55] focus:border-transparent bg-white placeholder:text-slate-300 transition ${compact ? 'text-xs' : 'text-sm'}`}
        />
        {/* Extra options toggle */}
        <button
          type="button"
          onClick={() => setShowExtra(v => !v)}
          className={`px-2.5 py-2 rounded-lg border border-slate-200 text-slate-400 hover:text-indigo-500 hover:border-indigo-300 transition ${showExtra ? 'bg-indigo-50 border-indigo-300 text-indigo-500' : ''}`}
          title="Asignare & deadline"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={!title.trim()}
          className={`px-3.5 py-2 rounded-full bg-[#acff55] hover:bg-[#9fee44] text-black font-bold disabled:opacity-40 disabled:cursor-not-allowed transition ${compact ? 'text-xs' : 'text-sm'}`}
        >
          {buttonLabel}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="text-xs text-slate-400 hover:text-slate-600 transition">
            Anulează
          </button>
        )}
      </div>

      {/* Assignee + deadline row */}
      {showExtra && (
        <div className="flex items-center gap-2 pl-1">
          {availableMembers.length > 0 && (
            <select
              value={assignee}
              onChange={e => setAssignee(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:border-[#acff55] bg-white text-slate-700"
            >
              <option value="">👤 Asignează</option>
              {availableMembers.map(m => (
                <option key={m.id} value={m.invited_email}>
                  {m.invited_email}{m.status === 'pending' ? ' (invitat)' : ''}
                </option>
              ))}
            </select>
          )}
          <input
            type="date"
            value={deadline}
            onChange={e => setDeadline(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:border-[#acff55] bg-white text-slate-700"
          />
        </div>
      )}
    </div>
  )
}
