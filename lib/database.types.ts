export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      abuse_guard: {
        Row: {
          created_at: string
          device_fingerprints: string[]
          email_hash: string
          id: string
          payment_fingerprints: string[]
          rewarded_before: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          device_fingerprints?: string[]
          email_hash: string
          id?: string
          payment_fingerprints?: string[]
          rewarded_before?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          device_fingerprints?: string[]
          email_hash?: string
          id?: string
          payment_fingerprints?: string[]
          rewarded_before?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      credit_grants: {
        Row: {
          amount: number
          expires_at: string
          granted_at: string
          id: string
          remaining_amount: number
          source_referral_id: string | null
          source_type: Database["public"]["Enums"]["credit_source"]
          status: Database["public"]["Enums"]["credit_grant_status"]
          user_id: string
        }
        Insert: {
          amount: number
          expires_at: string
          granted_at?: string
          id?: string
          remaining_amount: number
          source_referral_id?: string | null
          source_type: Database["public"]["Enums"]["credit_source"]
          status?: Database["public"]["Enums"]["credit_grant_status"]
          user_id: string
        }
        Update: {
          amount?: number
          expires_at?: string
          granted_at?: string
          id?: string
          remaining_amount?: number
          source_referral_id?: string | null
          source_type?: Database["public"]["Enums"]["credit_source"]
          status?: Database["public"]["Enums"]["credit_grant_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_grants_source_referral_id_fkey"
            columns: ["source_referral_id"]
            isOneToOne: false
            referencedRelation: "referrals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_grants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_transactions: {
        Row: {
          created_at: string
          delta: number
          grant_id: string | null
          id: string
          kind: Database["public"]["Enums"]["credit_txn_kind"]
          memo: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          delta: number
          grant_id?: string | null
          id?: string
          kind: Database["public"]["Enums"]["credit_txn_kind"]
          memo?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          delta?: number
          grant_id?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["credit_txn_kind"]
          memo?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_transactions_grant_id_fkey"
            columns: ["grant_id"]
            isOneToOne: false
            referencedRelation: "credit_grants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      deliveries: {
        Row: {
          channel: Database["public"]["Enums"]["delivery_channel"]
          created_at: string
          id: string
          sent_at: string | null
          slot: Database["public"]["Enums"]["delivery_slot"]
          status: Database["public"]["Enums"]["delivery_status"]
          user_id: string
          video_id: string
        }
        Insert: {
          channel?: Database["public"]["Enums"]["delivery_channel"]
          created_at?: string
          id?: string
          sent_at?: string | null
          slot: Database["public"]["Enums"]["delivery_slot"]
          status?: Database["public"]["Enums"]["delivery_status"]
          user_id: string
          video_id: string
        }
        Update: {
          channel?: Database["public"]["Enums"]["delivery_channel"]
          created_at?: string
          id?: string
          sent_at?: string | null
          slot?: Database["public"]["Enums"]["delivery_slot"]
          status?: Database["public"]["Enums"]["delivery_status"]
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deliveries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliveries_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_codes: {
        Row: {
          code: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_codes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_program: {
        Row: {
          active: boolean
          budget_cap: number
          id: number
          payment_usage_ratio: number
          per_user_cap: number
          reward_amount: number
          total_issued: number
          validity_years: number
        }
        Insert: {
          active?: boolean
          budget_cap?: number
          id?: number
          payment_usage_ratio?: number
          per_user_cap?: number
          reward_amount?: number
          total_issued?: number
          validity_years?: number
        }
        Update: {
          active?: boolean
          budget_cap?: number
          id?: number
          payment_usage_ratio?: number
          per_user_cap?: number
          reward_amount?: number
          total_issued?: number
          validity_years?: number
        }
        Relationships: []
      }
      referrals: {
        Row: {
          activated_at: string | null
          code: string
          created_at: string
          id: string
          referee_email_hash: string | null
          referee_user_id: string
          referrer_user_id: string
          status: Database["public"]["Enums"]["referral_status"]
        }
        Insert: {
          activated_at?: string | null
          code: string
          created_at?: string
          id?: string
          referee_email_hash?: string | null
          referee_user_id: string
          referrer_user_id: string
          status?: Database["public"]["Enums"]["referral_status"]
        }
        Update: {
          activated_at?: string | null
          code?: string
          created_at?: string
          id?: string
          referee_email_hash?: string | null
          referee_user_id?: string
          referrer_user_id?: string
          status?: Database["public"]["Enums"]["referral_status"]
        }
        Relationships: [
          {
            foreignKeyName: "referrals_referee_user_id_fkey"
            columns: ["referee_user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_user_id_fkey"
            columns: ["referrer_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          active_since: string | null
          channel_handle: string | null
          channel_id: string
          channel_thumbnail: string | null
          channel_title: string | null
          channel_url: string | null
          created_at: string
          id: string
          paused: boolean
          user_id: string
        }
        Insert: {
          active_since?: string | null
          channel_handle?: string | null
          channel_id: string
          channel_thumbnail?: string | null
          channel_title?: string | null
          channel_url?: string | null
          created_at?: string
          id?: string
          paused?: boolean
          user_id: string
        }
        Update: {
          active_since?: string | null
          channel_handle?: string | null
          channel_id?: string
          channel_thumbnail?: string | null
          channel_title?: string | null
          channel_url?: string | null
          created_at?: string
          id?: string
          paused?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      summaries: {
        Row: {
          body: Json | null
          core_text: string | null
          created_at: string
          headline: string | null
          id: string
          language: Database["public"]["Enums"]["summary_language"]
          length_mode: Database["public"]["Enums"]["summary_length"]
          video_id: string
        }
        Insert: {
          body?: Json | null
          core_text?: string | null
          created_at?: string
          headline?: string | null
          id?: string
          language?: Database["public"]["Enums"]["summary_language"]
          length_mode: Database["public"]["Enums"]["summary_length"]
          video_id: string
        }
        Update: {
          body?: Json | null
          core_text?: string | null
          created_at?: string
          headline?: string | null
          id?: string
          language?: Database["public"]["Enums"]["summary_language"]
          length_mode?: Database["public"]["Enums"]["summary_length"]
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "summaries_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      user_settings: {
        Row: {
          delivery_email: string | null
          delivery_slots: Database["public"]["Enums"]["delivery_slot"][]
          exclude_over_2h: boolean
          otp_expires_at: string | null
          otp_hash: string | null
          pending_email: string | null
          push_slot_0730: boolean
          push_slot_1130: boolean
          push_slot_1730: boolean
          skip_empty_email: boolean
          skip_empty_push: boolean
          summary_length: Database["public"]["Enums"]["summary_length"]
          user_id: string
        }
        Insert: {
          delivery_email?: string | null
          delivery_slots?: Database["public"]["Enums"]["delivery_slot"][]
          exclude_over_2h?: boolean
          otp_expires_at?: string | null
          otp_hash?: string | null
          pending_email?: string | null
          push_slot_0730?: boolean
          push_slot_1130?: boolean
          push_slot_1730?: boolean
          skip_empty_email?: boolean
          skip_empty_push?: boolean
          summary_length?: Database["public"]["Enums"]["summary_length"]
          user_id: string
        }
        Update: {
          delivery_email?: string | null
          delivery_slots?: Database["public"]["Enums"]["delivery_slot"][]
          exclude_over_2h?: boolean
          otp_expires_at?: string | null
          otp_hash?: string | null
          pending_email?: string | null
          push_slot_0730?: boolean
          push_slot_1130?: boolean
          push_slot_1730?: boolean
          skip_empty_email?: boolean
          skip_empty_push?: boolean
          summary_length?: Database["public"]["Enums"]["summary_length"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_video_prefs: {
        Row: {
          length_mode: Database["public"]["Enums"]["summary_length"]
          updated_at: string
          user_id: string
          video_id: string
        }
        Insert: {
          length_mode: Database["public"]["Enums"]["summary_length"]
          updated_at?: string
          user_id: string
          video_id: string
        }
        Update: {
          length_mode?: Database["public"]["Enums"]["summary_length"]
          updated_at?: string
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_video_prefs_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      videos: {
        Row: {
          channel_id: string
          created_at: string
          duration_seconds: number | null
          id: string
          published_at: string | null
          status: Database["public"]["Enums"]["video_status"]
          title: string | null
          transcript: string | null
          transcript_source: Database["public"]["Enums"]["transcript_source"]
          url: string | null
          video_id: string
        }
        Insert: {
          channel_id: string
          created_at?: string
          duration_seconds?: number | null
          id?: string
          published_at?: string | null
          status?: Database["public"]["Enums"]["video_status"]
          title?: string | null
          transcript?: string | null
          transcript_source?: Database["public"]["Enums"]["transcript_source"]
          url?: string | null
          video_id: string
        }
        Update: {
          channel_id?: string
          created_at?: string
          duration_seconds?: number | null
          id?: string
          published_at?: string | null
          status?: Database["public"]["Enums"]["video_status"]
          title?: string | null
          transcript?: string | null
          transcript_source?: Database["public"]["Enums"]["transcript_source"]
          url?: string | null
          video_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      activate_and_award: {
        Args: { p_referee: string }
        Returns: {
          award_amount: number
          award_source: Database["public"]["Enums"]["credit_source"]
          award_user_id: string
        }[]
      }
      expire_credits: { Args: never; Returns: number }
      forfeit_user_credits: { Args: { p_user: string }; Returns: number }
      get_referral_progress: {
        Args: never
        Returns: {
          activated_at: string | null
          channel_count: number
          created_at: string
          referral_id: string
          status: Database["public"]["Enums"]["referral_status"]
          summary_count: number
        }[]
      }
      use_credits: {
        Args: { p_payment_amount: number; p_user: string }
        Returns: number
      }
    }
    Enums: {
      credit_grant_status: "active" | "exhausted" | "expired" | "forfeited"
      credit_source: "referrer" | "referee"
      credit_txn_kind: "grant" | "usage" | "expiry" | "forfeit"
      delivery_channel: "email" | "push"
      delivery_slot: "0730" | "1130" | "1730"
      delivery_status: "pending" | "sent" | "failed"
      referral_status: "pending" | "activated" | "void"
      summary_language: "ko" | "en"
      summary_length: "short" | "normal" | "long"
      transcript_source: "caption" | "audio" | "none"
      video_status: "pending" | "processing" | "done" | "failed"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      credit_grant_status: ["active", "exhausted", "expired", "forfeited"],
      credit_source: ["referrer", "referee"],
      credit_txn_kind: ["grant", "usage", "expiry", "forfeit"],
      delivery_channel: ["email", "push"],
      delivery_slot: ["0730", "1130", "1730"],
      delivery_status: ["pending", "sent", "failed"],
      referral_status: ["pending", "activated", "void"],
      summary_language: ["ko", "en"],
      summary_length: ["short", "normal", "long"],
      transcript_source: ["caption", "audio", "none"],
      video_status: ["pending", "processing", "done", "failed"],
    },
  },
} as const
