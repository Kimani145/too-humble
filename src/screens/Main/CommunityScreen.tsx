// =============================================================================
// TOO HUMBLE - COMMUNITY SCREEN
// Social feed with image upload (5MB hard limit), flagging, pagination
// =============================================================================

import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Image,
  TextInput, Modal, Alert, ActivityIndicator, RefreshControl,
  StatusBar, KeyboardAvoidingView, Platform, ScrollView,
  ListRenderItemInfo,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase, uploadToStorage } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { CommunityPost, CommunityPostInsert, CommunityPostUpdate } from '../../types/database.types';
import {
  COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS,
  MAX_IMAGE_SIZE_BYTES, MAX_CAPTION_LENGTH, STORAGE_BUCKETS, PAGE_SIZE,
} from '../../constants/theme';

// -----------------------------------------------------------------------
// Format relative time
// -----------------------------------------------------------------------
function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const signedUrlCache: { [path: string]: { url: string; expiresAt: number } } = {};

const getStoragePathFromUrl = (url: string): string | null => {
  if (!url) return null;
  const match = url.match(/community\/media\/[^?]+/);
  return match ? match[0] : null;
};

async function getCachedSignedUrl(path: string): Promise<string> {
  const cached = signedUrlCache[path];
  const buffer = 300 * 1000; // 5 minute buffer
  if (cached && cached.expiresAt > Date.now() + buffer) {
    return cached.url;
  }

  const { data, error } = await supabase.storage
    .from('community-uploads')
    .createSignedUrl(path, 3600);

  if (error || !data?.signedUrl) {
    throw new Error(error?.message ?? 'Failed to generate signed URL');
  }

  signedUrlCache[path] = {
    url: data.signedUrl,
    expiresAt: Date.now() + 3600 * 1000,
  };

  return data.signedUrl;
}

// -----------------------------------------------------------------------
// Post Card
// -----------------------------------------------------------------------
interface PostCardProps {
  post: CommunityPost;
  currentUserId: string | null;
  isAdmin: boolean;
  onFlag: (id: string) => void;
  onDelete: (id: string) => void;
}

function PostCard({ post, currentUserId, isAdmin, onFlag, onDelete }: PostCardProps): React.JSX.Element {
  const profile = post.profiles;
  const isOwner = currentUserId === post.user_id;

  return (
    <View style={styles.postCard}>
      {/* Author row */}
      <View style={styles.postHeader}>
        <View style={styles.avatar}>
          {profile?.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={styles.avatarImg} />
          ) : (
            <Text style={styles.avatarPlaceholder}>
              {(profile?.full_name ?? 'U').charAt(0).toUpperCase()}
            </Text>
          )}
        </View>
        <View style={styles.authorInfo}>
          <Text style={styles.authorName}>{profile?.full_name ?? 'Community Member'}</Text>
          <Text style={styles.postTime}>{timeAgo(post.created_at)} · 🌐</Text>
        </View>
        {(isOwner || isAdmin) && (
          <TouchableOpacity
            onPress={() =>
              Alert.alert('Post Options', '', [
                isAdmin && !post.is_flagged
                  ? { text: '🚩 Flag Post', onPress: () => onFlag(post.id) }
                  : { text: '✅ Dismiss Flag', onPress: () => onFlag(post.id) },
                isAdmin || isOwner
                  ? { text: '🗑️ Delete Post', style: 'destructive', onPress: () => onDelete(post.id) }
                  : { text: 'Cancel', style: 'cancel' },
                { text: 'Cancel', style: 'cancel' },
              ])
            }
            style={styles.moreBtn}
          >
            <Text style={styles.moreBtnText}>···</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Caption */}
      {post.caption ? <Text style={styles.caption}>{post.caption}</Text> : null}

      {/* Image */}
      {post.image_url ? (
        <Image source={{ uri: post.image_url }} style={styles.postImage} resizeMode="cover" />
      ) : null}

      {/* Flag indicator */}
      {post.is_flagged && (
        <View style={styles.flagBanner}>
          <Text style={styles.flagText}>🚩 Flagged for review</Text>
        </View>
      )}
    </View>
  );
}

// -----------------------------------------------------------------------
// Create Post Modal
// -----------------------------------------------------------------------
interface CreatePostModalProps {
  visible: boolean;
  onClose: () => void;
  onPublished: () => void;
  userId: string;
}

function CreatePostModal({ visible, onClose, onPublished, userId }: CreatePostModalProps): React.JSX.Element {
  const [caption, setCaption] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageSizeKb, setImageSizeKb] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);
  const [sizeError, setSizeError] = useState<string | null>(null);

  const pickImage = useCallback(async (): Promise<void> => {
    setSizeError(null);
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Too Humble needs photo access to share content.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
      aspect: [4, 3],
    });

    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];

    // Hard file-size check before upload
    const sizeBytes = asset.fileSize ?? 0;
    if (sizeBytes > MAX_IMAGE_SIZE_BYTES) {
      setSizeError(`Image is too large (${(sizeBytes / 1024 / 1024).toFixed(1)} MB). Max 5 MB.`);
      return;
    }

    setImageUri(asset.uri);
    setImageSizeKb(sizeBytes / 1024);
  }, []);

  const handleSubmit = useCallback(async (): Promise<void> => {
    if (!caption.trim() && !imageUri) {
      Alert.alert('Empty Post', 'Add a caption or select an image.');
      return;
    }

    setIsUploading(true);
    try {
      let uploadedUrl: string | null = null;

      if (imageUri) {
        const ext = imageUri.split('.').pop() ?? 'jpg';
        const uuid = generateUUID();
        const path = `community/media/${userId}/${uuid}.${ext}`;
        const response = await fetch(imageUri);
        const blob = await response.blob();
        uploadedUrl = await uploadToStorage(STORAGE_BUCKETS.communityUploads, path, blob, `image/${ext}`);
      }

      const { error } = await supabase.from('community_posts').insert({
        user_id: userId,
        caption: caption.trim(),
        image_url: uploadedUrl,
        file_size_kb: imageSizeKb ? Math.round(imageSizeKb) : null,
      } as CommunityPostInsert);

      if (error) throw error;

      setCaption('');
      setImageUri(null);
      onPublished();
      onClose();
    } catch (err: unknown) {
      Alert.alert('Upload Failed', err instanceof Error ? err.message : 'Try again.');
    } finally {
      setIsUploading(false);
    }
  }, [caption, imageUri, userId, imageSizeKb, onPublished, onClose]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={createStyles.container}>
          <View style={createStyles.header}>
            <TouchableOpacity onPress={onClose}><Text style={createStyles.cancelText}>Cancel</Text></TouchableOpacity>
            <Text style={createStyles.title}>Create Post</Text>
            <TouchableOpacity onPress={handleSubmit} disabled={isUploading}>
              {isUploading
                ? <ActivityIndicator color={COLORS.primary} />
                : <Text style={createStyles.postBtn}>Post</Text>}
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={createStyles.body}>
            <TextInput
              style={createStyles.captionInput}
              placeholder="What's on your mind?"
              placeholderTextColor={COLORS.midGray}
              value={caption}
              onChangeText={(t) => t.length <= MAX_CAPTION_LENGTH && setCaption(t)}
              multiline
              maxLength={MAX_CAPTION_LENGTH}
            />
            <Text style={createStyles.charCount}>{caption.length}/{MAX_CAPTION_LENGTH}</Text>

            {imageUri ? (
              <View style={createStyles.previewContainer}>
                <Image source={{ uri: imageUri }} style={createStyles.preview} resizeMode="cover" />
                <TouchableOpacity
                  style={createStyles.removeImg}
                  onPress={() => { setImageUri(null); setSizeError(null); }}
                >
                  <Text style={createStyles.removeImgText}>✕</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={createStyles.photoBtn} onPress={pickImage}>
                <Text style={createStyles.photoBtnIcon}>🖼️</Text>
                <Text style={createStyles.photoBtnText}>Add Photo (Max 5 MB)</Text>
              </TouchableOpacity>
            )}

            {sizeError && <Text style={createStyles.sizeError}>{sizeError}</Text>}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const createStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 52, paddingHorizontal: SPACING.base, paddingBottom: SPACING.md,
    borderBottomWidth: 1, borderBottomColor: COLORS.lightGray,
  },
  cancelText: { color: COLORS.darkGray, fontSize: TYPOGRAPHY.fontSize.base },
  title: { fontSize: TYPOGRAPHY.fontSize.md, fontWeight: '700', color: COLORS.charcoal },
  postBtn: { color: COLORS.primary, fontSize: TYPOGRAPHY.fontSize.base, fontWeight: '700' },
  body: { padding: SPACING.base },
  captionInput: {
    fontSize: TYPOGRAPHY.fontSize.base, color: COLORS.charcoal,
    minHeight: 120, textAlignVertical: 'top',
  },
  charCount: { fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.midGray, textAlign: 'right', marginBottom: SPACING.base },
  photoBtn: {
    borderWidth: 2, borderColor: COLORS.lightGray, borderStyle: 'dashed',
    borderRadius: BORDER_RADIUS.lg, padding: SPACING['2xl'],
    alignItems: 'center', marginBottom: SPACING.base,
  },
  photoBtnIcon: { fontSize: 32, marginBottom: SPACING.sm },
  photoBtnText: { color: COLORS.midGray, fontSize: TYPOGRAPHY.fontSize.base },
  previewContainer: { position: 'relative', marginBottom: SPACING.base },
  preview: { width: '100%', height: 200, borderRadius: BORDER_RADIUS.lg },
  removeImg: {
    position: 'absolute', top: 8, right: 8, width: 28, height: 28,
    borderRadius: 14, backgroundColor: COLORS.overlayDark,
    alignItems: 'center', justifyContent: 'center',
  },
  removeImgText: { color: COLORS.white, fontWeight: '700' },
  sizeError: { color: COLORS.error, fontSize: TYPOGRAPHY.fontSize.sm, textAlign: 'center' },
});

// -----------------------------------------------------------------------
// Community Screen
// -----------------------------------------------------------------------
export default function CommunityScreen(): React.JSX.Element {
  const { user, role } = useAuth();
  const isAdmin = role === 'admin';

  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const fetchPosts = useCallback(async (reset = false): Promise<void> => {
    const currentPage = reset ? 0 : page;
    if (!reset && !hasMore) return;

    try {
      const from = currentPage * PAGE_SIZE;
      const { data, error } = await supabase
        .from('community_posts')
        .select('*, profiles(id, full_name, avatar_url, role)')
        .order('created_at', { ascending: false })
        .range(from, from + PAGE_SIZE - 1);

      if (error) throw error;
      const newPosts = (data ?? []) as CommunityPost[];
      
      const resolvedPosts = await Promise.all(
        newPosts.map(async (post) => {
          if (post.image_url) {
            try {
              const path = getStoragePathFromUrl(post.image_url);
              if (path) {
                const signedUrl = await getCachedSignedUrl(path);
                return { ...post, image_url: signedUrl };
              }
            } catch (err) {
              console.error('Failed to get signed URL for post:', post.id, err);
            }
          }
          return post;
        })
      );

      setPosts((prev) => reset ? resolvedPosts : [...prev, ...resolvedPosts]);
      setHasMore(newPosts.length === PAGE_SIZE);
      setPage(currentPage + 1);
    } catch (err) {
      console.error('[CommunityScreen]', err);
    }
  }, [page, hasMore]);

  useEffect(() => {
    const init = async (): Promise<void> => {
      setIsLoading(true);
      await fetchPosts(true);
      setIsLoading(false);
    };
    init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRefresh = useCallback(async (): Promise<void> => {
    setIsRefreshing(true);
    setPage(0);
    setHasMore(true);
    await fetchPosts(true);
    setIsRefreshing(false);
  }, [fetchPosts]);

  const handleFlag = useCallback(async (postId: string): Promise<void> => {
    const post = posts.find((p) => p.id === postId);
    const newFlag = !(post?.is_flagged ?? false);
    await supabase.from('community_posts').update({ is_flagged: newFlag } as CommunityPostUpdate).eq('id', postId);
    setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, is_flagged: newFlag } : p));
  }, [posts]);

  const handleDelete = useCallback((postId: string): void => {
    Alert.alert('Delete Post', 'This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          await supabase.from('community_posts').delete().eq('id', postId);
          setPosts((prev) => prev.filter((p) => p.id !== postId));
        },
      },
    ]);
  }, []);

  const renderPost = useCallback(
    ({ item }: ListRenderItemInfo<CommunityPost>) => (
      <PostCard
        post={item}
        currentUserId={user?.id ?? null}
        isAdmin={isAdmin}
        onFlag={handleFlag}
        onDelete={handleDelete}
      />
    ),
    [user, isAdmin, handleFlag, handleDelete]
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>Community</Text>
            <Text style={styles.headerSub}>Share your faith. Inspire others.</Text>
          </View>
          <TouchableOpacity style={styles.createBtn} onPress={() => setShowCreate(true)}>
            <Text style={styles.createBtnText}>+ Create Post</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {isLoading ? (
        <View style={styles.centered}><ActivityIndicator size="large" color={COLORS.primary} /></View>
      ) : (
        <FlatList<CommunityPost>
          data={posts}
          renderItem={renderPost}
          keyExtractor={(p) => p.id}
          onEndReached={() => !isLoading && hasMore && fetchPosts(false)}
          onEndReachedThreshold={0.4}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} />
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>💬</Text>
              <Text style={styles.emptyText}>No posts yet.</Text>
              <Text style={styles.emptySubtext}>Be the first to share your faith!</Text>
            </View>
          }
        />
      )}

      {user && (
        <CreatePostModal
          visible={showCreate}
          onClose={() => setShowCreate(false)}
          onPublished={handleRefresh}
          userId={user.id}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.backgroundPrimary },
  header: { paddingTop: 48, paddingBottom: SPACING.base },
  headerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.base,
  },
  headerTitle: { fontSize: TYPOGRAPHY.fontSize.xl, fontWeight: '800', color: COLORS.white },
  headerSub: { fontSize: TYPOGRAPHY.fontSize.sm, color: COLORS.accentLight, marginTop: 2 },
  createBtn: {
    backgroundColor: COLORS.accent, borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: SPACING.base, paddingVertical: SPACING.sm,
  },
  createBtnText: { color: COLORS.primary, fontWeight: '700', fontSize: TYPOGRAPHY.fontSize.sm },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { paddingBottom: SPACING['4xl'] },
  postCard: {
    backgroundColor: COLORS.white, marginHorizontal: SPACING.base,
    marginBottom: SPACING.base, borderRadius: BORDER_RADIUS.xl, overflow: 'hidden', ...SHADOWS.md,
  },
  postHeader: {
    flexDirection: 'row', alignItems: 'center',
    padding: SPACING.md, paddingBottom: SPACING.sm,
  },
  avatar: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center', marginRight: SPACING.md, overflow: 'hidden',
  },
  avatarImg: { width: 44, height: 44 },
  avatarPlaceholder: { color: COLORS.white, fontWeight: '700', fontSize: TYPOGRAPHY.fontSize.md },
  authorInfo: { flex: 1 },
  authorName: { fontSize: TYPOGRAPHY.fontSize.base, fontWeight: '700', color: COLORS.charcoal },
  postTime: { fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.midGray, marginTop: 2 },
  moreBtn: { padding: SPACING.sm },
  moreBtnText: { fontSize: 18, color: COLORS.midGray, letterSpacing: 2 },
  caption: {
    fontSize: TYPOGRAPHY.fontSize.base, color: COLORS.charcoal,
    paddingHorizontal: SPACING.md, paddingBottom: SPACING.md,
    lineHeight: TYPOGRAPHY.fontSize.base * 1.6,
  },
  postImage: { width: '100%', height: 220 },
  flagBanner: {
    backgroundColor: '#FFF8E1', paddingHorizontal: SPACING.base, paddingVertical: SPACING.sm,
    borderTopWidth: 1, borderTopColor: '#FFD54F',
  },
  flagText: { fontSize: TYPOGRAPHY.fontSize.xs, color: '#F59E0B', fontWeight: '600' },
  emptyContainer: { alignItems: 'center', paddingTop: SPACING['5xl'], paddingHorizontal: SPACING['2xl'] },
  emptyEmoji: { fontSize: 48, marginBottom: SPACING.md },
  emptyText: { fontSize: TYPOGRAPHY.fontSize.lg, fontWeight: '700', color: COLORS.charcoal, marginBottom: SPACING.sm },
  emptySubtext: { fontSize: TYPOGRAPHY.fontSize.base, color: COLORS.midGray, textAlign: 'center' },
});
