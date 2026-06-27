// =============================================================================
// TOO HUMBLE - SAVED POSTS SCREEN
// Displays home_feed posts the current user has bookmarked
// Uses saved_posts junction table (migration 003)
// =============================================================================

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Alert,
  ListRenderItemInfo,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { HomeFeedPost, SavedPost } from '../../types/database.types';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../../constants/theme';

// -----------------------------------------------------------------------
// Saved card component
// -----------------------------------------------------------------------
interface SavedCardProps {
  item: HomeFeedPost;
  savedId: string;
  onUnsave: (savedId: string, postTitle: string) => void;
}

function SavedCard({ item, savedId, onUnsave }: SavedCardProps): React.JSX.Element {
  return (
    <View style={styles.card}>
      <View style={styles.cardTypeBadge}>
        <Text style={styles.cardTypeText}>
          {item.content_type === 'quote' ? '💬' :
           item.content_type === 'video' ? '▶️' : '📖'}{' '}
          {item.content_type.charAt(0).toUpperCase() + item.content_type.slice(1)}
        </Text>
      </View>

      {item.media_url ? (
        <Image source={{ uri: item.media_url }} style={styles.cardImage} resizeMode="cover" />
      ) : null}

      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
        {item.body_text ? (
          <Text style={styles.cardBodyText} numberOfLines={3}>{item.body_text}</Text>
        ) : null}
        {item.author_reference ? (
          <Text style={styles.cardAuthor}>— {item.author_reference}</Text>
        ) : null}
      </View>

      <View style={styles.cardFooter}>
        <Text style={styles.cardDate}>
          {new Date(item.created_at).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric',
          })}
        </Text>
        <TouchableOpacity
          style={styles.unsaveBtn}
          onPress={() => onUnsave(savedId, item.title)}
          activeOpacity={0.75}
        >
          <Text style={styles.unsaveBtnText}>🔖 Unsave</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// -----------------------------------------------------------------------
// SavedPostsScreen
// -----------------------------------------------------------------------
interface SavedRow extends SavedPost {
  home_feed: HomeFeedPost;
}

export default function SavedPostsScreen(): React.JSX.Element {
  const router = useRouter();
  const { user } = useAuth();

  const [savedRows, setSavedRows] = useState<SavedRow[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);

  const fetchSaved = useCallback(async (showLoader = true): Promise<void> => {
    if (!user) return;
    if (showLoader) setIsLoading(true);
    setHasError(false);

    try {
      const { data, error } = await supabase
        .from('saved_posts')
        .select('*, home_feed(*)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Filter out orphaned rows where the feed post was deleted
      const valid = ((data ?? []) as SavedRow[]).filter(
        (row) => row.home_feed !== null && row.home_feed !== undefined
      );
      setSavedRows(valid);
    } catch (err) {
      setHasError(true);
      console.error('[SavedPostsScreen] fetchSaved error:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchSaved();
  }, [fetchSaved]);

  const handleRefresh = useCallback(async (): Promise<void> => {
    setIsRefreshing(true);
    await fetchSaved(false);
  }, [fetchSaved]);

  const handleUnsave = useCallback((savedId: string, postTitle: string): void => {
    Alert.alert(
      'Remove from Saved',
      `Remove "${postTitle}" from your saved posts?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase
              .from('saved_posts')
              .delete()
              .eq('id', savedId);

            if (error) {
              Alert.alert('Error', error.message);
              return;
            }
            setSavedRows((prev) => prev.filter((r) => r.id !== savedId));
          },
        },
      ]
    );
  }, []);

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<SavedRow>): React.JSX.Element => (
      <SavedCard
        item={item.home_feed}
        savedId={item.id}
        onUnsave={handleUnsave}
      />
    ),
    [handleUnsave]
  );

  const keyExtractor = useCallback((item: SavedRow): string => item.id, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Saved Posts</Text>
        <View style={styles.headerRight} />
      </LinearGradient>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading saved posts...</Text>
        </View>
      ) : hasError ? (
        <View style={styles.centered}>
          <Text style={styles.errorEmoji}>⚠️</Text>
          <Text style={styles.errorText}>Couldn't load saved posts.</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => fetchSaved()}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList<SavedRow>
          data={savedRows}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={COLORS.primary}
              colors={[COLORS.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>🔖</Text>
              <Text style={styles.emptyTitle}>No saved posts yet</Text>
              <Text style={styles.emptySubtext}>
                Bookmark posts from the Home Feed and they'll appear here.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.backgroundPrimary },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 52,
    paddingBottom: SPACING.base,
    paddingHorizontal: SPACING.base,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.overlayLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: { fontSize: 20, color: COLORS.white, fontWeight: '700' },
  headerTitle: {
    flex: 1,
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: '700',
    color: COLORS.white,
    textAlign: 'center',
  },
  headerRight: { width: 40 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: SPACING['2xl'] },
  loadingText: { marginTop: SPACING.md, fontSize: TYPOGRAPHY.fontSize.sm, color: COLORS.midGray },
  errorEmoji: { fontSize: 40, marginBottom: SPACING.md },
  errorText: { fontSize: TYPOGRAPHY.fontSize.base, color: COLORS.darkGray, textAlign: 'center', marginBottom: SPACING.md },
  retryBtn: {
    backgroundColor: COLORS.primary, paddingHorizontal: SPACING['2xl'],
    paddingVertical: SPACING.md, borderRadius: BORDER_RADIUS.full,
  },
  retryBtnText: { color: COLORS.white, fontWeight: '700', fontSize: TYPOGRAPHY.fontSize.base },
  listContent: { padding: SPACING.base, paddingBottom: SPACING['5xl'] },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    marginBottom: SPACING.base,
    overflow: 'hidden',
    ...SHADOWS.md,
  },
  cardTypeBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.sm,
  },
  cardTypeText: { fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.white, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
  cardImage: { width: '100%', height: 180 },
  cardBody: { padding: SPACING.base },
  cardTitle: { fontSize: TYPOGRAPHY.fontSize.md, fontWeight: '700', color: COLORS.charcoal, marginBottom: SPACING.xs },
  cardBodyText: {
    fontSize: TYPOGRAPHY.fontSize.base, color: COLORS.darkGray,
    lineHeight: TYPOGRAPHY.fontSize.base * 1.6, marginBottom: SPACING.sm,
  },
  cardAuthor: { fontSize: TYPOGRAPHY.fontSize.sm, color: COLORS.primary, fontWeight: '600' },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGray,
  },
  cardDate: { fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.midGray },
  unsaveBtn: {
    backgroundColor: COLORS.lightGray,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
  },
  unsaveBtnText: { fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.darkGray, fontWeight: '600' },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: SPACING['5xl'],
    paddingHorizontal: SPACING['2xl'],
  },
  emptyEmoji: { fontSize: 56, marginBottom: SPACING['2xl'] },
  emptyTitle: { fontSize: TYPOGRAPHY.fontSize.lg, fontWeight: '700', color: COLORS.charcoal, marginBottom: SPACING.sm },
  emptySubtext: { fontSize: TYPOGRAPHY.fontSize.base, color: COLORS.midGray, textAlign: 'center', lineHeight: TYPOGRAPHY.fontSize.base * 1.6 },
});
