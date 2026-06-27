// =============================================================================
// TOO HUMBLE - SUPABASE CLIENT
// Handles persistent sessions, token refresh, and network-aware behavior
// =============================================================================

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Database } from '../types/database.types';

// -----------------------------------------------------------------------
// Environment constants — replace with your actual Supabase project values
// or inject via expo-constants / environment variables
// -----------------------------------------------------------------------
const SUPABASE_URL: string = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const SUPABASE_ANON_KEY: string = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE1Nzg0MDU3MzcsImV4cCI6MTg5Mzk4MTczN30.placeholder-signature';

if (!process.env.EXPO_PUBLIC_SUPABASE_URL || !process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY) {
  console.warn(
    '[Supabase] EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY is not set. ' +
      'Using mock placeholder credentials for static compilation/testing.'
  );
}

import { Platform } from 'react-native';

const isSSR = Platform.OS === 'web' && typeof window === 'undefined';

const SecureStoreAdapter = {
  getItem: (key: string): string | null | Promise<string | null> => {
    if (isSSR) return null;
    return Platform.OS === 'web' ? localStorage.getItem(key) : SecureStore.getItemAsync(key);
  },
  setItem: (key: string, value: string): void | Promise<void> => {
    if (isSSR) return;
    return Platform.OS === 'web' ? localStorage.setItem(key, value) : SecureStore.setItemAsync(key, value);
  },
  removeItem: (key: string): void | Promise<void> => {
    if (isSSR) return;
    return Platform.OS === 'web' ? localStorage.removeItem(key) : SecureStore.deleteItemAsync(key);
  },
};

// -----------------------------------------------------------------------
// Supabase client singleton
// -----------------------------------------------------------------------
export const supabase: SupabaseClient<Database> = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      storage: SecureStoreAdapter,
      // Automatically refresh tokens before they expire
      autoRefreshToken: true,
      // Persist session across cold boots
      persistSession: true,
      // Detect session from URL (deep links)
      detectSessionInUrl: false,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
    global: {
      headers: {
        'x-app-name': 'too-humble',
        'x-app-version': '1.0.0',
      },
    },
  }
);

// -----------------------------------------------------------------------
// Helper: Upload file to a storage bucket
// -----------------------------------------------------------------------
export async function uploadToStorage(
  bucket: string,
  path: string,
  file: Blob | File | ArrayBuffer,
  contentType: string
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      contentType,
      upsert: false,
    });

  if (error) {
    throw new Error(`Storage upload failed: ${error.message}`);
  }

  const { data: publicData } = supabase.storage
    .from(bucket)
    .getPublicUrl(data.path);

  return publicData.publicUrl;
}

// -----------------------------------------------------------------------
// Helper: Fetch signed URL for private buckets (community-uploads)
// -----------------------------------------------------------------------
export async function getSignedUrl(
  bucket: string,
  path: string,
  expiresInSeconds = 3600
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresInSeconds);

  if (error || !data) {
    throw new Error(`Failed to get signed URL: ${error?.message}`);
  }

  return data.signedUrl;
}

// -----------------------------------------------------------------------
// Helper: Delete a file from storage
// -----------------------------------------------------------------------
export async function deleteFromStorage(
  bucket: string,
  path: string
): Promise<void> {
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) {
    throw new Error(`Storage delete failed: ${error.message}`);
  }
}

export default supabase;
