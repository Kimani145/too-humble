// Core types shared across admin panel modules

export type UserRole    = 'client' | 'admin';
export type ContentType = 'quote' | 'video' | 'verse';
export type PaymentGateway = 'daraja' | 'paypal';
export type PaymentStatus  = 'pending' | 'success' | 'failed' | 'cancelled' | 'expired';

export interface AdminProfile {
  id:         string;
  full_name:  string;
  role:       UserRole;
  avatar_url: string | null;
  fb_link:    string | null;
  created_at: string;
  updated_at: string;
}

export interface HomeFeedPost {
  id:               string;
  content_type:     ContentType;
  title:            string;
  body_text:        string | null;
  media_url:        string | null;
  author_reference: string | null;
  reaction_count:   number;
  created_at:       string;
  updated_at:       string;
}

export interface CommunityPost {
  id:           string;
  user_id:      string;
  image_url:    string | null;
  caption:      string | null;
  file_size_kb: number | null;
  is_flagged:   boolean;
  created_at:   string;
  profiles:     { full_name: string; avatar_url: string | null } | null;
}

export interface LedgerEntry {
  id:              string;
  user_id:         string;
  payment_gateway: PaymentGateway;
  amount:          number;
  currency:        string;
  status:          PaymentStatus;
  reference_id:    string;
  phone_number:    string | null;
  created_at:      string;
  profiles:        { full_name: string } | null;
}

export interface DashboardStats {
  totalUsers:       number;
  totalClients:     number;
  totalAdmins:      number;
  totalPosts:       number;
  flaggedPosts:     number;
  totalFeedItems:   number;
  totalDonations:   number;
  successfulAmount: number;
}
