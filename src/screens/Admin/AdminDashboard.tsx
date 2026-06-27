// =============================================================================
// TOO HUMBLE - ADMIN DASHBOARD
// RBAC guard, realtime new user alerts, flagged content moderation grid
// =============================================================================

import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Alert,
  ActivityIndicator, StatusBar, ScrollView, ListRenderItemInfo,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { RealtimePostgresInsertPayload } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Profile, CommunityPost, CommunityPostUpdate } from '../../types/database.types';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../../constants/theme';


// -----------------------------------------------------------------------
// Stat card
// -----------------------------------------------------------------------
interface StatCardProps { label: string; value: string | number; emoji: string; color: string }
function StatCard({ label, value, emoji, color }: StatCardProps): React.JSX.Element {
  return (
    <View style={[adminStyles.statCard, { borderTopColor: color }]}>
      <Text style={adminStyles.statEmoji}>{emoji}</Text>
      <Text style={[adminStyles.statValue, { color }]}>{value}</Text>
      <Text style={adminStyles.statLabel}>{label}</Text>
    </View>
  );
}

// -----------------------------------------------------------------------
// AdminDashboard
// -----------------------------------------------------------------------
export default function AdminDashboard(): React.JSX.Element {
  const router = useRouter();
  const { role, isLoading } = useAuth();

  const [stats, setStats] = useState({ users: 0, posts: 0, flagged: 0, feed: 0 });
  const [flaggedPosts, setFlaggedPosts] = useState<CommunityPost[]>([]);
  const [newUserAlerts, setNewUserAlerts] = useState<Profile[]>([]);
  const [isFetching, setIsFetching] = useState(true);

  // ----------------------------------------------------------------
  // RBAC guard — break execution immediately for non-admins
  // ----------------------------------------------------------------
  useEffect(() => {
    if (!isLoading && role !== 'admin') {
      Alert.alert('Access Denied', 'You do not have admin privileges.');
      router.replace('/(tabs)/home');
    }
  }, [role, isLoading, router]);

  // ----------------------------------------------------------------
  // Fetch stats + flagged posts
  // ----------------------------------------------------------------
  const fetchData = useCallback(async (): Promise<void> => {
    setIsFetching(true);
    try {
      const [usersRes, postsRes, flaggedRes, feedRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('community_posts').select('id', { count: 'exact', head: true }),
        supabase.from('community_posts').select('*, profiles(id, full_name, avatar_url, role)').eq('is_flagged', true).order('created_at', { ascending: false }),
        supabase.from('home_feed').select('id', { count: 'exact', head: true }),
      ]);

      setStats({
        users: usersRes.count ?? 0,
        posts: postsRes.count ?? 0,
        flagged: flaggedRes.data?.length ?? 0,
        feed: feedRes.count ?? 0,
      });
      setFlaggedPosts((flaggedRes.data ?? []) as CommunityPost[]);
    } catch (err) {
      console.error('[AdminDashboard]', err);
    } finally {
      setIsFetching(false);
    }
  }, []);

  useEffect(() => {
    if (role === 'admin') {
      fetchData();

      // Realtime: stream new profile inserts
      const channel = supabase
        .channel('admin-new-users')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'profiles' },
          (payload: RealtimePostgresInsertPayload<Profile>) => {
            setNewUserAlerts((prev) => [payload.new as Profile, ...prev].slice(0, 10));
            setStats((s) => ({ ...s, users: s.users + 1 }));
          }
        )
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    }
    return undefined;
  }, [role, fetchData]);

  // ----------------------------------------------------------------
  // Actions
  // ----------------------------------------------------------------
  const handleDeletePost = useCallback((postId: string): void => {
    Alert.alert('Delete Post', 'Permanently remove this post?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          await supabase.from('community_posts').delete().eq('id', postId);
          setFlaggedPosts((prev) => prev.filter((p) => p.id !== postId));
          setStats((s) => ({ ...s, flagged: Math.max(0, s.flagged - 1), posts: Math.max(0, s.posts - 1) }));
        },
      },
    ]);
  }, []);

  const handleDismissFlag = useCallback(async (postId: string): Promise<void> => {
    await supabase.from('community_posts').update({ is_flagged: false } as CommunityPostUpdate).eq('id', postId);
    setFlaggedPosts((prev) => prev.filter((p) => p.id !== postId));
    setStats((s) => ({ ...s, flagged: Math.max(0, s.flagged - 1) }));
  }, []);

  // ----------------------------------------------------------------
  // Render flagged post row
  // ----------------------------------------------------------------
  const renderFlagged = useCallback(
    ({ item }: ListRenderItemInfo<CommunityPost>): React.JSX.Element => (
      <View style={adminStyles.flaggedRow}>
        <View style={adminStyles.flaggedInfo}>
          <Text style={adminStyles.flaggedAuthor} numberOfLines={1}>
            {item.profiles?.full_name ?? 'Unknown'}
          </Text>
          <Text style={adminStyles.flaggedCaption} numberOfLines={2}>
            {item.caption || '(no caption)'}
          </Text>
          <Text style={adminStyles.flaggedTime}>
            {new Date(item.created_at).toLocaleDateString()}
          </Text>
        </View>
        <View style={adminStyles.flaggedActions}>
          <TouchableOpacity
            style={adminStyles.dismissBtn}
            onPress={() => handleDismissFlag(item.id)}
          >
            <Text style={adminStyles.dismissBtnText}>✓ Dismiss</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={adminStyles.deleteBtn}
            onPress={() => handleDeletePost(item.id)}
          >
            <Text style={adminStyles.deleteBtnText}>🗑 Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    ),
    [handleDismissFlag, handleDeletePost]
  );

  // ----------------------------------------------------------------
  // Guard render
  // ----------------------------------------------------------------
  if (isLoading || role !== 'admin') {
    return (
      <View style={adminStyles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={adminStyles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primaryDark} />
      <LinearGradient colors={[COLORS.primaryDark, COLORS.primary]} style={adminStyles.header}>
        <Text style={adminStyles.headerBadge}>⚙️ ADMIN</Text>
        <Text style={adminStyles.headerTitle}>Dashboard</Text>
        <Text style={adminStyles.headerSub}>Too Humble Control Center</Text>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={adminStyles.content}>
        {/* Stats row */}
        <Text style={adminStyles.sectionTitle}>Overview</Text>
        {isFetching ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginVertical: SPACING.xl }} />
        ) : (
          <View style={adminStyles.statsRow}>
            <StatCard label="Total Users" value={stats.users} emoji="👥" color={COLORS.info} />
            <StatCard label="Posts" value={stats.posts} emoji="📝" color={COLORS.success} />
            <StatCard label="Flagged" value={stats.flagged} emoji="🚩" color={COLORS.error} />
            <StatCard label="Feed Items" value={stats.feed} emoji="📌" color={COLORS.accent} />
          </View>
        )}

        {/* New user alerts */}
        <Text style={adminStyles.sectionTitle}>🔔 New User Alerts</Text>
        {newUserAlerts.length === 0 ? (
          <View style={adminStyles.emptyAlert}>
            <Text style={adminStyles.emptyAlertText}>No new registrations since you logged in.</Text>
          </View>
        ) : (
          newUserAlerts.map((u) => (
            <View key={u.id} style={adminStyles.alertRow}>
              <View style={adminStyles.alertDot} />
              <View style={adminStyles.alertInfo}>
                <Text style={adminStyles.alertName}>{u.full_name}</Text>
                <Text style={adminStyles.alertTime}>
                  {new Date(u.created_at).toLocaleTimeString()}
                </Text>
              </View>
              <Text style={adminStyles.alertBadge}>{u.role}</Text>
            </View>
          ))
        )}

        {/* Moderation grid */}
        <View style={adminStyles.sectionHeader}>
          <Text style={adminStyles.sectionTitle}>🚩 Flagged Content</Text>
          <TouchableOpacity onPress={fetchData}>
            <Text style={adminStyles.refreshText}>Refresh</Text>
          </TouchableOpacity>
        </View>

        {isFetching ? (
          <ActivityIndicator color={COLORS.primary} />
        ) : flaggedPosts.length === 0 ? (
          <View style={adminStyles.emptyAlert}>
            <Text style={adminStyles.emptyAlertText}>No flagged content. Community looks clean! ✅</Text>
          </View>
        ) : (
          <FlatList<CommunityPost>
            data={flaggedPosts}
            renderItem={renderFlagged}
            keyExtractor={(p) => p.id}
            scrollEnabled={false}
          />
        )}

        {/* Quick links */}
        <Text style={adminStyles.sectionTitle}>Quick Actions</Text>
        <TouchableOpacity style={adminStyles.quickAction} onPress={() => router.push('/(admin)/create-content' as any)}>
          <Text style={adminStyles.quickActionEmoji}>➕</Text>
          <Text style={adminStyles.quickActionText}>Publish New Content</Text>
          <Text style={adminStyles.quickChevron}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity style={adminStyles.quickAction} onPress={() => router.push('/(admin)/users' as any)}>
          <Text style={adminStyles.quickActionEmoji}>👥</Text>
          <Text style={adminStyles.quickActionText}>Manage Users</Text>
          <Text style={adminStyles.quickChevron}>›</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const adminStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.backgroundPrimary },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.backgroundPrimary },
  header: { paddingTop: 52, paddingBottom: SPACING.xl, paddingHorizontal: SPACING.base },
  headerBadge: {
    fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.accentLight, fontWeight: '700',
    letterSpacing: 1, marginBottom: SPACING.xs,
  },
  headerTitle: { fontSize: TYPOGRAPHY.fontSize['2xl'], fontWeight: '800', color: COLORS.white },
  headerSub: { fontSize: TYPOGRAPHY.fontSize.sm, color: 'rgba(255,255,255,0.6)', marginTop: 4 },
  content: { padding: SPACING.base, paddingBottom: SPACING['5xl'] },
  sectionTitle: {
    fontSize: TYPOGRAPHY.fontSize.md, fontWeight: '700', color: COLORS.charcoal,
    marginTop: SPACING.xl, marginBottom: SPACING.md,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: SPACING.xl },
  refreshText: { fontSize: TYPOGRAPHY.fontSize.sm, color: COLORS.primary, fontWeight: '600' },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.md },
  statCard: {
    flex: 1, minWidth: 140, backgroundColor: COLORS.white, borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md, borderTopWidth: 4, alignItems: 'center', ...SHADOWS.sm,
  },
  statEmoji: { fontSize: 24, marginBottom: SPACING.xs },
  statValue: { fontSize: TYPOGRAPHY.fontSize['2xl'], fontWeight: '800' },
  statLabel: { fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.midGray, marginTop: 2, textAlign: 'center' },
  alertRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.md, padding: SPACING.md, marginBottom: SPACING.sm, ...SHADOWS.sm,
  },
  alertDot: {
    width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.success, marginRight: SPACING.md,
  },
  alertInfo: { flex: 1 },
  alertName: { fontSize: TYPOGRAPHY.fontSize.base, fontWeight: '600', color: COLORS.charcoal },
  alertTime: { fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.midGray, marginTop: 2 },
  alertBadge: {
    fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.primary, fontWeight: '700',
    backgroundColor: COLORS.offWhite, paddingHorizontal: SPACING.sm, paddingVertical: 4,
    borderRadius: BORDER_RADIUS.full,
  },
  emptyAlert: {
    backgroundColor: COLORS.offWhite, borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg, alignItems: 'center',
  },
  emptyAlertText: { color: COLORS.midGray, fontSize: TYPOGRAPHY.fontSize.sm, textAlign: 'center' },
  flaggedRow: {
    backgroundColor: COLORS.white, borderRadius: BORDER_RADIUS.lg, padding: SPACING.md,
    marginBottom: SPACING.sm, borderLeftWidth: 4, borderLeftColor: COLORS.error, ...SHADOWS.sm,
  },
  flaggedInfo: { marginBottom: SPACING.sm },
  flaggedAuthor: { fontSize: TYPOGRAPHY.fontSize.base, fontWeight: '700', color: COLORS.charcoal },
  flaggedCaption: { fontSize: TYPOGRAPHY.fontSize.sm, color: COLORS.darkGray, marginTop: 4 },
  flaggedTime: { fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.midGray, marginTop: 4 },
  flaggedActions: { flexDirection: 'row', gap: SPACING.md },
  dismissBtn: {
    flex: 1, backgroundColor: COLORS.offWhite, borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.sm, alignItems: 'center', borderWidth: 1, borderColor: COLORS.lightGray,
  },
  dismissBtnText: { color: COLORS.success, fontWeight: '700', fontSize: TYPOGRAPHY.fontSize.sm },
  deleteBtn: {
    flex: 1, backgroundColor: '#FFF5F5', borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.sm, alignItems: 'center', borderWidth: 1, borderColor: '#FED7D7',
  },
  deleteBtnText: { color: COLORS.error, fontWeight: '700', fontSize: TYPOGRAPHY.fontSize.sm },
  quickAction: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.sm, ...SHADOWS.sm,
  },
  quickActionEmoji: { fontSize: 22, marginRight: SPACING.md },
  quickActionText: { flex: 1, fontSize: TYPOGRAPHY.fontSize.base, fontWeight: '600', color: COLORS.charcoal },
  quickChevron: { fontSize: 22, color: COLORS.midGray },
});
