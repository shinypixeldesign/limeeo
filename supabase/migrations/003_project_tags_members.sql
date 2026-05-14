-- ============================================================
-- FREELIO — Migrare 003: Project Tags & Team Members
-- ============================================================

-- Tags array pe proiecte
ALTER TABLE projects ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}';

-- Tabel pentru membrii echipei invitați pe proiecte
CREATE TABLE IF NOT EXISTS project_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invited_email text NOT NULL,
  member_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  role text NOT NULL DEFAULT 'viewer' CHECK (role IN ('viewer', 'editor')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  invite_token text UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  invited_at timestamptz NOT NULL DEFAULT NOW(),
  accepted_at timestamptz,
  UNIQUE(project_id, invited_email)
);

ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner manages project members"
  ON project_members FOR ALL
  USING (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY "Anyone can view invite by token"
  ON project_members FOR SELECT
  USING (true);

CREATE POLICY "Member can update own invite"
  ON project_members FOR UPDATE
  USING (invited_email = (SELECT email FROM auth.users WHERE id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_project_members_token ON project_members(invite_token);
CREATE INDEX IF NOT EXISTS idx_project_members_project ON project_members(project_id);
