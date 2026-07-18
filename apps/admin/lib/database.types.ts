// 어드민 DB 타입 (최소). admin_users + 관제 RPC. 전체 generated types 는 필요 시 JIT 확장.
// 소스: supabase/migrations/20260713060000_admin_users.sql, 20260713070000_get_admin_overview.sql
export type AdminRole = 'master' | 'sub_master';

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      admin_users: {
        Row: {
          user_id: string;
          role: AdminRole;
          invited_by: string | null;
          created_at: string;
        };
        Insert: {
          user_id: string;
          role: AdminRole;
          invited_by?: string | null;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          role?: AdminRole;
          invited_by?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      get_admin_overview: {
        Args: Record<string, never>;
        Returns: Json;
      };
      get_pipeline_status: {
        Args: { p_date?: string | null };
        Returns: Json;
      };
      get_channel_processing: {
        Args: Record<string, never>;
        Returns: Json;
      };
      get_cost_breakdown: {
        Args: { p_from?: string | null; p_to?: string | null };
        Returns: Json;
      };
      get_growth_metrics: {
        Args: Record<string, never>;
        Returns: Json;
      };
      get_feedback_events: {
        Args: {
          p_rating?: string | null;
          p_search?: string | null;
          p_from?: string | null;
          p_to?: string | null;
          p_limit?: number;
          p_offset?: number;
        };
        Returns: Json;
      };
      add_glossary_term: {
        Args: {
          p_term_ko: string;
          p_term_en: string;
          p_definition: string;
          p_note: string;
          p_editor: string;
          p_aliases?: string[];
        };
        Returns: string | null;
      };
      save_glossary_term: {
        Args: {
          p_id: string;
          p_term_ko: string;
          p_term_en: string;
          p_definition: string;
          p_note: string;
          p_editor: string;
          p_aliases?: string[];
        };
        Returns: string;
      };
      import_glossary_csv: {
        Args: { p_rows: Json; p_editor: string };
        Returns: Json;
      };
      set_glossary_disabled: {
        Args: { p_id: string; p_disabled: boolean; p_editor: string };
        Returns: string;
      };
      delete_glossary_term: {
        Args: { p_id: string; p_editor: string };
        Returns: string;
      };
      get_glossary: {
        Args: {
          p_source?: string | null;
          p_status?: string | null;
          p_search?: string | null;
          p_limit?: number;
          p_offset?: number;
        };
        Returns: Json;
      };
      get_glossary_history: {
        Args: { p_term_id: string };
        Returns: Json;
      };
      get_glossary_sources: {
        Args: { p_term_id: string; p_limit?: number };
        Returns: Json;
      };
      get_term_corrections: {
        Args: {
          p_search?: string | null;
          p_method?: string | null;
          p_form?: string | null;
          p_limit?: number;
          p_offset?: number;
        };
        Returns: Json;
      };
      save_term_correction: {
        Args: {
          p_id: string;
          p_corrected: string;
          p_form: string;
          p_memo: string | null;
          p_editor: string | null;
        };
        Returns: string;
      };
      get_video_content: {
        Args: { p_video_id: string };
        Returns: Json;
      };
      get_incident_log: {
        Args: { p_days?: number };
        Returns: Json;
      };
      get_membership_history: {
        Args: {
          p_status?: string | null;
          p_search?: string | null;
          p_limit?: number;
          p_offset?: number;
        };
        Returns: Json;
      };
      get_ops_data: {
        Args: { p_digest_limit?: number };
        Returns: Json;
      };
      get_send_history: {
        Args: {
          p_slot?: string | null;
          p_status?: string | null;
          p_search?: string | null;
          p_from?: string | null;
          p_to?: string | null;
          p_limit?: number;
          p_offset?: number;
        };
        Returns: Json;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
