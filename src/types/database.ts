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
      exercises: {
        Row: {
          created_at: string
          created_by: string | null
          equipment: string
          id: string
          image_url: string | null
          muscle_group: string
          name_de: string
          name_en: string
          primary_muscles: string[]
          secondary_muscles: string[]
          source: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          equipment: string
          id?: string
          image_url?: string | null
          muscle_group: string
          name_de: string
          name_en: string
          primary_muscles?: string[]
          secondary_muscles?: string[]
          source: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          equipment?: string
          id?: string
          image_url?: string | null
          muscle_group?: string
          name_de?: string
          name_en?: string
          primary_muscles?: string[]
          secondary_muscles?: string[]
          source?: string
          updated_at?: string
        }
        Relationships: []
      }
      food_logs: {
        Row: {
          created_at: string
          date: string
          food_id: string
          id: string
          meal_type: string
          quantity_g: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          food_id: string
          id?: string
          meal_type: string
          quantity_g: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          food_id?: string
          id?: string
          meal_type?: string
          quantity_g?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "food_logs_food_id_fkey"
            columns: ["food_id"]
            isOneToOne: false
            referencedRelation: "foods"
            referencedColumns: ["id"]
          },
        ]
      }
      foods: {
        Row: {
          barcode: string | null
          brand: string | null
          carbs_100g: number
          created_at: string
          created_by: string | null
          fat_100g: number
          fibre_100g: number | null
          id: string
          kcal_100g: number
          micros: Json | null
          name: string
          protein_100g: number
          salt_100g: number | null
          saturated_fat_100g: number | null
          serving_label: string | null
          serving_size_g: number | null
          source: string
          sugars_100g: number | null
          updated_at: string
        }
        Insert: {
          barcode?: string | null
          brand?: string | null
          carbs_100g: number
          created_at?: string
          created_by?: string | null
          fat_100g: number
          fibre_100g?: number | null
          id?: string
          kcal_100g: number
          micros?: Json | null
          name: string
          protein_100g: number
          salt_100g?: number | null
          saturated_fat_100g?: number | null
          serving_label?: string | null
          serving_size_g?: number | null
          source: string
          sugars_100g?: number | null
          updated_at?: string
        }
        Update: {
          barcode?: string | null
          brand?: string | null
          carbs_100g?: number
          created_at?: string
          created_by?: string | null
          fat_100g?: number
          fibre_100g?: number | null
          id?: string
          kcal_100g?: number
          micros?: Json | null
          name?: string
          protein_100g?: number
          salt_100g?: number | null
          saturated_fat_100g?: number | null
          serving_label?: string | null
          serving_size_g?: number | null
          source?: string
          sugars_100g?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      nutrition_goals: {
        Row: {
          carbs_g: number
          created_at: string
          fat_g: number
          kcal: number
          mode: string
          protein_g: number
          updated_at: string
          user_id: string
          valid_from: string
        }
        Insert: {
          carbs_g: number
          created_at?: string
          fat_g: number
          kcal: number
          mode: string
          protein_g: number
          updated_at?: string
          user_id: string
          valid_from?: string
        }
        Update: {
          carbs_g?: number
          created_at?: string
          fat_g?: number
          kcal?: number
          mode?: string
          protein_g?: number
          updated_at?: string
          user_id?: string
          valid_from?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          activity_level: string | null
          birth_date: string | null
          created_at: string
          display_name: string | null
          goal: string | null
          height_cm: number | null
          locale: string
          sex: string | null
          theme: string
          updated_at: string
          user_id: string
        }
        Insert: {
          activity_level?: string | null
          birth_date?: string | null
          created_at?: string
          display_name?: string | null
          goal?: string | null
          height_cm?: number | null
          locale?: string
          sex?: string | null
          theme?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          activity_level?: string | null
          birth_date?: string | null
          created_at?: string
          display_name?: string | null
          goal?: string | null
          height_cm?: number | null
          locale?: string
          sex?: string | null
          theme?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      routine_days: {
        Row: {
          routine_id: string
          weekday: number
        }
        Insert: {
          routine_id: string
          weekday: number
        }
        Update: {
          routine_id?: string
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "routine_days_routine_id_fkey"
            columns: ["routine_id"]
            isOneToOne: false
            referencedRelation: "routines"
            referencedColumns: ["id"]
          },
        ]
      }
      routine_exercises: {
        Row: {
          created_at: string
          exercise_id: string
          id: string
          position: number
          routine_id: string
          set_reps: number[]
        }
        Insert: {
          created_at?: string
          exercise_id: string
          id?: string
          position: number
          routine_id: string
          set_reps: number[]
        }
        Update: {
          created_at?: string
          exercise_id?: string
          id?: string
          position?: number
          routine_id?: string
          set_reps?: number[]
        }
        Relationships: [
          {
            foreignKeyName: "routine_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routine_exercises_routine_id_fkey"
            columns: ["routine_id"]
            isOneToOne: false
            referencedRelation: "routines"
            referencedColumns: ["id"]
          },
        ]
      }
      routines: {
        Row: {
          created_at: string
          id: string
          name: string
          position: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          position?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          position?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      scheduled_sessions: {
        Row: {
          created_at: string
          id: string
          routine_id: string
          scheduled_date: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          routine_id: string
          scheduled_date: string
          status: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          routine_id?: string
          scheduled_date?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_sessions_routine_id_fkey"
            columns: ["routine_id"]
            isOneToOne: false
            referencedRelation: "routines"
            referencedColumns: ["id"]
          },
        ]
      }
      weight_logs: {
        Row: {
          body_fat_pct: number | null
          created_at: string
          date: string
          measurements: Json | null
          updated_at: string
          user_id: string
          weight_kg: number
        }
        Insert: {
          body_fat_pct?: number | null
          created_at?: string
          date: string
          measurements?: Json | null
          updated_at?: string
          user_id: string
          weight_kg: number
        }
        Update: {
          body_fat_pct?: number | null
          created_at?: string
          date?: string
          measurements?: Json | null
          updated_at?: string
          user_id?: string
          weight_kg?: number
        }
        Relationships: []
      }
      workout_sets: {
        Row: {
          created_at: string
          done: boolean
          exercise_id: string
          id: string
          reps: number
          rir: number | null
          set_number: number
          updated_at: string
          user_id: string
          weight_kg: number
          workout_id: string
        }
        Insert: {
          created_at?: string
          done?: boolean
          exercise_id: string
          id?: string
          reps: number
          rir?: number | null
          set_number: number
          updated_at?: string
          user_id: string
          weight_kg: number
          workout_id: string
        }
        Update: {
          created_at?: string
          done?: boolean
          exercise_id?: string
          id?: string
          reps?: number
          rir?: number | null
          set_number?: number
          updated_at?: string
          user_id?: string
          weight_kg?: number
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_sets_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_sets_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      workouts: {
        Row: {
          created_at: string
          date: string
          ended_at: string | null
          id: string
          notes: string | null
          routine_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          ended_at?: string | null
          id?: string
          notes?: string | null
          routine_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          ended_at?: string | null
          id?: string
          notes?: string | null
          routine_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workouts_routine_id_fkey"
            columns: ["routine_id"]
            isOneToOne: false
            referencedRelation: "routines"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      all_between: {
        Args: { high: number; low: number; numbers: number[] }
        Returns: boolean
      }
      set_routine_exercises: {
        Args: { items: Json; routine: string }
        Returns: undefined
      }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
