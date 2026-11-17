-- 0002_indexes_triggers_rls.sql
-- Indexes, updated_at triggers, and Row Level Security policies for AgentGDD.

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_gdd_projects_updated_at ON public.gdd_projects;
CREATE TRIGGER trg_gdd_projects_updated_at
  BEFORE UPDATE ON public.gdd_projects
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_gdd_sections_updated_at ON public.gdd_sections;
CREATE TRIGGER trg_gdd_sections_updated_at
  BEFORE UPDATE ON public.gdd_sections
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_gdd_entities_updated_at ON public.gdd_entities;
CREATE TRIGGER trg_gdd_entities_updated_at
  BEFORE UPDATE ON public.gdd_entities
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_gdd_generation_jobs_updated_at ON public.gdd_generation_jobs;
CREATE TRIGGER trg_gdd_generation_jobs_updated_at
  BEFORE UPDATE ON public.gdd_generation_jobs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_gdd_projects_owner_updated ON public.gdd_projects (owner_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_gdd_projects_share_slug ON public.gdd_projects (share_slug) WHERE share_slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_gdd_projects_brief_gin ON public.gdd_projects USING GIN (concept_brief);
CREATE INDEX IF NOT EXISTS idx_gdd_sections_project_num ON public.gdd_sections (project_id, section_number);
CREATE INDEX IF NOT EXISTS idx_gdd_entities_project_type ON public.gdd_entities (project_id, entity_type, sort_order);
CREATE INDEX IF NOT EXISTS idx_gdd_versions_project_created ON public.gdd_versions (project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gdd_audits_project_created ON public.gdd_audit_reports (project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gdd_comments_project_section ON public.gdd_comments (project_id, section_number);
CREATE INDEX IF NOT EXISTS idx_gdd_jobs_project_created ON public.gdd_generation_jobs (project_id, created_at DESC);

-- Enable Row Level Security on all tables
ALTER TABLE public.schema_migrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gdd_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gdd_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gdd_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gdd_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gdd_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gdd_audit_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gdd_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gdd_generation_jobs ENABLE ROW LEVEL SECURITY;

-- gdd_templates: readable by authenticated and anon users
DROP POLICY IF EXISTS "Templates are readable by all" ON public.gdd_templates;
CREATE POLICY "Templates are readable by all"
  ON public.gdd_templates
  FOR SELECT
  USING (true);

-- gdd_projects: owner CRUD + public read when is_public = true
DROP POLICY IF EXISTS "Projects readable by owner or public share" ON public.gdd_projects;
CREATE POLICY "Projects readable by owner or public share"
  ON public.gdd_projects
  FOR SELECT
  USING (auth.uid() = owner_id OR is_public = true);

DROP POLICY IF EXISTS "Projects insertable by owner" ON public.gdd_projects;
CREATE POLICY "Projects insertable by owner"
  ON public.gdd_projects
  FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Projects updatable by owner" ON public.gdd_projects;
CREATE POLICY "Projects updatable by owner"
  ON public.gdd_projects
  FOR UPDATE
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Projects deletable by owner" ON public.gdd_projects;
CREATE POLICY "Projects deletable by owner"
  ON public.gdd_projects
  FOR DELETE
  USING (auth.uid() = owner_id);

-- gdd_sections: inherited ownership/public visibility
DROP POLICY IF EXISTS "Sections readable by owner or public share" ON public.gdd_sections;
CREATE POLICY "Sections readable by owner or public share"
  ON public.gdd_sections
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.gdd_projects p
      WHERE p.id = project_id AND (p.owner_id = auth.uid() OR p.is_public = true)
    )
  );

DROP POLICY IF EXISTS "Sections writable by owner" ON public.gdd_sections;
CREATE POLICY "Sections writable by owner"
  ON public.gdd_sections
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.gdd_projects p
      WHERE p.id = project_id AND p.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.gdd_projects p
      WHERE p.id = project_id AND p.owner_id = auth.uid()
    )
  );

-- gdd_entities: inherited ownership/public visibility
DROP POLICY IF EXISTS "Entities readable by owner or public share" ON public.gdd_entities;
CREATE POLICY "Entities readable by owner or public share"
  ON public.gdd_entities
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.gdd_projects p
      WHERE p.id = project_id AND (p.owner_id = auth.uid() OR p.is_public = true)
    )
  );

DROP POLICY IF EXISTS "Entities writable by owner" ON public.gdd_entities;
CREATE POLICY "Entities writable by owner"
  ON public.gdd_entities
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.gdd_projects p
      WHERE p.id = project_id AND p.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.gdd_projects p
      WHERE p.id = project_id AND p.owner_id = auth.uid()
    )
  );

-- gdd_versions: inherited ownership/public visibility
DROP POLICY IF EXISTS "Versions readable by owner or public share" ON public.gdd_versions;
CREATE POLICY "Versions readable by owner or public share"
  ON public.gdd_versions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.gdd_projects p
      WHERE p.id = project_id AND (p.owner_id = auth.uid() OR p.is_public = true)
    )
  );

DROP POLICY IF EXISTS "Versions writable by owner" ON public.gdd_versions;
CREATE POLICY "Versions writable by owner"
  ON public.gdd_versions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.gdd_projects p
      WHERE p.id = project_id AND p.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.gdd_projects p
      WHERE p.id = project_id AND p.owner_id = auth.uid()
    )
  );

-- gdd_audit_reports: inherited ownership/public visibility
DROP POLICY IF EXISTS "Audit reports readable by owner or public share" ON public.gdd_audit_reports;
CREATE POLICY "Audit reports readable by owner or public share"
  ON public.gdd_audit_reports
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.gdd_projects p
      WHERE p.id = project_id AND (p.owner_id = auth.uid() OR p.is_public = true)
    )
  );

DROP POLICY IF EXISTS "Audit reports writable by owner" ON public.gdd_audit_reports;
CREATE POLICY "Audit reports writable by owner"
  ON public.gdd_audit_reports
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.gdd_projects p
      WHERE p.id = project_id AND p.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.gdd_projects p
      WHERE p.id = project_id AND p.owner_id = auth.uid()
    )
  );

-- gdd_comments: readable by owner or public share, writable by owner
DROP POLICY IF EXISTS "Comments readable by owner or public share" ON public.gdd_comments;
CREATE POLICY "Comments readable by owner or public share"
  ON public.gdd_comments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.gdd_projects p
      WHERE p.id = project_id AND (p.owner_id = auth.uid() OR p.is_public = true)
    )
  );

DROP POLICY IF EXISTS "Comments writable by owner" ON public.gdd_comments;
CREATE POLICY "Comments writable by owner"
  ON public.gdd_comments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.gdd_projects p
      WHERE p.id = project_id AND p.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.gdd_projects p
      WHERE p.id = project_id AND p.owner_id = auth.uid()
    )
  );

-- gdd_generation_jobs: strictly owner only
DROP POLICY IF EXISTS "Generation jobs owner only" ON public.gdd_generation_jobs;
CREATE POLICY "Generation jobs owner only"
  ON public.gdd_generation_jobs
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.gdd_projects p
      WHERE p.id = project_id AND p.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.gdd_projects p
      WHERE p.id = project_id AND p.owner_id = auth.uid()
    )
  );
