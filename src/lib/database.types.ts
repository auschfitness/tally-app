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
      app_state: {
        Row: {
          data: Json
          org_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          data?: Json
          org_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          data?: Json
          org_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "app_state_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_records: {
        Row: {
          id: string
          recorded_at: string
          recorded_by: string | null
          session_id: string
          source: string
          status: Database["public"]["Enums"]["attendance_status"]
          stick_id: string
        }
        Insert: {
          id?: string
          recorded_at?: string
          recorded_by?: string | null
          session_id: string
          source?: string
          status?: Database["public"]["Enums"]["attendance_status"]
          stick_id: string
        }
        Update: {
          id?: string
          recorded_at?: string
          recorded_by?: string | null
          session_id?: string
          source?: string
          status?: Database["public"]["Enums"]["attendance_status"]
          stick_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "attendance_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_stick_id_fkey"
            columns: ["stick_id"]
            isOneToOne: false
            referencedRelation: "sticks"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_sessions: {
        Row: {
          campus_id: string | null
          context_id: string | null
          context_type: Database["public"]["Enums"]["attendance_context"]
          created_at: string
          created_by: string | null
          id: string
          org_id: string
          photo: string | null
          session_date: string
          session_time: string | null
          title: string | null
        }
        Insert: {
          campus_id?: string | null
          context_id?: string | null
          context_type: Database["public"]["Enums"]["attendance_context"]
          created_at?: string
          created_by?: string | null
          id?: string
          org_id: string
          photo?: string | null
          session_date: string
          session_time?: string | null
          title?: string | null
        }
        Update: {
          campus_id?: string | null
          context_id?: string | null
          context_type?: Database["public"]["Enums"]["attendance_context"]
          created_at?: string
          created_by?: string | null
          id?: string
          org_id?: string
          photo?: string | null
          session_date?: string
          session_time?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_sessions_campus_id_fkey"
            columns: ["campus_id"]
            isOneToOne: false
            referencedRelation: "campuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_sessions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      bible_book_context: {
        Row: {
          audience: string | null
          author: string | null
          book: string
          date_range: string | null
          summary: string | null
          testament: string
          theme: string | null
          title_pt: string
          updated_at: string
        }
        Insert: {
          audience?: string | null
          author?: string | null
          book: string
          date_range?: string | null
          summary?: string | null
          testament: string
          theme?: string | null
          title_pt: string
          updated_at?: string
        }
        Update: {
          audience?: string | null
          author?: string | null
          book?: string
          date_range?: string | null
          summary?: string | null
          testament?: string
          theme?: string | null
          title_pt?: string
          updated_at?: string
        }
        Relationships: []
      }
      bible_original_tokens: {
        Row: {
          book: string
          chapter: number
          gloss: string | null
          id: number
          lang: string
          lemma: string | null
          morph: string | null
          position: number
          strong: string | null
          surface: string
          translit: string | null
          verse: number
        }
        Insert: {
          book: string
          chapter: number
          gloss?: string | null
          id?: never
          lang: string
          lemma?: string | null
          morph?: string | null
          position: number
          strong?: string | null
          surface: string
          translit?: string | null
          verse: number
        }
        Update: {
          book?: string
          chapter?: number
          gloss?: string | null
          id?: never
          lang?: string
          lemma?: string | null
          morph?: string | null
          position?: number
          strong?: string | null
          surface?: string
          translit?: string | null
          verse?: number
        }
        Relationships: []
      }
      campus_fiscal_profiles: {
        Row: {
          bank_info: Json
          campus_id: string
          country: string
          donation_compliance: Json
          fiscal_address: Json
          legal_name: string | null
          org_id: string
          pix_key: string | null
          state_registration: string | null
          tax_exempt_status: string | null
          tax_id: string | null
          trade_name: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          bank_info?: Json
          campus_id: string
          country?: string
          donation_compliance?: Json
          fiscal_address?: Json
          legal_name?: string | null
          org_id: string
          pix_key?: string | null
          state_registration?: string | null
          tax_exempt_status?: string | null
          tax_id?: string | null
          trade_name?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          bank_info?: Json
          campus_id?: string
          country?: string
          donation_compliance?: Json
          fiscal_address?: Json
          legal_name?: string | null
          org_id?: string
          pix_key?: string | null
          state_registration?: string | null
          tax_exempt_status?: string | null
          tax_id?: string | null
          trade_name?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campus_fiscal_profiles_campus_id_fkey"
            columns: ["campus_id"]
            isOneToOne: true
            referencedRelation: "campuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campus_fiscal_profiles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      campuses: {
        Row: {
          active: boolean
          address: Json
          created_at: string
          id: string
          name: string
          org_id: string
          timezone: string
        }
        Insert: {
          active?: boolean
          address?: Json
          created_at?: string
          id?: string
          name: string
          org_id: string
          timezone?: string
        }
        Update: {
          active?: boolean
          address?: Json
          created_at?: string
          id?: string
          name?: string
          org_id?: string
          timezone?: string
        }
        Relationships: [
          {
            foreignKeyName: "campuses_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      care_contacts: {
        Row: {
          care_item_id: string
          contacted_by: string | null
          contacted_on: string
          created_at: string
          id: string
          method: string | null
          note: string | null
          stick_id: string | null
        }
        Insert: {
          care_item_id: string
          contacted_by?: string | null
          contacted_on?: string
          created_at?: string
          id?: string
          method?: string | null
          note?: string | null
          stick_id?: string | null
        }
        Update: {
          care_item_id?: string
          contacted_by?: string | null
          contacted_on?: string
          created_at?: string
          id?: string
          method?: string | null
          note?: string | null
          stick_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "care_contacts_care_item_id_fkey"
            columns: ["care_item_id"]
            isOneToOne: false
            referencedRelation: "care_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "care_contacts_stick_id_fkey"
            columns: ["stick_id"]
            isOneToOne: false
            referencedRelation: "sticks"
            referencedColumns: ["id"]
          },
        ]
      }
      care_items: {
        Row: {
          assigned_to: string | null
          category: string | null
          confidentiality_level: string
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          next_action: string | null
          org_id: string
          priority: Database["public"]["Enums"]["signal_priority"]
          resolved_at: string | null
          signal_id: string | null
          status: Database["public"]["Enums"]["care_status"]
          stick_id: string | null
          title: string
        }
        Insert: {
          assigned_to?: string | null
          category?: string | null
          confidentiality_level?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          next_action?: string | null
          org_id: string
          priority?: Database["public"]["Enums"]["signal_priority"]
          resolved_at?: string | null
          signal_id?: string | null
          status?: Database["public"]["Enums"]["care_status"]
          stick_id?: string | null
          title: string
        }
        Update: {
          assigned_to?: string | null
          category?: string | null
          confidentiality_level?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          next_action?: string | null
          org_id?: string
          priority?: Database["public"]["Enums"]["signal_priority"]
          resolved_at?: string | null
          signal_id?: string | null
          status?: Database["public"]["Enums"]["care_status"]
          stick_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "care_items_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "care_items_signal_id_fkey"
            columns: ["signal_id"]
            isOneToOne: false
            referencedRelation: "signals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "care_items_stick_id_fkey"
            columns: ["stick_id"]
            isOneToOne: false
            referencedRelation: "sticks"
            referencedColumns: ["id"]
          },
        ]
      }
      care_notes: {
        Row: {
          author_id: string | null
          care_item_id: string
          content: string
          created_at: string
          id: string
          visibility: string
        }
        Insert: {
          author_id?: string | null
          care_item_id: string
          content: string
          created_at?: string
          id?: string
          visibility?: string
        }
        Update: {
          author_id?: string | null
          care_item_id?: string
          content?: string
          created_at?: string
          id?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "care_notes_care_item_id_fkey"
            columns: ["care_item_id"]
            isOneToOne: false
            referencedRelation: "care_items"
            referencedColumns: ["id"]
          },
        ]
      }
      coordination_posts: {
        Row: {
          body: string | null
          campus_id: string | null
          created_at: string
          created_by: string | null
          id: string
          org_id: string
          posted_on: string
          team: string | null
          title: string
        }
        Insert: {
          body?: string | null
          campus_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          org_id: string
          posted_on?: string
          team?: string | null
          title: string
        }
        Update: {
          body?: string | null
          campus_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          org_id?: string
          posted_on?: string
          team?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "coordination_posts_campus_id_fkey"
            columns: ["campus_id"]
            isOneToOne: false
            referencedRelation: "campuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coordination_posts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      coordination_tasks: {
        Row: {
          assignee: string | null
          campus_id: string | null
          created_at: string
          created_by: string | null
          done: boolean
          id: string
          org_id: string
          text: string
        }
        Insert: {
          assignee?: string | null
          campus_id?: string | null
          created_at?: string
          created_by?: string | null
          done?: boolean
          id?: string
          org_id: string
          text: string
        }
        Update: {
          assignee?: string | null
          campus_id?: string | null
          created_at?: string
          created_by?: string | null
          done?: boolean
          id?: string
          org_id?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "coordination_tasks_campus_id_fkey"
            columns: ["campus_id"]
            isOneToOne: false
            referencedRelation: "campuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coordination_tasks_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      cross_references: {
        Row: {
          from_book: string
          from_chapter: number
          from_verse: number
          id: number
          to_book: string
          to_chapter: number
          to_verse_end: number | null
          to_verse_start: number
          votes: number
        }
        Insert: {
          from_book: string
          from_chapter: number
          from_verse: number
          id?: never
          to_book: string
          to_chapter: number
          to_verse_end?: number | null
          to_verse_start: number
          votes?: number
        }
        Update: {
          from_book?: string
          from_chapter?: number
          from_verse?: number
          id?: never
          to_book?: string
          to_chapter?: number
          to_verse_end?: number | null
          to_verse_start?: number
          votes?: number
        }
        Relationships: []
      }
      dm_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          org_id: string
          read_at: string | null
          sender_id: string
          thread_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          org_id: string
          read_at?: string | null
          sender_id: string
          thread_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          org_id?: string
          read_at?: string | null
          sender_id?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dm_messages_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dm_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "dm_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      dm_threads: {
        Row: {
          created_at: string
          id: string
          last_message_at: string | null
          org_id: string
          user_a: string
          user_b: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string | null
          org_id: string
          user_a: string
          user_b: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string | null
          org_id?: string
          user_a?: string
          user_b?: string
        }
        Relationships: [
          {
            foreignKeyName: "dm_threads_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      donation_receipts: {
        Row: {
          country: string
          created_by: string | null
          currency: string
          donation_id: string | null
          id: string
          issued_at: string
          kind: string
          org_id: string
          period_year: number | null
          receipt_no: string
          snapshot: Json
          stick_id: string | null
          total_amount: number
        }
        Insert: {
          country?: string
          created_by?: string | null
          currency?: string
          donation_id?: string | null
          id?: string
          issued_at?: string
          kind: string
          org_id: string
          period_year?: number | null
          receipt_no: string
          snapshot?: Json
          stick_id?: string | null
          total_amount?: number
        }
        Update: {
          country?: string
          created_by?: string | null
          currency?: string
          donation_id?: string | null
          id?: string
          issued_at?: string
          kind?: string
          org_id?: string
          period_year?: number | null
          receipt_no?: string
          snapshot?: Json
          stick_id?: string | null
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "donation_receipts_donation_id_fkey"
            columns: ["donation_id"]
            isOneToOne: false
            referencedRelation: "donations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donation_receipts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donation_receipts_stick_id_fkey"
            columns: ["stick_id"]
            isOneToOne: false
            referencedRelation: "sticks"
            referencedColumns: ["id"]
          },
        ]
      }
      donations: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          currency: string
          donation_date: string
          donor_name: string | null
          donor_tax_id: string | null
          fund_id: string | null
          goods_services_description: string | null
          goods_services_provided: boolean
          goods_services_value: number | null
          id: string
          method: string
          note: string | null
          org_id: string
          stick_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          currency?: string
          donation_date?: string
          donor_name?: string | null
          donor_tax_id?: string | null
          fund_id?: string | null
          goods_services_description?: string | null
          goods_services_provided?: boolean
          goods_services_value?: number | null
          id?: string
          method?: string
          note?: string | null
          org_id: string
          stick_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          currency?: string
          donation_date?: string
          donor_name?: string | null
          donor_tax_id?: string | null
          fund_id?: string | null
          goods_services_description?: string | null
          goods_services_provided?: boolean
          goods_services_value?: number | null
          id?: string
          method?: string
          note?: string | null
          org_id?: string
          stick_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "donations_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "funds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donations_stick_id_fkey"
            columns: ["stick_id"]
            isOneToOne: false
            referencedRelation: "sticks"
            referencedColumns: ["id"]
          },
        ]
      }
      event_registrations: {
        Row: {
          answers: Json
          checked_in: boolean
          checked_in_at: string | null
          created_at: string
          email: string | null
          event_id: string
          household: string | null
          id: string
          name: string | null
          org_id: string
          payment_status: string | null
          phone: string | null
          stick_id: string | null
        }
        Insert: {
          answers?: Json
          checked_in?: boolean
          checked_in_at?: string | null
          created_at?: string
          email?: string | null
          event_id: string
          household?: string | null
          id?: string
          name?: string | null
          org_id: string
          payment_status?: string | null
          phone?: string | null
          stick_id?: string | null
        }
        Update: {
          answers?: Json
          checked_in?: boolean
          checked_in_at?: string | null
          created_at?: string
          email?: string | null
          event_id?: string
          household?: string | null
          id?: string
          name?: string | null
          org_id?: string
          payment_status?: string | null
          phone?: string | null
          stick_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_registrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_registrations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_registrations_stick_id_fkey"
            columns: ["stick_id"]
            isOneToOne: false
            referencedRelation: "sticks"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          campus_id: string | null
          capacity: number | null
          check_in_enabled: boolean
          cover_image: string | null
          created_at: string
          created_by: string | null
          description: string | null
          end_time: string | null
          event_date: string | null
          id: string
          location: string | null
          name: string
          org_id: string
          payment_required: boolean
          registration_required: boolean
          starts_at: string | null
          status: string
          type: string | null
        }
        Insert: {
          campus_id?: string | null
          capacity?: number | null
          check_in_enabled?: boolean
          cover_image?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_time?: string | null
          event_date?: string | null
          id?: string
          location?: string | null
          name: string
          org_id: string
          payment_required?: boolean
          registration_required?: boolean
          starts_at?: string | null
          status?: string
          type?: string | null
        }
        Update: {
          campus_id?: string | null
          capacity?: number | null
          check_in_enabled?: boolean
          cover_image?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_time?: string | null
          event_date?: string | null
          id?: string
          location?: string | null
          name?: string
          org_id?: string
          payment_required?: boolean
          registration_required?: boolean
          starts_at?: string | null
          status?: string
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_campus_id_fkey"
            columns: ["campus_id"]
            isOneToOne: false
            referencedRelation: "campuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_categories: {
        Row: {
          created_at: string
          id: string
          name: string
          org_id: string
          type: Database["public"]["Enums"]["entry_type"]
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          org_id: string
          type: Database["public"]["Enums"]["entry_type"]
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          org_id?: string
          type?: Database["public"]["Enums"]["entry_type"]
        }
        Relationships: [
          {
            foreignKeyName: "finance_categories_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_entries: {
        Row: {
          amount: number
          campus_id: string | null
          category_id: string | null
          category_name: string | null
          created_at: string
          created_by: string | null
          description: string
          entry_date: string
          fund_id: string | null
          fund_name: string | null
          id: string
          org_id: string
          type: Database["public"]["Enums"]["entry_type"]
        }
        Insert: {
          amount?: number
          campus_id?: string | null
          category_id?: string | null
          category_name?: string | null
          created_at?: string
          created_by?: string | null
          description: string
          entry_date?: string
          fund_id?: string | null
          fund_name?: string | null
          id?: string
          org_id: string
          type: Database["public"]["Enums"]["entry_type"]
        }
        Update: {
          amount?: number
          campus_id?: string | null
          category_id?: string | null
          category_name?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          entry_date?: string
          fund_id?: string | null
          fund_name?: string | null
          id?: string
          org_id?: string
          type?: Database["public"]["Enums"]["entry_type"]
        }
        Relationships: [
          {
            foreignKeyName: "finance_entries_campus_id_fkey"
            columns: ["campus_id"]
            isOneToOne: false
            referencedRelation: "campuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_entries_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "finance_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_entries_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "funds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_entries_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      funds: {
        Row: {
          created_at: string
          id: string
          name: string
          org_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          org_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "funds_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      group_members: {
        Row: {
          group_id: string
          id: string
          joined_at: string
          left_at: string | null
          role: Database["public"]["Enums"]["group_member_role"]
          status: string
          stick_id: string
        }
        Insert: {
          group_id: string
          id?: string
          joined_at?: string
          left_at?: string | null
          role?: Database["public"]["Enums"]["group_member_role"]
          status?: string
          stick_id: string
        }
        Update: {
          group_id?: string
          id?: string
          joined_at?: string
          left_at?: string | null
          role?: Database["public"]["Enums"]["group_member_role"]
          status?: string
          stick_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_members_stick_id_fkey"
            columns: ["stick_id"]
            isOneToOne: false
            referencedRelation: "sticks"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          archived: boolean
          campus_id: string | null
          created_at: string
          description: string | null
          id: string
          meeting_day: string | null
          meeting_time: string | null
          name: string
          org_id: string
        }
        Insert: {
          archived?: boolean
          campus_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          meeting_day?: string | null
          meeting_time?: string | null
          name: string
          org_id: string
        }
        Update: {
          archived?: boolean
          campus_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          meeting_day?: string | null
          meeting_time?: string | null
          name?: string
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "groups_campus_id_fkey"
            columns: ["campus_id"]
            isOneToOne: false
            referencedRelation: "campuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "groups_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      household_members: {
        Row: {
          household_id: string
          id: string
          is_primary_contact: boolean
          relationship_type: string
          stick_id: string
        }
        Insert: {
          household_id: string
          id?: string
          is_primary_contact?: boolean
          relationship_type?: string
          stick_id: string
        }
        Update: {
          household_id?: string
          id?: string
          is_primary_contact?: boolean
          relationship_type?: string
          stick_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "household_members_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "household_members_stick_id_fkey"
            columns: ["stick_id"]
            isOneToOne: false
            referencedRelation: "sticks"
            referencedColumns: ["id"]
          },
        ]
      }
      households: {
        Row: {
          address: string | null
          campus_id: string | null
          created_at: string
          id: string
          name: string
          org_id: string
          photo: string | null
        }
        Insert: {
          address?: string | null
          campus_id?: string | null
          created_at?: string
          id?: string
          name: string
          org_id: string
          photo?: string | null
        }
        Update: {
          address?: string | null
          campus_id?: string | null
          created_at?: string
          id?: string
          name?: string
          org_id?: string
          photo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "households_campus_id_fkey"
            columns: ["campus_id"]
            isOneToOne: false
            referencedRelation: "campuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "households_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      journey_stages: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          id: string
          journey_id: string | null
          name: string
          org_id: string
          position: number
          recommended_actions: Json
          required_milestones: string[]
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          journey_id?: string | null
          name: string
          org_id: string
          position?: number
          recommended_actions?: Json
          required_milestones?: string[]
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          journey_id?: string | null
          name?: string
          org_id?: string
          position?: number
          recommended_actions?: Json
          required_milestones?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "journey_stages_journey_id_fkey"
            columns: ["journey_id"]
            isOneToOne: false
            referencedRelation: "journeys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journey_stages_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      journeys: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_default: boolean
          name: string
          org_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean
          name: string
          org_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean
          name?: string
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "journeys_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      member_invites: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          org_id: string
          status: string
          stick_id: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          org_id: string
          status?: string
          stick_id: string
          token?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          org_id?: string
          status?: string
          stick_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_invites_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_invites_stick_id_fkey"
            columns: ["stick_id"]
            isOneToOne: false
            referencedRelation: "sticks"
            referencedColumns: ["id"]
          },
        ]
      }
      memberships: {
        Row: {
          created_at: string
          id: string
          is_owner: boolean
          org_id: string
          permissions: string[]
          role: string
          role_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_owner?: boolean
          org_id: string
          permissions?: string[]
          role?: string
          role_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_owner?: boolean
          org_id?: string
          permissions?: string[]
          role?: string
          role_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memberships_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memberships_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      message_recipients: {
        Row: {
          created_at: string
          error: string | null
          id: string
          message_id: string
          org_id: string
          read_at: string | null
          sent_at: string | null
          status: string
          stick_id: string | null
          to_email: string | null
          to_name: string | null
        }
        Insert: {
          created_at?: string
          error?: string | null
          id?: string
          message_id: string
          org_id: string
          read_at?: string | null
          sent_at?: string | null
          status?: string
          stick_id?: string | null
          to_email?: string | null
          to_name?: string | null
        }
        Update: {
          created_at?: string
          error?: string | null
          id?: string
          message_id?: string
          org_id?: string
          read_at?: string | null
          sent_at?: string | null
          status?: string
          stick_id?: string | null
          to_email?: string | null
          to_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "message_recipients_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_recipients_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_recipients_stick_id_fkey"
            columns: ["stick_id"]
            isOneToOne: false
            referencedRelation: "sticks"
            referencedColumns: ["id"]
          },
        ]
      }
      message_templates: {
        Row: {
          body: string
          channel: string
          created_at: string
          created_by: string | null
          id: string
          name: string
          org_id: string
          subject: string | null
          updated_at: string
        }
        Insert: {
          body: string
          channel?: string
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          org_id: string
          subject?: string | null
          updated_at?: string
        }
        Update: {
          body?: string
          channel?: string
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          org_id?: string
          subject?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_templates_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          audience_kind: string
          audience_ref: Json
          body: string
          channel: string
          created_at: string
          created_by: string | null
          id: string
          org_id: string
          sent_at: string | null
          status: string
          subject: string | null
        }
        Insert: {
          audience_kind: string
          audience_ref?: Json
          body: string
          channel?: string
          created_at?: string
          created_by?: string | null
          id?: string
          org_id: string
          sent_at?: string | null
          status?: string
          subject?: string | null
        }
        Update: {
          audience_kind?: string
          audience_ref?: Json
          body?: string
          channel?: string
          created_at?: string
          created_by?: string | null
          id?: string
          org_id?: string
          sent_at?: string | null
          status?: string
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      milestone_types: {
        Row: {
          auto: boolean
          code: string
          created_at: string
          id: string
          is_system: boolean
          name: string
          org_id: string
        }
        Insert: {
          auto?: boolean
          code: string
          created_at?: string
          id?: string
          is_system?: boolean
          name: string
          org_id: string
        }
        Update: {
          auto?: boolean
          code?: string
          created_at?: string
          id?: string
          is_system?: boolean
          name?: string
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "milestone_types_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      milestones: {
        Row: {
          code: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          milestone_type_id: string | null
          occurred_on: string
          org_id: string
          source_module: string | null
          source_record_id: string | null
          stick_id: string
          title: string | null
          visibility: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          milestone_type_id?: string | null
          occurred_on: string
          org_id: string
          source_module?: string | null
          source_record_id?: string | null
          stick_id: string
          title?: string | null
          visibility?: string
        }
        Update: {
          code?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          milestone_type_id?: string | null
          occurred_on?: string
          org_id?: string
          source_module?: string | null
          source_record_id?: string | null
          stick_id?: string
          title?: string | null
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "milestones_milestone_type_id_fkey"
            columns: ["milestone_type_id"]
            isOneToOne: false
            referencedRelation: "milestone_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "milestones_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "milestones_stick_id_fkey"
            columns: ["stick_id"]
            isOneToOne: false
            referencedRelation: "sticks"
            referencedColumns: ["id"]
          },
        ]
      }
      ministries: {
        Row: {
          campus_id: string | null
          color: string | null
          created_at: string
          description: string | null
          id: string
          leader_id: string | null
          name: string
          org_id: string
          status: string
        }
        Insert: {
          campus_id?: string | null
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          leader_id?: string | null
          name: string
          org_id: string
          status?: string
        }
        Update: {
          campus_id?: string | null
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          leader_id?: string | null
          name?: string
          org_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "ministries_campus_id_fkey"
            columns: ["campus_id"]
            isOneToOne: false
            referencedRelation: "campuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ministries_leader_id_fkey"
            columns: ["leader_id"]
            isOneToOne: false
            referencedRelation: "sticks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ministries_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_fiscal_profiles: {
        Row: {
          bank_info: Json
          country: string
          donation_compliance: Json
          fiscal_address: Json
          legal_name: string | null
          org_id: string
          pix_key: string | null
          state_registration: string | null
          tax_exempt_status: string | null
          tax_id: string | null
          trade_name: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          bank_info?: Json
          country?: string
          donation_compliance?: Json
          fiscal_address?: Json
          legal_name?: string | null
          org_id: string
          pix_key?: string | null
          state_registration?: string | null
          tax_exempt_status?: string | null
          tax_id?: string | null
          trade_name?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          bank_info?: Json
          country?: string
          donation_compliance?: Json
          fiscal_address?: Json
          legal_name?: string | null
          org_id?: string
          pix_key?: string | null
          state_registration?: string | null
          tax_exempt_status?: string | null
          tax_id?: string | null
          trade_name?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "org_fiscal_profiles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          country: string
          created_at: string
          currency: string
          id: string
          name: string
          plan: string
          status: string
        }
        Insert: {
          country?: string
          created_at?: string
          currency?: string
          id?: string
          name: string
          plan?: string
          status?: string
        }
        Update: {
          country?: string
          created_at?: string
          currency?: string
          id?: string
          name?: string
          plan?: string
          status?: string
        }
        Relationships: []
      }
      platform_admins: {
        Row: {
          created_at: string
          note: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          note?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          note?: string | null
          user_id?: string
        }
        Relationships: []
      }
      prayer_requests: {
        Row: {
          answered: boolean
          answered_on: string | null
          author_name: string | null
          campus_id: string | null
          created_at: string
          group_id: string | null
          id: string
          org_id: string
          praying_count: number
          privacy: Database["public"]["Enums"]["prayer_privacy"]
          request: string
          stick_id: string | null
          title: string | null
          topics: string[]
        }
        Insert: {
          answered?: boolean
          answered_on?: string | null
          author_name?: string | null
          campus_id?: string | null
          created_at?: string
          group_id?: string | null
          id?: string
          org_id: string
          praying_count?: number
          privacy?: Database["public"]["Enums"]["prayer_privacy"]
          request: string
          stick_id?: string | null
          title?: string | null
          topics?: string[]
        }
        Update: {
          answered?: boolean
          answered_on?: string | null
          author_name?: string | null
          campus_id?: string | null
          created_at?: string
          group_id?: string | null
          id?: string
          org_id?: string
          praying_count?: number
          privacy?: Database["public"]["Enums"]["prayer_privacy"]
          request?: string
          stick_id?: string | null
          title?: string | null
          topics?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "prayer_requests_campus_id_fkey"
            columns: ["campus_id"]
            isOneToOne: false
            referencedRelation: "campuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prayer_requests_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prayer_requests_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prayer_requests_stick_id_fkey"
            columns: ["stick_id"]
            isOneToOne: false
            referencedRelation: "sticks"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          locale: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          locale?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          locale?: string
        }
        Relationships: []
      }
      receipt_counters: {
        Row: {
          last_no: number
          org_id: string
          year: number
        }
        Insert: {
          last_no?: number
          org_id: string
          year: number
        }
        Update: {
          last_no?: number
          org_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "receipt_counters_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      resources: {
        Row: {
          author: string | null
          created_at: string
          description: string | null
          id: string
          org_id: string
          sermon_id: string | null
          tags: string[]
          title: string
          topic: string | null
          type: string | null
          url: string | null
        }
        Insert: {
          author?: string | null
          created_at?: string
          description?: string | null
          id?: string
          org_id: string
          sermon_id?: string | null
          tags?: string[]
          title: string
          topic?: string | null
          type?: string | null
          url?: string | null
        }
        Update: {
          author?: string | null
          created_at?: string
          description?: string | null
          id?: string
          org_id?: string
          sermon_id?: string | null
          tags?: string[]
          title?: string
          topic?: string | null
          type?: string | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "resources_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resources_sermon_id_fkey"
            columns: ["sermon_id"]
            isOneToOne: false
            referencedRelation: "sermons"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string
          id: string
          is_system: boolean
          name: string
          org_id: string
          permissions: string[]
        }
        Insert: {
          created_at?: string
          id?: string
          is_system?: boolean
          name: string
          org_id: string
          permissions?: string[]
        }
        Update: {
          created_at?: string
          id?: string
          is_system?: boolean
          name?: string
          org_id?: string
          permissions?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "roles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_assignments: {
        Row: {
          assignment_date: string | null
          confirmed_at: string | null
          created_at: string
          event_id: string | null
          id: string
          org_id: string
          role: string | null
          service_id: string | null
          status: string
          stick_id: string | null
          team_id: string | null
        }
        Insert: {
          assignment_date?: string | null
          confirmed_at?: string | null
          created_at?: string
          event_id?: string | null
          id?: string
          org_id: string
          role?: string | null
          service_id?: string | null
          status?: string
          stick_id?: string | null
          team_id?: string | null
        }
        Update: {
          assignment_date?: string | null
          confirmed_at?: string | null
          created_at?: string
          event_id?: string | null
          id?: string
          org_id?: string
          role?: string | null
          service_id?: string | null
          status?: string
          stick_id?: string | null
          team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "schedule_assignments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_assignments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_assignments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_assignments_stick_id_fkey"
            columns: ["stick_id"]
            isOneToOne: false
            referencedRelation: "sticks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_assignments_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      series: {
        Row: {
          cover_image: string | null
          created_at: string
          description: string | null
          end_date: string | null
          id: string
          org_id: string
          start_date: string | null
          status: Database["public"]["Enums"]["series_status"]
          theme: string | null
          title: string
        }
        Insert: {
          cover_image?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          org_id: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["series_status"]
          theme?: string | null
          title: string
        }
        Update: {
          cover_image?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          org_id?: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["series_status"]
          theme?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "series_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      sermon_scriptures: {
        Row: {
          book: string
          chapter: number
          created_at: string
          id: string
          org_id: string
          reference: string
          sermon_id: string
          verse_end: number | null
          verse_start: number | null
        }
        Insert: {
          book: string
          chapter: number
          created_at?: string
          id?: string
          org_id: string
          reference: string
          sermon_id: string
          verse_end?: number | null
          verse_start?: number | null
        }
        Update: {
          book?: string
          chapter?: number
          created_at?: string
          id?: string
          org_id?: string
          reference?: string
          sermon_id?: string
          verse_end?: number | null
          verse_start?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sermon_scriptures_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sermon_scriptures_sermon_id_fkey"
            columns: ["sermon_id"]
            isOneToOne: false
            referencedRelation: "sermons"
            referencedColumns: ["id"]
          },
        ]
      }
      sermons: {
        Row: {
          big_idea: string | null
          campus_id: string | null
          content: Json
          created_at: string
          description: string | null
          id: string
          main_passage: string | null
          org_id: string
          preacher_id: string | null
          series_id: string | null
          sermon_date: string | null
          service_id: string | null
          status: Database["public"]["Enums"]["sermon_status"]
          subtitle: string | null
          title: string
          updated_at: string
          visibility: Database["public"]["Enums"]["sermon_visibility"]
        }
        Insert: {
          big_idea?: string | null
          campus_id?: string | null
          content?: Json
          created_at?: string
          description?: string | null
          id?: string
          main_passage?: string | null
          org_id: string
          preacher_id?: string | null
          series_id?: string | null
          sermon_date?: string | null
          service_id?: string | null
          status?: Database["public"]["Enums"]["sermon_status"]
          subtitle?: string | null
          title: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["sermon_visibility"]
        }
        Update: {
          big_idea?: string | null
          campus_id?: string | null
          content?: Json
          created_at?: string
          description?: string | null
          id?: string
          main_passage?: string | null
          org_id?: string
          preacher_id?: string | null
          series_id?: string | null
          sermon_date?: string | null
          service_id?: string | null
          status?: Database["public"]["Enums"]["sermon_status"]
          subtitle?: string | null
          title?: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["sermon_visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "sermons_campus_id_fkey"
            columns: ["campus_id"]
            isOneToOne: false
            referencedRelation: "campuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sermons_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sermons_series_id_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "series"
            referencedColumns: ["id"]
          },
        ]
      }
      service_plan_items: {
        Row: {
          created_at: string
          duration_min: number | null
          id: string
          notes: string | null
          org_id: string
          position: number
          responsible: string | null
          service_id: string | null
          session_id: string | null
          time_label: string | null
          title: string
        }
        Insert: {
          created_at?: string
          duration_min?: number | null
          id?: string
          notes?: string | null
          org_id: string
          position?: number
          responsible?: string | null
          service_id?: string | null
          session_id?: string | null
          time_label?: string | null
          title: string
        }
        Update: {
          created_at?: string
          duration_min?: number | null
          id?: string
          notes?: string | null
          org_id?: string
          position?: number
          responsible?: string | null
          service_id?: string | null
          session_id?: string | null
          time_label?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_plan_items_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_plan_items_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_plan_items_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "attendance_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          active: boolean
          campus_id: string | null
          created_at: string
          description: string | null
          end_time: string | null
          id: string
          location: string | null
          name: string
          org_id: string
          recurring_pattern: string | null
          start_time: string | null
          type: string | null
          weekday: number | null
        }
        Insert: {
          active?: boolean
          campus_id?: string | null
          created_at?: string
          description?: string | null
          end_time?: string | null
          id?: string
          location?: string | null
          name: string
          org_id: string
          recurring_pattern?: string | null
          start_time?: string | null
          type?: string | null
          weekday?: number | null
        }
        Update: {
          active?: boolean
          campus_id?: string | null
          created_at?: string
          description?: string | null
          end_time?: string | null
          id?: string
          location?: string | null
          name?: string
          org_id?: string
          recurring_pattern?: string | null
          start_time?: string | null
          type?: string | null
          weekday?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "services_campus_id_fkey"
            columns: ["campus_id"]
            isOneToOne: false
            referencedRelation: "campuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      signal_overrides: {
        Row: {
          id: string
          org_id: string
          signal_key: string
          status: string
          updated_at: string
        }
        Insert: {
          id?: string
          org_id: string
          signal_key: string
          status: string
          updated_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          signal_key?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "signal_overrides_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      signals: {
        Row: {
          assigned_to: string | null
          campus_id: string | null
          category: string
          created_at: string
          description: string | null
          detected_at: string
          dismissed_reason: string | null
          id: string
          metadata: Json
          org_id: string
          priority: Database["public"]["Enums"]["signal_priority"]
          related_group_id: string | null
          related_stick_id: string | null
          resolution_note: string | null
          resolved_at: string | null
          resolved_by: string | null
          source_module: string | null
          source_record_id: string | null
          status: Database["public"]["Enums"]["signal_status"]
          title: string
          type: string
        }
        Insert: {
          assigned_to?: string | null
          campus_id?: string | null
          category: string
          created_at?: string
          description?: string | null
          detected_at?: string
          dismissed_reason?: string | null
          id?: string
          metadata?: Json
          org_id: string
          priority?: Database["public"]["Enums"]["signal_priority"]
          related_group_id?: string | null
          related_stick_id?: string | null
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          source_module?: string | null
          source_record_id?: string | null
          status?: Database["public"]["Enums"]["signal_status"]
          title: string
          type: string
        }
        Update: {
          assigned_to?: string | null
          campus_id?: string | null
          category?: string
          created_at?: string
          description?: string | null
          detected_at?: string
          dismissed_reason?: string | null
          id?: string
          metadata?: Json
          org_id?: string
          priority?: Database["public"]["Enums"]["signal_priority"]
          related_group_id?: string | null
          related_stick_id?: string | null
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          source_module?: string | null
          source_record_id?: string | null
          status?: Database["public"]["Enums"]["signal_status"]
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "signals_campus_id_fkey"
            columns: ["campus_id"]
            isOneToOne: false
            referencedRelation: "campuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signals_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signals_related_group_id_fkey"
            columns: ["related_group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signals_related_stick_id_fkey"
            columns: ["related_stick_id"]
            isOneToOne: false
            referencedRelation: "sticks"
            referencedColumns: ["id"]
          },
        ]
      }
      space_chat_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          org_id: string
          sender_id: string
          space_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          org_id: string
          sender_id: string
          space_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          org_id?: string
          sender_id?: string
          space_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "space_chat_messages_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "space_chat_messages_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      space_post_comments: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          org_id: string
          post_id: string
          updated_at: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          org_id: string
          post_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          org_id?: string
          post_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "space_post_comments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "space_post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "space_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      space_posts: {
        Row: {
          archived: boolean
          author_id: string
          body: string
          created_at: string
          id: string
          org_id: string
          pinned: boolean
          space_id: string
          title: string
          updated_at: string
        }
        Insert: {
          archived?: boolean
          author_id: string
          body: string
          created_at?: string
          id?: string
          org_id: string
          pinned?: boolean
          space_id: string
          title: string
          updated_at?: string
        }
        Update: {
          archived?: boolean
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          org_id?: string
          pinned?: boolean
          space_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "space_posts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "space_posts_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      space_todo_lists: {
        Row: {
          archived: boolean
          created_at: string
          created_by: string | null
          id: string
          name: string
          org_id: string
          space_id: string
          updated_at: string
        }
        Insert: {
          archived?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          org_id: string
          space_id: string
          updated_at?: string
        }
        Update: {
          archived?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          org_id?: string
          space_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "space_todo_lists_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "space_todo_lists_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      space_todos: {
        Row: {
          assignee_id: string | null
          created_at: string
          created_by: string | null
          done: boolean
          done_at: string | null
          done_by: string | null
          due_on: string | null
          id: string
          list_id: string
          notes: string | null
          org_id: string
          position: number
          space_id: string
          title: string
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          created_at?: string
          created_by?: string | null
          done?: boolean
          done_at?: string | null
          done_by?: string | null
          due_on?: string | null
          id?: string
          list_id: string
          notes?: string | null
          org_id: string
          position?: number
          space_id: string
          title: string
          updated_at?: string
        }
        Update: {
          assignee_id?: string | null
          created_at?: string
          created_by?: string | null
          done?: boolean
          done_at?: string | null
          done_by?: string | null
          due_on?: string | null
          id?: string
          list_id?: string
          notes?: string | null
          org_id?: string
          position?: number
          space_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "space_todos_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "space_todo_lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "space_todos_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "space_todos_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      spaces: {
        Row: {
          archived: boolean
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          kind: string
          name: string
          org_id: string
          ref_id: string | null
          updated_at: string
          visibility: string
        }
        Insert: {
          archived?: boolean
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          kind: string
          name: string
          org_id: string
          ref_id?: string | null
          updated_at?: string
          visibility?: string
        }
        Update: {
          archived?: boolean
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          kind?: string
          name?: string
          org_id?: string
          ref_id?: string | null
          updated_at?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "spaces_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      stick_journey_records: {
        Row: {
          completed_stages: string[]
          created_at: string
          current_stage_id: string | null
          entered_stage_at: string
          id: string
          journey_id: string
          notes: string | null
          org_id: string
          previous_stage_id: string | null
          stick_id: string
          updated_at: string
        }
        Insert: {
          completed_stages?: string[]
          created_at?: string
          current_stage_id?: string | null
          entered_stage_at?: string
          id?: string
          journey_id: string
          notes?: string | null
          org_id: string
          previous_stage_id?: string | null
          stick_id: string
          updated_at?: string
        }
        Update: {
          completed_stages?: string[]
          created_at?: string
          current_stage_id?: string | null
          entered_stage_at?: string
          id?: string
          journey_id?: string
          notes?: string | null
          org_id?: string
          previous_stage_id?: string | null
          stick_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stick_journey_records_current_stage_id_fkey"
            columns: ["current_stage_id"]
            isOneToOne: false
            referencedRelation: "journey_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stick_journey_records_journey_id_fkey"
            columns: ["journey_id"]
            isOneToOne: false
            referencedRelation: "journeys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stick_journey_records_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stick_journey_records_previous_stage_id_fkey"
            columns: ["previous_stage_id"]
            isOneToOne: false
            referencedRelation: "journey_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stick_journey_records_stick_id_fkey"
            columns: ["stick_id"]
            isOneToOne: false
            referencedRelation: "sticks"
            referencedColumns: ["id"]
          },
        ]
      }
      sticks: {
        Row: {
          address_line_1: string | null
          address_line_2: string | null
          archive_reason: string | null
          archived: boolean
          archived_at: string | null
          assigned_care_leader_id: string | null
          assigned_pastor_id: string | null
          baptism_date: string | null
          birth_date: string | null
          city: string | null
          conversion_date: string | null
          country: string | null
          created_at: string
          email: string | null
          email_allowed: boolean
          first_name: string | null
          first_visit_date: string | null
          followup_open: boolean
          full_name: string
          gender: string | null
          id: string
          is_leader: boolean
          journey_stage_id: string | null
          last_name: string | null
          last_seen_at: string | null
          membership_date: string | null
          org_id: string
          phone: string | null
          postal_code: string | null
          preferred_contact_method: string | null
          preferred_name: string | null
          primary_campus_id: string | null
          primary_language: string | null
          profile_photo: string | null
          relationship_status: Database["public"]["Enums"]["relationship_status"]
          sms_allowed: boolean
          source: string | null
          source_detail: string | null
          state: string | null
          tags: string[]
          updated_at: string
          user_id: string | null
          whatsapp: string | null
          whatsapp_allowed: boolean
        }
        Insert: {
          address_line_1?: string | null
          address_line_2?: string | null
          archive_reason?: string | null
          archived?: boolean
          archived_at?: string | null
          assigned_care_leader_id?: string | null
          assigned_pastor_id?: string | null
          baptism_date?: string | null
          birth_date?: string | null
          city?: string | null
          conversion_date?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          email_allowed?: boolean
          first_name?: string | null
          first_visit_date?: string | null
          followup_open?: boolean
          full_name: string
          gender?: string | null
          id?: string
          is_leader?: boolean
          journey_stage_id?: string | null
          last_name?: string | null
          last_seen_at?: string | null
          membership_date?: string | null
          org_id: string
          phone?: string | null
          postal_code?: string | null
          preferred_contact_method?: string | null
          preferred_name?: string | null
          primary_campus_id?: string | null
          primary_language?: string | null
          profile_photo?: string | null
          relationship_status?: Database["public"]["Enums"]["relationship_status"]
          sms_allowed?: boolean
          source?: string | null
          source_detail?: string | null
          state?: string | null
          tags?: string[]
          updated_at?: string
          user_id?: string | null
          whatsapp?: string | null
          whatsapp_allowed?: boolean
        }
        Update: {
          address_line_1?: string | null
          address_line_2?: string | null
          archive_reason?: string | null
          archived?: boolean
          archived_at?: string | null
          assigned_care_leader_id?: string | null
          assigned_pastor_id?: string | null
          baptism_date?: string | null
          birth_date?: string | null
          city?: string | null
          conversion_date?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          email_allowed?: boolean
          first_name?: string | null
          first_visit_date?: string | null
          followup_open?: boolean
          full_name?: string
          gender?: string | null
          id?: string
          is_leader?: boolean
          journey_stage_id?: string | null
          last_name?: string | null
          last_seen_at?: string | null
          membership_date?: string | null
          org_id?: string
          phone?: string | null
          postal_code?: string | null
          preferred_contact_method?: string | null
          preferred_name?: string | null
          primary_campus_id?: string | null
          primary_language?: string | null
          profile_photo?: string | null
          relationship_status?: Database["public"]["Enums"]["relationship_status"]
          sms_allowed?: boolean
          source?: string | null
          source_detail?: string | null
          state?: string | null
          tags?: string[]
          updated_at?: string
          user_id?: string | null
          whatsapp?: string | null
          whatsapp_allowed?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "sticks_assigned_care_leader_id_fkey"
            columns: ["assigned_care_leader_id"]
            isOneToOne: false
            referencedRelation: "sticks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sticks_assigned_pastor_id_fkey"
            columns: ["assigned_pastor_id"]
            isOneToOne: false
            referencedRelation: "sticks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sticks_journey_stage_id_fkey"
            columns: ["journey_stage_id"]
            isOneToOne: false
            referencedRelation: "journey_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sticks_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sticks_primary_campus_id_fkey"
            columns: ["primary_campus_id"]
            isOneToOne: false
            referencedRelation: "campuses"
            referencedColumns: ["id"]
          },
        ]
      }
      strong_frequency: {
        Row: {
          lang: string
          occurrences: number
          strong: string
        }
        Insert: {
          lang: string
          occurrences: number
          strong: string
        }
        Update: {
          lang?: string
          occurrences?: number
          strong?: string
        }
        Relationships: []
      }
      strongs_lexicon: {
        Row: {
          definition: string | null
          gloss: string | null
          lang: string
          lemma: string | null
          pronunciation: string | null
          strong: string
          translit: string | null
        }
        Insert: {
          definition?: string | null
          gloss?: string | null
          lang: string
          lemma?: string | null
          pronunciation?: string | null
          strong: string
          translit?: string | null
        }
        Update: {
          definition?: string | null
          gloss?: string | null
          lang?: string
          lemma?: string | null
          pronunciation?: string | null
          strong?: string
          translit?: string | null
        }
        Relationships: []
      }
      study_notes: {
        Row: {
          author_id: string | null
          content: string | null
          created_at: string
          id: string
          org_id: string
          scope: string
          scripture_ref: string | null
          series_id: string | null
          sermon_id: string | null
          tags: string[]
          title: string | null
          topic: string | null
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          content?: string | null
          created_at?: string
          id?: string
          org_id: string
          scope?: string
          scripture_ref?: string | null
          series_id?: string | null
          sermon_id?: string | null
          tags?: string[]
          title?: string | null
          topic?: string | null
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          content?: string | null
          created_at?: string
          id?: string
          org_id?: string
          scope?: string
          scripture_ref?: string | null
          series_id?: string | null
          sermon_id?: string | null
          tags?: string[]
          title?: string | null
          topic?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_notes_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_notes_series_id_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "series"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_notes_sermon_id_fkey"
            columns: ["sermon_id"]
            isOneToOne: false
            referencedRelation: "sermons"
            referencedColumns: ["id"]
          },
        ]
      }
      study_text_notes: {
        Row: {
          author_id: string
          body: string
          book: string
          chapter: number | null
          created_at: string
          id: string
          org_id: string
          updated_at: string
          verse_end: number | null
          verse_start: number | null
        }
        Insert: {
          author_id?: string
          body: string
          book: string
          chapter?: number | null
          created_at?: string
          id?: string
          org_id: string
          updated_at?: string
          verse_end?: number | null
          verse_start?: number | null
        }
        Update: {
          author_id?: string
          body?: string
          book?: string
          chapter?: number | null
          created_at?: string
          id?: string
          org_id?: string
          updated_at?: string
          verse_end?: number | null
          verse_start?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "study_text_notes_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          availability: string | null
          created_at: string
          id: string
          joined_at: string | null
          notes: string | null
          org_id: string
          role: string | null
          status: string
          stick_id: string
          team_id: string
        }
        Insert: {
          availability?: string | null
          created_at?: string
          id?: string
          joined_at?: string | null
          notes?: string | null
          org_id: string
          role?: string | null
          status?: string
          stick_id: string
          team_id: string
        }
        Update: {
          availability?: string | null
          created_at?: string
          id?: string
          joined_at?: string | null
          notes?: string | null
          org_id?: string
          role?: string | null
          status?: string
          stick_id?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_stick_id_fkey"
            columns: ["stick_id"]
            isOneToOne: false
            referencedRelation: "sticks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          campus_id: string | null
          created_at: string
          description: string | null
          id: string
          leader_id: string | null
          ministry_id: string | null
          name: string
          org_id: string
          serving_roles: Json
          status: string
        }
        Insert: {
          campus_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          leader_id?: string | null
          ministry_id?: string | null
          name: string
          org_id: string
          serving_roles?: Json
          status?: string
        }
        Update: {
          campus_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          leader_id?: string | null
          ministry_id?: string | null
          name?: string
          org_id?: string
          serving_roles?: Json
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_campus_id_fkey"
            columns: ["campus_id"]
            isOneToOne: false
            referencedRelation: "campuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_leader_id_fkey"
            columns: ["leader_id"]
            isOneToOne: false
            referencedRelation: "sticks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_ministry_id_fkey"
            columns: ["ministry_id"]
            isOneToOne: false
            referencedRelation: "ministries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      timeline_events: {
        Row: {
          created_at: string
          created_by: string | null
          event_type: string
          id: string
          metadata: Json
          occurred_at: string
          org_id: string
          source_module: string | null
          source_record_id: string | null
          stick_id: string
          summary: string | null
          title: string
          visibility: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          event_type: string
          id?: string
          metadata?: Json
          occurred_at?: string
          org_id: string
          source_module?: string | null
          source_record_id?: string | null
          stick_id: string
          summary?: string | null
          title: string
          visibility?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          event_type?: string
          id?: string
          metadata?: Json
          occurred_at?: string
          org_id?: string
          source_module?: string | null
          source_record_id?: string | null
          stick_id?: string
          summary?: string | null
          title?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "timeline_events_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timeline_events_stick_id_fkey"
            columns: ["stick_id"]
            isOneToOne: false
            referencedRelation: "sticks"
            referencedColumns: ["id"]
          },
        ]
      }
      track_enrollments: {
        Row: {
          completed_at: string | null
          created_at: string
          current_step_id: string | null
          id: string
          org_id: string
          progress: number
          started_at: string | null
          status: string
          stick_id: string
          track_id: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          current_step_id?: string | null
          id?: string
          org_id: string
          progress?: number
          started_at?: string | null
          status?: string
          stick_id: string
          track_id: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          current_step_id?: string | null
          id?: string
          org_id?: string
          progress?: number
          started_at?: string | null
          status?: string
          stick_id?: string
          track_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "track_enrollments_current_step_id_fkey"
            columns: ["current_step_id"]
            isOneToOne: false
            referencedRelation: "track_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "track_enrollments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "track_enrollments_stick_id_fkey"
            columns: ["stick_id"]
            isOneToOne: false
            referencedRelation: "sticks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "track_enrollments_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      track_steps: {
        Row: {
          created_at: string
          description: string | null
          id: string
          materials: Json
          name: string
          org_id: string
          position: number
          track_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          materials?: Json
          name: string
          org_id: string
          position?: number
          track_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          materials?: Json
          name?: string
          org_id?: string
          position?: number
          track_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "track_steps_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "track_steps_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      tracks: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          org_id: string
          status: string
          type: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          org_id: string
          status?: string
          type?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          org_id?: string
          status?: string
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tracks_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_member_invite: { Args: { p_token: string }; Returns: string }
      admin_list_orgs: {
        Args: never
        Returns: {
          country: string
          created_at: string
          currency: string
          groups: number
          members: number
          name: string
          org_id: string
          plan: string
          status: string
          sticks: number
        }[]
      }
      admin_platform_stats: {
        Args: never
        Returns: {
          active: number
          members: number
          orgs: number
          sticks: number
          suspended: number
        }[]
      }
      admin_set_org_status: {
        Args: { p_org: string; p_status: string }
        Returns: undefined
      }
      can_manage_org_fiscal: { Args: { p_org: string }; Returns: boolean }
      can_see_post: { Args: { p_post: string }; Returns: boolean }
      can_see_space: { Args: { p_space: string }; Returns: boolean }
      create_org: {
        Args: {
          p_campus: string
          p_country?: string
          p_currency: string
          p_name: string
          p_state: Json
        }
        Returns: string
      }
      has_perm: { Args: { p_org: string; p_perm: string }; Returns: boolean }
      is_dm_participant: { Args: { p_thread: string }; Returns: boolean }
      is_org_member: { Args: { p_org: string }; Returns: boolean }
      is_platform_admin: { Args: never; Returns: boolean }
      next_receipt_number: { Args: { p_org: string }; Returns: string }
      org_has_no_members: { Args: { p_org: string }; Returns: boolean }
      seed_default_finance_categories: {
        Args: { p_org: string }
        Returns: undefined
      }
      seed_default_system_roles: { Args: { p_org: string }; Returns: undefined }
      shares_org: { Args: { p_other: string }; Returns: boolean }
    }
    Enums: {
      attendance_context: "service" | "group" | "event" | "teaching"
      attendance_status: "present" | "absent" | "excused" | "unknown"
      care_status:
        | "new"
        | "assigned"
        | "in_progress"
        | "waiting"
        | "resolved"
        | "closed"
      entry_type: "in" | "out"
      group_member_role: "member" | "leader" | "co_leader" | "host"
      prayer_privacy: "church" | "group" | "leader" | "private"
      relationship_status:
        | "visitor_first"
        | "visitor_returning"
        | "attendee"
        | "member"
        | "inactive"
      series_status: "planning" | "active" | "completed" | "archived"
      sermon_status: "draft" | "preparing" | "ready" | "preached" | "archived"
      sermon_visibility: "private" | "leadership" | "church" | "public"
      signal_priority: "celebration" | "notice" | "attention" | "urgent"
      signal_status:
        | "new"
        | "seen"
        | "assigned"
        | "in_progress"
        | "resolved"
        | "dismissed"
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
      attendance_context: ["service", "group", "event", "teaching"],
      attendance_status: ["present", "absent", "excused", "unknown"],
      care_status: [
        "new",
        "assigned",
        "in_progress",
        "waiting",
        "resolved",
        "closed",
      ],
      entry_type: ["in", "out"],
      group_member_role: ["member", "leader", "co_leader", "host"],
      prayer_privacy: ["church", "group", "leader", "private"],
      relationship_status: [
        "visitor_first",
        "visitor_returning",
        "attendee",
        "member",
        "inactive",
      ],
      series_status: ["planning", "active", "completed", "archived"],
      sermon_status: ["draft", "preparing", "ready", "preached", "archived"],
      sermon_visibility: ["private", "leadership", "church", "public"],
      signal_priority: ["celebration", "notice", "attention", "urgent"],
      signal_status: [
        "new",
        "seen",
        "assigned",
        "in_progress",
        "resolved",
        "dismissed",
      ],
    },
  },
} as const
