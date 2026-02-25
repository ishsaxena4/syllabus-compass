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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      assignments: {
        Row: {
          confidence: Database["public"]["Enums"]["extraction_confidence"]
          confirmed: boolean
          course_id: string
          created_at: string
          due_at: string | null
          external_calendar_event_id: string | null
          id: string
          notes: string | null
          source_snippet: string | null
          status: Database["public"]["Enums"]["assignment_status"]
          syllabus_upload_id: string | null
          title: string
          type: Database["public"]["Enums"]["assignment_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          confidence?: Database["public"]["Enums"]["extraction_confidence"]
          confirmed?: boolean
          course_id: string
          created_at?: string
          due_at?: string | null
          external_calendar_event_id?: string | null
          id?: string
          notes?: string | null
          source_snippet?: string | null
          status?: Database["public"]["Enums"]["assignment_status"]
          syllabus_upload_id?: string | null
          title: string
          type?: Database["public"]["Enums"]["assignment_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          confidence?: Database["public"]["Enums"]["extraction_confidence"]
          confirmed?: boolean
          course_id?: string
          created_at?: string
          due_at?: string | null
          external_calendar_event_id?: string | null
          id?: string
          notes?: string | null
          source_snippet?: string | null
          status?: Database["public"]["Enums"]["assignment_status"]
          syllabus_upload_id?: string | null
          title?: string
          type?: Database["public"]["Enums"]["assignment_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_syllabus_upload_id_fkey"
            columns: ["syllabus_upload_id"]
            isOneToOne: false
            referencedRelation: "syllabus_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_actions: {
        Row: {
          action_type: string
          confirmed_at: string | null
          created_at: string
          error: string | null
          executed_at: string | null
          id: string
          payload: Json
          session_id: string | null
          status: string
          summary: string
          user_id: string
        }
        Insert: {
          action_type: string
          confirmed_at?: string | null
          created_at?: string
          error?: string | null
          executed_at?: string | null
          id?: string
          payload: Json
          session_id?: string | null
          status?: string
          summary: string
          user_id: string
        }
        Update: {
          action_type?: string
          confirmed_at?: string | null
          created_at?: string
          error?: string | null
          executed_at?: string | null
          id?: string
          payload?: Json
          session_id?: string | null
          status?: string
          summary?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_actions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          metadata: Json
          role: string
          session_id: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          metadata?: Json
          role: string
          session_id?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          metadata?: Json
          role?: string
          session_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_sessions: {
        Row: {
          created_at: string
          id: string
          title: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string | null
          user_id?: string
        }
        Relationships: []
      }
      course_meetings: {
        Row: {
          course_id: string
          created_at: string
          days: Database["public"]["Enums"]["weekday"][]
          end_time: string
          external_calendar_event_id: string | null
          id: string
          location: string | null
          start_time: string
          timezone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          days: Database["public"]["Enums"]["weekday"][]
          end_time: string
          external_calendar_event_id?: string | null
          id?: string
          location?: string | null
          start_time: string
          timezone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          days?: Database["public"]["Enums"]["weekday"][]
          end_time?: string
          external_calendar_event_id?: string | null
          id?: string
          location?: string | null
          start_time?: string
          timezone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_meetings_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          color: string | null
          created_at: string
          id: string
          name: string
          office_hours: string | null
          professor_email: string | null
          professor_name: string | null
          section: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          name: string
          office_hours?: string | null
          professor_email?: string | null
          professor_name?: string | null
          section?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          office_hours?: string | null
          professor_email?: string | null
          professor_name?: string | null
          section?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      extracted_items: {
        Row: {
          confidence: Database["public"]["Enums"]["extraction_confidence"]
          course_id: string | null
          created_at: string
          id: string
          item_kind: string
          payload: Json
          reviewed_at: string | null
          source_location: Json | null
          source_snippet: string | null
          status: Database["public"]["Enums"]["extraction_item_status"]
          syllabus_upload_id: string
          title: string | null
          user_id: string
        }
        Insert: {
          confidence?: Database["public"]["Enums"]["extraction_confidence"]
          course_id?: string | null
          created_at?: string
          id?: string
          item_kind: string
          payload: Json
          reviewed_at?: string | null
          source_location?: Json | null
          source_snippet?: string | null
          status?: Database["public"]["Enums"]["extraction_item_status"]
          syllabus_upload_id: string
          title?: string | null
          user_id: string
        }
        Update: {
          confidence?: Database["public"]["Enums"]["extraction_confidence"]
          course_id?: string | null
          created_at?: string
          id?: string
          item_kind?: string
          payload?: Json
          reviewed_at?: string | null
          source_location?: Json | null
          source_snippet?: string | null
          status?: Database["public"]["Enums"]["extraction_item_status"]
          syllabus_upload_id?: string
          title?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "extracted_items_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extracted_items_syllabus_upload_id_fkey"
            columns: ["syllabus_upload_id"]
            isOneToOne: false
            referencedRelation: "syllabus_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          assignment_id: string | null
          body: string
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at: string
          id: string
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          assignment_id?: string | null
          body: string
          channel?: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          id?: string
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          assignment_id?: string | null
          body?: string
          channel?: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          id?: string
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "v_due_soon"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "v_risky_items"
            referencedColumns: ["entity_id"]
          },
          {
            foreignKeyName: "notifications_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "v_today"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          first_name: string | null
          id: string
          last_name: string | null
          organization: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          organization?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          organization?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reminder_jobs: {
        Row: {
          assignment_id: string
          created_at: string
          id: string
          scheduled_for: string
          sent_at: string | null
          user_id: string
        }
        Insert: {
          assignment_id: string
          created_at?: string
          id?: string
          scheduled_for: string
          sent_at?: string | null
          user_id: string
        }
        Update: {
          assignment_id?: string
          created_at?: string
          id?: string
          scheduled_for?: string
          sent_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminder_jobs_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminder_jobs_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "v_due_soon"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminder_jobs_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "v_risky_items"
            referencedColumns: ["entity_id"]
          },
          {
            foreignKeyName: "reminder_jobs_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "v_today"
            referencedColumns: ["id"]
          },
        ]
      }
      reminder_prefs: {
        Row: {
          created_at: string
          email_enabled: boolean
          quiet_end: string | null
          quiet_hours_enabled: boolean
          quiet_start: string | null
          reminder_enabled: boolean
          reminder_lead_minutes: number
          timezone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_enabled?: boolean
          quiet_end?: string | null
          quiet_hours_enabled?: boolean
          quiet_start?: string | null
          reminder_enabled?: boolean
          reminder_lead_minutes?: number
          timezone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_enabled?: boolean
          quiet_end?: string | null
          quiet_hours_enabled?: boolean
          quiet_start?: string | null
          reminder_enabled?: boolean
          reminder_lead_minutes?: number
          timezone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      syllabus_uploads: {
        Row: {
          course_id: string | null
          created_at: string
          file_mime: string | null
          file_name: string
          file_path: string
          id: string
          processed_at: string | null
          raw_text: string | null
          user_id: string
        }
        Insert: {
          course_id?: string | null
          created_at?: string
          file_mime?: string | null
          file_name: string
          file_path: string
          id?: string
          processed_at?: string | null
          raw_text?: string | null
          user_id: string
        }
        Update: {
          course_id?: string | null
          created_at?: string
          file_mime?: string | null
          file_name?: string
          file_path?: string
          id?: string
          processed_at?: string | null
          raw_text?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "syllabus_uploads_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_due_soon: {
        Row: {
          confidence:
            | Database["public"]["Enums"]["extraction_confidence"]
            | null
          confirmed: boolean | null
          course_color: string | null
          course_id: string | null
          course_name: string | null
          due_at: string | null
          id: string | null
          notes: string | null
          status: Database["public"]["Enums"]["assignment_status"] | null
          title: string | null
          type: Database["public"]["Enums"]["assignment_type"] | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assignments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      v_risky_items: {
        Row: {
          confidence:
            | Database["public"]["Enums"]["extraction_confidence"]
            | null
          confirmed: boolean | null
          course_color: string | null
          course_id: string | null
          course_name: string | null
          due_at: string | null
          entity_id: string | null
          entity_type: string | null
          label: string | null
          last_updated_at: string | null
          risk_reason: string | null
          source_snippet: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assignments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      v_today: {
        Row: {
          confidence:
            | Database["public"]["Enums"]["extraction_confidence"]
            | null
          confirmed: boolean | null
          course_color: string | null
          course_id: string | null
          course_name: string | null
          due_at: string | null
          id: string | null
          notes: string | null
          status: Database["public"]["Enums"]["assignment_status"] | null
          title: string | null
          type: Database["public"]["Enums"]["assignment_type"] | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assignments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      assignment_status: "upcoming" | "completed"
      assignment_type:
        | "homework"
        | "quiz"
        | "exam"
        | "project"
        | "reading"
        | "lab"
        | "other"
      extraction_confidence: "high" | "medium" | "low"
      extraction_item_status: "pending" | "accepted" | "discarded"
      notification_channel: "in_app" | "email"
      weekday: "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun"
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
      assignment_status: ["upcoming", "completed"],
      assignment_type: [
        "homework",
        "quiz",
        "exam",
        "project",
        "reading",
        "lab",
        "other",
      ],
      extraction_confidence: ["high", "medium", "low"],
      extraction_item_status: ["pending", "accepted", "discarded"],
      notification_channel: ["in_app", "email"],
      weekday: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
    },
  },
} as const
