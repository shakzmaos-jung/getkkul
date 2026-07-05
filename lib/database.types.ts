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
      subscriptions: {
        Row: {
          channel_id: string
          channel_title: string | null
          channel_url: string | null
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          channel_id: string
          channel_title?: string | null
          channel_url?: string | null
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          channel_id?: string
          channel_title?: string | null
          channel_url?: string | null
          created_at?: string
          id?: string
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
          otp_expires_at: string | null
          otp_hash: string | null
          pending_email: string | null
          summary_length: Database["public"]["Enums"]["summary_length"]
          user_id: string
        }
        Insert: {
          delivery_email?: string | null
          otp_expires_at?: string | null
          otp_hash?: string | null
          pending_email?: string | null
          summary_length?: Database["public"]["Enums"]["summary_length"]
          user_id: string
        }
        Update: {
          delivery_email?: string | null
          otp_expires_at?: string | null
          otp_hash?: string | null
          pending_email?: string | null
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
      videos: {
        Row: {
          channel_id: string
          created_at: string
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
      [_ in never]: never
    }
    Enums: {
      delivery_channel: "email"
      delivery_slot: "0730" | "1130" | "1730"
      delivery_status: "pending" | "sent" | "failed"
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
      delivery_channel: ["email"],
      delivery_slot: ["0730", "1130", "1730"],
      delivery_status: ["pending", "sent", "failed"],
      summary_language: ["ko", "en"],
      summary_length: ["short", "normal", "long"],
      transcript_source: ["caption", "audio", "none"],
      video_status: ["pending", "processing", "done", "failed"],
    },
  },
} as const
