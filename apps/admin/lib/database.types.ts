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
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
