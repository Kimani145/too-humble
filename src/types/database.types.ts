// =============================================================================
// TOO HUMBLE - DATABASE TYPE DEFINITIONS
// Maps 1:1 to the Supabase migration schema (001_initial_schema.sql)
// =============================================================================

export type UserRole = 'client' | 'admin';
export type ContentType = 'quote' | 'video' | 'verse';
export type PaymentGateway = 'daraja' | 'paypal';
export type PaymentStatus = 'pending' | 'success' | 'failed' | 'cancelled';

// -----------------------------------------------------------------------
// TABLE ROW TYPES
// -----------------------------------------------------------------------

export interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
  avatar_url: string | null;
  fb_link: string | null;
  created_at: string;
  updated_at: string;
}

export interface HomeFeedPost {
  id: string;
  content_type: ContentType;
  title: string;
  media_url: string | null;
  author_reference: string;
  body_text: string | null;
  reaction_count: number;
  created_at: string;
  updated_at: string;
}

export interface CommunityPost {
  id: string;
  user_id: string;
  image_url: string | null;
  caption: string;
  file_size_kb: number | null;
  is_flagged: boolean;
  created_at: string;
  updated_at: string;
  // Joined fields (from queries that join profiles)
  profiles?: Pick<Profile, 'id' | 'full_name' | 'avatar_url' | 'role'>;
}

export interface MonetizationLedger {
  id: string;
  user_id: string;
  payment_gateway: PaymentGateway;
  amount: number;
  status: PaymentStatus;
  reference_id: string;
  phone_number: string | null;
  currency: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface PostReaction {
  id: string;
  post_id: string;
  user_id: string;
  created_at: string;
}

export interface CommunityReaction {
  id: string;
  post_id: string;
  user_id: string;
  created_at: string;
}

// -----------------------------------------------------------------------
// INSERT TYPES (omit auto-generated fields)
// -----------------------------------------------------------------------

export type ProfileInsert = Pick<Profile, 'id' | 'full_name'> &
  Partial<Pick<Profile, 'role' | 'avatar_url' | 'fb_link'>>;

export type HomeFeedInsert = Pick<HomeFeedPost, 'content_type' | 'title'> &
  Partial<Pick<HomeFeedPost, 'media_url' | 'author_reference' | 'body_text'>>;

export type CommunityPostInsert = Pick<CommunityPost, 'user_id' | 'caption'> &
  Partial<Pick<CommunityPost, 'image_url' | 'file_size_kb'>>;

export type MonetizationLedgerInsert = Pick<
  MonetizationLedger,
  'user_id' | 'payment_gateway' | 'amount' | 'reference_id'
> &
  Partial<
    Pick<MonetizationLedger, 'phone_number' | 'currency' | 'metadata' | 'status'>
  >;

// -----------------------------------------------------------------------
// UPDATE TYPES
// -----------------------------------------------------------------------

export type ProfileUpdate = Partial<
  Pick<Profile, 'full_name' | 'avatar_url' | 'fb_link' | 'role'>
>;

export type HomeFeedUpdate = Partial<
  Pick<HomeFeedPost, 'content_type' | 'title' | 'media_url' | 'author_reference' | 'body_text'>
>;

export type CommunityPostUpdate = Partial<
  Pick<CommunityPost, 'caption' | 'image_url' | 'is_flagged'>
>;

export type MonetizationLedgerUpdate = Partial<
  Pick<MonetizationLedger, 'status' | 'metadata'>
>;

// -----------------------------------------------------------------------
// DATABASE TYPE MAP (Supabase generic type helper)
// -----------------------------------------------------------------------

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: ProfileInsert;
        Update: ProfileUpdate;
      };
      home_feed: {
        Row: HomeFeedPost;
        Insert: HomeFeedInsert;
        Update: HomeFeedUpdate;
      };
      community_posts: {
        Row: CommunityPost;
        Insert: CommunityPostInsert;
        Update: CommunityPostUpdate;
      };
      monetization_ledger: {
        Row: MonetizationLedger;
        Insert: MonetizationLedgerInsert;
        Update: MonetizationLedgerUpdate;
      };
      post_reactions: {
        Row: PostReaction;
        Insert: Pick<PostReaction, 'post_id' | 'user_id'>;
        Update: never;
      };
      community_reactions: {
        Row: CommunityReaction;
        Insert: Pick<CommunityReaction, 'post_id' | 'user_id'>;
        Update: never;
      };
    };
    Enums: {
      user_role: UserRole;
      content_type: ContentType;
      payment_gateway: PaymentGateway;
      payment_status: PaymentStatus;
    };
  };
}

// -----------------------------------------------------------------------
// API / SERVICE TYPES
// -----------------------------------------------------------------------

export interface BibleBook {
  id: number;
  name: string;
  testament: 'old' | 'new';
  chapters: number;
  abbreviation: string;
}

export interface BibleVerse {
  id: number;
  book: string;
  chapter: number;
  verse: number;
  text: string;
}

export interface BibleChapter {
  book: string;
  chapter: number;
  verses: BibleVerse[];
}

export interface DailyVerse {
  reference: string;
  text: string;
  book: string;
  chapter: number;
  verse: number;
  fetchedAt: string;
}

// -----------------------------------------------------------------------
// PAYMENT SERVICE TYPES
// -----------------------------------------------------------------------

export interface DarajaSTKPushRequest {
  BusinessShortCode: string;
  Password: string;
  Timestamp: string;
  TransactionType: 'CustomerPayBillOnline' | 'CustomerBuyGoodsOnline';
  Amount: number;
  PartyA: string;
  PartyB: string;
  PhoneNumber: string;
  CallBackURL: string;
  AccountReference: string;
  TransactionDesc: string;
}

export interface DarajaSTKPushResponse {
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResponseCode: string;
  ResponseDescription: string;
  CustomerMessage: string;
}

export interface DarajaCallbackMetadata {
  MpesaReceiptNumber: string;
  Amount: number;
  Balance?: string;
  TransactionDate: number;
  PhoneNumber: string;
}

export interface PayPalOrderCreateRequest {
  amount: number;
  currency: string;
  description: string;
  userId: string;
}

export interface PaymentResult {
  success: boolean;
  referenceId: string;
  amount: number;
  gateway: PaymentGateway;
  errorMessage?: string;
}
