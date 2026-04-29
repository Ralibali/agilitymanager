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
      achievements: {
        Row: {
          achievement_key: string
          dog_id: string | null
          id: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          achievement_key: string
          dog_id?: string | null
          id?: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          achievement_key?: string
          dog_id?: string | null
          id?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "achievements_dog_id_fkey"
            columns: ["dog_id"]
            isOneToOne: false
            referencedRelation: "dogs"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_posts: {
        Row: {
          author: string
          category: string
          content: string
          created_at: string
          date: string
          excerpt: string
          id: string
          published: boolean
          read_time: number
          seo_description: string | null
          seo_title: string | null
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          author?: string
          category?: string
          content?: string
          created_at?: string
          date?: string
          excerpt?: string
          id?: string
          published?: boolean
          read_time?: number
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          author?: string
          category?: string
          content?: string
          created_at?: string
          date?: string
          excerpt?: string
          id?: string
          published?: boolean
          read_time?: number
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      breeds: {
        Row: {
          agility_challenges: string
          agility_popularity_rank: number | null
          agility_profile: string
          agility_strengths: string
          agility_suitability: number | null
          breed_group: string | null
          created_at: string
          description: string
          hoopers_suitability: number | null
          id: string
          image_attribution: string | null
          image_url: string | null
          life_expectancy: string | null
          long_description: string
          name: string
          name_en: string | null
          origin_country: string | null
          popular_in_sweden: boolean
          published: boolean
          seo_description: string | null
          seo_title: string | null
          short_description: string
          size_class: string
          slug: string
          suitable_class: string | null
          temperament: string[]
          training_tips: string
          typical_height_cm: string | null
          typical_weight_kg: string | null
          updated_at: string
        }
        Insert: {
          agility_challenges?: string
          agility_popularity_rank?: number | null
          agility_profile?: string
          agility_strengths?: string
          agility_suitability?: number | null
          breed_group?: string | null
          created_at?: string
          description?: string
          hoopers_suitability?: number | null
          id?: string
          image_attribution?: string | null
          image_url?: string | null
          life_expectancy?: string | null
          long_description?: string
          name: string
          name_en?: string | null
          origin_country?: string | null
          popular_in_sweden?: boolean
          published?: boolean
          seo_description?: string | null
          seo_title?: string | null
          short_description?: string
          size_class?: string
          slug: string
          suitable_class?: string | null
          temperament?: string[]
          training_tips?: string
          typical_height_cm?: string | null
          typical_weight_kg?: string | null
          updated_at?: string
        }
        Update: {
          agility_challenges?: string
          agility_popularity_rank?: number | null
          agility_profile?: string
          agility_strengths?: string
          agility_suitability?: number | null
          breed_group?: string | null
          created_at?: string
          description?: string
          hoopers_suitability?: number | null
          id?: string
          image_attribution?: string | null
          image_url?: string | null
          life_expectancy?: string | null
          long_description?: string
          name?: string
          name_en?: string | null
          origin_country?: string | null
          popular_in_sweden?: boolean
          published?: boolean
          seo_description?: string | null
          seo_title?: string | null
          short_description?: string
          size_class?: string
          slug?: string
          suitable_class?: string | null
          temperament?: string[]
          training_tips?: string
          typical_height_cm?: string | null
          typical_weight_kg?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      cached_dog_results: {
        Row: {
          breed: string
          created_at: string
          dog_id: string
          dog_name: string
          fetched_at: string
          handler: string
          id: string
          reg_name: string
          reg_nr: string
          results: Json
          user_id: string
        }
        Insert: {
          breed?: string
          created_at?: string
          dog_id: string
          dog_name?: string
          fetched_at?: string
          handler?: string
          id?: string
          reg_name?: string
          reg_nr?: string
          results?: Json
          user_id: string
        }
        Update: {
          breed?: string
          created_at?: string
          dog_id?: string
          dog_name?: string
          fetched_at?: string
          handler?: string
          id?: string
          reg_name?: string
          reg_nr?: string
          results?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cached_dog_results_dog_id_fkey"
            columns: ["dog_id"]
            isOneToOne: false
            referencedRelation: "dogs"
            referencedColumns: ["id"]
          },
        ]
      }
      club_event_signups: {
        Row: {
          comment: string
          created_at: string
          event_id: string
          id: string
          status: string
          user_id: string
        }
        Insert: {
          comment?: string
          created_at?: string
          event_id: string
          id?: string
          status?: string
          user_id: string
        }
        Update: {
          comment?: string
          created_at?: string
          event_id?: string
          id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_event_signups_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "club_events"
            referencedColumns: ["id"]
          },
        ]
      }
      club_events: {
        Row: {
          club_id: string
          created_at: string
          date: string
          description: string
          event_type: string
          group_id: string | null
          id: string
          location: string
          max_participants: number | null
          title: string
          user_id: string
        }
        Insert: {
          club_id: string
          created_at?: string
          date: string
          description?: string
          event_type?: string
          group_id?: string | null
          id?: string
          location?: string
          max_participants?: number | null
          title: string
          user_id: string
        }
        Update: {
          club_id?: string
          created_at?: string
          date?: string
          description?: string
          event_type?: string
          group_id?: string | null
          id?: string
          location?: string
          max_participants?: number | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_events_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_events_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "club_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      club_group_members: {
        Row: {
          group_id: string
          id: string
          joined_at: string
          user_id: string
        }
        Insert: {
          group_id: string
          id?: string
          joined_at?: string
          user_id: string
        }
        Update: {
          group_id?: string
          id?: string
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "club_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      club_groups: {
        Row: {
          club_id: string
          created_at: string
          description: string
          id: string
          name: string
        }
        Insert: {
          club_id: string
          created_at?: string
          description?: string
          id?: string
          name: string
        }
        Update: {
          club_id?: string
          created_at?: string
          description?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_groups_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      club_members: {
        Row: {
          club_id: string
          id: string
          joined_at: string
          role: string
          status: string
          user_id: string
        }
        Insert: {
          club_id: string
          id?: string
          joined_at?: string
          role?: string
          status?: string
          user_id: string
        }
        Update: {
          club_id?: string
          id?: string
          joined_at?: string
          role?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_members_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      club_posts: {
        Row: {
          club_id: string
          content: string
          created_at: string
          id: string
          pinned: boolean
          user_id: string
        }
        Insert: {
          club_id: string
          content: string
          created_at?: string
          id?: string
          pinned?: boolean
          user_id: string
        }
        Update: {
          club_id?: string
          content?: string
          created_at?: string
          id?: string
          pinned?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_posts_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      clubs: {
        Row: {
          city: string
          created_at: string
          created_by: string
          description: string
          id: string
          invite_code: string
          logo_url: string | null
          name: string
          quick_tags: string[]
          region: string | null
          slug: string | null
          updated_at: string
        }
        Insert: {
          city?: string
          created_at?: string
          created_by: string
          description?: string
          id?: string
          invite_code?: string
          logo_url?: string | null
          name: string
          quick_tags?: string[]
          region?: string | null
          slug?: string | null
          updated_at?: string
        }
        Update: {
          city?: string
          created_at?: string
          created_by?: string
          description?: string
          id?: string
          invite_code?: string
          logo_url?: string | null
          name?: string
          quick_tags?: string[]
          region?: string | null
          slug?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      coach_feedback: {
        Row: {
          ai_response: string | null
          coach_response: string | null
          created_at: string
          dog_id: string | null
          id: string
          question: string
          sport: string
          status: string
          user_id: string
          video_url: string
        }
        Insert: {
          ai_response?: string | null
          coach_response?: string | null
          created_at?: string
          dog_id?: string | null
          id?: string
          question: string
          sport?: string
          status?: string
          user_id: string
          video_url: string
        }
        Update: {
          ai_response?: string | null
          coach_response?: string | null
          created_at?: string
          dog_id?: string | null
          id?: string
          question?: string
          sport?: string
          status?: string
          user_id?: string
          video_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_feedback_dog_id_fkey"
            columns: ["dog_id"]
            isOneToOne: false
            referencedRelation: "dogs"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_feedback_messages: {
        Row: {
          content: string
          created_at: string
          feedback_id: string
          id: string
          sender: string
        }
        Insert: {
          content: string
          created_at?: string
          feedback_id: string
          id?: string
          sender: string
        }
        Update: {
          content?: string
          created_at?: string
          feedback_id?: string
          id?: string
          sender?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_feedback_messages_feedback_id_fkey"
            columns: ["feedback_id"]
            isOneToOne: false
            referencedRelation: "coach_feedback"
            referencedColumns: ["id"]
          },
        ]
      }
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
      competition_reminders: {
        Row: {
          channel: string
          created_at: string
          days_before: number
          id: string
          planned_competition_id: string
          sent_at: string | null
          user_id: string
        }
        Insert: {
          channel?: string
          created_at?: string
          days_before: number
          id?: string
          planned_competition_id: string
          sent_at?: string | null
          user_id: string
        }
        Update: {
          channel?: string
          created_at?: string
          days_before?: number
          id?: string
          planned_competition_id?: string
          sent_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "competition_reminders_planned_competition_id_fkey"
            columns: ["planned_competition_id"]
            isOneToOne: false
            referencedRelation: "planned_competitions"
            referencedColumns: ["id"]
          },
        ]
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
          hoopers_points: number | null
          id: string
          lopp_number: number | null
          notes: string
          organizer: string
          passed: boolean
          placement: number | null
          size_class: Database["public"]["Enums"]["size_class"]
          sport: Database["public"]["Enums"]["sport"]
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
          hoopers_points?: number | null
          id?: string
          lopp_number?: number | null
          notes?: string
          organizer?: string
          passed?: boolean
          placement?: number | null
          size_class?: Database["public"]["Enums"]["size_class"]
          sport?: Database["public"]["Enums"]["sport"]
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
          hoopers_points?: number | null
          id?: string
          lopp_number?: number | null
          notes?: string
          organizer?: string
          passed?: boolean
          placement?: number | null
          size_class?: Database["public"]["Enums"]["size_class"]
          sport?: Database["public"]["Enums"]["sport"]
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
          region: string | null
          source_url: string | null
          sport: string | null
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
          region?: string | null
          source_url?: string | null
          sport?: string | null
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
          region?: string | null
          source_url?: string | null
          sport?: string | null
          status?: string | null
          status_code?: string | null
        }
        Relationships: []
      }
      course_purchases: {
        Row: {
          amount_paid_sek: number
          course_id: string
          created_at: string
          id: string
          purchased_at: string
          status: string
          stripe_session_id: string | null
          user_id: string
        }
        Insert: {
          amount_paid_sek?: number
          course_id: string
          created_at?: string
          id?: string
          purchased_at?: string
          status?: string
          stripe_session_id?: string | null
          user_id: string
        }
        Update: {
          amount_paid_sek?: number
          course_id?: string
          created_at?: string
          id?: string
          purchased_at?: string
          status?: string
          stripe_session_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_purchases_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          category: string
          created_at: string
          description: string
          discounted_price_sek: number | null
          id: string
          image_url: string | null
          instructor_bio: string
          instructor_name: string
          long_description: string
          partner_name: string
          partner_url: string
          price_sek: number
          published: boolean
          slug: string
          stripe_price_id: string | null
          stripe_product_id: string | null
          title: string
          trailer_url: string | null
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string
          discounted_price_sek?: number | null
          id?: string
          image_url?: string | null
          instructor_bio?: string
          instructor_name?: string
          long_description?: string
          partner_name?: string
          partner_url?: string
          price_sek?: number
          published?: boolean
          slug: string
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          title: string
          trailer_url?: string | null
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          discounted_price_sek?: number | null
          id?: string
          image_url?: string | null
          instructor_bio?: string
          instructor_name?: string
          long_description?: string
          partner_name?: string
          partner_url?: string
          price_sek?: number
          published?: boolean
          slug?: string
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          title?: string
          trailer_url?: string | null
          updated_at?: string
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
          hoopers_level: Database["public"]["Enums"]["hoopers_level"]
          hoopers_size: Database["public"]["Enums"]["hoopers_size"]
          id: string
          is_active_competition_dog: boolean
          jumping_level: Database["public"]["Enums"]["competition_level"]
          name: string
          notes: string
          photo_url: string | null
          size_class: Database["public"]["Enums"]["size_class"]
          sport: Database["public"]["Enums"]["sport"]
          theme_color: string
          updated_at: string
          user_id: string
          withers_cm: number | null
        }
        Insert: {
          birthdate?: string | null
          breed?: string
          color?: string
          competition_level?: Database["public"]["Enums"]["competition_level"]
          created_at?: string
          gender?: Database["public"]["Enums"]["dog_gender"]
          hoopers_level?: Database["public"]["Enums"]["hoopers_level"]
          hoopers_size?: Database["public"]["Enums"]["hoopers_size"]
          id?: string
          is_active_competition_dog?: boolean
          jumping_level?: Database["public"]["Enums"]["competition_level"]
          name: string
          notes?: string
          photo_url?: string | null
          size_class?: Database["public"]["Enums"]["size_class"]
          sport?: Database["public"]["Enums"]["sport"]
          theme_color?: string
          updated_at?: string
          user_id: string
          withers_cm?: number | null
        }
        Update: {
          birthdate?: string | null
          breed?: string
          color?: string
          competition_level?: Database["public"]["Enums"]["competition_level"]
          created_at?: string
          gender?: Database["public"]["Enums"]["dog_gender"]
          hoopers_level?: Database["public"]["Enums"]["hoopers_level"]
          hoopers_size?: Database["public"]["Enums"]["hoopers_size"]
          id?: string
          is_active_competition_dog?: boolean
          jumping_level?: Database["public"]["Enums"]["competition_level"]
          name?: string
          notes?: string
          photo_url?: string | null
          size_class?: Database["public"]["Enums"]["size_class"]
          sport?: Database["public"]["Enums"]["sport"]
          theme_color?: string
          updated_at?: string
          user_id?: string
          withers_cm?: number | null
        }
        Relationships: []
      }
      friendships: {
        Row: {
          created_at: string
          id: string
          receiver_id: string
          requester_id: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          receiver_id: string
          requester_id: string
          status: string
        }
        Update: {
          created_at?: string
          id?: string
          receiver_id?: string
          requester_id?: string
          status?: string
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
      hoopers_competitions: {
        Row: {
          classes: string[] | null
          club_name: string | null
          competition_id: string
          competition_name: string | null
          contact_email: string | null
          contact_person: string | null
          county: string | null
          date: string | null
          extra_info: string | null
          fetched_at: string
          id: string
          judge: string | null
          location: string | null
          lopp_per_class: Json | null
          organizer: string | null
          price_per_lopp: string | null
          registration_closes: string | null
          registration_opens: string | null
          registration_status: string | null
          source_url: string | null
          type: string | null
        }
        Insert: {
          classes?: string[] | null
          club_name?: string | null
          competition_id: string
          competition_name?: string | null
          contact_email?: string | null
          contact_person?: string | null
          county?: string | null
          date?: string | null
          extra_info?: string | null
          fetched_at?: string
          id?: string
          judge?: string | null
          location?: string | null
          lopp_per_class?: Json | null
          organizer?: string | null
          price_per_lopp?: string | null
          registration_closes?: string | null
          registration_opens?: string | null
          registration_status?: string | null
          source_url?: string | null
          type?: string | null
        }
        Update: {
          classes?: string[] | null
          club_name?: string | null
          competition_id?: string
          competition_name?: string | null
          contact_email?: string | null
          contact_person?: string | null
          county?: string | null
          date?: string | null
          extra_info?: string | null
          fetched_at?: string
          id?: string
          judge?: string | null
          location?: string | null
          lopp_per_class?: Json | null
          organizer?: string | null
          price_per_lopp?: string | null
          registration_closes?: string | null
          registration_opens?: string | null
          registration_status?: string | null
          source_url?: string | null
          type?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          read: boolean
          receiver_id: string
          sender_id: string
          shared_data: Json | null
          shared_id: string | null
          shared_type: string | null
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          read?: boolean
          receiver_id: string
          sender_id: string
          shared_data?: Json | null
          shared_id?: string | null
          shared_type?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          read?: boolean
          receiver_id?: string
          sender_id?: string
          shared_data?: Json | null
          shared_id?: string | null
          shared_type?: string | null
        }
        Relationships: []
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
      planned_training: {
        Row: {
          completed: boolean
          created_at: string
          date: string
          description: string
          dog_id: string | null
          id: string
          location: string
          recurring: string
          reminder_minutes_before: number
          sport: string
          time_end: string | null
          time_start: string | null
          title: string
          training_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          date: string
          description?: string
          dog_id?: string | null
          id?: string
          location?: string
          recurring?: string
          reminder_minutes_before?: number
          sport?: string
          time_end?: string | null
          time_start?: string | null
          title: string
          training_type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          date?: string
          description?: string
          dog_id?: string | null
          id?: string
          location?: string
          recurring?: string
          reminder_minutes_before?: number
          sport?: string
          time_end?: string | null
          time_start?: string | null
          title?: string
          training_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "planned_training_dog_id_fkey"
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
          handler_first_name: string | null
          handler_last_name: string | null
          id: string
          legacy_price_locked_at: string | null
          legacy_pricing: boolean
          premium_until: string | null
          referral_code: string | null
          show_competitions_to_friends: boolean
          show_results_to_friends: boolean
          stripe_current_period_end: string | null
          stripe_customer_id: string | null
          stripe_price_id: string | null
          stripe_product_id: string | null
          stripe_subscription_status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          handler_first_name?: string | null
          handler_last_name?: string | null
          id?: string
          legacy_price_locked_at?: string | null
          legacy_pricing?: boolean
          premium_until?: string | null
          referral_code?: string | null
          show_competitions_to_friends?: boolean
          show_results_to_friends?: boolean
          stripe_current_period_end?: string | null
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          stripe_subscription_status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          handler_first_name?: string | null
          handler_last_name?: string | null
          id?: string
          legacy_price_locked_at?: string | null
          legacy_pricing?: boolean
          premium_until?: string | null
          referral_code?: string | null
          show_competitions_to_friends?: boolean
          show_results_to_friends?: boolean
          stripe_current_period_end?: string | null
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          stripe_subscription_status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      referral_rewards: {
        Row: {
          created_at: string
          days_granted: number
          id: string
          referred_converted_at: string | null
          referred_id: string
          referrer_id: string
          referrer_rewarded_at: string | null
        }
        Insert: {
          created_at?: string
          days_granted?: number
          id?: string
          referred_converted_at?: string | null
          referred_id: string
          referrer_id: string
          referrer_rewarded_at?: string | null
        }
        Update: {
          created_at?: string
          days_granted?: number
          id?: string
          referred_converted_at?: string | null
          referred_id?: string
          referrer_id?: string
          referrer_rewarded_at?: string | null
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
      shared_courses: {
        Row: {
          course_id: string
          created_at: string
          id: string
          message: string | null
          shared_by: string
          shared_with: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          message?: string | null
          shared_by: string
          shared_with: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          message?: string | null
          shared_by?: string
          shared_with?: string
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
      training_goals: {
        Row: {
          category: string
          created_at: string
          current_value: number | null
          description: string
          dog_id: string
          goal_type: string
          id: string
          status: string
          target_date: string | null
          target_value: number | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          current_value?: number | null
          description?: string
          dog_id: string
          goal_type?: string
          id?: string
          status?: string
          target_date?: string | null
          target_value?: number | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          current_value?: number | null
          description?: string
          dog_id?: string
          goal_type?: string
          id?: string
          status?: string
          target_date?: string | null
          target_value?: number | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_goals_dog_id_fkey"
            columns: ["dog_id"]
            isOneToOne: false
            referencedRelation: "dogs"
            referencedColumns: ["id"]
          },
        ]
      }
      training_milestones: {
        Row: {
          completed: boolean
          completed_at: string | null
          created_at: string
          goal_id: string
          id: string
          sort_order: number
          title: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          goal_id: string
          id?: string
          sort_order?: number
          title: string
          user_id: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          goal_id?: string
          id?: string
          sort_order?: number
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_milestones_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "training_goals"
            referencedColumns: ["id"]
          },
        ]
      }
      training_sessions: {
        Row: {
          banflyt_score: number | null
          best_time_sec: number | null
          created_at: string
          date: string
          dirigering_score: number | null
          dog_energy: number
          dog_id: string
          duration_min: number
          fault_count: number | null
          handler_energy: number
          handler_zone_kept: boolean | null
          id: string
          jump_height_used: string | null
          location: string | null
          notes_good: string
          notes_improve: string
          obstacles_trained: string[] | null
          overall_mood: number | null
          reps: number
          sport: Database["public"]["Enums"]["sport"]
          tags: string[]
          type: Database["public"]["Enums"]["training_type"]
          user_id: string
        }
        Insert: {
          banflyt_score?: number | null
          best_time_sec?: number | null
          created_at?: string
          date?: string
          dirigering_score?: number | null
          dog_energy?: number
          dog_id: string
          duration_min?: number
          fault_count?: number | null
          handler_energy?: number
          handler_zone_kept?: boolean | null
          id?: string
          jump_height_used?: string | null
          location?: string | null
          notes_good?: string
          notes_improve?: string
          obstacles_trained?: string[] | null
          overall_mood?: number | null
          reps?: number
          sport?: Database["public"]["Enums"]["sport"]
          tags?: string[]
          type?: Database["public"]["Enums"]["training_type"]
          user_id: string
        }
        Update: {
          banflyt_score?: number | null
          best_time_sec?: number | null
          created_at?: string
          date?: string
          dirigering_score?: number | null
          dog_energy?: number
          dog_id?: string
          duration_min?: number
          fault_count?: number | null
          handler_energy?: number
          handler_zone_kept?: boolean | null
          id?: string
          jump_height_used?: string | null
          location?: string | null
          notes_good?: string
          notes_improve?: string
          obstacles_trained?: string[] | null
          overall_mood?: number | null
          reps?: number
          sport?: Database["public"]["Enums"]["sport"]
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
      breed_stats: {
        Row: {
          active_competition_count: number | null
          agility_popularity_rank: number | null
          dog_count: number | null
          id: string | null
          name: string | null
          size_class: string | null
          slug: string | null
        }
        Relationships: []
      }
      hoopers_competitions_public: {
        Row: {
          classes: string[] | null
          club_name: string | null
          competition_id: string | null
          competition_name: string | null
          county: string | null
          date: string | null
          extra_info: string | null
          fetched_at: string | null
          id: string | null
          judge: string | null
          location: string | null
          lopp_per_class: Json | null
          organizer: string | null
          price_per_lopp: string | null
          registration_closes: string | null
          registration_opens: string | null
          registration_status: string | null
          source_url: string | null
          type: string | null
        }
        Insert: {
          classes?: string[] | null
          club_name?: string | null
          competition_id?: string | null
          competition_name?: string | null
          county?: string | null
          date?: string | null
          extra_info?: string | null
          fetched_at?: string | null
          id?: string | null
          judge?: string | null
          location?: string | null
          lopp_per_class?: Json | null
          organizer?: string | null
          price_per_lopp?: string | null
          registration_closes?: string | null
          registration_opens?: string | null
          registration_status?: string | null
          source_url?: string | null
          type?: string | null
        }
        Update: {
          classes?: string[] | null
          club_name?: string | null
          competition_id?: string | null
          competition_name?: string | null
          county?: string | null
          date?: string | null
          extra_info?: string | null
          fetched_at?: string | null
          id?: string | null
          judge?: string | null
          location?: string | null
          lopp_per_class?: Json | null
          organizer?: string | null
          price_per_lopp?: string | null
          registration_closes?: string | null
          registration_opens?: string | null
          registration_status?: string | null
          source_url?: string | null
          type?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_club_admin: {
        Args: { _club_id: string; _user_id: string }
        Returns: boolean
      }
      is_club_member: {
        Args: { _club_id: string; _user_id: string }
        Returns: boolean
      }
      is_friend: {
        Args: { _friend_id: string; _user_id: string }
        Returns: boolean
      }
      slugify: { Args: { input: string }; Returns: string }
    }
    Enums: {
      app_role: "admin" | "user"
      competition_level: "Nollklass" | "K1" | "K2" | "K3"
      competition_status: "sparad" | "anmäld" | "bekräftad" | "genomförd"
      discipline: "Agility" | "Jumping" | "Nollklass"
      dog_gender: "Hane" | "Tik"
      hoopers_level: "Startklass" | "Klass 1" | "Klass 2" | "Klass 3"
      hoopers_size: "Small" | "Large"
      size_class: "XS" | "S" | "M" | "L"
      sport: "Agility" | "Hoopers" | "Båda"
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
        | "Kombination"
        | "Dirigering"
        | "Hoop"
        | "Tunnel"
        | "Tunna"
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
      hoopers_level: ["Startklass", "Klass 1", "Klass 2", "Klass 3"],
      hoopers_size: ["Small", "Large"],
      size_class: ["XS", "S", "M", "L"],
      sport: ["Agility", "Hoopers", "Båda"],
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
        "Kombination",
        "Dirigering",
        "Hoop",
        "Tunnel",
        "Tunna",
      ],
    },
  },
} as const
