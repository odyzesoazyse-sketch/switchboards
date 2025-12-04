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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          battle_id: string | null
          created_at: string
          event_details: Json | null
          event_type: string
          id: string
          user_id: string | null
        }
        Insert: {
          battle_id?: string | null
          created_at?: string
          event_details?: Json | null
          event_type: string
          id?: string
          user_id?: string | null
        }
        Update: {
          battle_id?: string | null
          created_at?: string
          event_details?: Json | null
          event_type?: string
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_battle_id_fkey"
            columns: ["battle_id"]
            isOneToOne: false
            referencedRelation: "battles"
            referencedColumns: ["id"]
          },
        ]
      }
      battles: {
        Row: {
          created_at: string
          date: string
          id: string
          location: string | null
          name: string
          organizer_id: string
          phase: Database["public"]["Enums"]["battle_phase"]
          seed_code: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          location?: string | null
          name: string
          organizer_id: string
          phase?: Database["public"]["Enums"]["battle_phase"]
          seed_code?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          location?: string | null
          name?: string
          organizer_id?: string
          phase?: Database["public"]["Enums"]["battle_phase"]
          seed_code?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "battles_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          battle_id: string
          created_at: string
          id: string
          message: string
          user_id: string | null
          user_name: string
        }
        Insert: {
          battle_id: string
          created_at?: string
          id?: string
          message: string
          user_id?: string | null
          user_name: string
        }
        Update: {
          battle_id?: string
          created_at?: string
          id?: string
          message?: string
          user_id?: string | null
          user_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_battle_id_fkey"
            columns: ["battle_id"]
            isOneToOne: false
            referencedRelation: "battles"
            referencedColumns: ["id"]
          },
        ]
      }
      dancers: {
        Row: {
          achievements: Json | null
          age: number | null
          average_score: number | null
          battles_count: number | null
          bio: string | null
          city: string | null
          created_at: string
          id: string
          instagram: string | null
          is_qualified: boolean | null
          name: string
          nomination_id: string
          photo_url: string | null
          position: number | null
          video_url: string | null
          wins_count: number | null
        }
        Insert: {
          achievements?: Json | null
          age?: number | null
          average_score?: number | null
          battles_count?: number | null
          bio?: string | null
          city?: string | null
          created_at?: string
          id?: string
          instagram?: string | null
          is_qualified?: boolean | null
          name: string
          nomination_id: string
          photo_url?: string | null
          position?: number | null
          video_url?: string | null
          wins_count?: number | null
        }
        Update: {
          achievements?: Json | null
          age?: number | null
          average_score?: number | null
          battles_count?: number | null
          bio?: string | null
          city?: string | null
          created_at?: string
          id?: string
          instagram?: string | null
          is_qualified?: boolean | null
          name?: string
          nomination_id?: string
          photo_url?: string | null
          position?: number | null
          video_url?: string | null
          wins_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "dancers_nomination_id_fkey"
            columns: ["nomination_id"]
            isOneToOne: false
            referencedRelation: "nominations"
            referencedColumns: ["id"]
          },
        ]
      }
      judge_applications: {
        Row: {
          battle_id: string
          created_at: string
          id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          battle_id: string
          created_at?: string
          id?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          battle_id?: string
          created_at?: string
          id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "judge_applications_battle_id_fkey"
            columns: ["battle_id"]
            isOneToOne: false
            referencedRelation: "battles"
            referencedColumns: ["id"]
          },
        ]
      }
      judge_ratings: {
        Row: {
          battle_id: string
          comment: string | null
          created_at: string
          created_by: string | null
          id: string
          judge_id: string
          rating: number | null
        }
        Insert: {
          battle_id: string
          comment?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          judge_id: string
          rating?: number | null
        }
        Update: {
          battle_id?: string
          comment?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          judge_id?: string
          rating?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "judge_ratings_battle_id_fkey"
            columns: ["battle_id"]
            isOneToOne: false
            referencedRelation: "battles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "judge_ratings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "judge_ratings_judge_id_fkey"
            columns: ["judge_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      match_votes: {
        Row: {
          created_at: string
          id: string
          judge_id: string
          match_id: string
          round_number: number
          slider_musicality: number | null
          slider_performance: number | null
          slider_technique: number | null
          vote_for: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          judge_id: string
          match_id: string
          round_number?: number
          slider_musicality?: number | null
          slider_performance?: number | null
          slider_technique?: number | null
          vote_for?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          judge_id?: string
          match_id?: string
          round_number?: number
          slider_musicality?: number | null
          slider_performance?: number | null
          slider_technique?: number | null
          vote_for?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "match_votes_judge_id_fkey"
            columns: ["judge_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_votes_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_votes_vote_for_fkey"
            columns: ["vote_for"]
            isOneToOne: false
            referencedRelation: "dancers"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          created_at: string
          dancer_left_id: string | null
          dancer_right_id: string | null
          id: string
          is_completed: boolean | null
          nomination_id: string
          position: number
          round: string
          votes_left: number | null
          votes_right: number | null
          winner_id: string | null
        }
        Insert: {
          created_at?: string
          dancer_left_id?: string | null
          dancer_right_id?: string | null
          id?: string
          is_completed?: boolean | null
          nomination_id: string
          position: number
          round: string
          votes_left?: number | null
          votes_right?: number | null
          winner_id?: string | null
        }
        Update: {
          created_at?: string
          dancer_left_id?: string | null
          dancer_right_id?: string | null
          id?: string
          is_completed?: boolean | null
          nomination_id?: string
          position?: number
          round?: string
          votes_left?: number | null
          votes_right?: number | null
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "matches_dancer_left_id_fkey"
            columns: ["dancer_left_id"]
            isOneToOne: false
            referencedRelation: "dancers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_dancer_right_id_fkey"
            columns: ["dancer_right_id"]
            isOneToOne: false
            referencedRelation: "dancers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_nomination_id_fkey"
            columns: ["nomination_id"]
            isOneToOne: false
            referencedRelation: "nominations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "dancers"
            referencedColumns: ["id"]
          },
        ]
      }
      nominations: {
        Row: {
          allow_ties: boolean | null
          battle_id: string
          created_at: string
          description: string | null
          id: string
          judging_criteria: Json | null
          judging_mode: string
          max_dancers: number | null
          name: string
          phase: Database["public"]["Enums"]["battle_phase"]
          rounds_to_win: number | null
          top_count: number | null
        }
        Insert: {
          allow_ties?: boolean | null
          battle_id: string
          created_at?: string
          description?: string | null
          id?: string
          judging_criteria?: Json | null
          judging_mode?: string
          max_dancers?: number | null
          name: string
          phase?: Database["public"]["Enums"]["battle_phase"]
          rounds_to_win?: number | null
          top_count?: number | null
        }
        Update: {
          allow_ties?: boolean | null
          battle_id?: string
          created_at?: string
          description?: string | null
          id?: string
          judging_criteria?: Json | null
          judging_mode?: string
          max_dancers?: number | null
          name?: string
          phase?: Database["public"]["Enums"]["battle_phase"]
          rounds_to_win?: number | null
          top_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "nominations_battle_id_fkey"
            columns: ["battle_id"]
            isOneToOne: false
            referencedRelation: "battles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          city: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          judge_avg_rating: number | null
          judge_battles_count: number | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          judge_avg_rating?: number | null
          judge_battles_count?: number | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          judge_avg_rating?: number | null
          judge_battles_count?: number | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      scores: {
        Row: {
          created_at: string
          creativity: number | null
          dancer_id: string
          energy: number | null
          id: string
          judge_id: string
          technique: number | null
          total: number | null
        }
        Insert: {
          created_at?: string
          creativity?: number | null
          dancer_id: string
          energy?: number | null
          id?: string
          judge_id: string
          technique?: number | null
          total?: number | null
        }
        Update: {
          created_at?: string
          creativity?: number | null
          dancer_id?: string
          energy?: number | null
          id?: string
          judge_id?: string
          technique?: number | null
          total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "scores_dancer_id_fkey"
            columns: ["dancer_id"]
            isOneToOne: false
            referencedRelation: "dancers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scores_judge_id_fkey"
            columns: ["judge_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      screen_state: {
        Row: {
          active_template_id: string | null
          animation_style: string | null
          background_color: string | null
          background_gradient_from: string | null
          background_gradient_to: string | null
          background_image_url: string | null
          background_type: string | null
          battle_id: string
          created_at: string
          current_match_id: string | null
          current_round: number | null
          custom_message: string | null
          font_size: string | null
          id: string
          match_status: string | null
          nomination_id: string | null
          rounds_to_win: number | null
          show_battle_name: boolean | null
          show_bracket: boolean | null
          show_custom_message: boolean | null
          show_judges: boolean | null
          show_round_info: boolean | null
          show_score: boolean | null
          show_template: boolean | null
          show_timer: boolean | null
          show_winner: boolean | null
          sound_enabled: boolean | null
          theme_preset: string | null
          timer_end_time: string | null
          timer_running: boolean | null
          timer_seconds: number | null
          updated_at: string
          votes_left: number | null
          votes_right: number | null
        }
        Insert: {
          active_template_id?: string | null
          animation_style?: string | null
          background_color?: string | null
          background_gradient_from?: string | null
          background_gradient_to?: string | null
          background_image_url?: string | null
          background_type?: string | null
          battle_id: string
          created_at?: string
          current_match_id?: string | null
          current_round?: number | null
          custom_message?: string | null
          font_size?: string | null
          id?: string
          match_status?: string | null
          nomination_id?: string | null
          rounds_to_win?: number | null
          show_battle_name?: boolean | null
          show_bracket?: boolean | null
          show_custom_message?: boolean | null
          show_judges?: boolean | null
          show_round_info?: boolean | null
          show_score?: boolean | null
          show_template?: boolean | null
          show_timer?: boolean | null
          show_winner?: boolean | null
          sound_enabled?: boolean | null
          theme_preset?: string | null
          timer_end_time?: string | null
          timer_running?: boolean | null
          timer_seconds?: number | null
          updated_at?: string
          votes_left?: number | null
          votes_right?: number | null
        }
        Update: {
          active_template_id?: string | null
          animation_style?: string | null
          background_color?: string | null
          background_gradient_from?: string | null
          background_gradient_to?: string | null
          background_image_url?: string | null
          background_type?: string | null
          battle_id?: string
          created_at?: string
          current_match_id?: string | null
          current_round?: number | null
          custom_message?: string | null
          font_size?: string | null
          id?: string
          match_status?: string | null
          nomination_id?: string | null
          rounds_to_win?: number | null
          show_battle_name?: boolean | null
          show_bracket?: boolean | null
          show_custom_message?: boolean | null
          show_judges?: boolean | null
          show_round_info?: boolean | null
          show_score?: boolean | null
          show_template?: boolean | null
          show_timer?: boolean | null
          show_winner?: boolean | null
          sound_enabled?: boolean | null
          theme_preset?: string | null
          timer_end_time?: string | null
          timer_running?: boolean | null
          timer_seconds?: number | null
          updated_at?: string
          votes_left?: number | null
          votes_right?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "screen_state_active_template_id_fkey"
            columns: ["active_template_id"]
            isOneToOne: false
            referencedRelation: "screen_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "screen_state_battle_id_fkey"
            columns: ["battle_id"]
            isOneToOne: false
            referencedRelation: "battles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "screen_state_current_match_id_fkey"
            columns: ["current_match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "screen_state_nomination_id_fkey"
            columns: ["nomination_id"]
            isOneToOne: false
            referencedRelation: "nominations"
            referencedColumns: ["id"]
          },
        ]
      }
      screen_templates: {
        Row: {
          background_color: string | null
          background_gradient_from: string | null
          background_gradient_to: string | null
          battle_id: string
          created_at: string
          duration_seconds: number | null
          id: string
          image_url: string | null
          name: string
          subtitle: string | null
          template_type: string
          title: string | null
        }
        Insert: {
          background_color?: string | null
          background_gradient_from?: string | null
          background_gradient_to?: string | null
          battle_id: string
          created_at?: string
          duration_seconds?: number | null
          id?: string
          image_url?: string | null
          name: string
          subtitle?: string | null
          template_type?: string
          title?: string | null
        }
        Update: {
          background_color?: string | null
          background_gradient_from?: string | null
          background_gradient_to?: string | null
          battle_id?: string
          created_at?: string
          duration_seconds?: number | null
          id?: string
          image_url?: string | null
          name?: string
          subtitle?: string | null
          template_type?: string
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "screen_templates_battle_id_fkey"
            columns: ["battle_id"]
            isOneToOne: false
            referencedRelation: "battles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          battle_id: string | null
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          battle_id?: string | null
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          battle_id?: string | null
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      advance_winner_to_next_match: {
        Args: { p_match_id: string; p_winner_id: string }
        Returns: undefined
      }
      create_activity_log: {
        Args: {
          p_battle_id: string
          p_event_details?: Json
          p_event_type: string
        }
        Returns: string
      }
    }
    Enums: {
      app_role:
        | "organizer"
        | "judge"
        | "selector"
        | "operator"
        | "participant"
        | "spectator"
      battle_phase: "registration" | "selection" | "bracket" | "completed"
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
      app_role: [
        "organizer",
        "judge",
        "selector",
        "operator",
        "participant",
        "spectator",
      ],
      battle_phase: ["registration", "selection", "bracket", "completed"],
    },
  },
} as const
