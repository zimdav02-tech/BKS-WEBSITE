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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      activity_events: {
        Row: {
          created_at: string
          description: string | null
          icon: string | null
          id: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      airport_transfers: {
        Row: {
          airport: string | null
          arrival_at: string | null
          booking_id: string
          created_at: string
          driver_name: string | null
          driver_phone: string | null
          emergency_contact: string | null
          flight_number: string | null
          id: string
          pickup_location: string | null
          stage: Database["public"]["Enums"]["transfer_stage"]
          updated_at: string
          user_id: string
          vehicle_id: string | null
        }
        Insert: {
          airport?: string | null
          arrival_at?: string | null
          booking_id: string
          created_at?: string
          driver_name?: string | null
          driver_phone?: string | null
          emergency_contact?: string | null
          flight_number?: string | null
          id?: string
          pickup_location?: string | null
          stage?: Database["public"]["Enums"]["transfer_stage"]
          updated_at?: string
          user_id: string
          vehicle_id?: string | null
        }
        Update: {
          airport?: string | null
          arrival_at?: string | null
          booking_id?: string
          created_at?: string
          driver_name?: string | null
          driver_phone?: string | null
          emergency_contact?: string | null
          flight_number?: string | null
          id?: string
          pickup_location?: string | null
          stage?: Database["public"]["Enums"]["transfer_stage"]
          updated_at?: string
          user_id?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "airport_transfers_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "airport_transfers_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      apartments: {
        Row: {
          address: string | null
          amenities: string[]
          bedrooms: number
          city: string | null
          created_at: string
          description: string | null
          house_rules: string | null
          id: string
          images: string[]
          is_active: boolean
          map_url: string | null
          name: string
          nightly_rate: number
          updated_at: string
        }
        Insert: {
          address?: string | null
          amenities?: string[]
          bedrooms?: number
          city?: string | null
          created_at?: string
          description?: string | null
          house_rules?: string | null
          id?: string
          images?: string[]
          is_active?: boolean
          map_url?: string | null
          name: string
          nightly_rate?: number
          updated_at?: string
        }
        Update: {
          address?: string | null
          amenities?: string[]
          bedrooms?: number
          city?: string | null
          created_at?: string
          description?: string | null
          house_rules?: string | null
          id?: string
          images?: string[]
          is_active?: boolean
          map_url?: string | null
          name?: string
          nightly_rate?: number
          updated_at?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          created_at: string
          details: Json
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_address: string | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          details?: Json
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          details?: Json
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
        }
        Relationships: []
      }
      booking_services: {
        Row: {
          amount: number
          apartment_id: string | null
          booking_id: string
          created_at: string
          details: Json
          end_at: string | null
          id: string
          kind: Database["public"]["Enums"]["service_kind"]
          label: string
          start_at: string | null
          updated_at: string
          vehicle_id: string | null
        }
        Insert: {
          amount?: number
          apartment_id?: string | null
          booking_id: string
          created_at?: string
          details?: Json
          end_at?: string | null
          id?: string
          kind: Database["public"]["Enums"]["service_kind"]
          label: string
          start_at?: string | null
          updated_at?: string
          vehicle_id?: string | null
        }
        Update: {
          amount?: number
          apartment_id?: string | null
          booking_id?: string
          created_at?: string
          details?: Json
          end_at?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["service_kind"]
          label?: string
          start_at?: string | null
          updated_at?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_services_apartment_id_fkey"
            columns: ["apartment_id"]
            isOneToOne: false
            referencedRelation: "apartments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_services_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_services_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          created_at: string
          currency: string
          end_date: string | null
          id: string
          notes: string | null
          reference: string
          stage: Database["public"]["Enums"]["booking_stage"]
          start_date: string | null
          status: Database["public"]["Enums"]["booking_status"]
          title: string | null
          total_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          currency?: string
          end_date?: string | null
          id?: string
          notes?: string | null
          reference?: string
          stage?: Database["public"]["Enums"]["booking_stage"]
          start_date?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
          title?: string | null
          total_amount?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          currency?: string
          end_date?: string | null
          id?: string
          notes?: string | null
          reference?: string
          stage?: Database["public"]["Enums"]["booking_stage"]
          start_date?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
          title?: string | null
          total_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          last_message_at: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string
          subject?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          category: Database["public"]["Enums"]["document_category"]
          created_at: string
          id: string
          mime_type: string | null
          name: string
          size_bytes: number | null
          storage_path: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["document_category"]
          created_at?: string
          id?: string
          mime_type?: string | null
          name: string
          size_bytes?: number | null
          storage_path: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: Database["public"]["Enums"]["document_category"]
          created_at?: string
          id?: string
          mime_type?: string | null
          name?: string
          size_bytes?: number | null
          storage_path?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          attachment_name: string | null
          attachment_path: string | null
          body: string | null
          conversation_id: string
          created_at: string
          id: string
          read_at: string | null
          sender_id: string
          updated_at: string
        }
        Insert: {
          attachment_name?: string | null
          attachment_path?: string | null
          body?: string | null
          conversation_id: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id: string
          updated_at?: string
        }
        Update: {
          attachment_name?: string | null
          attachment_path?: string | null
          body?: string | null
          conversation_id?: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_url: string | null
          category: string
          created_at: string
          description: string | null
          id: string
          is_read: boolean
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          action_url?: string | null
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_read?: boolean
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          action_url?: string | null
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_read?: boolean
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          booking_id: string | null
          created_at: string
          currency: string
          id: string
          invoice_url: string | null
          method: string | null
          proof_path: string | null
          receipt_url: string | null
          reference: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          booking_id?: string | null
          created_at?: string
          currency?: string
          id?: string
          invoice_url?: string | null
          method?: string | null
          proof_path?: string | null
          receipt_url?: string | null
          reference?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          booking_id?: string | null
          created_at?: string
          currency?: string
          id?: string
          invoice_url?: string | null
          method?: string | null
          proof_path?: string | null
          receipt_url?: string | null
          reference?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          is_verified: boolean
          phone: string | null
          status: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          is_verified?: boolean
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          is_verified?: boolean
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          booking_id: string | null
          comment: string | null
          created_at: string
          id: string
          rating: number
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          booking_id?: string | null
          comment?: string | null
          created_at?: string
          id?: string
          rating: number
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          booking_id?: string | null
          comment?: string | null
          created_at?: string
          id?: string
          rating?: number
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_services: {
        Row: {
          created_at: string
          href: string | null
          id: string
          image_url: string | null
          item_id: string | null
          kind: Database["public"]["Enums"]["service_kind"]
          label: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          href?: string | null
          id?: string
          image_url?: string | null
          item_id?: string | null
          kind: Database["public"]["Enums"]["service_kind"]
          label: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          href?: string | null
          id?: string
          image_url?: string | null
          item_id?: string | null
          kind?: Database["public"]["Enums"]["service_kind"]
          label?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vehicles: {
        Row: {
          category: string | null
          created_at: string
          daily_rate: number
          fuel_policy: string | null
          id: string
          images: string[]
          insurance_info: string | null
          is_active: boolean
          name: string
          registration: string | null
          seats: number
          transmission: string | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          daily_rate?: number
          fuel_policy?: string | null
          id?: string
          images?: string[]
          insurance_info?: string | null
          is_active?: boolean
          name: string
          registration?: string | null
          seats?: number
          transmission?: string | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          daily_rate?: number
          fuel_policy?: string | null
          id?: string
          images?: string[]
          insurance_info?: string | null
          is_active?: boolean
          name?: string
          registration?: string | null
          seats?: number
          transmission?: string | null
          updated_at?: string
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
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "admin"
        | "manager"
        | "driver"
        | "housekeeping"
        | "support"
        | "finance"
        | "operations"
        | "customer"
      booking_stage:
        | "submitted"
        | "approved"
        | "payment_verified"
        | "driver_assigned"
        | "apartment_ready"
        | "arrival"
        | "completed"
      booking_status:
        | "pending"
        | "approved"
        | "in_progress"
        | "completed"
        | "cancelled"
      document_category:
        | "passport"
        | "national_id"
        | "drivers_licence"
        | "invoice"
        | "receipt"
        | "contract"
        | "rental_agreement"
        | "other"
      payment_status:
        | "pending"
        | "under_review"
        | "approved"
        | "rejected"
        | "refunded"
      service_kind:
        | "apartment"
        | "vehicle"
        | "airport_transfer"
        | "tour"
        | "cargo"
        | "logistics"
        | "get_cash"
        | "construction"
        | "property"
      transfer_stage:
        | "flight_scheduled"
        | "driver_assigned"
        | "driver_en_route"
        | "driver_waiting"
        | "picked_up"
        | "completed"
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
        "super_admin",
        "admin",
        "manager",
        "driver",
        "housekeeping",
        "support",
        "finance",
        "operations",
        "customer",
      ],
      booking_stage: [
        "submitted",
        "approved",
        "payment_verified",
        "driver_assigned",
        "apartment_ready",
        "arrival",
        "completed",
      ],
      booking_status: [
        "pending",
        "approved",
        "in_progress",
        "completed",
        "cancelled",
      ],
      document_category: [
        "passport",
        "national_id",
        "drivers_licence",
        "invoice",
        "receipt",
        "contract",
        "rental_agreement",
        "other",
      ],
      payment_status: [
        "pending",
        "under_review",
        "approved",
        "rejected",
        "refunded",
      ],
      service_kind: [
        "apartment",
        "vehicle",
        "airport_transfer",
        "tour",
        "cargo",
        "logistics",
        "get_cash",
        "construction",
        "property",
      ],
      transfer_stage: [
        "flight_scheduled",
        "driver_assigned",
        "driver_en_route",
        "driver_waiting",
        "picked_up",
        "completed",
      ],
    },
  },
} as const
