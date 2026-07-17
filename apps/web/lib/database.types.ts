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
      admin_users: {
        Row: {
          created_at: string
          invited_by: string | null
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          invited_by?: string | null
          role: string
          user_id: string
        }
        Update: {
          created_at?: string
          invited_by?: string | null
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      billing_history: {
        Row: {
          amount: number
          billing_period: string
          created_at: string
          credit_used: number
          id: string
          idempotency_key: string
          memo: string | null
          plan_code: Database["public"]["Enums"]["membership_plan"]
          status: Database["public"]["Enums"]["billing_status"]
          user_id: string
        }
        Insert: {
          amount?: number
          billing_period: string
          created_at?: string
          credit_used?: number
          id?: string
          idempotency_key: string
          memo?: string | null
          plan_code: Database["public"]["Enums"]["membership_plan"]
          status: Database["public"]["Enums"]["billing_status"]
          user_id: string
        }
        Update: {
          amount?: number
          billing_period?: string
          created_at?: string
          credit_used?: number
          id?: string
          idempotency_key?: string
          memo?: string | null
          plan_code?: Database["public"]["Enums"]["membership_plan"]
          status?: Database["public"]["Enums"]["billing_status"]
          user_id?: string
        }
        Relationships: []
      }
      bookmarks: {
        Row: {
          created_at: string
          id: string
          user_id: string
          video_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
          video_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookmarks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookmarks_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      channel_catalog: {
        Row: {
          channel_id: string
          created_at: string
          handle: string | null
          id: string
          source: Database["public"]["Enums"]["channel_catalog_source"]
          subscriber_hint: string | null
          thumbnail_url: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          channel_id: string
          created_at?: string
          handle?: string | null
          id?: string
          source?: Database["public"]["Enums"]["channel_catalog_source"]
          subscriber_hint?: string | null
          thumbnail_url?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          channel_id?: string
          created_at?: string
          handle?: string | null
          id?: string
          source?: Database["public"]["Enums"]["channel_catalog_source"]
          subscriber_hint?: string | null
          thumbnail_url?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      channel_search_cache: {
        Row: {
          expires_at: string
          fetched_at: string
          id: string
          query_norm: string
          results: Json
        }
        Insert: {
          expires_at: string
          fetched_at?: string
          id?: string
          query_norm: string
          results: Json
        }
        Update: {
          expires_at?: string
          fetched_at?: string
          id?: string
          query_norm?: string
          results?: Json
        }
        Relationships: []
      }
      content_feedback: {
        Row: {
          created_at: string
          id: string
          language: Database["public"]["Enums"]["summary_language"]
          length_mode: Database["public"]["Enums"]["summary_length"]
          rating: Database["public"]["Enums"]["feedback_rating"]
          updated_at: string
          user_id: string
          video_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          language?: Database["public"]["Enums"]["summary_language"]
          length_mode: Database["public"]["Enums"]["summary_length"]
          rating: Database["public"]["Enums"]["feedback_rating"]
          updated_at?: string
          user_id: string
          video_id: string
        }
        Update: {
          created_at?: string
          id?: string
          language?: Database["public"]["Enums"]["summary_language"]
          length_mode?: Database["public"]["Enums"]["summary_length"]
          rating?: Database["public"]["Enums"]["feedback_rating"]
          updated_at?: string
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_feedback_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback_events: {
        Row: {
          created_at: string
          id: string
          language: Database["public"]["Enums"]["summary_language"]
          length_mode: Database["public"]["Enums"]["summary_length"]
          rating: Database["public"]["Enums"]["feedback_rating"]
          reason: string | null
          user_id: string
          video_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          language?: Database["public"]["Enums"]["summary_language"]
          length_mode: Database["public"]["Enums"]["summary_length"]
          rating: Database["public"]["Enums"]["feedback_rating"]
          reason?: string | null
          user_id: string
          video_id: string
        }
        Update: {
          created_at?: string
          id?: string
          language?: Database["public"]["Enums"]["summary_language"]
          length_mode?: Database["public"]["Enums"]["summary_length"]
          rating?: Database["public"]["Enums"]["feedback_rating"]
          reason?: string | null
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_events_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      content_terms: {
        Row: {
          created_at: string
          terms: string[]
          video_id: string
        }
        Insert: {
          created_at?: string
          terms?: string[]
          video_id: string
        }
        Update: {
          created_at?: string
          terms?: string[]
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_terms_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: true
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
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
      send_log: {
        Row: {
          created_at: string
          email_status: string | null
          error: string | null
          id: string
          item_count: number
          push_status: string | null
          send_date: string
          slot: Database["public"]["Enums"]["delivery_slot"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_status?: string | null
          error?: string | null
          id?: string
          item_count?: number
          push_status?: string | null
          send_date: string
          slot: Database["public"]["Enums"]["delivery_slot"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_status?: string | null
          error?: string | null
          id?: string
          item_count?: number
          push_status?: string | null
          send_date?: string
          slot?: Database["public"]["Enums"]["delivery_slot"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "send_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      membership: {
        Row: {
          anchor_day: number
          created_at: string
          grace_until: string | null
          id: string
          next_billing_at: string
          period_end: string
          period_start: string
          plan_code: Database["public"]["Enums"]["membership_plan"]
          poc_free_until: string | null
          poc_warned: boolean
          scheduled_change: Json | null
          status: Database["public"]["Enums"]["membership_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          anchor_day: number
          created_at?: string
          grace_until?: string | null
          id?: string
          next_billing_at: string
          period_end: string
          period_start: string
          plan_code?: Database["public"]["Enums"]["membership_plan"]
          poc_free_until?: string | null
          poc_warned?: boolean
          scheduled_change?: Json | null
          status?: Database["public"]["Enums"]["membership_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          anchor_day?: number
          created_at?: string
          grace_until?: string | null
          id?: string
          next_billing_at?: string
          period_end?: string
          period_start?: string
          plan_code?: Database["public"]["Enums"]["membership_plan"]
          poc_free_until?: string | null
          poc_warned?: boolean
          scheduled_change?: Json | null
          status?: Database["public"]["Enums"]["membership_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      membership_usage: {
        Row: {
          ai_query_used: number
          created_at: string
          digest_used: number
          id: string
          period_start: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_query_used?: number
          created_at?: string
          digest_used?: number
          id?: string
          period_start: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_query_used?: number
          created_at?: string
          digest_used?: number
          id?: string
          period_start?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pipeline_runs: {
        Row: {
          created_at: string
          finished_at: string | null
          id: string
          kind: string
          ok: boolean
          started_at: string
          stats: Json | null
        }
        Insert: {
          created_at?: string
          finished_at?: string | null
          id?: string
          kind: string
          ok?: boolean
          started_at: string
          stats?: Json | null
        }
        Update: {
          created_at?: string
          finished_at?: string | null
          id?: string
          kind?: string
          ok?: boolean
          started_at?: string
          stats?: Json | null
        }
        Relationships: []
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
      search_api_usage: {
        Row: {
          cap: number
          day: string
          id: string
          units_used: number
        }
        Insert: {
          cap?: number
          day: string
          id?: string
          units_used?: number
        }
        Update: {
          cap?: number
          day?: string
          id?: string
          units_used?: number
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          active: boolean
          active_since: string | null
          channel_handle: string | null
          channel_id: string
          channel_thumbnail: string | null
          channel_title: string | null
          channel_url: string | null
          created_at: string
          id: string
          pause_reason: Database["public"]["Enums"]["pause_reason"] | null
          paused: boolean
          user_id: string
        }
        Insert: {
          active?: boolean
          active_since?: string | null
          channel_handle?: string | null
          channel_id: string
          channel_thumbnail?: string | null
          channel_title?: string | null
          channel_url?: string | null
          created_at?: string
          id?: string
          pause_reason?: Database["public"]["Enums"]["pause_reason"] | null
          paused?: boolean
          user_id: string
        }
        Update: {
          active?: boolean
          active_since?: string | null
          channel_handle?: string | null
          channel_id?: string
          channel_thumbnail?: string | null
          channel_title?: string | null
          channel_url?: string | null
          created_at?: string
          id?: string
          pause_reason?: Database["public"]["Enums"]["pause_reason"] | null
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
          prompt_version: string | null
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
          prompt_version?: string | null
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
          prompt_version?: string | null
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
          otp_attempts: number
          otp_expires_at: string | null
          otp_hash: string | null
          otp_requested_at: string | null
          pending_email: string | null
          push_slot_0730: boolean
          push_slot_1130: boolean
          push_slot_1730: boolean
          push_slot_2130: boolean
          skip_empty_email: boolean
          skip_empty_push: boolean
          summary_length: Database["public"]["Enums"]["summary_length"]
          theme: string | null
          user_id: string
        }
        Insert: {
          delivery_email?: string | null
          delivery_slots?: Database["public"]["Enums"]["delivery_slot"][]
          exclude_over_2h?: boolean
          otp_attempts?: number
          otp_expires_at?: string | null
          otp_hash?: string | null
          otp_requested_at?: string | null
          pending_email?: string | null
          push_slot_0730?: boolean
          push_slot_1130?: boolean
          push_slot_1730?: boolean
          push_slot_2130?: boolean
          skip_empty_email?: boolean
          skip_empty_push?: boolean
          summary_length?: Database["public"]["Enums"]["summary_length"]
          theme?: string | null
          user_id: string
        }
        Update: {
          delivery_email?: string | null
          delivery_slots?: Database["public"]["Enums"]["delivery_slot"][]
          exclude_over_2h?: boolean
          otp_attempts?: number
          otp_expires_at?: string | null
          otp_hash?: string | null
          otp_requested_at?: string | null
          pending_email?: string | null
          push_slot_0730?: boolean
          push_slot_1130?: boolean
          push_slot_1730?: boolean
          push_slot_2130?: boolean
          skip_empty_email?: boolean
          skip_empty_push?: boolean
          summary_length?: Database["public"]["Enums"]["summary_length"]
          theme?: string | null
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
          failure_kind: Database["public"]["Enums"]["failure_kind"] | null
          id: string
          last_error: string | null
          next_retry_at: string | null
          published_at: string | null
          retry_count: number
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
          failure_kind?: Database["public"]["Enums"]["failure_kind"] | null
          id?: string
          last_error?: string | null
          next_retry_at?: string | null
          published_at?: string | null
          retry_count?: number
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
          failure_kind?: Database["public"]["Enums"]["failure_kind"] | null
          id?: string
          last_error?: string | null
          next_retry_at?: string | null
          published_at?: string | null
          retry_count?: number
          status?: Database["public"]["Enums"]["video_status"]
          title?: string | null
          transcript?: string | null
          transcript_source?: Database["public"]["Enums"]["transcript_source"]
          url?: string | null
          video_id?: string
        }
        Relationships: []
      }
      websub_subscriptions: {
        Row: {
          channel_id: string
          last_error: string | null
          lease_expires_at: string | null
          status: Database["public"]["Enums"]["websub_status"]
          subscribed_at: string | null
          updated_at: string
        }
        Insert: {
          channel_id: string
          last_error?: string | null
          lease_expires_at?: string | null
          status?: Database["public"]["Enums"]["websub_status"]
          subscribed_at?: string | null
          updated_at?: string
        }
        Update: {
          channel_id?: string
          last_error?: string | null
          lease_expires_at?: string | null
          status?: Database["public"]["Enums"]["websub_status"]
          subscribed_at?: string | null
          updated_at?: string
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
      consume_search_api_units: {
        Args: { p_cap?: number; p_units: number }
        Returns: boolean
      }
      count_period_digests: {
        Args: { p_from: string; p_user: string }
        Returns: number
      }
      dispatch_deliver: { Args: never; Returns: undefined }
      dispatch_pipeline: { Args: never; Returns: undefined }
      dispatch_pipeline_check: { Args: never; Returns: undefined }
      expire_credits: { Args: never; Returns: number }
      forfeit_user_credits: { Args: { p_user: string }; Returns: number }
      get_admin_overview: { Args: never; Returns: Json }
      get_bookmarked_digests: {
        Args: never
        Returns: {
          bookmarked: boolean
          channel_id: string
          duration_seconds: number
          feedback: Json
          id: string
          pref_mode: string
          published_at: string
          summaries: Json
          title: string
          url: string
        }[]
      }
      get_channel_processing: { Args: never; Returns: Json }
      get_content_feedback_metrics: {
        Args: never
        Returns: {
          channel_id: string
          down_count: number
          length_mode: string
          up_count: number
        }[]
      }
      get_cost_breakdown: {
        Args: { p_from?: string; p_to?: string }
        Returns: Json
      }
      get_digest_dates: {
        Args: never
        Returns: {
          channel_id: string
          cnt: number
          kst_date: string
        }[]
      }
      get_digest_summary: {
        Args: never
        Returns: {
          today_count: number
          total_count: number
          period_count: number
        }[]
      }
      get_feed_digests: {
        Args: { p_from: string; p_to?: string; p_with_bookmarked?: boolean }
        Returns: {
          bookmarked: boolean
          channel_id: string
          duration_seconds: number
          feedback: Json
          id: string
          pref_mode: string
          published_at: string
          summaries: Json
          title: string
          url: string
        }[]
      }
      get_growth_metrics: { Args: never; Returns: Json }
      get_incident_log: { Args: { p_days?: number }; Returns: Json }
      get_month_value_stats: {
        Args: { p_from: string; p_mode?: string }
        Returns: {
          read_chars: number
          video_count: number
          video_seconds: number
        }[]
      }
      get_ops_data: { Args: { p_digest_limit?: number }; Returns: Json }
      get_pipeline_status: { Args: { p_date?: string }; Returns: Json }
      get_recent_digests: {
        Args: { p_limit?: number }
        Returns: {
          channel_id: string
          id: string
          published_at: string
          title: string
        }[]
      }
      get_referral_progress: {
        Args: never
        Returns: {
          activated_at: string
          channel_count: number
          created_at: string
          referee_email: string
          referral_id: string
          status: Database["public"]["Enums"]["referral_status"]
          summary_count: number
        }[]
      }
      get_today_digests: {
        Args: never
        Returns: {
          channel_id: string
          id: string
          published_at: string
          title: string
        }[]
      }
      membership_advance_period: {
        Args: {
          p_billing_status: Database["public"]["Enums"]["billing_status"]
          p_channel_limit: number
          p_charge: number
          p_clear_poc: boolean
          p_idem: string
          p_new_plan: Database["public"]["Enums"]["membership_plan"]
          p_new_status: Database["public"]["Enums"]["membership_status"]
          p_next_billing: string
          p_period_end: string
          p_period_start: string
          p_user: string
        }
        Returns: undefined
      }
      membership_apply_upgrade: {
        Args: {
          p_billing_period: string
          p_charge: number
          p_idem: string
          p_proration_raw: number
          p_to: Database["public"]["Enums"]["membership_plan"]
          p_user: string
        }
        Returns: number
      }
      membership_bootstrap: {
        Args: {
          p_anchor: number
          p_next_billing: string
          p_period_end: string
          p_period_start: string
          p_plan: Database["public"]["Enums"]["membership_plan"]
          p_poc_free_until: string
          p_status: Database["public"]["Enums"]["membership_status"]
          p_user: string
        }
        Returns: undefined
      }
      membership_cancel_scheduled: {
        Args: { p_user: string }
        Returns: undefined
      }
      membership_poc_end: { Args: { p_user: string }; Returns: undefined }
      membership_enforce_all_limits: { Args: never; Returns: number }
      membership_reconcile_channels: {
        Args: { p_limit: number; p_user: string }
        Returns: undefined
      }
      membership_schedule_change: {
        Args: {
          p_cancel: boolean
          p_to: Database["public"]["Enums"]["membership_plan"]
          p_user: string
        }
        Returns: undefined
      }
      membership_try_consume: {
        Args: {
          p_kind: string
          p_limit: number
          p_period: string
          p_user: string
        }
        Returns: boolean
      }
      pipeline_health_snapshot: { Args: never; Returns: Json }
      plan_channel_limit: {
        Args: { p_plan: Database["public"]["Enums"]["membership_plan"] }
        Returns: number
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      use_credits: {
        Args: { p_payment_amount: number; p_user: string }
        Returns: number
      }
    }
    Enums: {
      billing_status:
        | "success"
        | "failed"
        | "grace"
        | "skipped_free"
        | "proration"
      channel_catalog_source: "user_selected" | "api" | "detected"
      credit_grant_status: "active" | "exhausted" | "expired" | "forfeited"
      credit_source: "referrer" | "referee"
      credit_txn_kind: "grant" | "usage" | "expiry" | "forfeit"
      delivery_channel: "email" | "push"
      delivery_slot: "0730" | "1130" | "1730" | "2130"
      delivery_status: "pending" | "sent" | "failed"
      failure_kind: "transient" | "permanent"
      feedback_rating: "up" | "down"
      membership_plan: "free" | "small" | "medium" | "large"
      membership_status: "active" | "grace" | "canceled" | "ended" | "poc_free"
      pause_reason: "manual" | "downgrade"
      referral_status: "pending" | "activated" | "void"
      summary_language: "ko" | "en"
      summary_length: "short" | "normal" | "long"
      transcript_source: "caption" | "audio" | "none"
      video_status: "pending" | "processing" | "done" | "failed"
      websub_status: "active" | "pending" | "expired" | "unsubscribed"
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
      billing_status: [
        "success",
        "failed",
        "grace",
        "skipped_free",
        "proration",
      ],
      channel_catalog_source: ["user_selected", "api", "detected"],
      credit_grant_status: ["active", "exhausted", "expired", "forfeited"],
      credit_source: ["referrer", "referee"],
      credit_txn_kind: ["grant", "usage", "expiry", "forfeit"],
      delivery_channel: ["email", "push"],
      delivery_slot: ["0730", "1130", "1730", "2130"],
      delivery_status: ["pending", "sent", "failed"],
      failure_kind: ["transient", "permanent"],
      feedback_rating: ["up", "down"],
      membership_plan: ["free", "small", "medium", "large"],
      membership_status: ["active", "grace", "canceled", "ended", "poc_free"],
      pause_reason: ["manual", "downgrade"],
      referral_status: ["pending", "activated", "void"],
      summary_language: ["ko", "en"],
      summary_length: ["short", "normal", "long"],
      transcript_source: ["caption", "audio", "none"],
      video_status: ["pending", "processing", "done", "failed"],
      websub_status: ["active", "pending", "expired", "unsubscribed"],
    },
  },
} as const
