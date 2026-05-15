-- project_expenses table
CREATE TABLE IF NOT EXISTS public.project_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT current_date,
  category text NOT NULL DEFAULT 'other' CHECK (category IN ('labor','materials','software','travel','marketing','equipment','other')),
  description text NOT NULL,
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'RON',
  payment_method text DEFAULT 'card' CHECK (payment_method IN ('card','cash','transfer','other')),
  vendor text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT NOW()
);

ALTER TABLE public.project_expenses ENABLE ROW LEVEL SECURITY;

-- Owner can do everything
CREATE POLICY "Owner manages project expenses"
  ON public.project_expenses FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_expenses.project_id AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_expenses.project_id AND p.user_id = auth.uid()
    )
  );

-- Members can view expenses
CREATE POLICY "Project members can view expenses"
  ON public.project_expenses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = project_expenses.project_id
        AND pm.member_user_id = auth.uid()
        AND pm.status = 'accepted'
    )
  );

-- Editors and managers can add expenses
CREATE POLICY "Editors can add expenses"
  ON public.project_expenses FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = project_expenses.project_id
        AND pm.member_user_id = auth.uid()
        AND pm.status = 'accepted'
        AND pm.role IN ('editor', 'manager')
    )
  );

-- Users can delete their own expenses (editors)
CREATE POLICY "Users can delete own expenses"
  ON public.project_expenses FOR DELETE
  USING (user_id = auth.uid());

-- Alter project_members role check to include manager
ALTER TABLE public.project_members DROP CONSTRAINT IF EXISTS project_members_role_check;
ALTER TABLE public.project_members ADD CONSTRAINT project_members_role_check
  CHECK (role IN ('viewer', 'editor', 'manager'));

CREATE INDEX IF NOT EXISTS idx_project_expenses_project ON public.project_expenses(project_id);
CREATE INDEX IF NOT EXISTS idx_project_expenses_date ON public.project_expenses(date DESC);
