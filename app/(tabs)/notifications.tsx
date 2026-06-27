// =============================================================================
// TOO HUMBLE - NOTIFICATIONS SCREEN
// Real-time notifications via Supabase Realtime + recent home_feed activity
// Subscribes to home_feed INSERT events and post_reactions on own posts
// =============================================================================

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, StatusBar, ListRenderItemInfo,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../src/lib/supabase';
import { useAuth } from '../../src/context/AuthContext';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../../src/constants/theme';

interface AppNotification {
  id: string;
  emoji: string;
  title: string;
  subtitle: string;
  time: string;
  isNew: boolean;
  type: 'new_content' | 'new_reaction' | 'community_post';
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function contentTypeEmoji(contentType: string): string {
  if (contentType === 'quote') return '💬';
  if (contentType === 'video') return '▶️';
  return '📖';
}

export default function NotificationsScreen(): React.JSX.Element {
  const router = useRouter();
  const { user } = useAuth();

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const seenIds = useRef<Set<string>>(new Set());

  const buildNotifications = useCallback(async (): Promise<void> => {
    const results: AppNotification[] = [];

    // 1. Recent home_feed posts (last 7 days)
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: feedData } = await supabase
      .from('home_feed')
      .select('id, content_type, title, created_at')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(20);

    for (const post of (feedData ?? [])) {
      const typedPost = post as {
        id: string;
        content_type: string;
        title: string;
        created_at: string;
      };
      results.push({
        id: `feed_${typedPost.id}`,
        emoji: contentTypeEmoji(typedPost.content_type),
        title: `New ${typedPost.content_type}: ${typedPost.title}`,
        subtitle: 'Tap to read the full content',
        time: formatTimeAgo(typedPost.created_at),
        isNew: !seenIds.current.has(`feed_${typedPost.id}`),
        type: 'new_content',
      });
    }

    // 2. Reactions on user's home_feed posts (if user exists)
    if (user) {
      const { data: myPosts } = await supabase
        .from('home_feed')
        .select('id, title')
        .limit(50);

      if (myPosts && myPosts.length > 0) {
        const myPostIds = (myPosts as Array<{ id: string; title: string }>).map((p) => p.id);
        const { data: reactionData } = await supabase
          .from('post_reactions')
          .select('id, post_id, created_at')
          .in('post_id', myPostIds)
          .neq('user_id', user.id)
          .gte('created_at', since)
          .order('created_at', { ascending: false })
          .limit(10);

        for (const reaction of (reactionData ?? [])) {
          const r = reaction as { id: string; post_id: string; created_at: string };
          const post = (myPosts as Array<{ id: string; title: string }>)
            .find((p) => p.id === r.post_id);
          results.push({
            id: `reaction_${r.id}`,
            emoji: '❤️',
            title: 'Someone liked a post',
            subtitle: post?.title ?? 'A post you follow',
            time: formatTimeAgo(r.created_at),
            isNew: !seenIds.current.has(`reaction_${r.id}`),
            type: 'new_reaction',
          });
        }
      }
    }

    // Sort by newest first (best effort with string time labels)
    results.sort((a, b) => {
      // isNew items first, then others
      if (a.isNew && !b.isNew) return -1;
      if (!a.isNew && b.isNew) return 1;
      return 0;
    });

    // Mark all as seen after loading
    results.forEach((n) => seenIds.current.add(n.id));
    setNotifications(results);
  }, [user]);

  const loadNotifications = useCallback(async (showLoader = true): Promise<void> => {
    if (showLoader) setIsLoading(true);
    try {
      await buildNotifications();
    } catch (err) {
      console.error('[NotificationsScreen]', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [buildNotifications]);

  useEffect(() => {
    loadNotifications();

    // Supabase Realtime: listen for new home_feed posts
    const channel = supabase
      .channel('home_feed_notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'home_feed' },
        (payload) => {
          const newPost = payload.new as {
            id: string;
            content_type: string;
            title: string;
            created_at: string;
          };
          const newNotif: AppNotification = {
            id: `feed_${newPost.id}`,
            emoji: contentTypeEmoji(newPost.content_type),
            title: `New ${newPost.content_type}: ${newPost.title}`,
            subtitle: 'Tap Home Feed to read',
            time: 'Just now',
            isNew: true,
            type: 'new_content',
          };
          setNotifications((prev) => {
            if (prev.find((n) => n.id === newNotif.id)) return prev;
            return [newNotif, ...prev];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadNotifications]);

  const handleRefresh = useCallback(async (): Promise<void> => {
    setIsRefreshing(true);
    await loadNotifications(false);
  }, [loadNotifications]);

  const handleNotifPress = useCallback((notif: AppNotification): void => {
    if (notif.type === 'new_content' || notif.type === 'new_reaction') {
      router.push('/(tabs)/home');
    } else if (notif.type === 'community_post') {
      router.push('/(tabs)/community');
    }
  }, [router]);

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<AppNotification>): React.JSX.Element => (
      <TouchableOpacity
        style={[styles.notifRow, item.isNew ? styles.notifRowNew : null]}
        onPress={() => handleNotifPress(item)}
        activeOpacity={0.8}
      >
        <View style={[styles.notifIconWrap, item.isNew ? styles.notifIconWrapNew : null]}>
          <Text style={styles.notifEmoji}>{item.emoji}</Text>
        </View>
        <View style={styles.notifInfo}>
          <Text style={[styles.notifTitle, item.isNew ? styles.notifTitleNew : null]} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={styles.notifSubtitle} numberOfLines={1}>{item.subtitle}</Text>
          <Text style={styles.notifTime}>{item.time}</Text>
        </View>
        {item.isNew && <View style={styles.newDot} />}
      </TouchableOpacity>
    ),
    [handleNotifPress]
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={styles.header}>
        <Text style={styles.title}>🔔 Notifications</Text>
        <Text style={styles.subtitle}>
          {notifications.filter((n) => n.isNew).length} new · Last 7 days
        </Text>
      </LinearGradient>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      ) : (
        <FlatList<AppNotification>
          data={notifications}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
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
              <Text style={styles.emptyEmoji}>🔔</Text>
              <Text style={styles.emptyTitle}>All caught up!</Text>
              <Text style={styles.emptySubtext}>New content and reactions will appear here.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.backgroundPrimary },
  header: { paddingTop: 52, paddingBottom: SPACING.xl, paddingHorizontal: SPACING.base },
  title: { fontSize: TYPOGRAPHY.fontSize['2xl'], fontWeight: '800', color: COLORS.white },
  subtitle: { fontSize: TYPOGRAPHY.fontSize.sm, color: COLORS.accentLight, marginTop: 4 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: SPACING.md, fontSize: TYPOGRAPHY.fontSize.sm, color: COLORS.midGray },
  listContent: { padding: SPACING.base, paddingBottom: SPACING['5xl'] },
  notifRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl, padding: SPACING.md, marginBottom: SPACING.sm,
    ...SHADOWS.sm,
  },
  notifRowNew: { backgroundColor: '#EEF2FF', borderLeftWidth: 3, borderLeftColor: COLORS.primary },
  notifIconWrap: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.lightGray,
    alignItems: 'center', justifyContent: 'center', marginRight: SPACING.md,
  },
  notifIconWrapNew: { backgroundColor: COLORS.primary },
  notifEmoji: { fontSize: 22 },
  notifInfo: { flex: 1 },
  notifTitle: { fontSize: TYPOGRAPHY.fontSize.sm, fontWeight: '600', color: COLORS.charcoal },
  notifTitleNew: { fontWeight: '700', color: COLORS.primary },
  notifSubtitle: { fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.midGray, marginTop: 2 },
  notifTime: { fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.midGray, marginTop: 4 },
  newDot: {
    width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.primary, marginLeft: SPACING.sm,
  },
  emptyContainer: { alignItems: 'center', paddingTop: SPACING['5xl'], paddingHorizontal: SPACING['2xl'] },
  emptyEmoji: { fontSize: 56, marginBottom: SPACING['2xl'] },
  emptyTitle: { fontSize: TYPOGRAPHY.fontSize.lg, fontWeight: '700', color: COLORS.charcoal, marginBottom: SPACING.sm },
  emptySubtext: { fontSize: TYPOGRAPHY.fontSize.base, color: COLORS.midGray, textAlign: 'center', lineHeight: TYPOGRAPHY.fontSize.base * 1.6 },
});
