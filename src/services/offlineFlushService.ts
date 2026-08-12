import * as FileSystem from 'expo-file-system';
import { supabase, uploadToStorage } from '../lib/supabase';
import {
  getDraftQueue,
  removeDraft,
  incrementAttempts,
  pruneFailedDrafts,
  OfflinePostDraft,
} from './offlineQueueService';

export interface FlushResult {
  published: number;
  failed:    number;
  remaining: number;
}

export async function flushOfflineQueue(
  onProgress?: (draft: OfflinePostDraft, success: boolean) => void
): Promise<FlushResult> {
  await pruneFailedDrafts();
  const queue = await getDraftQueue();
  if (queue.length === 0) return { published: 0, failed: 0, remaining: 0 };

  let published = 0;
  let failed = 0;

  for (const draft of queue) {
    try {
      let uploadedUrl: string | null = null;

      if (draft.localImagePath && draft.imageExt) {
        // Read the persisted local image as a base64 blob
        const base64 = await FileSystem.readAsStringAsync(draft.localImagePath, {
          encoding: FileSystem.EncodingType.Base64,
        });

        // Convert base64 to ArrayBuffer for Supabase upload
        const binaryStr = atob(base64);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }

        const storagePath = `community/media/${draft.userId}/${draft.id}.${draft.imageExt}`;
        uploadedUrl = await uploadToStorage(
          'community-uploads',
          storagePath,
          bytes.buffer,
          `image/${draft.imageExt}`
        );
      }

      const { error } = await supabase.from('community_posts').insert({
        user_id:     draft.userId,
        caption:     draft.caption,
        image_url:   uploadedUrl,
        file_size_kb: draft.imageSizeKb ? Math.round(draft.imageSizeKb) : null,
      });

      if (error) throw error;

      await removeDraft(draft.id);
      published++;
      onProgress?.(draft, true);
    } catch {
      await incrementAttempts(draft.id);
      failed++;
      onProgress?.(draft, false);
      // Continue flushing remaining drafts — one failure doesn't stop the queue
    }
  }

  const remaining = (await getDraftQueue()).length;
  return { published, failed, remaining };
}
