-- ============================================================
-- LIMEEO — Migrare 004: Access policies pentru membrii echipei
-- Rulează în Supabase Dashboard → SQL Editor
-- ============================================================

-- Membrii acceptați pot vedea proiectele la care sunt invitați
CREATE POLICY "Project members can view projects"
  ON public.projects FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = projects.id
        AND pm.member_user_id = auth.uid()
        AND pm.status = 'accepted'
    )
  );

-- Membrii acceptați pot vedea clienții proiectelor lor
CREATE POLICY "Project members can view clients"
  ON public.clients FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      JOIN public.project_members pm ON pm.project_id = p.id
      WHERE p.client_id = clients.id
        AND pm.member_user_id = auth.uid()
        AND pm.status = 'accepted'
    )
  );

-- Membrii acceptați pot vedea task-urile proiectelor lor
CREATE POLICY "Project members can view tasks"
  ON public.project_tasks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = project_tasks.project_id
        AND pm.member_user_id = auth.uid()
        AND pm.status = 'accepted'
    )
  );

-- Orice utilizator autentificat poate vedea profilurile (doar name/company)
-- Necesar pentru a afișa numele proprietarului de proiect în secțiunea "Echipe din care fac parte"
DROP POLICY IF EXISTS "Utilizatorii îsi pot vedea propriul profil" ON public.profiles;
CREATE POLICY "Authenticated users can view profiles"
  ON public.profiles FOR SELECT
  USING (auth.role() = 'authenticated');
