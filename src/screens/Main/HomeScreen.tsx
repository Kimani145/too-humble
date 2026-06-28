// =============================================================================
// TOO HUMBLE - HOME SCREEN
// 30-day calendar strip + home_feed (admin posts, sorted by reaction_count)
// Supports dynamic theme toggling, translation, and custom branding header.
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
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useTranslation } from '../../context/LanguageContext';
import { HomeFeedPost, PostReaction, SavedPost } from '../../types/database.types';
import StickyVerse from '../../components/StickyVerse';
import BrandText from '../../components/BrandText';
import {
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
  colors: any;
  t: (key: string) => string;
}

function FeedCard({ item, onReact, onShare, onSave, hasReacted, hasSaved, colors, t }: FeedCardProps): React.JSX.Element {
  const isVideo = item.content_type === 'video';
  const styles = getCardStyles(colors);

  return (
    <View style={styles.feedCard}>
      {/* Header */}
      <LinearGradient
        colors={[colors.primary, colors.primaryLight]}
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
                <Ionicons name="play" size={36} color="#FFFFFF" />
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
          <Text style={styles.cardBodyText} numberOfLines={3}>
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
          <Ionicons
            name={hasReacted ? 'heart' : 'heart-outline'}
            size={18}
            color={hasReacted ? '#EF4444' : colors.darkGray}
          />
          <Text style={[styles.actionText, hasReacted ? styles.actionTextActive : null]}>
            {item.reaction_count}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => onShare(item)}
          activeOpacity={0.75}
        >
          <Ionicons name="share-social-outline" size={18} color={colors.darkGray} />
          <Text style={styles.actionText}>{t('share')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, hasSaved ? styles.actionBtnSaved : null]}
          onPress={() => onSave(item.id)}
          activeOpacity={0.75}
        >
          <Ionicons
            name={hasSaved ? 'bookmark' : 'bookmark-outline'}
            size={18}
            color={hasSaved ? colors.accent : colors.darkGray}
          />
          <Text style={[styles.actionText, hasSaved ? styles.actionTextSaved : null]}>
            {hasSaved ? t('saved') : t('save')}
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
  const { colors, isDarkMode } = useTheme();
  const { t } = useTranslation();
  const styles = getStyles(colors, isDarkMode);

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
        colors={colors}
        t={t}
      />
    ),
    [handleReact, handleShare, handleSave, reactedPosts, savedPosts, colors, t]
  );

  const keyExtractor = useCallback(
    (item: HomeFeedPost): string => item.id,
    []
  );

  const renderFooter = useCallback((): React.JSX.Element | null => {
    if (!hasMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }, [hasMore, colors]);

  const renderHeader = useCallback((): React.JSX.Element => (
    <>
      {/* StickyVerse */}
      <StickyVerse onPress={() => router.push('/(tabs)/bible')} />

      {/* Feed label */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{t('home.title')}</Text>
        <Text style={styles.sectionSubtitle}>
          {calendarDays[selectedDayIndex]?.month}{' '}
          {calendarDays[selectedDayIndex]?.dayNum}
        </Text>
      </View>
    </>
  ), [selectedDayIndex, calendarDays, router, t, styles]);

  // ----------------------------------------------------------------
  // Render
  // ----------------------------------------------------------------
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primaryDark} />

      {/* App Bar */}
      <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.appBar}>
        <View style={styles.appBarContent}>
          <View>
            {/* Custom BrandText Logo */}
            <BrandText size={22} colorMode="dark" />
          </View>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/notifications')}
            style={styles.appBarIcon}
          >
            <Ionicons name="notifications-outline" size={20} color="#FFFFFF" />
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
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.loadingText}>{t('loading.feed')}</Text>
        </View>
      ) : hasError ? (
        <View style={styles.centered}>
          <Ionicons name="warning-outline" size={48} color={colors.error} style={{ marginBottom: 12 }} />
          <Text style={styles.errorText}>{t('error.load')}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => fetchPosts(true)}
          >
            <Text style={styles.retryButtonText}>{t('retry')}</Text>
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
              <View style={styles.emptyIconContainer}>
                <Ionicons name="newspaper-outline" size={48} color={colors.accent} />
              </View>
              <Text style={styles.emptyText}>{t('home.empty.title')}</Text>
              <Text style={styles.emptySubtext}>
                {t('home.empty.subtitle')}
              </Text>
            </View>
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.4}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={colors.accent}
              colors={[colors.accent]}
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
const getCardStyles = (colors: any) =>
  StyleSheet.create({
    feedCard: {
      backgroundColor: colors.backgroundCard,
      borderRadius: BORDER_RADIUS.xl,
      marginHorizontal: SPACING.base,
      marginBottom: SPACING.base,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.lightGray,
      ...SHADOWS.md,
    },
    cardHeader: {
      padding: SPACING.md,
    },
    cardHeaderLeft: { flexDirection: 'row', alignItems: 'center' },
    contentTypeBadge: {
      backgroundColor: colors.overlayLight,
      paddingHorizontal: SPACING.md,
      paddingVertical: 4,
      borderRadius: BORDER_RADIUS.full,
    },
    contentTypeText: {
      fontSize: TYPOGRAPHY.fontSize.xs,
      color: '#FFFFFF',
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    cardMediaContainer: { width: CARD_WIDTH },
    videoThumbnail: { position: 'relative' },
    mediaImage: { width: CARD_WIDTH, height: 220 },
    playOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(0,0,0,0.4)',
    },
    cardBody: { padding: SPACING.base },
    cardTitle: {
      fontSize: TYPOGRAPHY.fontSize.md,
      fontWeight: '700',
      color: colors.charcoal,
      marginBottom: SPACING.xs,
    },
    cardBodyText: {
      fontSize: TYPOGRAPHY.fontSize.base,
      color: colors.darkGray,
      lineHeight: TYPOGRAPHY.fontSize.base * 1.6,
      marginBottom: SPACING.sm,
    },
    cardAuthor: {
      fontSize: TYPOGRAPHY.fontSize.sm,
      color: colors.accent,
      fontWeight: '700',
    },
    cardActions: {
      flexDirection: 'row',
      borderTopWidth: 1,
      borderTopColor: colors.lightGray,
      paddingVertical: SPACING.sm,
      paddingHorizontal: SPACING.base,
      justifyContent: 'space-between',
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
      backgroundColor: 'rgba(239, 68, 68, 0.08)',
    },
    actionText: {
      fontSize: TYPOGRAPHY.fontSize.sm,
      color: colors.darkGray,
      fontWeight: '600',
    },
    actionTextActive: { color: '#EF4444' },
    actionBtnSaved: {
      backgroundColor: 'rgba(240, 165, 0, 0.08)',
    },
    actionTextSaved: { color: colors.accent },
  });

const getStyles = (colors: any, isDarkMode: boolean) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.backgroundPrimary },
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
    appBarIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: 'rgba(255, 255, 255, 0.12)',
      alignItems: 'center',
      justifyContent: 'center',
    },
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
      backgroundColor: colors.accent,
    },
    calendarMonth: {
      fontSize: TYPOGRAPHY.fontSize.xs,
      color: colors.accentLight,
      fontWeight: '600',
      letterSpacing: 0.5,
    },
    calendarDayNum: {
      fontSize: TYPOGRAPHY.fontSize.lg,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    calendarTextActive: {
      color: '#0A0D16', // Dark text on active gold day
    },
    calendarTodayNum: {
      color: colors.accent,
    },
    todayDot: {
      fontSize: 20,
      color: colors.accent,
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
      color: colors.charcoal,
    },
    sectionSubtitle: {
      fontSize: TYPOGRAPHY.fontSize.sm,
      color: colors.midGray,
    },
    footerLoader: {
      paddingVertical: SPACING.md,
      alignItems: 'center',
    },
    centered: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: SPACING['2xl'],
    },
    loadingText: {
      marginTop: SPACING.md,
      fontSize: TYPOGRAPHY.fontSize.sm,
      color: colors.midGray,
    },
    errorText: {
      fontSize: TYPOGRAPHY.fontSize.base,
      color: colors.darkGray,
      textAlign: 'center',
      marginBottom: SPACING.md,
    },
    retryButton: {
      backgroundColor: colors.accent,
      paddingHorizontal: SPACING['2xl'],
      paddingVertical: SPACING.md,
      borderRadius: BORDER_RADIUS.full,
    },
    retryButtonText: {
      color: '#0A0D16',
      fontWeight: '700',
      fontSize: TYPOGRAPHY.fontSize.base,
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
    },
  });
