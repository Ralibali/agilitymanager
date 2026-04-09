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
      competition_interests: {
        Row: {
          class: string | null
          competition_id: string
          created_at: string | null
          dog_name: string | null
          id: string
          notified_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          class?: string | null
          competition_id: string
          created_at?: string | null
          dog_name?: string | null
          id?: string
          notified_at?: string | null
          status: string
          user_id: string
        }
        Update: {
          class?: string | null
          competition_id?: string
          created_at?: string | null
          dog_name?: string | null
          id?: string
          notified_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "competition_interests_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
        ]
      }
      competition_log: {
        Row: {
          city: string | null
          class: string | null
          competition_id: string | null
          competition_name: string | null
          created_at: string | null
          date: string | null
          discipline: string | null
          dog_name: string | null
          id: string
          notes: string | null
          starts: number | null
          user_id: string
        }
        Insert: {
          city?: string | null
          class?: string | null
          competition_id?: string | null
          competition_name?: string | null
          created_at?: string | null
          date?: string | null
          discipline?: string | null
          dog_name?: string | null
          id?: string
          notes?: string | null
          starts?: number | null
          user_id: string
        }
        Update: {
          city?: string | null
          class?: string | null
          competition_id?: string | null
          competition_name?: string | null
          created_at?: string | null
          date?: string | null
          discipline?: string | null
          dog_name?: string | null
          id?: string
          notes?: string | null
          starts?: number | null
          user_id?: string
        }
        Relationships: []
      }
      competition_results: {
        Row: {
          competition_level: Database["public"]["Enums"]["competition_level"]
          course_length_m: number | null
          created_at: string
          date: string
          discipline: Database["public"]["Enums"]["discipline"]
          disqualified: boolean
          dog_id: string
          event_name: string
          faults: number
          id: string
          notes: string
          organizer: string
          passed: boolean
          placement: number | null
          size_class: Database["public"]["Enums"]["size_class"]
          time_sec: number
          user_id: string
        }
        Insert: {
          competition_level?: Database["public"]["Enums"]["competition_level"]
          course_length_m?: number | null
          created_at?: string
          date?: string
          discipline?: Database["public"]["Enums"]["discipline"]
          disqualified?: boolean
          dog_id: string
          event_name: string
          faults?: number
          id?: string
          notes?: string
          organizer?: string
          passed?: boolean
          placement?: number | null
          size_class?: Database["public"]["Enums"]["size_class"]
          time_sec?: number
          user_id: string
        }
        Update: {
          competition_level?: Database["public"]["Enums"]["competition_level"]
          course_length_m?: number | null
          created_at?: string
          date?: string
          discipline?: Database["public"]["Enums"]["discipline"]
          disqualified?: boolean
          dog_id?: string
          event_name?: string
          faults?: number
          id?: string
          notes?: string
          organizer?: string
          passed?: boolean
          placement?: number | null
          size_class?: Database["public"]["Enums"]["size_class"]
          time_sec?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "competition_results_dog_id_fkey"
            columns: ["dog_id"]
            isOneToOne: false
            referencedRelation: "dogs"
            referencedColumns: ["id"]
          },
        ]
      }
      competitions: {
        Row: {
          classes_agility: string[] | null
          classes_hopp: string[] | null
          classes_other: string[] | null
          club_name: string | null
          competition_name: string | null
          date_end: string | null
          date_start: string | null
          fetched_at: string | null
          id: string
          indoor_outdoor: string | null
          judges: string[] | null
          last_registration_date: string | null
          location: string | null
          part_key: string | null
          raw_lopp: string | null
          source_url: string | null
          status: string | null
          status_code: string | null
        }
        Insert: {
          classes_agility?: string[] | null
          classes_hopp?: string[] | null
          classes_other?: string[] | null
          club_name?: string | null
          competition_name?: string | null
          date_end?: string | null
          date_start?: string | null
          fetched_at?: string | null
          id: string
          indoor_outdoor?: string | null
          judges?: string[] | null
          last_registration_date?: string | null
          location?: string | null
          part_key?: string | null
          raw_lopp?: string | null
          source_url?: string | null
          status?: string | null
          status_code?: string | null
        }
        Update: {
          classes_agility?: string[] | null
          classes_hopp?: string[] | null
          classes_other?: string[] | null
          club_name?: string | null
          competition_name?: string | null
          date_end?: string | null
          date_start?: string | null
          fetched_at?: string | null
          id?: string
          indoor_outdoor?: string | null
          judges?: string[] | null
          last_registration_date?: string | null
          location?: string | null
          part_key?: string | null
          raw_lopp?: string | null
          source_url?: string | null
          status?: string | null
          status_code?: string | null
        }
        Relationships: []
      }
      dogs: {
        Row: {
          birthdate: string | null
          breed: string
          color: string
          competition_level: Database["public"]["Enums"]["competition_level"]
          created_at: string
          gender: Database["public"]["Enums"]["dog_gender"]
          id: string
          jumping_level: Database["public"]["Enums"]["competition_level"]
          name: string
          notes: string
          photo_url: string | null
          size_class: Database["public"]["Enums"]["size_class"]
          theme_color: string
          updated_at: string
          user_id: string
        }
        Insert: {
          birthdate?: string | null
          breed?: string
          color?: string
          competition_level?: Database["public"]["Enums"]["competition_level"]
          created_at?: string
          gender?: Database["public"]["Enums"]["dog_gender"]
          id?: string
          jumping_level?: Database["public"]["Enums"]["competition_level"]
          name: string
          notes?: string
          photo_url?: string | null
          size_class?: Database["public"]["Enums"]["size_class"]
          theme_color?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          birthdate?: string | null
          breed?: string
          color?: string
          competition_level?: Database["public"]["Enums"]["competition_level"]
          created_at?: string
          gender?: Database["public"]["Enums"]["dog_gender"]
          id?: string
          jumping_level?: Database["public"]["Enums"]["competition_level"]
          name?: string
          notes?: string
          photo_url?: string | null
          size_class?: Database["public"]["Enums"]["size_class"]
          theme_color?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      health_logs: {
        Row: {
          created_at: string
          date: string
          description: string
          dog_id: string
          id: string
          next_date: string | null
          title: string
          type: string
          user_id: string
          weight_kg: number | null
        }
        Insert: {
          created_at?: string
          date?: string
          description?: string
          dog_id: string
          id?: string
          next_date?: string | null
          title: string
          type?: string
          user_id: string
          weight_kg?: number | null
        }
        Update: {
          created_at?: string
          date?: string
          description?: string
          dog_id?: string
          id?: string
          next_date?: string | null
          title?: string
          type?: string
          user_id?: string
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "health_logs_dog_id_fkey"
            columns: ["dog_id"]
            isOneToOne: false
            referencedRelation: "dogs"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          competition_id: string | null
          created_at: string | null
          id: string
          message: string | null
          read: boolean | null
          user_id: string
        }
        Insert: {
          competition_id?: string | null
          created_at?: string | null
          id?: string
          message?: string | null
          read?: boolean | null
          user_id: string
        }
        Update: {
          competition_id?: string | null
          created_at?: string | null
          id?: string
          message?: string | null
          read?: boolean | null
          user_id?: string
        }
        Relationships: []
      }
      planned_competitions: {
        Row: {
          created_at: string
          date: string
          dog_id: string
          event_name: string
          id: string
          location: string
          reminder_days_before: number
          signup_url: string
          status: Database["public"]["Enums"]["competition_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          dog_id: string
          event_name: string
          id?: string
          location?: string
          reminder_days_before?: number
          signup_url?: string
          status?: Database["public"]["Enums"]["competition_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          dog_id?: string
          event_name?: string
          id?: string
          location?: string
          reminder_days_before?: number
          signup_url?: string
          status?: Database["public"]["Enums"]["competition_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "planned_competitions_dog_id_fkey"
            columns: ["dog_id"]
            isOneToOne: false
            referencedRelation: "dogs"
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
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      saved_courses: {
        Row: {
          canvas_height: number
          canvas_width: number
          course_data: Json
          created_at: string
          description: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          canvas_height?: number
          canvas_width?: number
          course_data?: Json
          created_at?: string
          description?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          canvas_height?: number
          canvas_width?: number
          course_data?: Json
          created_at?: string
          description?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      signup_sources: {
        Row: {
          created_at: string
          id: string
          landing_page: string | null
          referrer: string | null
          user_id: string
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          landing_page?: string | null
          referrer?: string | null
          user_id: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          landing_page?: string | null
          referrer?: string | null
          user_id?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: []
      }
      stopwatch_results: {
        Row: {
          created_at: string
          date: string
          dog_id: string
          faults: number
          id: string
          notes: string
          refusals: number
          time_ms: number
          user_id: string
        }
        Insert: {
          created_at?: string
          date?: string
          dog_id: string
          faults?: number
          id?: string
          notes?: string
          refusals?: number
          time_ms: number
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          dog_id?: string
          faults?: number
          id?: string
          notes?: string
          refusals?: number
          time_ms?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stopwatch_results_dog_id_fkey"
            columns: ["dog_id"]
            isOneToOne: false
            referencedRelation: "dogs"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          admin_reply: string | null
          created_at: string
          id: string
          message: string
          status: Database["public"]["Enums"]["ticket_status"]
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_reply?: string | null
          created_at?: string
          id?: string
          message: string
          status?: Database["public"]["Enums"]["ticket_status"]
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_reply?: string | null
          created_at?: string
          id?: string
          message?: string
          status?: Database["public"]["Enums"]["ticket_status"]
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      training_sessions: {
        Row: {
          created_at: string
          date: string
          dog_energy: number
          dog_id: string
          duration_min: number
          handler_energy: number
          id: string
          notes_good: string
          notes_improve: string
          reps: number
          tags: string[]
          type: Database["public"]["Enums"]["training_type"]
          user_id: string
        }
        Insert: {
          created_at?: string
          date?: string
          dog_energy?: number
          dog_id: string
          duration_min?: number
          handler_energy?: number
          id?: string
          notes_good?: string
          notes_improve?: string
          reps?: number
          tags?: string[]
          type?: Database["public"]["Enums"]["training_type"]
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          dog_energy?: number
          dog_id?: string
          duration_min?: number
          handler_energy?: number
          id?: string
          notes_good?: string
          notes_improve?: string
          reps?: number
          tags?: string[]
          type?: Database["public"]["Enums"]["training_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_sessions_dog_id_fkey"
            columns: ["dog_id"]
            isOneToOne: false
            referencedRelation: "dogs"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      competition_level: "Nollklass" | "K1" | "K2" | "K3"
      competition_status: "sparad" | "anmäld" | "bekräftad" | "genomförd"
      discipline: "Agility" | "Jumping" | "Nollklass"
      dog_gender: "Hane" | "Tik"
      size_class: "XS" | "S" | "M" | "L"
      ticket_status: "open" | "answered" | "closed"
      training_type:
        | "Bana"
        | "Hinder"
        | "Kontakt"
        | "Vändning"
        | "Distans"
        | "Freestyle"
        | "Annan"
        | "Målgång"
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
      app_role: ["admin", "user"],
      competition_level: ["Nollklass", "K1", "K2", "K3"],
      competition_status: ["sparad", "anmäld", "bekräftad", "genomförd"],
      discipline: ["Agility", "Jumping", "Nollklass"],
      dog_gender: ["Hane", "Tik"],
      size_class: ["XS", "S", "M", "L"],
      ticket_status: ["open", "answered", "closed"],
      training_type: [
        "Bana",
        "Hinder",
        "Kontakt",
        "Vändning",
        "Distans",
        "Freestyle",
        "Annan",
        "Målgång",
      ],
    },
  },
} as const
