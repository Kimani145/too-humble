# 🙏 Too Humble — Mobile Community Platform

Too Humble is a premium, production-grade, faith-based mobile community application built using React Native (Expo) and Supabase. The platform provides a shared spiritual space, daily devotionals, an interactive Bible reader, user-generated community content, and local/global donation integrations.

---

## 📖 Key Pillars & Core Features

1. **Daily Feed & Devotionals**:
   - Curated daily scripture and devotionals published by administrators.
   - A interactive **30-day calendar strip** with precise GMT date filtering (fetch devotionals starting from GMT 00:00:00 to 23:59:59 of the selected day).
   - Sticky daily verses with smooth, flicker-free animated transitions.

2. **Community Space**:
   - User-generated post uploads (image + caption) with secure pathing rules: `community/media/{user_id}/{uuid}.{ext}`.
   - Highly secure **Private Storage Buckets** where images are retrieved using cached signed URLs (valid for 3600 seconds) to limit redundant Supabase network request overhead.
   - User reporting and flagging mechanisms with administrative moderation capabilities.

3. **Bible Reader**:
   - A fully functional 66-book Bible reader backed by the **Free Use Bible API (AO Lab)**.
   - Complete chapter selection and reading list persistence.

4. **Monetization Hub**:
   - Local mobile transactions via the **Safaricom Daraja API** (M-Pesa STK Push webhooks).
   - Global donation integration using the **PayPal SDK & WebView approvals**.
   - Fully audited transaction logging to a PostgreSQL `monetization_ledger` table with client-side read-only locks.

---

## 🗂 Project Topology & Architecture

```text
├── app/                           # Expo Router file-based navigation
│   ├── (tabs)/                    # Client user tab navigator
│   │   ├── home.tsx               # 30-day calendar strip & devotionals feed
│   │   ├── bible.tsx              # Bible search and full text reader
│   │   ├── community.tsx          # Community photo uploads and posts feed
│   │   ├── profile.tsx            # Personal configuration, ledger, & donations
│   │   └── _layout.tsx            # Tab navigation layout & icons
│   ├── (admin)/                   # Restricted administrative space
│   │   ├── dashboard.tsx          # Realtime registration alerts & flagging moderation grid
│   │   └── create-content.tsx     # Devotional creation & editor interface
│   ├── auth/                      # Authentication screen suite
│   │   ├── login.tsx              # Responsive login with desktop split-panel
│   │   └── register.tsx           # Responsive registration with password strength bars
│   └── _layout.tsx                # Global application root provider (Auth, Navigation)
│
├── src/                           # Shared source directory
│   ├── components/                # Reusable UI elements (StickyVerse, cards, loaders)
│   ├── constants/                 # Theme tokens (colors, margins, font configurations)
│   ├── context/                   # Global React contexts (AuthContext session management)
│   ├── lib/                       # SDK Client wrappers (supabase.ts with SecureStoreAdapter)
│   ├── screens/                   # Screen controllers backing route components
│   ├── services/                  # Business logic services (bibleService, paymentService)
│   └── types/                     # Strictly typed database and API contracts
│
└── supabase/                      # Database scripts and management
    ├── migrations/                # PostgreSQL migration scripts
    │   ├── 001_initial_schema.sql # Core tables (profiles, feed, community, ledger, reactions)
    │   └── 002_hardening.sql      # Check constraints, triggers, and secure RLS policies
    └── config.toml                # Supabase local environment configuration
```

---

## 🔒 Security & Access Control (RBAC)

The application implements a strict **Role-Based Access Control** security architecture at the database level using Supabase Row Level Security (RLS) policies:

* **Public Roles**: All signed-in accounts defaults to the `client` role.
* **Client Rights**:
  - Read-only access to admin-published devotionals (`home_feed`).
  - Read-write access to community posts (`community_posts`) and reactions (`post_reactions`).
  - Cannot escalate roles or modify authorization states.
  - Read-only access to their own transactions in the `monetization_ledger` (all inserts/updates are delegated to protected server-side endpoints).
* **Admin Rights**:
  - Full CRUD operations on `home_feed` content.
  - Absolute moderation rights (DELETE, Flag Dismissals) over community content.
  - No public registration flow exists for `admin` accounts (granted directly via database modification or secure invite keys).
* **Hardened Schema**:
  - Size check constraints to prevent buffer/length-based abuse.
  - Triggers to automatically create public profiles upon email confirmation and sync reaction counts atomically.

---

## 🛠 Setup & Local Installation

### Prerequisites
- Node.js (v18 or higher recommended)
- npm or yarn package manager
- Expo Go app on a physical device, or Xcode/Android Studio simulators
- A Supabase project instance (local or hosted)

### 1. Clone the repository and install dependencies
```bash
cd too-humble
npm install
```

### 2. Set up environment variables
Create a `.env.local` file at the root of the project:
```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key

# Safaricom Daraja (M-Pesa STK Push)
EXPO_PUBLIC_DARAJA_CONSUMER_KEY=your-daraja-consumer-key
EXPO_PUBLIC_DARAJA_CONSUMER_SECRET=your-daraja-consumer-secret
EXPO_PUBLIC_DARAJA_SHORTCODE=174379
EXPO_PUBLIC_DARAJA_PASSKEY=your-daraja-passkey
EXPO_PUBLIC_DARAJA_CALLBACK_URL=https://yourdomain.com/api/mpesa-callback

# PayPal
EXPO_PUBLIC_PAYPAL_CLIENT_ID=your-paypal-sandbox-client-id
```

### 3. Run the migrations
Deploy files under `supabase/migrations/` to your database instance:
```bash
# Using the Supabase CLI
supabase db push
```

### 4. Start the application
```bash
# Start development server
npm start

# Run on Web Browser
npm run web

# Run on Android Emulator
npm run android

# Run on iOS Simulator
npm run ios
```

---

## 🎯 Verification & Linting

We maintain defensive programming standards. The project operates under strict TypeScript rules (no implicit `any`, explicit payload type casting).

To verify compilation and types:
```bash
npm run typecheck
```
