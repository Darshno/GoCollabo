export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type Table<Row, Insert = Partial<Row>, Update = Partial<Insert>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type AccountType = "creator" | "brand";
export type BriefStatus = "draft" | "published" | "closed";
export type CollaborationStatus = "sent" | "accepted" | "declined";

export type ProfileRow = {
  id: string;
  account_type: AccountType;
  display_name: string | null;
  created_at: string;
  updated_at: string;
};

export type CreatorProfileRow = {
  id: number;
  user_id: string;
  slug: string;
  name: string;
  headline: string;
  bio: string;
  location: string;
  work_mode: "remote" | "hybrid" | "on-site";
  skills: string;
  tools: string;
  content_types: string;
  styles: string;
  experience: string;
  rates: string | null;
  formats: string;
  workflow: string;
  verification_status: "self-reported" | "not-verified";
  availability: "available" | "selective" | "unavailable";
  published: boolean;
  created_at: string;
  updated_at: string;
};

export type PortfolioProjectRow = {
  id: number;
  creator_id: number;
  title: string;
  description: string;
  content_type: string;
  tools: string;
  skills: string;
  role: string;
  challenge: string;
  approach: string;
  outcomes: string;
  impact_summary: string;
  media_path: string | null;
  media_name: string | null;
  media_type: string | null;
  media_size: number | null;
  is_concept: boolean;
  published: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type BriefRow = {
  id: number;
  brand_id: string;
  title: string;
  objective: string;
  content_type: string;
  style: string;
  audience: string;
  platform: string;
  duration: string;
  aspect_ratio: string;
  deliverables: number;
  budget: string;
  deadline: string;
  location: string;
  work_mode: "remote" | "hybrid" | "on-site";
  licensing: string;
  status: BriefStatus;
  created_at: string;
  updated_at: string;
};

export type SavedCreatorRow = {
  id: number;
  brand_id: string;
  creator_id: number;
  created_at: string;
};

export type CollaborationRequestRow = {
  id: number;
  brief_id: number;
  brand_id: string;
  creator_id: number;
  message: string;
  status: CollaborationStatus;
  created_at: string;
  updated_at: string;
};

export type ProjectStatus = "active" | "in_review" | "completed";
export type TaskStatus = "todo" | "in_progress" | "done";
export type TaskPriority = "high" | "medium" | "low";
export type TaskSource = "brief" | "manual" | "ai_copilot";
export type DeliverableStatus = "pending_review" | "changes_requested" | "approved";

export type ProjectRow = {
  id: number;
  request_id: number;
  brief_id: number;
  brand_id: string;
  creator_id: number;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
};

export type ProjectTaskRow = {
  id: string;
  project_id: number;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  deadline: string | null;
  source: TaskSource;
  created_at: string;
  updated_at: string;
};

export type ProjectDeliverableRow = {
  id: string;
  project_id: number;
  version: number;
  title: string;
  notes: string;
  asset_url: string | null;
  status: DeliverableStatus;
  feedback: string | null;
  submitted_at: string;
  reviewed_at: string | null;
};

export interface Database {
  public: {
    Tables: {
      profiles: Table<ProfileRow, Pick<ProfileRow, "id"> & Partial<Omit<ProfileRow, "id">>>;
      creator_profiles: Table<CreatorProfileRow>;
      portfolio_projects: Table<PortfolioProjectRow>;
      briefs: Table<BriefRow>;
      saved_creators: Table<SavedCreatorRow>;
      collaboration_requests: Table<CollaborationRequestRow>;
      projects: Table<ProjectRow>;
      project_tasks: Table<ProjectTaskRow>;
      project_deliverables: Table<ProjectDeliverableRow>;
    };
    Views: Record<string, never>;
    Functions: {
      reorder_portfolio_projects: {
        Args: { project_ids: number[] };
        Returns: boolean;
      };
      create_project_with_tasks: {
        Args: {
          p_request_id: number;
          p_brief_id: number;
          p_brand_id: string;
          p_creator_id: number;
          p_tasks: Array<{
            id: string;
            title: string;
            description: string;
            status: string;
            priority: string;
            deadline: string | null;
            source: string;
          }>;
        };
        Returns: number;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
