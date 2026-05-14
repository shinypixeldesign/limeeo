'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createTaskAction(
  projectId: string,
  title: string,
  parentTaskId?: string | null,
  assigneeEmail?: string | null,
  deadline?: string | null,
): Promise<{ id: string; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { id: '', error: 'Neautorizat.' }

  // poziție = numărul de taskuri existente la același nivel
  const { count } = await supabase
    .from('project_tasks')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', projectId)
    .is('parent_task_id', parentTaskId ?? null)

  const { data, error } = await supabase
    .from('project_tasks')
    .insert({
      project_id: projectId,
      user_id: user.id,
      title: title.trim(),
      position: (count ?? 0),
      parent_task_id: parentTaskId ?? null,
      assignee_email: assigneeEmail ?? null,
      deadline: deadline ?? null,
    })
    .select('id')
    .single()

  if (error || !data) return { id: '', error: error?.message }

  revalidatePath(`/projects/${projectId}`)
  return { id: data.id }
}

export async function toggleTaskAction(taskId: string, projectId: string, completed: boolean): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await supabase
    .from('project_tasks')
    .update({
      is_completed: completed,
      completed_at: completed ? new Date().toISOString() : null,
    })
    .eq('id', taskId)
    .eq('user_id', user.id)

  revalidatePath(`/projects/${projectId}`)
}

export async function updateTaskAction(
  taskId: string,
  projectId: string,
  fields: { title?: string; assignee_email?: string | null; deadline?: string | null },
): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const update: Record<string, unknown> = {}
  if (fields.title !== undefined) update.title = fields.title.trim()
  if ('assignee_email' in fields) update.assignee_email = fields.assignee_email ?? null
  if ('deadline' in fields) update.deadline = fields.deadline ?? null

  await supabase
    .from('project_tasks')
    .update(update)
    .eq('id', taskId)
    .eq('user_id', user.id)

  revalidatePath(`/projects/${projectId}`)
}

// Kept for backwards compatibility
export async function updateTaskTitleAction(taskId: string, projectId: string, title: string): Promise<void> {
  return updateTaskAction(taskId, projectId, { title })
}

export async function deleteTaskAction(taskId: string, projectId: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  // CASCADE on parent_task_id handles subtasks automatically
  await supabase
    .from('project_tasks')
    .delete()
    .eq('id', taskId)
    .eq('user_id', user.id)

  revalidatePath(`/projects/${projectId}`)
}

export async function reorderTasksAction(projectId: string, orderedIds: string[]): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await Promise.all(
    orderedIds.map((id, position) =>
      supabase
        .from('project_tasks')
        .update({ position })
        .eq('id', id)
        .eq('user_id', user.id)
    )
  )

  revalidatePath(`/projects/${projectId}`)
}
