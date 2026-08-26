// =============================================================================
// TOO HUMBLE - DATABASE TYPE DEFINITIONS
// Maps 1:1 to the Supabase migration schema (001_initial_schema.sql)
// =============================================================================

export type UserRole = 'client' | 'admin';
export type ContentType = 'quote' | 'video' | 'verse';
export type PaymentGateway = 'daraja' | 'paypal';
export type PaymentStatus = 'pending' | 'success' | 'failed' | 'cancelled' | 'expired';

// -----------------------------------------------------------------------
// TABLE ROW TYPES
// -----------------------------------------------------------------------

export type Profile = {
  id: string;
  full_name: string;
  role: UserRole;
  avatar_url: string | null;
  fb_link: string | null;
  created_at: string;
  updated_at: string;
};

export type HomeFeedPost = {
  id: string;
  content_type: ContentType;
  title: string;
  media_url: string | null;
  author_reference: string;
  body_text: string | null;
  reaction_count: number;
  created_at: string;
  updated_at: string;
};

export type CommunityPost = {
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
};

export type MonetizationLedger = {
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
};

export type PostReaction = {
  id: string;
  post_id: string;
  user_id: string;
  created_at: string;
};

export type CommunityReaction = {
  id: string;
  post_id: string;
  user_id: string;
  created_at: string;
};

export type ProcessedWebhookLog = {
  id: string;
  gateway: 'daraja' | 'paypal';
  event_id: string;
  event_type: string;
  result_code: number | null;
  processed_at: string;
};

export type SavedPost = {
  id: string;
  user_id: string;
  post_id: string;
  created_at: string;
  // Joined fields (queries that join home_feed)
  home_feed?: HomeFeedPost;
};

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

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: ProfileInsert;
        Update: ProfileUpdate;
        Relationships: [];
      };
      home_feed: {
        Row: HomeFeedPost;
        Insert: HomeFeedInsert;
        Update: HomeFeedUpdate;
        Relationships: [];
      };
      community_posts: {
        Row: CommunityPost;
        Insert: CommunityPostInsert;
        Update: CommunityPostUpdate;
        Relationships: [];
      };
      monetization_ledger: {
        Row: MonetizationLedger;
        Insert: MonetizationLedgerInsert;
        Update: MonetizationLedgerUpdate;
        Relationships: [];
      };
      post_reactions: {
        Row: PostReaction;
        Insert: Pick<PostReaction, 'post_id' | 'user_id'>;
        Update: never;
        Relationships: [];
      };
      community_reactions: {
        Row: CommunityReaction;
        Insert: Pick<CommunityReaction, 'post_id' | 'user_id'>;
        Update: never;
        Relationships: [];
      };
      saved_posts: {
        Row: SavedPost;
        Insert: Pick<SavedPost, 'user_id' | 'post_id'>;
        Update: never;
        Relationships: [];
      };
      bible_highlights: {
        Row: BibleHighlight;
        Insert: BibleHighlightInsert;
        Update: BibleHighlightUpdate;
        Relationships: [];
      };
      bible_notes: {
        Row: BibleNote;
        Insert: BibleNoteInsert;
        Update: BibleNoteUpdate;
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: Record<never, never>;
    Enums: {
      user_role: UserRole;
      content_type: ContentType;
      payment_gateway: PaymentGateway;
      payment_status: PaymentStatus;
    };
    CompositeTypes: Record<never, never>;
  };
};

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

export interface AOLabBook {
  id:               string;  // e.g., 'GEN', 'JHN'
  name:             string;  // e.g., 'Genesis'
  commonName:       string;  // e.g., 'Genesis'
  numberOfChapters: number;
  testament:        'old' | 'new';  // derived: NT starts at 'MAT'
}

export type AOLabTextItem = string | { text?: string; poem?: number; lineBreak?: boolean; noteId?: number };

export interface AOLabVerse {
  type:    'verse';
  number:  number;
  content: AOLabTextItem[];
}

export interface AOLabHeading {
  type:    'heading';
  content: AOLabTextItem[];
}

export type AOLabContentItem = AOLabVerse | AOLabHeading | { type: 'line_break' };

export interface AOLabApiChapterResponse {
  translation: { id: string; name: string; shortName: string };
  book: { id: string; name: string; commonName: string };
  chapter: {
    number: number;
    content: AOLabContentItem[];
  };
  numberOfVerses: number;
  previousChapterApiLink: string | null;
  nextChapterApiLink: string | null;
}

export interface AOLabChapter {
  book:    { id: string; name: string; commonName: string };
  chapter: { number: number };
  numberOfVerses: number;
  previousChapterApiLink: string | null;
  nextChapterApiLink:     string | null;
  content: AOLabContentItem[];
}

export interface BiblePreferences {
  translationId:  string;
  selectedBookId: string | null;    // AOLabBook.id
  selectedChapter: number | null;
}

export type BibleHighlight = {
  id:             string;
  user_id:        string;
  translation_id: string;
  book_id:        string;
  book_name:      string;
  chapter:        number;
  verse_number:   number;
  verse_text:     string;
  color:          string;
  created_at:     string;
  updated_at:     string;
  deleted_at:     string | null;
};

export type BibleHighlightInsert = {
  id?: string;
  user_id: string;
  translation_id?: string;
  book_id: string;
  book_name: string;
  chapter: number;
  verse_number: number;
  verse_text: string;
  color?: string;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
};

export type BibleHighlightUpdate = Partial<BibleHighlightInsert>;

export type BibleNote = {
  id:             string;
  user_id:        string;
  translation_id: string;
  book_id:        string;
  book_name:      string;
  chapter:        number;
  verse_number:   number;
  verse_text:     string;
  note_text:      string;
  created_at:     string;
  updated_at:     string;
  verse_end:      number | null;
};

export type BibleNoteInsert = {
  id?: string;
  user_id: string;
  translation_id?: string;
  book_id: string;
  book_name: string;
  chapter: number;
  verse_number: number;
  verse_text: string;
  note_text: string;
  created_at?: string;
  updated_at?: string;
  verse_end?: number | null;
};

export type BibleNoteUpdate = Partial<BibleNoteInsert>;

export interface ChapterAnnotations {
  highlights: BibleHighlight[];  // all highlights for this chapter
  notes:      BibleNote[];       // all notes for this chapter
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
