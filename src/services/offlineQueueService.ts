import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';

const QUEUE_KEY = '@too_humble:offline_post_queue';

export interface OfflinePostDraft {
  id:           string;         // UUID — used as filename key and idempotency ID
  userId:       string;
  caption:      string;
  localImagePath: string | null; // FileSystem.documentDirectory + id + ext
  imageExt:     string | null;   // 'jpg' | 'png' etc
  imageSizeKb:  number | null;
  createdAt:    string;          // ISO string
  attempts:     number;          // flush retry count — max 3
}

// ── Read the full queue ───────────────────────────────────────────────────────
export async function getDraftQueue(): Promise<OfflinePostDraft[]> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as OfflinePostDraft[];
  } catch {
    return [];
  }
}

// ── Persist full queue ────────────────────────────────────────────────────────
async function saveDraftQueue(queue: OfflinePostDraft[]): Promise<void> {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

// ── Enqueue a new draft ───────────────────────────────────────────────────────
// Copies the image from a temporary picker URI to a persistent DocumentDirectory
// location. The picker URI is ephemeral — without this copy it is lost on app restart.
export async function enqueueDraft(
  userId:       string,
  caption:      string,
  imageUri:     string | null,
  imageExt:     string | null,
  imageSizeKb:  number | null
): Promise<string> {
  const id = generateDraftId();
  let localImagePath: string | null = null;

  if (imageUri && imageExt) {
    const destPath = `${FileSystem.documentDirectory ?? ''}draft_${id}.${imageExt}`;
    await FileSystem.copyAsync({ from: imageUri, to: destPath });
    localImagePath = destPath;
  }

  const draft: OfflinePostDraft = {
    id, userId, caption, localImagePath, imageExt,
    imageSizeKb, createdAt: new Date().toISOString(), attempts: 0,
  };

  const queue = await getDraftQueue();
  queue.push(draft);
  await saveDraftQueue(queue);
  return id;
}

// ── Remove a draft by ID ──────────────────────────────────────────────────────
// Also deletes the local image file if it exists.
export async function removeDraft(id: string): Promise<void> {
  const queue = await getDraftQueue();
  const draft = queue.find(d => d.id === id);
  if (draft?.localImagePath) {
    await FileSystem.deleteAsync(draft.localImagePath, { idempotent: true });
  }
  await saveDraftQueue(queue.filter(d => d.id !== id));
}

// ── Increment attempt counter ─────────────────────────────────────────────────
export async function incrementAttempts(id: string): Promise<void> {
  const queue = await getDraftQueue();
  await saveDraftQueue(
    queue.map(d => d.id === id ? { ...d, attempts: d.attempts + 1 } : d)
  );
}

// ── Discard drafts that have failed too many times ────────────────────────────
export async function pruneFailedDrafts(): Promise<void> {
  const queue = await getDraftQueue();
  const MAX_ATTEMPTS = 3;
  const toRemove = queue.filter(d => d.attempts >= MAX_ATTEMPTS);
  for (const draft of toRemove) {
    if (draft.localImagePath) {
      await FileSystem.deleteAsync(draft.localImagePath, { idempotent: true });
    }
  }
  await saveDraftQueue(queue.filter(d => d.attempts < MAX_ATTEMPTS));
}

// ── Utility: generate a UUID-like draft ID ───────────────────────────────────
function generateDraftId(): string {
  return 'draft_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 9);
}
