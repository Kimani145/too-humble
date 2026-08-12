// =============================================================================
// TOO HUMBLE - COMMUNITY SCREEN
// Social feed with image upload (7MB limit), flagging, pagination
// Supports dynamic theme toggling, translation, and vector icons.
// =============================================================================

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  TextInput,
  Modal,
  Alert,
  RefreshControl,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ListRenderItemInfo,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { supabase, uploadToStorage } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useTranslation } from '../../context/LanguageContext';
import GlobalHeader from '../../components/GlobalHeader';
import { useWebLayout } from '../../hooks/useWebLayout';
import ContextPanel from '../../components/web/ContextPanel';
import { CommunityPost, CommunityPostInsert, CommunityPostUpdate } from '../../types/database.types';
import NetInfo from '@react-native-community/netinfo';
import OfflineBanner from '../../components/OfflineBanner';
import { CommunityPostSkeleton } from '../../components/skeletons/CommunityPostSkeleton';
import { enqueueDraft, getDraftQueue } from '../../services/offlineQueueService';
import { flushOfflineQueue } from '../../services/offlineFlushService';
import { DraftQueueBadge } from '../../components/DraftQueueBadge';
import { ShareButton } from '../../components/ShareButton';
import {
  TYPOGRAPHY,
  SPACING,
  BORDER_RADIUS,
  SHADOWS,
  MAX_IMAGE_SIZE_BYTES,
  MAX_CAPTION_LENGTH,
  STORAGE_BUCKETS,
  PAGE_SIZE,
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
  colors: any;
}

function PostCard({ post, currentUserId, isAdmin, onFlag, onDelete, colors }: PostCardProps): React.JSX.Element {
  const profile = post.profiles;
  const isOwner = currentUserId === post.user_id;
  const styles = getCardStyles(colors);

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
                  : isAdmin
                  ? { text: '✅ Dismiss Flag', onPress: () => onFlag(post.id) }
                  : null,
                isAdmin || isOwner
                  ? { text: '🗑️ Delete Post', style: 'destructive', onPress: () => onDelete(post.id) }
                  : null,
                { text: 'Cancel', style: 'cancel' },
              ].filter(Boolean) as any)
            }
            style={styles.moreBtn}
          >
            <Ionicons name="ellipsis-horizontal" size={18} color={colors.midGray} />
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
          <Ionicons name="flag" size={14} color="#F59E0B" style={{ marginRight: 6 }} />
          <Text style={styles.flagText}>Flagged for review</Text>
        </View>
      )}

      {/* Action Row */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', paddingHorizontal: 12, paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.lightGray }}>
        <ShareButton
          title="Check this out on Too Humble"
          message={post.caption ?? 'Shared from Too Humble community'}
          size="small"
        />
      </View>
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
  colors: any;
  t: (key: string) => string;
}

function CreatePostModal({ visible, onClose, onPublished, userId, colors, t }: CreatePostModalProps): React.JSX.Element {
  const [caption, setCaption] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageSizeKb, setImageSizeKb] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);
  const [sizeError, setSizeError] = useState<string | null>(null);
  const styles = getCreateStyles(colors);

  const pickImage = useCallback(async (): Promise<void> => {
    setSizeError(null);
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', t('community.create.error.permission'));
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

    // Hard file-size check before upload (7MB)
    const sizeBytes = asset.fileSize ?? 0;
    if (sizeBytes > MAX_IMAGE_SIZE_BYTES) {
      setSizeError(t('community.create.error.size'));
      return;
    }

    setImageUri(asset.uri);
    setImageSizeKb(sizeBytes / 1024);
  }, [t]);

  const handleSubmit = useCallback(async (): Promise<void> => {
    if (!caption.trim() && !imageUri) {
      Alert.alert('Empty Post', 'Add a caption or select an image.');
      return;
    }

    // Check connectivity BEFORE attempting upload
    const netState = await NetInfo.fetch();
    if (netState.isConnected === false) {
      // Save draft locally — do not attempt upload
      setIsUploading(true);
      try {
        await enqueueDraft(
          userId,
          caption.trim(),
          imageUri,
          imageUri ? (imageUri.split('.').pop() ?? 'jpg') : null,
          imageSizeKb
        );
        setCaption('');
        setImageUri(null);
        onPublished(); // triggers refreshDraftCount in parent
        onClose();
        // Show toast-style feedback
        Alert.alert(
          '📥 Saved for later',
          "Your post will publish automatically when you're back online.",
          [{ text: 'OK' }]
        );
      } catch {
        Alert.alert('Error', 'Could not save your draft. Please try again.');
      } finally {
        setIsUploading(false);
      }
      return; // exit — do not fall through to upload
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
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.cancelText}>{t('profile.logout').split(' ')[0] /* Cancel fallback */}</Text>
            </TouchableOpacity>
            <Text style={styles.title}>{t('community.create.title')}</Text>
            <TouchableOpacity onPress={handleSubmit} disabled={isUploading}>
              {isUploading ? (
                <Text style={styles.postBtn}>Posting...</Text>
              ) : (
                <Text style={styles.postBtn}>{t('community.create.post')}</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            <TextInput
              style={styles.captionInput}
              placeholder={t('community.create.placeholder')}
              placeholderTextColor={colors.midGray}
              value={caption}
              onChangeText={(t) => t.length <= MAX_CAPTION_LENGTH && setCaption(t)}
              multiline
              maxLength={MAX_CAPTION_LENGTH}
            />
            <Text style={styles.charCount}>{caption.length}/{MAX_CAPTION_LENGTH}</Text>

            {imageUri ? (
              <View style={styles.previewContainer}>
                <Image source={{ uri: imageUri }} style={styles.preview} resizeMode="cover" />
                <TouchableOpacity
                  style={styles.removeImg}
                  onPress={() => { setImageUri(null); setSizeError(null); }}
                >
                  <Ionicons name="close" size={18} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.photoBtn} onPress={pickImage}>
                <Ionicons name="image-outline" size={32} color={colors.midGray} style={{ marginBottom: SPACING.sm }} />
                <Text style={styles.photoBtnText}>
                  {t('community.create.photo')} ({t('community.create.limit')})
                </Text>
              </TouchableOpacity>
            )}

            {sizeError && <Text style={styles.sizeError}>{sizeError}</Text>}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// -----------------------------------------------------------------------
// Community Screen
// -----------------------------------------------------------------------
export default function CommunityScreen(): React.JSX.Element {
  const { user, profile, role } = useAuth();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const styles = getStyles(colors);
  const { isWide } = useWebLayout();

  const isAdmin = role === 'admin';

  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [draftCount, setDraftCount] = useState<number>(0);
  const [isFlushing, setIsFlushing] = useState<boolean>(false);
  const isFlushingRef = useRef<boolean>(false);

  const refreshDraftCount = useCallback(async (): Promise<void> => {
    const queue = await getDraftQueue();
    setDraftCount(queue.length);
  }, []);

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
      const netState = await NetInfo.fetch();
      if (netState.isConnected === false) {
        setIsOffline(true);
      }
    }
  }, [page, hasMore]);

  const handleFlushQueue = useCallback(async (): Promise<void> => {
    if (isFlushingRef.current) return;
    isFlushingRef.current = true;
    setIsFlushing(true);
    try {
      const result = await flushOfflineQueue();
      if (result.published > 0) {
        await fetchPosts(true);
      }
    } finally {
      await refreshDraftCount();
      isFlushingRef.current = false;
      setIsFlushing(false);
    }
  }, [fetchPosts, refreshDraftCount]);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const offline = state.isConnected === false;
      setIsOffline(offline);
      if (state.isConnected && !isFlushingRef.current) {
        handleFlushQueue();
      }
    });
    return () => unsubscribe();
  }, [handleFlushQueue]);

  useEffect(() => {
    const init = async (): Promise<void> => {
      setIsLoading(true);
      await fetchPosts(true);
      await refreshDraftCount();
      setIsLoading(false);

      const netState = await NetInfo.fetch();
      if (netState.isConnected) {
        const queue = await getDraftQueue();
        if (queue.length > 0) {
          handleFlushQueue();
        }
      }
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
        colors={colors}
      />
    ),
    [user, isAdmin, handleFlag, handleDelete, colors]
  );

  const mainContent = (
    <View style={[styles.container, Platform.OS === 'web' && styles.webContent]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primaryDark} />
      <GlobalHeader />

      <OfflineBanner visible={isOffline} />

      <DraftQueueBadge
        count={draftCount}
        isFlushing={isFlushing}
        onPress={handleFlushQueue}
      />

      {isLoading ? (
        <View style={{ padding: 16 }}>
          {[1, 2, 3].map((i) => (
            <CommunityPostSkeleton key={i} />
          ))}
        </View>
      ) : (
        <FlatList<CommunityPost>
          data={posts}
          renderItem={renderPost}
          keyExtractor={(p) => p.id}
          onEndReached={() => !isLoading && hasMore && fetchPosts(false)}
          onEndReachedThreshold={0.4}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={colors.accent} colors={[colors.accent]} />
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            /* Inline Post-Creation Card Box Widget */
            <View style={styles.inlineCreateCard}>
              <View style={styles.inlineCreateRow}>
                <View style={styles.inlineAvatar}>
                  {profile?.avatar_url ? (
                    <Image source={{ uri: profile.avatar_url }} style={styles.inlineAvatarImg} />
                  ) : (
                    <Text style={styles.inlineAvatarPlaceholder}>
                      {(profile?.full_name ?? user?.email ?? 'U').charAt(0).toUpperCase()}
                    </Text>
                  )}
                </View>
                <TouchableOpacity
                  style={styles.inlineInputBox}
                  activeOpacity={0.8}
                  onPress={() => setShowCreate(true)}
                >
                  <Text style={styles.inlineInputText}>{t('community.create.placeholder')}</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.inlineActionsDivider} />
              <View style={styles.inlineActionsRow}>
                <TouchableOpacity
                  style={styles.inlineActionBtn}
                  activeOpacity={0.7}
                  onPress={() => setShowCreate(true)}
                >
                  <Ionicons name="image" size={18} color={colors.success} style={{ marginRight: 6 }} />
                  <Text style={styles.inlineActionBtnText}>{t('community.create.photo')}</Text>
                </TouchableOpacity>
                <View style={styles.inlineActionDivider} />
                <TouchableOpacity
                  style={styles.inlineActionBtn}
                  activeOpacity={0.7}
                  onPress={() => setShowCreate(true)}
                >
                  <Ionicons name="videocam" size={18} color={colors.primaryLight} style={{ marginRight: 6 }} />
                  <Text style={styles.inlineActionBtnText}>{t('community.create.video')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconContainer}>
                <Ionicons name="chatbubbles-outline" size={48} color={colors.accent} />
              </View>
              <Text style={styles.emptyText}>{t('community.empty.title')}</Text>
              <Text style={styles.emptySubtext}>{t('community.empty.subtitle')}</Text>
              <TouchableOpacity
                style={styles.emptyButton}
                activeOpacity={0.8}
                onPress={() => setShowCreate(true)}
              >
                <Ionicons name="add-circle" size={18} color="#0A0D16" style={{ marginRight: 6 }} />
                <Text style={styles.emptyButtonText}>{t('community.create.title')}</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {user && (
        <CreatePostModal
          visible={showCreate}
          onClose={() => setShowCreate(false)}
          onPublished={async () => {
            await handleRefresh();
            await refreshDraftCount();
          }}
          userId={user.id}
          colors={colors}
          t={t}
        />
      )}
    </View>
  );

  if (isWide) {
    return (
      <View style={{ flex: 1, flexDirection: 'row' }}>
        <View style={{ flex: 1 }}>
          {mainContent}
        </View>
        <ContextPanel>
          {/* Card 1: Post Guidelines */}
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Text style={{ fontWeight: '700', fontSize: 14, color: colors.textPrimary }}>Post Guidelines</Text>
            </View>
            <Text style={{ fontSize: 13, color: colors.textSecondary }}>
              Keep posts encouraging and faith-focused. Be respectful of others and follow the community rules.
            </Text>
          </View>

          {/* Card 2: Search */}
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Text style={{ fontWeight: '700', fontSize: 14, color: colors.textPrimary }}>Search</Text>
            </View>
            <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: 8 }}>
              Search features are coming soon.
            </Text>
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: colors.lightGray || '#ECEFF1',
              borderRadius: 8,
              paddingHorizontal: 12,
              height: 40,
              opacity: 0.6
            }}>
              <Ionicons name="search-outline" size={16} color={colors.textMuted} style={{ marginRight: 8 }} />
              <TextInput
                style={{ flex: 1, fontSize: 13, color: colors.textMuted }}
                placeholder="Search posts..."
                placeholderTextColor={colors.textMuted}
                editable={false}
              />
            </View>
          </View>
        </ContextPanel>
      </View>
    );
  }

  return mainContent;
}

// -----------------------------------------------------------------------
// Styles
// -----------------------------------------------------------------------
const getCardStyles = (colors: any) =>
  StyleSheet.create({
    postCard: {
      backgroundColor: colors.backgroundCard,
      marginHorizontal: SPACING.base,
      marginBottom: SPACING.base,
      borderRadius: BORDER_RADIUS.xl,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.lightGray,
      ...SHADOWS.md,
    },
    postHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: SPACING.md,
      paddingBottom: SPACING.sm,
    },
    avatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: SPACING.md,
      overflow: 'hidden',
    },
    avatarImg: { width: 44, height: 44 },
    avatarPlaceholder: { color: '#FFFFFF', fontWeight: '700', fontSize: TYPOGRAPHY.fontSize.md },
    authorInfo: { flex: 1 },
    authorName: { fontSize: TYPOGRAPHY.fontSize.base, fontWeight: '700', color: colors.charcoal },
    postTime: { fontSize: TYPOGRAPHY.fontSize.xs, color: colors.midGray, marginTop: 2 },
    moreBtn: { padding: SPACING.sm },
    caption: {
      fontSize: TYPOGRAPHY.fontSize.base,
      color: colors.charcoal,
      paddingHorizontal: SPACING.md,
      paddingBottom: SPACING.md,
      lineHeight: TYPOGRAPHY.fontSize.base * 1.6,
    },
    postImage: { width: '100%', height: 220 },
    flagBanner: {
      backgroundColor: colors.theme === 'dark' ? '#2C1E0A' : '#FFF8E1',
      paddingHorizontal: SPACING.base,
      paddingVertical: SPACING.sm,
      borderTopWidth: 1,
      borderTopColor: '#FFD54F',
      flexDirection: 'row',
      alignItems: 'center',
    },
    flagText: { fontSize: TYPOGRAPHY.fontSize.xs, color: '#F59E0B', fontWeight: '600' },
  });

const getCreateStyles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.backgroundCard },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: 52,
      paddingHorizontal: SPACING.base,
      paddingBottom: SPACING.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.lightGray,
    },
    cancelText: { color: colors.darkGray, fontSize: TYPOGRAPHY.fontSize.base },
    title: { fontSize: TYPOGRAPHY.fontSize.md, fontWeight: '700', color: colors.charcoal },
    postBtn: { color: colors.accent, fontSize: TYPOGRAPHY.fontSize.base, fontWeight: '700' },
    body: { padding: SPACING.base },
    captionInput: {
      fontSize: TYPOGRAPHY.fontSize.base,
      color: colors.charcoal,
      minHeight: 120,
      textAlignVertical: 'top',
    },
    charCount: {
      fontSize: TYPOGRAPHY.fontSize.xs,
      color: colors.midGray,
      textAlign: 'right',
      marginBottom: SPACING.base,
    },
    photoBtn: {
      borderWidth: 2,
      borderColor: colors.lightGray,
      borderStyle: 'dashed',
      borderRadius: BORDER_RADIUS.lg,
      padding: SPACING['2xl'],
      alignItems: 'center',
      marginBottom: SPACING.base,
    },
    photoBtnText: { color: colors.midGray, fontSize: TYPOGRAPHY.fontSize.base },
    previewContainer: { position: 'relative', marginBottom: SPACING.base },
    preview: { width: '100%', height: 200, borderRadius: BORDER_RADIUS.lg },
    removeImg: {
      position: 'absolute',
      top: 8,
      right: 8,
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: 'rgba(0,0,0,0.6)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    sizeError: { color: colors.error, fontSize: TYPOGRAPHY.fontSize.sm, textAlign: 'center' },
  });

const getStyles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.backgroundPrimary },
    webContent: {
      maxWidth: 960,
      width: '100%',
      alignSelf: 'center' as const,
    },
    header: { paddingTop: 48, paddingBottom: SPACING.base },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: SPACING.base,
    },
    headerTitle: { fontSize: TYPOGRAPHY.fontSize.xl, fontWeight: '800', color: '#FFFFFF' },
    headerSub: { fontSize: TYPOGRAPHY.fontSize.sm, color: colors.accentLight, marginTop: 2 },
    createBtn: {
      backgroundColor: colors.accent,
      borderRadius: BORDER_RADIUS.full,
      paddingHorizontal: SPACING.base,
      paddingVertical: SPACING.sm,
    },
    createBtnText: { color: '#0A0D16', fontWeight: '700', fontSize: TYPOGRAPHY.fontSize.sm },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    listContent: { paddingBottom: SPACING['4xl'] },

    /* Inline Create Widget */
    inlineCreateCard: {
      backgroundColor: colors.backgroundCard,
      marginHorizontal: SPACING.base,
      marginTop: SPACING.base,
      marginBottom: SPACING.md,
      borderRadius: BORDER_RADIUS.xl,
      borderWidth: 1,
      borderColor: colors.lightGray,
      padding: SPACING.md,
      ...SHADOWS.sm,
    },
    inlineCreateRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    inlineAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: SPACING.md,
      overflow: 'hidden',
    },
    inlineAvatarImg: {
      width: 40,
      height: 40,
    },
    inlineAvatarPlaceholder: {
      color: '#FFFFFF',
      fontWeight: '700',
      fontSize: TYPOGRAPHY.fontSize.sm,
    },
    inlineInputBox: {
      flex: 1,
      height: 40,
      borderRadius: BORDER_RADIUS.full,
      backgroundColor: colors.backgroundPrimary,
      borderWidth: 1,
      borderColor: colors.lightGray,
      justifyContent: 'center',
      paddingHorizontal: SPACING.lg,
    },
    inlineInputText: {
      color: colors.midGray,
      fontSize: TYPOGRAPHY.fontSize.sm,
    },
    inlineActionsDivider: {
      height: 1,
      backgroundColor: colors.lightGray,
      marginVertical: SPACING.md,
    },
    inlineActionsRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    inlineActionBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 4,
    },
    inlineActionBtnText: {
      color: colors.darkGray,
      fontWeight: '600',
      fontSize: TYPOGRAPHY.fontSize.sm,
    },
    inlineActionDivider: {
      width: 1,
      height: 20,
      backgroundColor: colors.lightGray,
    },

    emptyContainer: {
      alignItems: 'center',
      paddingTop: SPACING['5xl'],
      paddingHorizontal: SPACING['2xl'],
    },
    emptyIconContainer: {
      width: 90,
      height: 90,
      borderRadius: 45,
      backgroundColor: colors.backgroundCard,
      borderWidth: 1,
      borderColor: colors.lightGray,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: SPACING.lg,
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
    },
    emptyText: {
      fontSize: TYPOGRAPHY.fontSize.lg,
      fontWeight: '700',
      color: colors.charcoal,
      marginBottom: SPACING.xs,
    },
    emptySubtext: {
      fontSize: TYPOGRAPHY.fontSize.base,
      color: colors.midGray,
      textAlign: 'center',
      lineHeight: 22,
      marginBottom: SPACING.xl,
    },
    emptyButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.accent,
      paddingHorizontal: SPACING.xl,
      paddingVertical: SPACING.md,
      borderRadius: BORDER_RADIUS.full,
      ...SHADOWS.sm,
    },
    emptyButtonText: {
      color: '#0A0D16',
      fontWeight: '700',
      fontSize: TYPOGRAPHY.fontSize.base,
    },
  });
