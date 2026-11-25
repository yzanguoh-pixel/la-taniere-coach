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
      activities: {
        Row: {
          client_id: string
          created_at: string
          date: string
          distance_km: number | null
          duration_min: number | null
          id: string
          kcal: number | null
          source: string
          type: string
        }
        Insert: {
          client_id: string
          created_at?: string
          date: string
          distance_km?: number | null
          duration_min?: number | null
          id?: string
          kcal?: number | null
          source?: string
          type: string
        }
        Update: {
          client_id?: string
          created_at?: string
          date?: string
          distance_km?: number | null
          duration_min?: number | null
          id?: string
          kcal?: number | null
          source?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      app_config: {
        Row: {
          key: string
          value: string
        }
        Insert: {
          key: string
          value: string
        }
        Update: {
          key?: string
          value?: string
        }
        Relationships: []
      }
      availability_slots: {
        Row: {
          coach_id: string
          created_at: string
          ends_at: string
          format: string
          id: string
          is_booked: boolean
          starts_at: string
        }
        Insert: {
          coach_id: string
          created_at?: string
          ends_at: string
          format?: string
          id?: string
          is_booked?: boolean
          starts_at: string
        }
        Update: {
          coach_id?: string
          created_at?: string
          ends_at?: string
          format?: string
          id?: string
          is_booked?: boolean
          starts_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "availability_slots_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          coach_id: string
          created_at: string
          email: string | null
          format: string
          full_name: string
          id: string
          phone: string
          slot_id: string | null
          starts_at: string | null
          status: string
        }
        Insert: {
          coach_id: string
          created_at?: string
          email?: string | null
          format: string
          full_name: string
          id?: string
          phone: string
          slot_id?: string | null
          starts_at?: string | null
          status?: string
        }
        Update: {
          coach_id?: string
          created_at?: string
          email?: string | null
          format?: string
          full_name?: string
          id?: string
          phone?: string
          slot_id?: string | null
          starts_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "availability_slots"
            referencedColumns: ["id"]
          },
        ]
      }
      client_meal_plans: {
        Row: {
          active: boolean
          adaptations: Json
          client_id: string
          created_at: string
          id: string
          kcal_target: number
          meals: Json
          name: string
          template_id: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          adaptations?: Json
          client_id: string
          created_at?: string
          id?: string
          kcal_target: number
          meals?: Json
          name: string
          template_id?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          adaptations?: Json
          client_id?: string
          created_at?: string
          id?: string
          kcal_target?: number
          meals?: Json
          name?: string
          template_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_meal_plans_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_meal_plans_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "meal_plan_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      client_programs: {
        Row: {
          active: boolean
          adaptations: Json
          client_id: string
          created_at: string
          id: string
          name: string
          start_date: string
          template_id: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          adaptations?: Json
          client_id: string
          created_at?: string
          id?: string
          name: string
          start_date?: string
          template_id?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          adaptations?: Json
          client_id?: string
          created_at?: string
          id?: string
          name?: string
          start_date?: string
          template_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_programs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_programs_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "program_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      client_sessions: {
        Row: {
          client_id: string
          client_program_id: string
          created_at: string
          date: string
          done_at: string | null
          id: string
          label: string
          name: string
          status: string
          week: number
        }
        Insert: {
          client_id: string
          client_program_id: string
          created_at?: string
          date: string
          done_at?: string | null
          id?: string
          label: string
          name: string
          status?: string
          week?: number
        }
        Update: {
          client_id?: string
          client_program_id?: string
          created_at?: string
          date?: string
          done_at?: string | null
          id?: string
          label?: string
          name?: string
          status?: string
          week?: number
        }
        Relationships: [
          {
            foreignKeyName: "client_sessions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_sessions_client_program_id_fkey"
            columns: ["client_program_id"]
            isOneToOne: false
            referencedRelation: "client_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          coach_id: string
          created_at: string
          food_exclusions: string[]
          goal: string | null
          height_cm: number | null
          id: string
          injuries: string | null
          level: string | null
          preferred_channel: string
          profile_id: string
          sessions_per_week: number | null
          since: string
          status: string
          targets: Json
          updated_at: string
          weight_kg: number | null
        }
        Insert: {
          coach_id: string
          created_at?: string
          food_exclusions?: string[]
          goal?: string | null
          height_cm?: number | null
          id?: string
          injuries?: string | null
          level?: string | null
          preferred_channel?: string
          profile_id: string
          sessions_per_week?: number | null
          since?: string
          status?: string
          targets?: Json
          updated_at?: string
          weight_kg?: number | null
        }
        Update: {
          coach_id?: string
          created_at?: string
          food_exclusions?: string[]
          goal?: string | null
          height_cm?: number | null
          id?: string
          injuries?: string | null
          level?: string | null
          preferred_channel?: string
          profile_id?: string
          sessions_per_week?: number | null
          since?: string
          status?: string
          targets?: Json
          updated_at?: string
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_notes: {
        Row: {
          body: string
          client_id: string
          coach_id: string
          created_at: string
          id: string
        }
        Insert: {
          body: string
          client_id: string
          coach_id: string
          created_at?: string
          id?: string
        }
        Update: {
          body?: string
          client_id?: string
          coach_id?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_notes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_notes_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      exercises: {
        Row: {
          aliases: string[]
          category: string
          created_at: string
          equipment: string | null
          id: string
          muscles: string[]
          name_fr: string
        }
        Insert: {
          aliases?: string[]
          category: string
          created_at?: string
          equipment?: string | null
          id?: string
          muscles?: string[]
          name_fr: string
        }
        Update: {
          aliases?: string[]
          category?: string
          created_at?: string
          equipment?: string | null
          id?: string
          muscles?: string[]
          name_fr?: string
        }
        Relationships: []
      }
      food_log_entries: {
        Row: {
          carbs_g: number
          client_id: string
          coach_comment: string | null
          created_at: string
          date: string
          fat_g: number
          food_id: string | null
          id: string
          kcal: number
          label: string | null
          meal: string
          protein_g: number
          quantity: number
          recipe_id: string | null
        }
        Insert: {
          carbs_g?: number
          client_id: string
          coach_comment?: string | null
          created_at?: string
          date: string
          fat_g?: number
          food_id?: string | null
          id?: string
          kcal: number
          label?: string | null
          meal: string
          protein_g?: number
          quantity: number
          recipe_id?: string | null
        }
        Update: {
          carbs_g?: number
          client_id?: string
          coach_comment?: string | null
          created_at?: string
          date?: string
          fat_g?: number
          food_id?: string | null
          id?: string
          kcal?: number
          label?: string | null
          meal?: string
          protein_g?: number
          quantity?: number
          recipe_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "food_log_entries_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "food_log_entries_food_id_fkey"
            columns: ["food_id"]
            isOneToOne: false
            referencedRelation: "foods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "food_log_entries_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      foods: {
        Row: {
          brand: string | null
          carbs_g: number
          category: string | null
          created_at: string
          fat_g: number
          id: string
          kcal: number
          name: string
          protein_g: number
          source: string
        }
        Insert: {
          brand?: string | null
          carbs_g: number
          category?: string | null
          created_at?: string
          fat_g: number
          id?: string
          kcal: number
          name: string
          protein_g: number
          source?: string
        }
        Update: {
          brand?: string | null
          carbs_g?: number
          category?: string | null
          created_at?: string
          fat_g?: number
          id?: string
          kcal?: number
          name?: string
          protein_g?: number
          source?: string
        }
        Relationships: []
      }
      intake_forms: {
        Row: {
          answers: Json | null
          booking_id: string
          converted_client_id: string | null
          created_at: string
          id: string
          status: string
          summary: Json | null
          tests: Json | null
          updated_at: string
        }
        Insert: {
          answers?: Json | null
          booking_id: string
          converted_client_id?: string | null
          created_at?: string
          id?: string
          status?: string
          summary?: Json | null
          tests?: Json | null
          updated_at?: string
        }
        Update: {
          answers?: Json | null
          booking_id?: string
          converted_client_id?: string | null
          created_at?: string
          id?: string
          status?: string
          summary?: Json | null
          tests?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "intake_forms_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intake_forms_converted_client_id_fkey"
            columns: ["converted_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      integrations: {
        Row: {
          connected_at: string | null
          created_at: string
          id: string
          last_sync_at: string | null
          provider: string
          shared_scopes: Json
          status: string
          user_id: string
        }
        Insert: {
          connected_at?: string | null
          created_at?: string
          id?: string
          last_sync_at?: string | null
          provider: string
          shared_scopes?: Json
          status?: string
          user_id: string
        }
        Update: {
          connected_at?: string | null
          created_at?: string
          id?: string
          last_sync_at?: string | null
          provider?: string
          shared_scopes?: Json
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "integrations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount_eur: number | null
          client_id: string
          created_at: string
          id: string
          issued_on: string
          number: string
          status: string
          subscription_id: string
        }
        Insert: {
          amount_eur?: number | null
          client_id: string
          created_at?: string
          id?: string
          issued_on: string
          number: string
          status?: string
          subscription_id: string
        }
        Update: {
          amount_eur?: number | null
          client_id?: string
          created_at?: string
          id?: string
          issued_on?: string
          number?: string
          status?: string
          subscription_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_plan_templates: {
        Row: {
          coach_id: string
          created_at: string
          description: string | null
          goal: string
          id: string
          kcal_target: number
          meals: Json
          name: string
          updated_at: string
        }
        Insert: {
          coach_id: string
          created_at?: string
          description?: string | null
          goal: string
          id?: string
          kcal_target: number
          meals?: Json
          name: string
          updated_at?: string
        }
        Update: {
          coach_id?: string
          created_at?: string
          description?: string | null
          goal?: string
          id?: string
          kcal_target?: number
          meals?: Json
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meal_plan_templates_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          client_id: string
          created_at: string
          id: string
          kind: string
          payload: Json | null
          read_at: string | null
          sender: string
          sender_id: string | null
        }
        Insert: {
          body: string
          client_id: string
          created_at?: string
          id?: string
          kind?: string
          payload?: Json | null
          read_at?: string | null
          sender: string
          sender_id?: string | null
        }
        Update: {
          body?: string
          client_id?: string
          created_at?: string
          id?: string
          kind?: string
          payload?: Json | null
          read_at?: string | null
          sender?: string
          sender_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      nutrition_goals: {
        Row: {
          carbs_g: number
          client_id: string
          day_type: string
          fat_g: number
          id: string
          kcal: number
          protein_g: number
          updated_at: string
        }
        Insert: {
          carbs_g: number
          client_id: string
          day_type: string
          fat_g: number
          id?: string
          kcal: number
          protein_g: number
          updated_at?: string
        }
        Update: {
          carbs_g?: number
          client_id?: string
          day_type?: string
          fat_g?: number
          id?: string
          kcal?: number
          protein_g?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "nutrition_goals_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          coach_id: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          initials: string
          role: string
          updated_at: string
        }
        Insert: {
          coach_id?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id: string
          initials: string
          role: string
          updated_at?: string
        }
        Update: {
          coach_id?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          initials?: string
          role?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      program_templates: {
        Row: {
          coach_id: string
          created_at: string
          description: string | null
          goal: string
          id: string
          level: string | null
          name: string
          sessions_per_week: number
          updated_at: string
          weeks: number
        }
        Insert: {
          coach_id: string
          created_at?: string
          description?: string | null
          goal: string
          id?: string
          level?: string | null
          name: string
          sessions_per_week?: number
          updated_at?: string
          weeks?: number
        }
        Update: {
          coach_id?: string
          created_at?: string
          description?: string | null
          goal?: string
          id?: string
          level?: string | null
          name?: string
          sessions_per_week?: number
          updated_at?: string
          weeks?: number
        }
        Relationships: [
          {
            foreignKeyName: "program_templates_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      recipes: {
        Row: {
          carbs_g: number
          coach_id: string
          created_at: string
          fat_g: number
          id: string
          ingredients: Json
          kcal_per_serving: number
          name: string
          protein_g: number
          servings: number
          steps: string | null
          tags: string[]
        }
        Insert: {
          carbs_g: number
          coach_id: string
          created_at?: string
          fat_g: number
          id?: string
          ingredients?: Json
          kcal_per_serving: number
          name: string
          protein_g: number
          servings?: number
          steps?: string | null
          tags?: string[]
        }
        Update: {
          carbs_g?: number
          coach_id?: string
          created_at?: string
          fat_g?: number
          id?: string
          ingredients?: Json
          kcal_per_serving?: number
          name?: string
          protein_g?: number
          servings?: number
          steps?: string | null
          tags?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "recipes_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      session_exercises: {
        Row: {
          client_id: string
          client_session_id: string
          consigne: string | null
          exercise_id: string
          id: string
          position: number
          rest_s: number | null
        }
        Insert: {
          client_id: string
          client_session_id: string
          consigne?: string | null
          exercise_id: string
          id?: string
          position?: number
          rest_s?: number | null
        }
        Update: {
          client_id?: string
          client_session_id?: string
          consigne?: string | null
          exercise_id?: string
          id?: string
          position?: number
          rest_s?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "session_exercises_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_exercises_client_session_id_fkey"
            columns: ["client_session_id"]
            isOneToOne: false
            referencedRelation: "client_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      session_feedback: {
        Row: {
          client_id: string
          client_session_id: string
          created_at: string
          feeling: string
          handled_at: string | null
          id: string
          note: string | null
          pain_zone: string | null
          rpe: number
        }
        Insert: {
          client_id: string
          client_session_id: string
          created_at?: string
          feeling: string
          handled_at?: string | null
          id?: string
          note?: string | null
          pain_zone?: string | null
          rpe: number
        }
        Update: {
          client_id?: string
          client_session_id?: string
          created_at?: string
          feeling?: string
          handled_at?: string | null
          id?: string
          note?: string | null
          pain_zone?: string | null
          rpe?: number
        }
        Relationships: [
          {
            foreignKeyName: "session_feedback_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_feedback_client_session_id_fkey"
            columns: ["client_session_id"]
            isOneToOne: false
            referencedRelation: "client_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      sets: {
        Row: {
          client_id: string
          done: boolean
          id: string
          load_kg: number | null
          reps: number | null
          rpe: number | null
          session_exercise_id: string
          set_number: number
          target_load_kg: number | null
          target_reps: number | null
          target_rpe: number | null
        }
        Insert: {
          client_id: string
          done?: boolean
          id?: string
          load_kg?: number | null
          reps?: number | null
          rpe?: number | null
          session_exercise_id: string
          set_number: number
          target_load_kg?: number | null
          target_reps?: number | null
          target_rpe?: number | null
        }
        Update: {
          client_id?: string
          done?: boolean
          id?: string
          load_kg?: number | null
          reps?: number | null
          rpe?: number | null
          session_exercise_id?: string
          set_number?: number
          target_load_kg?: number | null
          target_reps?: number | null
          target_rpe?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sets_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sets_session_exercise_id_fkey"
            columns: ["session_exercise_id"]
            isOneToOne: false
            referencedRelation: "session_exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      shopping_items: {
        Row: {
          checked: boolean
          client_id: string
          created_at: string
          id: string
          name: string
          quantity: string | null
        }
        Insert: {
          checked?: boolean
          client_id: string
          created_at?: string
          id?: string
          name: string
          quantity?: string | null
        }
        Update: {
          checked?: boolean
          client_id?: string
          created_at?: string
          id?: string
          name?: string
          quantity?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shopping_items_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          client_id: string
          created_at: string
          id: string
          period: string
          plan_name: string
          price_eur: number | null
          renews_on: string
          starts_on: string
          status: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          period?: string
          plan_name: string
          price_eur?: number | null
          renews_on: string
          starts_on: string
          status?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          period?: string
          plan_name?: string
          price_eur?: number | null
          renews_on?: string
          starts_on?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      supplement_intakes: {
        Row: {
          client_id: string
          date: string
          id: string
          supplement_id: string
        }
        Insert: {
          client_id: string
          date: string
          id?: string
          supplement_id: string
        }
        Update: {
          client_id?: string
          date?: string
          id?: string
          supplement_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplement_intakes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplement_intakes_supplement_id_fkey"
            columns: ["supplement_id"]
            isOneToOne: false
            referencedRelation: "supplements"
            referencedColumns: ["id"]
          },
        ]
      }
      supplements: {
        Row: {
          active: boolean
          client_id: string
          created_at: string
          dose: string | null
          id: string
          name: string
          timing: string | null
        }
        Insert: {
          active?: boolean
          client_id: string
          created_at?: string
          dose?: string | null
          id?: string
          name: string
          timing?: string | null
        }
        Update: {
          active?: boolean
          client_id?: string
          created_at?: string
          dose?: string | null
          id?: string
          name?: string
          timing?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplements_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      template_exercises: {
        Row: {
          consigne: string | null
          exercise_id: string
          id: string
          load_kg: number | null
          position: number
          reps: string
          rest_s: number | null
          sets: number
          target_rpe: number | null
          template_session_id: string
        }
        Insert: {
          consigne?: string | null
          exercise_id: string
          id?: string
          load_kg?: number | null
          position?: number
          reps?: string
          rest_s?: number | null
          sets?: number
          target_rpe?: number | null
          template_session_id: string
        }
        Update: {
          consigne?: string | null
          exercise_id?: string
          id?: string
          load_kg?: number | null
          position?: number
          reps?: string
          rest_s?: number | null
          sets?: number
          target_rpe?: number | null
          template_session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_exercises_template_session_id_fkey"
            columns: ["template_session_id"]
            isOneToOne: false
            referencedRelation: "template_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      template_sessions: {
        Row: {
          id: string
          label: string
          name: string
          position: number
          template_id: string
        }
        Insert: {
          id?: string
          label: string
          name: string
          position?: number
          template_id: string
        }
        Update: {
          id?: string
          label?: string
          name?: string
          position?: number
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_sessions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "program_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      weight_logs: {
        Row: {
          client_id: string
          created_at: string
          date: string
          id: string
          source: string
          weight_kg: number
        }
        Insert: {
          client_id: string
          created_at?: string
          date: string
          id?: string
          source?: string
          weight_kg: number
        }
        Update: {
          client_id?: string
          created_at?: string
          date?: string
          id?: string
          source?: string
          weight_kg?: number
        }
        Relationships: [
          {
            foreignKeyName: "weight_logs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      _demo_copy_program: {
        Args: {
          p_adaptations: Json
          p_client: string
          p_done_weeks: number
          p_template: string
          p_weeks: number
        }
        Returns: string
      }
      book_slot: {
        Args: {
          p_email: string
          p_format: string
          p_full_name: string
          p_phone: string
          p_slot_id: string
        }
        Returns: string
      }
      can_access_client: { Args: { p_client_id: string }; Returns: boolean }
      coach_owns_client: { Args: { p_client_id: string }; Returns: boolean }
      is_coach: { Args: never; Returns: boolean }
      my_client_id: { Args: never; Returns: string }
      my_coach_id: { Args: never; Returns: string }
      my_role: { Args: never; Returns: string }
      reset_demo: { Args: never; Returns: undefined }
      seed_demo: { Args: never; Returns: undefined }
      submit_intake: {
        Args: { p_answers: Json; p_booking_id: string }
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
  public: {
    Enums: {},
  },
} as const
