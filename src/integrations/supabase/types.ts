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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      assignments: {
        Row: {
          attention_dismissed_at: string | null
          confidence: Database["public"]["Enums"]["extraction_confidence"]
          confirmed: boolean
          course_id: string
          created_at: string
          due_at: string | null
          external_calendar_event_id: string | null
          extracted_item_id: string | null
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
          attention_dismissed_at?: string | null
          confidence?: Database["public"]["Enums"]["extraction_confidence"]
          confirmed?: boolean
          course_id: string
          created_at?: string
          due_at?: string | null
          external_calendar_event_id?: string | null
          extracted_item_id?: string | null
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
          attention_dismissed_at?: string | null
          confidence?: Database["public"]["Enums"]["extraction_confidence"]
          confirmed?: boolean
          course_id?: string
          created_at?: string
          due_at?: string | null
          external_calendar_event_id?: string | null
          extracted_item_id?: string | null
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
            foreignKeyName: "assignments_extracted_item_id_fkey"
            columns: ["extracted_item_id"]
            isOneToOne: true
            referencedRelation: "extracted_items"
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
      course_meetings: {
        Row: {
          course_id: string
          created_at: string
          days: Database["public"]["Enums"]["weekday"][]
          end_time: string
          external_calendar_event_id: string | null
          extracted_item_id: string | null
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
          extracted_item_id?: string | null
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
          extracted_item_id?: string | null
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
          {
            foreignKeyName: "course_meetings_extracted_item_id_fkey"
            columns: ["extracted_item_id"]
            isOneToOne: true
            referencedRelation: "extracted_items"
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
      extraction_runs: {
        Row: {
          id: string
          started_at: string
          user_id: string
        }
        Insert: {
          id?: string
          started_at?: string
          user_id: string
        }
        Update: {
          id?: string
          started_at?: string
          user_id?: string
        }
        Relationships: []
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
      syllabus_uploads: {
        Row: {
          course_id: string | null
          created_at: string
          extraction: Json | null
          file_mime: string | null
          file_name: string
          file_path: string
          id: string
          processed_at: string | null
          user_id: string
        }
        Insert: {
          course_id?: string | null
          created_at?: string
          extraction?: Json | null
          file_mime?: string | null
          file_name: string
          file_path: string
          id?: string
          processed_at?: string | null
          user_id: string
        }
        Update: {
          course_id?: string | null
          created_at?: string
          extraction?: Json | null
          file_mime?: string | null
          file_name?: string
          file_path?: string
          id?: string
          processed_at?: string | null
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
          notes: string | null
          risk_reason: string | null
          source_snippet: string | null
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
      claim_extraction_run: { Args: never; Returns: boolean }
      delete_course_cascade: {
        Args: { p_course_id: string }
        Returns: undefined
      }
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
        | "discussion"
        | "other"
      extraction_confidence: "high" | "medium" | "low"
      extraction_item_status: "pending" | "accepted" | "discarded"
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
  graphql_public: {
    Enums: {},
  },
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
        "discussion",
        "other",
      ],
      extraction_confidence: ["high", "medium", "low"],
      extraction_item_status: ["pending", "accepted", "discarded"],
      weekday: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
    },
  },
} as const
