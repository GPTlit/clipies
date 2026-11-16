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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      brand_kits: {
        Row: {
          created_at: string
          default_subtitle_preset_id: string | null
          font: string
          id: string
          intro_text: string | null
          logo_path: string | null
          name: string
          outro_text: string | null
          primary_color: string
          secondary_color: string
          updated_at: string
          user_id: string
          watermark_enabled: boolean
          watermark_position: string
        }
        Insert: {
          created_at?: string
          default_subtitle_preset_id?: string | null
          font?: string
          id?: string
          intro_text?: string | null
          logo_path?: string | null
          name?: string
          outro_text?: string | null
          primary_color?: string
          secondary_color?: string
          updated_at?: string
          user_id: string
          watermark_enabled?: boolean
          watermark_position?: string
        }
        Update: {
          created_at?: string
          default_subtitle_preset_id?: string | null
          font?: string
          id?: string
          intro_text?: string | null
          logo_path?: string | null
          name?: string
          outro_text?: string | null
          primary_color?: string
          secondary_color?: string
          updated_at?: string
          user_id?: string
          watermark_enabled?: boolean
          watermark_position?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_kits_default_subtitle_preset_id_fkey"
            columns: ["default_subtitle_preset_id"]
            isOneToOne: false
            referencedRelation: "subtitle_presets"
            referencedColumns: ["id"]
          },
        ]
      }
      clips: {
        Row: {
          aspect_ratio: string
          category: string | null
          content: Json
          created_at: string
          description: string | null
          end_seconds: number
          framing_mode: string
          hashtags: string[]
          id: string
          is_favorite: boolean
          moment_id: string | null
          reason: string | null
          render_path: string | null
          score: number | null
          start_seconds: number
          status: string
          subtitle_preset_id: string | null
          title: string
          transcript: string | null
          updated_at: string
          user_id: string
          video_id: string
        }
        Insert: {
          aspect_ratio?: string
          category?: string | null
          content?: Json
          created_at?: string
          description?: string | null
          end_seconds: number
          framing_mode?: string
          hashtags?: string[]
          id?: string
          is_favorite?: boolean
          moment_id?: string | null
          reason?: string | null
          render_path?: string | null
          score?: number | null
          start_seconds: number
          status?: string
          subtitle_preset_id?: string | null
          title: string
          transcript?: string | null
          updated_at?: string
          user_id: string
          video_id: string
        }
        Update: {
          aspect_ratio?: string
          category?: string | null
          content?: Json
          created_at?: string
          description?: string | null
          end_seconds?: number
          framing_mode?: string
          hashtags?: string[]
          id?: string
          is_favorite?: boolean
          moment_id?: string | null
          reason?: string | null
          render_path?: string | null
          score?: number | null
          start_seconds?: number
          status?: string
          subtitle_preset_id?: string | null
          title?: string
          transcript?: string | null
          updated_at?: string
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clips_moment_id_fkey"
            columns: ["moment_id"]
            isOneToOne: false
            referencedRelation: "detected_moments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clips_subtitle_preset_id_fkey"
            columns: ["subtitle_preset_id"]
            isOneToOne: false
            referencedRelation: "subtitle_presets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clips_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      detected_moments: {
        Row: {
          category: string | null
          created_at: string
          end_seconds: number
          id: string
          reason: string | null
          score: number | null
          start_seconds: number
          user_id: string
          video_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          end_seconds: number
          id?: string
          reason?: string | null
          score?: number | null
          start_seconds: number
          user_id: string
          video_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          end_seconds?: number
          id?: string
          reason?: string | null
          score?: number | null
          start_seconds?: number
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "detected_moments_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      editing_projects: {
        Row: {
          clip_id: string
          created_at: string
          history: Json
          id: string
          settings: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          clip_id: string
          created_at?: string
          history?: Json
          id?: string
          settings?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          clip_id?: string
          created_at?: string
          history?: Json
          id?: string
          settings?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "editing_projects_clip_id_fkey"
            columns: ["clip_id"]
            isOneToOne: true
            referencedRelation: "clips"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          kind: string
          link: string | null
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          kind: string
          link?: string | null
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          link?: string | null
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      oauth_states: {
        Row: {
          code_verifier: string | null
          created_at: string
          platform: string
          state: string
          user_id: string
        }
        Insert: {
          code_verifier?: string | null
          created_at?: string
          platform: string
          state: string
          user_id: string
        }
        Update: {
          code_verifier?: string | null
          created_at?: string
          platform?: string
          state?: string
          user_id?: string
        }
        Relationships: []
      }
      processing_jobs: {
        Row: {
          attempts: number
          clip_id: string | null
          created_at: string
          error: string | null
          finished_at: string | null
          id: string
          kind: string
          payload: Json
          progress: number
          result: Json | null
          started_at: string | null
          status: string
          updated_at: string
          user_id: string
          video_id: string | null
        }
        Insert: {
          attempts?: number
          clip_id?: string | null
          created_at?: string
          error?: string | null
          finished_at?: string | null
          id?: string
          kind: string
          payload?: Json
          progress?: number
          result?: Json | null
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
          video_id?: string | null
        }
        Update: {
          attempts?: number
          clip_id?: string | null
          created_at?: string
          error?: string | null
          finished_at?: string | null
          id?: string
          kind?: string
          payload?: Json
          progress?: number
          result?: Json | null
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          video_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "processing_jobs_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          timezone: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          created_at: string
          description: string | null
          id: string
          language: string
          name: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          language?: string
          name: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          language?: string
          name?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      published_posts: {
        Row: {
          clip_id: string | null
          external_post_id: string
          id: string
          metrics: Json | null
          metrics_fetched_at: string | null
          platform: string
          published_at: string
          scheduled_post_id: string | null
          url: string | null
          user_id: string
        }
        Insert: {
          clip_id?: string | null
          external_post_id: string
          id?: string
          metrics?: Json | null
          metrics_fetched_at?: string | null
          platform: string
          published_at?: string
          scheduled_post_id?: string | null
          url?: string | null
          user_id: string
        }
        Update: {
          clip_id?: string | null
          external_post_id?: string
          id?: string
          metrics?: Json | null
          metrics_fetched_at?: string | null
          platform?: string
          published_at?: string
          scheduled_post_id?: string | null
          url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "published_posts_clip_id_fkey"
            columns: ["clip_id"]
            isOneToOne: false
            referencedRelation: "clips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "published_posts_scheduled_post_id_fkey"
            columns: ["scheduled_post_id"]
            isOneToOne: false
            referencedRelation: "scheduled_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      publishing_logs: {
        Row: {
          created_at: string
          id: string
          level: string
          message: string
          scheduled_post_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          level?: string
          message: string
          scheduled_post_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          level?: string
          message?: string
          scheduled_post_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "publishing_logs_scheduled_post_id_fkey"
            columns: ["scheduled_post_id"]
            isOneToOne: false
            referencedRelation: "scheduled_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_posts: {
        Row: {
          attempts: number
          caption: string | null
          clip_id: string
          created_at: string
          id: string
          last_error: string | null
          platform: string
          recurrence: string | null
          scheduled_at: string
          social_account_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          attempts?: number
          caption?: string | null
          clip_id: string
          created_at?: string
          id?: string
          last_error?: string | null
          platform: string
          recurrence?: string | null
          scheduled_at: string
          social_account_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          attempts?: number
          caption?: string | null
          clip_id?: string
          created_at?: string
          id?: string
          last_error?: string | null
          platform?: string
          recurrence?: string | null
          scheduled_at?: string
          social_account_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_posts_clip_id_fkey"
            columns: ["clip_id"]
            isOneToOne: false
            referencedRelation: "clips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_posts_social_account_id_fkey"
            columns: ["social_account_id"]
            isOneToOne: false
            referencedRelation: "social_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      social_account_tokens: {
        Row: {
          access_token: string
          account_id: string
          expires_at: string | null
          refresh_token: string | null
          updated_at: string
        }
        Insert: {
          access_token: string
          account_id: string
          expires_at?: string | null
          refresh_token?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string
          account_id?: string
          expires_at?: string | null
          refresh_token?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_account_tokens_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: true
            referencedRelation: "social_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      social_accounts: {
        Row: {
          avatar_url: string | null
          connected_at: string
          external_id: string
          id: string
          platform: string
          scopes: string[]
          status: string
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          connected_at?: string
          external_id: string
          id?: string
          platform: string
          scopes?: string[]
          status?: string
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          connected_at?: string
          external_id?: string
          id?: string
          platform?: string
          scopes?: string[]
          status?: string
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      speakers: {
        Row: {
          color: string | null
          created_at: string
          display_name: string | null
          face_box: Json | null
          id: string
          label: string
          source: string
          user_id: string
          video_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          display_name?: string | null
          face_box?: Json | null
          id?: string
          label: string
          source?: string
          user_id: string
          video_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          display_name?: string | null
          face_box?: Json | null
          id?: string
          label?: string
          source?: string
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "speakers_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          id: string
          plan: string
          provider: string | null
          provider_customer_id: string | null
          provider_subscription_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          plan?: string
          provider?: string | null
          provider_customer_id?: string | null
          provider_subscription_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          plan?: string
          provider?: string | null
          provider_customer_id?: string | null
          provider_subscription_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      subtitle_presets: {
        Row: {
          created_at: string
          id: string
          is_default: boolean
          name: string
          style: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_default?: boolean
          name: string
          style?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean
          name?: string
          style?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      subtitles: {
        Row: {
          clip_id: string
          created_at: string
          cues: Json
          id: string
          style: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          clip_id: string
          created_at?: string
          cues?: Json
          id?: string
          style?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          clip_id?: string
          created_at?: string
          cues?: Json
          id?: string
          style?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subtitles_clip_id_fkey"
            columns: ["clip_id"]
            isOneToOne: true
            referencedRelation: "clips"
            referencedColumns: ["id"]
          },
        ]
      }
      transcripts: {
        Row: {
          created_at: string
          full_text: string
          id: string
          language: string | null
          segments: Json
          timing_precision: string
          updated_at: string
          user_id: string
          video_id: string
        }
        Insert: {
          created_at?: string
          full_text?: string
          id?: string
          language?: string | null
          segments?: Json
          timing_precision?: string
          updated_at?: string
          user_id: string
          video_id: string
        }
        Update: {
          created_at?: string
          full_text?: string
          id?: string
          language?: string | null
          segments?: Json
          timing_precision?: string
          updated_at?: string
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transcripts_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: true
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_records: {
        Row: {
          created_at: string
          id: string
          kind: string
          meta: Json
          quantity: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          meta?: Json
          quantity: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          meta?: Json
          quantity?: number
          user_id?: string
        }
        Relationships: []
      }
      video_assets: {
        Row: {
          clip_id: string | null
          created_at: string
          id: string
          kind: string
          meta: Json
          storage_path: string
          user_id: string
          video_id: string | null
        }
        Insert: {
          clip_id?: string | null
          created_at?: string
          id?: string
          kind: string
          meta?: Json
          storage_path: string
          user_id: string
          video_id?: string | null
        }
        Update: {
          clip_id?: string | null
          created_at?: string
          id?: string
          kind?: string
          meta?: Json
          storage_path?: string
          user_id?: string
          video_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "video_assets_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      videos: {
        Row: {
          created_at: string
          duration_seconds: number | null
          error: string | null
          height: number | null
          id: string
          mime_type: string | null
          project_id: string
          size_bytes: number | null
          source_url: string | null
          status: string
          storage_path: string | null
          thumbnail_path: string | null
          title: string
          updated_at: string
          user_id: string
          width: number | null
        }
        Insert: {
          created_at?: string
          duration_seconds?: number | null
          error?: string | null
          height?: number | null
          id?: string
          mime_type?: string | null
          project_id: string
          size_bytes?: number | null
          source_url?: string | null
          status?: string
          storage_path?: string | null
          thumbnail_path?: string | null
          title: string
          updated_at?: string
          user_id: string
          width?: number | null
        }
        Update: {
          created_at?: string
          duration_seconds?: number | null
          error?: string | null
          height?: number | null
          id?: string
          mime_type?: string | null
          project_id?: string
          size_bytes?: number | null
          source_url?: string | null
          status?: string
          storage_path?: string | null
          thumbnail_path?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "videos_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
