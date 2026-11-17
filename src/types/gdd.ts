/**
 * Supported output languages for generated Game Design Documents.
 */
export type GddLanguage = 'pt-BR' | 'en-US' | 'es';

/**
 * Depth modes controlling MVP-lean vs Full Studio Bible generation.
 */
export type GddDepthMode = 'mvp' | 'full';

/**
 * Editorial review workflow status per GDD section.
 */
export type GddReviewStatus = 'draft' | 'in_review' | 'approved';

/**
 * Structured game entity categories stored in `gdd_entities`.
 */
export type GddEntityType =
  | 'enemy'
  | 'boss'
  | 'equipment'
  | 'skill'
  | 'color_swatch'
  | 'roadmap_phase'
  | 'risk_item'
  | 'asset_estimate';

/**
 * Guided concept brief submitted by the user or preloaded from a template.
 */
export interface ConceptBrief {
  title: string;
  idea: string;
  genrePrimary?: string;
  genreSecondary?: string;
  engine?: string;
  dimensionality?: string;
  camera?: string;
  platforms?: string[];
  teamSize?: string;
  targetAudience?: string;
  inspirations?: string;
  monetization?: string;
  multiplayer?: boolean;
  studioName?: string;
  targetBudget?: string;
  targetTimeline?: string;
}

/**
 * Feasibility or architectural warning flagged by the conflict detector.
 */
export interface TechnicalWarning {
  code: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  detail: string;
  suggestion: string;
}

/**
 * Canonical section blueprint item.
 */
export interface GddSectionDefinition {
  number: number;
  key: string;
  title: string;
  optional: boolean;
  requiredChecklistId?: string;
  expectedSubsections: string[];
}

/**
 * Persisted GDD section record from `gdd_sections`.
 */
export interface GddSectionRecord {
  id: string;
  project_id: string;
  section_number: number;
  section_key: string;
  title: string;
  content_markdown: string;
  structured_data: Record<string, unknown>;
  review_status: GddReviewStatus;
  word_count: number;
  is_optional: boolean;
  created_at?: string;
  updated_at?: string;
}

/**
 * Persisted structured entity record from `gdd_entities`.
 */
export interface GddEntityRecord {
  id: string;
  project_id: string;
  entity_type: GddEntityType;
  name: string;
  attributes: Record<string, string | number | boolean | null>;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

/**
 * Single checklist validation result produced by the GDD Quality Auditor.
 */
export interface ChecklistItemResult {
  id: string;
  label: string;
  passed: boolean;
  weight: number;
  details: string;
}

/**
 * Output of the automated 12+ point GDD quality & consistency audit.
 */
export interface AuditReportResult {
  overallScore: number;
  checklistResults: ChecklistItemResult[];
  conflictsDetected: TechnicalWarning[];
  recommendations: string[];
  vagueTermsFound: string[];
}

/**
 * Persisted audit record from `gdd_audit_reports`.
 */
export interface GddAuditReportRecord {
  id: string;
  project_id: string;
  overall_score: number;
  checklist_results: ChecklistItemResult[];
  conflicts_detected: TechnicalWarning[];
  recommendations: string[];
  created_at: string;
}

/**
 * Snapshot version record from `gdd_versions`.
 */
export interface GddVersionRecord {
  id: string;
  project_id: string;
  version_label: string;
  changelog_note: string;
  snapshot: {
    version_label: string;
    sections: Array<{
      section_number: number;
      section_key: string;
      title: string;
      content_markdown: string;
      review_status: GddReviewStatus;
    }>;
    entities: Array<{
      entity_type: GddEntityType;
      name: string;
      attributes: Record<string, string | number | boolean | null>;
      sort_order: number;
    }>;
  };
  created_at: string;
}

/**
 * Comment record from `gdd_comments`.
 */
export interface GddCommentRecord {
  id: string;
  project_id: string;
  section_number: number;
  author_id?: string | null;
  author_name: string;
  body: string;
  resolved: boolean;
  created_at: string;
}

/**
 * Template record from `gdd_templates`.
 */
export interface GddTemplateRecord {
  id: string;
  slug: string;
  name: string;
  genre_primary: string;
  genre_secondary: string | null;
  description: string;
  default_brief: ConceptBrief;
  is_featured: boolean;
  sort_order: number;
}

/**
 * Core GDD project record from `gdd_projects`.
 */
export interface GddProjectRecord {
  id: string;
  owner_id: string;
  title: string;
  slug: string;
  version_label: string;
  status: string;
  studio_name: string;
  language: GddLanguage;
  depth_mode: GddDepthMode;
  concept_brief: ConceptBrief;
  technical_warnings: TechnicalWarning[];
  completeness_score: number;
  is_public: boolean;
  share_slug: string | null;
  template_id: string | null;
  moodboard_image_url: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Full hydrated project payload returned by `/api/projects/[id]`.
 */
export interface GddProjectDetail {
  project: GddProjectRecord;
  sections: GddSectionRecord[];
  entities: GddEntityRecord[];
  versions: GddVersionRecord[];
  latestAudit: GddAuditReportRecord | null;
  comments: GddCommentRecord[];
}
