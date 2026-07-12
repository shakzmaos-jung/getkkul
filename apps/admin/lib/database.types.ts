// 어드민 DB 타입 (최소). M1 범위는 admin_users 만 조회하므로 최소 타입만 둔다.
// 전체 generated types 는 M2 관제 RPC 도입 시 JIT 생성(전략 A: skeleton-first).
// 소스 스키마: supabase/migrations/20260713060000_admin_users.sql
export type AdminRole = 'master' | 'sub_master';

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
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
