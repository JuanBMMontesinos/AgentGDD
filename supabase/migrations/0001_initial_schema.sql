-- 0001_initial_schema.sql
-- Core schema for AgentGDD: templates, projects, sections, structured entities,
-- version snapshots, quality audit reports, comments, and generation jobs.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.schema_migrations (
  version TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.gdd_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  genre_primary TEXT NOT NULL,
  genre_secondary TEXT,
  description TEXT NOT NULL,
  default_brief JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.gdd_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  version_label TEXT NOT NULL DEFAULT 'v1.0',
  status TEXT NOT NULL DEFAULT 'Pré-Produção',
  studio_name TEXT NOT NULL DEFAULT 'Estúdio Independente',
  language TEXT NOT NULL DEFAULT 'pt-BR' CHECK (language IN ('pt-BR', 'en-US', 'es')),
  depth_mode TEXT NOT NULL DEFAULT 'full' CHECK (depth_mode IN ('mvp', 'full')),
  concept_brief JSONB NOT NULL DEFAULT '{}'::jsonb,
  technical_warnings JSONB NOT NULL DEFAULT '[]'::jsonb,
  completeness_score INT NOT NULL DEFAULT 0 CHECK (completeness_score >= 0 AND completeness_score <= 100),
  is_public BOOLEAN NOT NULL DEFAULT false,
  share_slug TEXT UNIQUE,
  template_id UUID REFERENCES public.gdd_templates(id) ON DELETE SET NULL,
  moodboard_image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.gdd_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.gdd_projects(id) ON DELETE CASCADE,
  section_number INT NOT NULL CHECK (section_number >= 1 AND section_number <= 15),
  section_key TEXT NOT NULL,
  title TEXT NOT NULL,
  content_markdown TEXT NOT NULL DEFAULT '',
  structured_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  review_status TEXT NOT NULL DEFAULT 'draft' CHECK (review_status IN ('draft', 'in_review', 'approved')),
  word_count INT NOT NULL DEFAULT 0,
  is_optional BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, section_number)
);

CREATE TABLE IF NOT EXISTS public.gdd_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.gdd_projects(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (
    entity_type IN (
      'enemy',
      'boss',
      'equipment',
      'skill',
      'color_swatch',
      'roadmap_phase',
      'risk_item',
      'asset_estimate'
    )
  ),
  name TEXT NOT NULL,
  attributes JSONB NOT NULL DEFAULT '{}'::jsonb,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.gdd_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.gdd_projects(id) ON DELETE CASCADE,
  version_label TEXT NOT NULL,
  changelog_note TEXT NOT NULL DEFAULT '',
  snapshot JSONB NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.gdd_audit_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.gdd_projects(id) ON DELETE CASCADE,
  overall_score INT NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
  checklist_results JSONB NOT NULL DEFAULT '[]'::jsonb,
  conflicts_detected JSONB NOT NULL DEFAULT '[]'::jsonb,
  recommendations JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.gdd_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.gdd_projects(id) ON DELETE CASCADE,
  section_number INT NOT NULL CHECK (section_number >= 1 AND section_number <= 15),
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name TEXT NOT NULL,
  body TEXT NOT NULL,
  resolved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.gdd_generation_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.gdd_projects(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'completed', 'failed')),
  current_step INT NOT NULL DEFAULT 0,
  total_steps INT NOT NULL DEFAULT 5,
  step_label TEXT NOT NULL DEFAULT '',
  model_used TEXT NOT NULL DEFAULT 'gemini-3.8-flash',
  last_interaction_id TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
