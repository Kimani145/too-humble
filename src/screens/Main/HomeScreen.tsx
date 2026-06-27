// =============================================================================
// TOO HUMBLE - HOME SCREEN
// 30-day calendar strip + home_feed (admin posts, sorted by reaction_count)
// =============================================================================

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator,
  StatusBar,
  Dimensions,
  Share,
  ListRenderItemInfo,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { HomeFeedPost, PostReaction, SavedPost } from '../../types/database.types';
import StickyVerse from '../../components/StickyVerse';
import {
  COLORS,
  TYPOGRAPHY,
  SPACING,
  BORDER_RADIUS,
  SHADOWS,
  CALENDAR_LOOKBACK_DAYS,
  PAGE_SIZE,
} from '../../constants/theme';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - SPACING['2xl'] * 2;

// -----------------------------------------------------------------------
// Calendar helpers
// -----------------------------------------------------------------------
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_SHORT = [
  'Jan','Feb','Mar','Apr','May','Jun',
  'Jul','Aug','Sep','Oct','Nov','Dec',
];

function buildCalendarDays(): Array<{ date: Date; label: string; dayNum: number; month: string }> {
  const days = [];
  const today = new Date();
  for (let i = CALENDAR_LOOKBACK_DAYS; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    days.push({
      date: d,
      label: DAY_NAMES[d.getDay()],
      dayNum: d.getDate(),
      month: MONTH_SHORT[d.getMonth()],
    });
  }
  return days;
}

// -----------------------------------------------------------------------
// Feed card component
// -----------------------------------------------------------------------
interface FeedCardProps {
  item: HomeFeedPost;
  onReact: (id: string) => void;
  onShare: (item: HomeFeedPost) => void;
  onSave: (id: string) => void;
  hasReacted: boolean;
  hasSaved: boolean;
}

function FeedCard({ item, onReact, onShare, onSave, hasReacted, hasSaved }: FeedCardProps): React.JSX.Element {
  const isVideo = item.content_type === 'video';

  return (
    <View style={styles.feedCard}>
      {/* Header */}
      <LinearGradient
        colors={[COLORS.primary, COLORS.primaryLight]}
        style={styles.cardHeader}
      >
        <View style={styles.cardHeaderLeft}>
          <View style={styles.contentTypeBadge}>
            <Text style={styles.contentTypeText}>
              {item.content_type === 'quote' ? '💬' :
               item.content_type === 'video' ? '▶️' : '📖'}{' '}
              {item.content_type.charAt(0).toUpperCase() + item.content_type.slice(1)}
            </Text>
          </View>
        </View>
      </LinearGradient>

      {/* Media */}
      {item.media_url ? (
        <View style={styles.cardMediaContainer}>
          {isVideo ? (
            <View style={styles.videoThumbnail}>
              <Image
                source={{ uri: item.media_url }}
                style={styles.mediaImage}
                resizeMode="cover"
              />
              <View style={styles.playOverlay}>
                <Text style={styles.playIcon}>▶</Text>
              </View>
            </View>
          ) : (
            <Image
              source={{ uri: item.media_url }}
              style={styles.mediaImage}
              resizeMode="cover"
            />
          )}
        </View>
      ) : null}

      {/* Body */}
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle}>{item.title}</Text>
        {item.body_text ? (
          <Text style={styles.cardBody_text} numberOfLines={3}>
            {item.body_text}
          </Text>
        ) : null}
        <Text style={styles.cardAuthor}>— {item.author_reference}</Text>
      </View>

      {/* Actions */}
      <View style={styles.cardActions}>
        <TouchableOpacity
          style={[styles.actionBtn, hasReacted ? styles.actionBtnActive : null]}
          onPress={() => onReact(item.id)}
          activeOpacity={0.75}
        >
          <Text style={styles.actionIcon}>{hasReacted ? '❤️' : '🤍'}</Text>
          <Text style={[styles.actionText, hasReacted ? styles.actionTextActive : null]}>
            {item.reaction_count}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => onShare(item)}
          activeOpacity={0.75}
        >
          <Text style={styles.actionIcon}>↗</Text>
          <Text style={styles.actionText}>Share</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, hasSaved ? styles.actionBtnSaved : null]}
          onPress={() => onSave(item.id)}
          activeOpacity={0.75}
        >
          <Text style={styles.actionIcon}>{hasSaved ? '🔖' : '🏷️'}</Text>
          <Text style={[styles.actionText, hasSaved ? styles.actionTextSaved : null]}>
            {hasSaved ? 'Saved' : 'Save'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// -----------------------------------------------------------------------
// HomeScreen
// -----------------------------------------------------------------------
export default function HomeScreen(): React.JSX.Element {
  const router = useRouter();
  const { user } = useAuth();
  const calendarRef = useRef<ScrollView>(null);

  const calendarDays = buildCalendarDays();
  const todayIndex = calendarDays.length - 1;

  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(todayIndex);
  const [posts, setPosts] = useState<HomeFeedPost[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);
  const [page, setPage] = useState<number>(0);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [reactedPosts, setReactedPosts] = useState<Set<string>>(new Set());
  const [savedPosts, setSavedPosts] = useState<Set<string>>(new Set());

  // ----------------------------------------------------------------
  // Fetch feed
  // ----------------------------------------------------------------
  const fetchPosts = useCallback(
    async (reset = false): Promise<void> => {
      const currentPage = reset ? 0 : page;
      if (!reset && !hasMore) return;

      const date = calendarDays[selectedDayIndex]?.date;
      if (!date) return;

      const year = date.getFullYear();
      const month = date.getMonth();
      const day = date.getDate();
      const startOfDay = new Date(Date.UTC(year, month, day, 0, 0, 0, 0)).toISOString();
      const endOfDay = new Date(Date.UTC(year, month, day, 23, 59, 59, 999)).toISOString();

      try {
        const from = currentPage * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;

        const { data, error } = await supabase
          .from('home_feed')
          .select('*')
          .gte('created_at', startOfDay)
          .lte('created_at', endOfDay)
          .order('reaction_count', { ascending: false })
          .order('created_at', { ascending: false })
          .range(from, to);

        if (error) throw error;

        const newPosts = (data ?? []) as HomeFeedPost[];

        setPosts((prev) => (reset ? newPosts : [...prev, ...newPosts]));
        setHasMore(newPosts.length === PAGE_SIZE);
        setPage(currentPage + 1);
        setHasError(false);
      } catch (err) {
        setHasError(true);
        console.error('[HomeScreen] fetchPosts error:', err);
      }
    },
    [page, hasMore, selectedDayIndex, calendarDays]
  );

  // ----------------------------------------------------------------
  // Fetch user reactions
  // ----------------------------------------------------------------
  const fetchUserReactions = useCallback(async (): Promise<void> => {
    if (!user) return;
    const { data } = await supabase
      .from('post_reactions')
      .select('post_id')
      .eq('user_id', user.id);

    if (data) {
      setReactedPosts(new Set((data as Array<{ post_id: string }>).map((r) => r.post_id)));
    }
  }, [user]);

  // ----------------------------------------------------------------
  // Fetch user saves
  // ----------------------------------------------------------------
  const fetchUserSaves = useCallback(async (): Promise<void> => {
    if (!user) return;
    const { data } = await supabase
      .from('saved_posts')
      .select('post_id')
      .eq('user_id', user.id);

    if (data) {
      setSavedPosts(new Set((data as Array<{ post_id: string }>).map((r) => r.post_id)));
    }
  }, [user]);

  useEffect(() => {
    let active = true;
    const loadSelectedDay = async () => {
      setIsLoading(true);
      setPage(0);
      setHasMore(true);
      try {
        const date = calendarDays[selectedDayIndex]?.date;
        if (!date) return;

        const year = date.getFullYear();
        const month = date.getMonth();
        const day = date.getDate();
        const startOfDay = new Date(Date.UTC(year, month, day, 0, 0, 0, 0)).toISOString();
        const endOfDay = new Date(Date.UTC(year, month, day, 23, 59, 59, 999)).toISOString();

        const { data, error } = await supabase
          .from('home_feed')
          .select('*')
          .gte('created_at', startOfDay)
          .lte('created_at', endOfDay)
          .order('reaction_count', { ascending: false })
          .order('created_at', { ascending: false })
          .range(0, PAGE_SIZE - 1);

        if (error) throw error;

        if (active) {
          const newPosts = (data ?? []) as HomeFeedPost[];
          setPosts(newPosts);
          setHasMore(newPosts.length === PAGE_SIZE);
          setPage(1);
          setHasError(false);
        }
      } catch (err) {
        if (active) {
          setHasError(true);
        }
        console.error('[HomeScreen] loadSelectedDay error:', err);
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    Promise.all([loadSelectedDay(), fetchUserReactions(), fetchUserSaves()]);
    return () => {
      active = false;
    };
  }, [selectedDayIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll calendar to today
  useEffect(() => {
    setTimeout(() => {
      calendarRef.current?.scrollTo({ x: todayIndex * 70, animated: true });
    }, 300);
  }, [todayIndex]);

  // ----------------------------------------------------------------
  // Handlers
  // ----------------------------------------------------------------
  const handleRefresh = useCallback(async (): Promise<void> => {
    setIsRefreshing(true);
    setPage(0);
    setHasMore(true);
    await Promise.all([fetchPosts(true), fetchUserReactions(), fetchUserSaves()]);
    setIsRefreshing(false);
  }, [fetchPosts, fetchUserReactions, fetchUserSaves]);

  const handleLoadMore = useCallback((): void => {
    if (!isLoading && hasMore) {
      fetchPosts(false);
    }
  }, [isLoading, hasMore, fetchPosts]);

  const handleReact = useCallback(
    async (postId: string): Promise<void> => {
      if (!user) return;

      const alreadyReacted = reactedPosts.has(postId);

      // Optimistic update
      setReactedPosts((prev) => {
        const next = new Set(prev);
        if (alreadyReacted) next.delete(postId);
        else next.add(postId);
        return next;
      });
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, reaction_count: p.reaction_count + (alreadyReacted ? -1 : 1) }
            : p
        )
      );

      if (alreadyReacted) {
        await supabase
          .from('post_reactions')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id);
      } else {
        await supabase
          .from('post_reactions')
          .insert({ post_id: postId, user_id: user.id } as Pick<PostReaction, 'post_id' | 'user_id'>);
      }
    },
    [user, reactedPosts]
  );

  const handleShare = useCallback(async (item: HomeFeedPost): Promise<void> => {
    try {
      await Share.share({
        message: `${item.title}\n\n${item.body_text ?? ''}\n— ${item.author_reference}\n\nShared via Too Humble 🙏`,
        title: item.title,
      });
    } catch {
      // Dismissed
    }
  }, []);

  const handleSave = useCallback(
    async (postId: string): Promise<void> => {
      if (!user) return;
      const alreadySaved = savedPosts.has(postId);

      // Optimistic update
      setSavedPosts((prev) => {
        const next = new Set(prev);
        if (alreadySaved) next.delete(postId);
        else next.add(postId);
        return next;
      });

      if (alreadySaved) {
        await supabase
          .from('saved_posts')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id);
      } else {
        await supabase
          .from('saved_posts')
          .insert({ post_id: postId, user_id: user.id } as Pick<SavedPost, 'post_id' | 'user_id'>);
      }
    },
    [user, savedPosts]
  );

  // ----------------------------------------------------------------
  // Render helpers
  // ----------------------------------------------------------------
  const renderFeedItem = useCallback(
    ({ item }: ListRenderItemInfo<HomeFeedPost>): React.JSX.Element => (
      <FeedCard
        item={item}
        onReact={handleReact}
        onShare={handleShare}
        onSave={handleSave}
        hasReacted={reactedPosts.has(item.id)}
        hasSaved={savedPosts.has(item.id)}
      />
    ),
    [handleReact, handleShare, handleSave, reactedPosts, savedPosts]
  );

  const keyExtractor = useCallback(
    (item: HomeFeedPost): string => item.id,
    []
  );

  const renderFooter = useCallback((): React.JSX.Element | null => {
    if (!hasMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator color={COLORS.primary} />
      </View>
    );
  }, [hasMore]);

  const renderHeader = useCallback((): React.JSX.Element => (
    <>
      {/* StickyVerse */}
      <StickyVerse onPress={() => router.push('/(tabs)/bible')} />

      {/* Feed label */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Today's Feed</Text>
        <Text style={styles.sectionSubtitle}>
          {calendarDays[selectedDayIndex]?.month}{' '}
          {calendarDays[selectedDayIndex]?.dayNum}
        </Text>
      </View>
    </>
  ), [selectedDayIndex, calendarDays, router]);

  // ----------------------------------------------------------------
  // Render
  // ----------------------------------------------------------------
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      {/* App Bar */}
      <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={styles.appBar}>
        <View style={styles.appBarContent}>
          <View>
            <Text style={styles.appBarLogo}>Too Humble</Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/notifications')}
            style={styles.appBarIcon}
          >
            <Text style={styles.appBarIconText}>🔔</Text>
          </TouchableOpacity>
        </View>

        {/* 30-Day Calendar Strip */}
        <ScrollView
          ref={calendarRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.calendarStrip}
          contentContainerStyle={styles.calendarContent}
        >
          {calendarDays.map((day, index) => {
            const isSelected = index === selectedDayIndex;
            const isToday = index === todayIndex;
            return (
              <TouchableOpacity
                key={index}
                style={[styles.calendarDay, isSelected ? styles.calendarDayActive : null]}
                onPress={() => setSelectedDayIndex(index)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.calendarMonth,
                    isSelected ? styles.calendarTextActive : null,
                  ]}
                >
                  {day.month}
                </Text>
                <Text
                  style={[
                    styles.calendarDayNum,
                    isSelected ? styles.calendarTextActive : null,
                    isToday && !isSelected ? styles.calendarTodayNum : null,
                  ]}
                >
                  {day.dayNum}
                </Text>
                {isToday && (
                  <Text style={styles.todayDot}>·</Text>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </LinearGradient>

      {/* Feed */}
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading feed...</Text>
        </View>
      ) : hasError ? (
        <View style={styles.centered}>
          <Text style={styles.errorEmoji}>⚠️</Text>
          <Text style={styles.errorText}>Couldn't load content.</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => fetchPosts(true)}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList<HomeFeedPost>
          data={posts}
          renderItem={renderFeedItem}
          keyExtractor={keyExtractor}
          ListHeaderComponent={renderHeader}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>📝</Text>
              <Text style={styles.emptyText}>No content yet.</Text>
              <Text style={styles.emptySubtext}>
                Admins will publish quotes, verses, and videos soon.
              </Text>
            </View>
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.4}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={COLORS.primary}
              colors={[COLORS.primary]}
            />
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

// -----------------------------------------------------------------------
// Styles
// -----------------------------------------------------------------------
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.backgroundPrimary },
  appBar: {
    paddingTop: 48,
    paddingBottom: 0,
  },
  appBarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.base,
    paddingBottom: SPACING.md,
  },
  appBarLogo: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: 0.5,
  },
  appBarIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.overlayLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appBarIconText: { fontSize: 20 },
  calendarStrip: { marginBottom: 0 },
  calendarContent: {
    paddingHorizontal: SPACING.base,
    paddingBottom: SPACING.md,
  },
  calendarDay: {
    alignItems: 'center',
    width: 60,
    paddingVertical: SPACING.sm,
    marginRight: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
  },
  calendarDayActive: {
    backgroundColor: COLORS.accent,
  },
  calendarMonth: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.accentLight,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  calendarDayNum: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: '700',
    color: COLORS.white,
  },
  calendarTextActive: {
    color: COLORS.primary,
  },
  calendarTodayNum: {
    color: COLORS.accent,
  },
  todayDot: {
    fontSize: 20,
    color: COLORS.accent,
    lineHeight: 10,
  },
  listContent: {
    paddingBottom: SPACING['3xl'],
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING['2xl'],
    paddingVertical: SPACING.md,
    marginTop: SPACING.sm,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: '700',
    color: COLORS.charcoal,
  },
  sectionSubtitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.midGray,
  },
  feedCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    marginHorizontal: SPACING.base,
    marginBottom: SPACING.base,
    overflow: 'hidden',
    ...SHADOWS.md,
  },
  cardHeader: {
    padding: SPACING.md,
  },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center' },
  contentTypeBadge: {
    backgroundColor: COLORS.overlayLight,
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.full,
  },
  contentTypeText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.white,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  cardMediaContainer: { width: CARD_WIDTH },
  videoThumbnail: { position: 'relative' },
  mediaImage: { width: CARD_WIDTH, height: 200 },
  playOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.overlayDark,
  },
  playIcon: { fontSize: 48, color: COLORS.white },
  cardBody: { padding: SPACING.base },
  cardTitle: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: '700',
    color: COLORS.charcoal,
    marginBottom: SPACING.xs,
  },
  cardBody_text: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.darkGray,
    lineHeight: TYPOGRAPHY.fontSize.base * 1.6,
    marginBottom: SPACING.sm,
  },
  cardAuthor: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.primary,
    fontWeight: '600',
  },
  cardActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGray,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.base,
    gap: SPACING.xl,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.full,
  },
  actionBtnActive: {
    backgroundColor: '#FFF0F0',
  },
  actionIcon: { fontSize: 18 },
  actionText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.darkGray,
    fontWeight: '600',
  },
  actionTextActive: { color: COLORS.error },
  actionBtnSaved: {
    backgroundColor: '#FFF8E1',
  },
  actionTextSaved: { color: COLORS.accent },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING['2xl'],
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.midGray,
  },
  errorEmoji: { fontSize: 40, marginBottom: SPACING.md },
  errorText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.darkGray,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING['2xl'],
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.full,
  },
  retryButtonText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: TYPOGRAPHY.fontSize.base,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: SPACING['4xl'],
    paddingHorizontal: SPACING['2xl'],
  },
  emptyEmoji: { fontSize: 48, marginBottom: SPACING.md },
  emptyText: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: '700',
    color: COLORS.charcoal,
    marginBottom: SPACING.sm,
  },
  emptySubtext: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.midGray,
    textAlign: 'center',
    lineHeight: TYPOGRAPHY.fontSize.base * 1.6,
  },
  footerLoader: {
    paddingVertical: SPACING.xl,
    alignItems: 'center',
  },
});
