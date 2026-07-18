// Generated from the live Supabase schema (Phase 1).
// Regenerate with the Supabase MCP `generate_typescript_types` tool, or:
//   supabase gen types typescript --project-id tqvznoeszjuouvzsovhk > src/types/database.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  __InternalSupabase: { PostgrestVersion: '14.5' };
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          full_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      businesses: {
        Row: {
          id: string;
          name: string;
          type: string | null;
          brand_colors: Json;
          logo_url: string | null;
          tone: string | null;
          description: string | null;
          onboarding_completed_at: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          type?: string | null;
          brand_colors?: Json;
          logo_url?: string | null;
          tone?: string | null;
          description?: string | null;
          onboarding_completed_at?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          type?: string | null;
          brand_colors?: Json;
          logo_url?: string | null;
          tone?: string | null;
          description?: string | null;
          onboarding_completed_at?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      workspace_members: {
        Row: {
          id: string;
          business_id: string;
          user_id: string;
          role: Database['public']['Enums']['member_role'];
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          user_id: string;
          role?: Database['public']['Enums']['member_role'];
          created_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          user_id?: string;
          role?: Database['public']['Enums']['member_role'];
          created_at?: string;
        };
        Relationships: [];
      };
      connected_accounts: {
        Row: {
          id: string;
          business_id: string;
          platform: Database['public']['Enums']['platform'];
          account_id: string | null;
          account_name: string | null;
          access_token: string | null;
          refresh_token: string | null;
          token_expires_at: string | null;
          scopes: string[] | null;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          platform: Database['public']['Enums']['platform'];
          account_id?: string | null;
          account_name?: string | null;
          access_token?: string | null;
          refresh_token?: string | null;
          token_expires_at?: string | null;
          scopes?: string[] | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          platform?: Database['public']['Enums']['platform'];
          account_id?: string | null;
          account_name?: string | null;
          access_token?: string | null;
          refresh_token?: string | null;
          token_expires_at?: string | null;
          scopes?: string[] | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      content_items: {
        Row: {
          id: string;
          business_id: string;
          type: Database['public']['Enums']['content_type'];
          status: Database['public']['Enums']['content_status'];
          caption: string | null;
          hashtags: string[];
          media_url: string | null;
          platform: Database['public']['Enums']['platform'] | null;
          scheduled_for: string | null;
          published_at: string | null;
          external_post_id: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          type?: Database['public']['Enums']['content_type'];
          status?: Database['public']['Enums']['content_status'];
          caption?: string | null;
          hashtags?: string[];
          media_url?: string | null;
          platform?: Database['public']['Enums']['platform'] | null;
          scheduled_for?: string | null;
          published_at?: string | null;
          external_post_id?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          type?: Database['public']['Enums']['content_type'];
          status?: Database['public']['Enums']['content_status'];
          caption?: string | null;
          hashtags?: string[];
          media_url?: string | null;
          platform?: Database['public']['Enums']['platform'] | null;
          scheduled_for?: string | null;
          published_at?: string | null;
          external_post_id?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      metrics: {
        Row: {
          id: string;
          business_id: string;
          connected_account_id: string | null;
          content_id: string | null;
          platform: Database['public']['Enums']['platform'];
          followers: number | null;
          reach: number | null;
          engagement: number | null;
          views: number | null;
          likes: number | null;
          comments: number | null;
          collected_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          connected_account_id?: string | null;
          content_id?: string | null;
          platform: Database['public']['Enums']['platform'];
          followers?: number | null;
          reach?: number | null;
          engagement?: number | null;
          views?: number | null;
          likes?: number | null;
          comments?: number | null;
          collected_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          connected_account_id?: string | null;
          content_id?: string | null;
          platform?: Database['public']['Enums']['platform'];
          followers?: number | null;
          reach?: number | null;
          engagement?: number | null;
          views?: number | null;
          likes?: number | null;
          comments?: number | null;
          collected_at?: string;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: {
      is_member_of: { Args: { b_id: string }; Returns: boolean };
      create_business: {
        Args: {
          p_name: string;
          p_type?: string | null;
          p_description?: string | null;
          p_tone?: string | null;
          p_brand_colors?: Json;
        };
        Returns: Database['public']['Tables']['businesses']['Row'];
      };
    };
    Enums: {
      platform: 'instagram' | 'youtube' | 'tiktok' | 'facebook';
      member_role: 'owner' | 'admin' | 'member';
      content_type: 'post' | 'graphic' | 'caption' | 'subtitle' | 'animation' | 'video';
      content_status: 'draft' | 'approved' | 'scheduled' | 'published' | 'failed';
    };
    CompositeTypes: Record<never, never>;
  };
};

type PublicSchema = Database['public'];
export type Tables<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Row'];
export type TablesInsert<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Insert'];
export type TablesUpdate<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Update'];
export type Enums<T extends keyof PublicSchema['Enums']> = PublicSchema['Enums'][T];
