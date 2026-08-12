// =============================================================================
// TOO HUMBLE - ADMIN DASHBOARD
// RBAC guard, realtime new user alerts, flagged content moderation grid
// Supports dynamic theme toggling and dynamic colors.
// =============================================================================

import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Alert,
  ActivityIndicator, StatusBar, ScrollView, ListRenderItemInfo, TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { RealtimePostgresInsertPayload } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Profile, CommunityPost, CommunityPostUpdate } from '../../types/database.types';
import { TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../../constants/theme';


// -----------------------------------------------------------------------
// Stat card
// -----------------------------------------------------------------------
interface StatCardProps {
  label: string;
  value: string | number;
  emoji: string;
  color: string;
  colors: any;
}
function StatCard({ label, value, emoji, color, colors }: StatCardProps): React.JSX.Element {
  const styles = getStyles(colors);
  return (
    <View style={[styles.statCard, { borderTopColor: color }]}>
      <Text style={styles.statEmoji}>{emoji}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// -----------------------------------------------------------------------
// AdminDashboard
// -----------------------------------------------------------------------
export default function AdminDashboard(): React.JSX.Element {
  const router = useRouter();
  const { user, role, isLoading } = useAuth();
  const { colors } = useTheme();
  const styles = getStyles(colors);

  const [stats, setStats] = useState({ users: 0, posts: 0, flagged: 0, feed: 0 });
  const [flaggedPosts, setFlaggedPosts] = useState<CommunityPost[]>([]);
  const [newUserAlerts, setNewUserAlerts] = useState<Profile[]>([]);
  const [isFetching, setIsFetching] = useState(true);

  const [fbLink, setFbLink] = useState<string>('');
  const [fbSaving, setFbSaving] = useState<boolean>(false);
  const [fbError, setFbError] = useState<string | null>(null);

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

  useEffect(() => {
    if (role === 'admin' && user?.id) {
      (async () => {
        try {
          const { data } = await supabase
            .from('profiles')
            .select('fb_link')
            .eq('id', user.id)
            .single();
          if (data?.fb_link) setFbLink(data.fb_link);
        } catch {
          // ignore
        }
      })();
    }
  }, [role, user?.id]);

  const handleFbSave = async () => {
    setFbSaving(true);
    setFbError(null);
    const { error } = await (supabase.rpc as (fn: string, args: Record<string, unknown>) => Promise<{ error: { message: string } | null }>)('admin_update_fb_link', {
      p_fb_link: fbLink.trim() || null,
    });
    if (error) {
      setFbError(error.message);
    } else {
      Alert.alert('Success', 'Ministry Facebook link updated successfully.');
    }
    setFbSaving(false);
  };

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
      <View style={styles.flaggedRow}>
        <View style={styles.flaggedInfo}>
          <Text style={styles.flaggedAuthor} numberOfLines={1}>
            {item.profiles?.full_name ?? 'Unknown'}
          </Text>
          <Text style={styles.flaggedCaption} numberOfLines={2}>
            {item.caption || '(no caption)'}
          </Text>
          <Text style={styles.flaggedTime}>
            {new Date(item.created_at).toLocaleDateString()}
          </Text>
        </View>
        <View style={styles.flaggedActions}>
          <TouchableOpacity
            style={styles.dismissBtn}
            onPress={() => handleDismissFlag(item.id)}
          >
            <Text style={styles.dismissBtnText}>✓ Dismiss</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => handleDeletePost(item.id)}
          >
            <Text style={styles.deleteBtnText}>🗑 Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    ),
    [handleDismissFlag, handleDeletePost, styles]
  );

  // ----------------------------------------------------------------
  // Guard render
  // ----------------------------------------------------------------
  if (isLoading || role !== 'admin') {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primaryDark} />
      <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.header}>
        <Text style={styles.headerBadge}>⚙️ ADMIN</Text>
        <Text style={styles.headerTitle}>Dashboard</Text>
        <Text style={styles.headerSub}>Too Humble Control Center</Text>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Stats row */}
        <Text style={styles.sectionTitle}>Overview</Text>
        {isFetching ? (
          <ActivityIndicator color={colors.accent} style={{ marginVertical: SPACING.xl }} />
        ) : (
          <View style={styles.statsRow}>
            <StatCard label="Total Users" value={stats.users} emoji="👥" color={colors.primaryLight} colors={colors} />
            <StatCard label="Posts" value={stats.posts} emoji="📝" color={colors.success} colors={colors} />
            <StatCard label="Flagged" value={stats.flagged} emoji="🚩" color={colors.danger} colors={colors} />
            <StatCard label="Feed Items" value={stats.feed} emoji="📌" color={colors.accent} colors={colors} />
          </View>
        )}

        {/* New user alerts */}
        <Text style={styles.sectionTitle}>🔔 New User Alerts</Text>
        {newUserAlerts.length === 0 ? (
          <View style={styles.emptyAlert}>
            <Text style={styles.emptyAlertText}>No new registrations since you logged in.</Text>
          </View>
        ) : (
          newUserAlerts.map((u) => (
            <View key={u.id} style={styles.alertRow}>
              <View style={styles.alertDot} />
              <View style={styles.alertInfo}>
                <Text style={styles.alertName}>{u.full_name}</Text>
                <Text style={styles.alertTime}>
                  {new Date(u.created_at).toLocaleTimeString()}
                </Text>
              </View>
              <Text style={styles.alertBadge}>{u.role}</Text>
            </View>
          ))
        )}

        {/* Moderation grid */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>🚩 Flagged Content</Text>
          <TouchableOpacity onPress={fetchData}>
            <Text style={styles.refreshText}>Refresh</Text>
          </TouchableOpacity>
        </View>

        {isFetching ? (
          <ActivityIndicator color={colors.accent} />
        ) : flaggedPosts.length === 0 ? (
          <View style={styles.emptyAlert}>
            <Text style={styles.emptyAlertText}>No flagged content. Community looks clean! ✅</Text>
          </View>
        ) : (
          <FlatList<CommunityPost>
            data={flaggedPosts}
            renderItem={renderFlagged}
            keyExtractor={(p) => p.id}
            scrollEnabled={false}
          />
        )}

        {/* Ministry Presence */}
        <Text style={styles.sectionTitle}>Ministry Presence</Text>
        <View style={styles.ministryCard}>
          <Text style={styles.ministryLabel}>Facebook Page</Text>
          <Text style={styles.ministrySubtext}>Shown to all users as Follow Us link</Text>
          <TextInput
            value={fbLink}
            onChangeText={setFbLink}
            placeholder="https://facebook.com/yourpage"
            placeholderTextColor={colors.midGray}
            keyboardType="url"
            autoCapitalize="none"
            style={styles.fbInput}
          />
          {fbError ? <Text style={styles.errorText}>{fbError}</Text> : null}
          <TouchableOpacity
            style={styles.saveFbBtn}
            onPress={handleFbSave}
            disabled={fbSaving}
            activeOpacity={0.8}
          >
            {fbSaving ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.saveFbBtnText}>Save Ministry Link</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Quick links */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <TouchableOpacity style={styles.quickAction} onPress={() => router.push('/(admin)/create-content' as any)}>
          <Text style={styles.quickActionEmoji}>➕</Text>
          <Text style={styles.quickActionText}>Publish New Content</Text>
          <Text style={styles.quickChevron}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickAction} onPress={() => router.push('/(admin)/users' as any)}>
          <Text style={styles.quickActionEmoji}>👥</Text>
          <Text style={styles.quickActionText}>Manage Users</Text>
          <Text style={styles.quickChevron}>›</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const getStyles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.backgroundPrimary },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.backgroundPrimary },
    header: { paddingTop: 52, paddingBottom: SPACING.xl, paddingHorizontal: SPACING.base },
    headerBadge: {
      fontSize: TYPOGRAPHY.fontSize.xs, color: colors.accentLight, fontWeight: '700',
      letterSpacing: 1, marginBottom: SPACING.xs,
    },
    headerTitle: { fontSize: TYPOGRAPHY.fontSize['2xl'], fontWeight: '800', color: '#FFFFFF' },
    headerSub: { fontSize: TYPOGRAPHY.fontSize.sm, color: 'rgba(255,255,255,0.6)', marginTop: 4 },
    content: { padding: SPACING.base, paddingBottom: SPACING['5xl'] },
    sectionTitle: {
      fontSize: TYPOGRAPHY.fontSize.md, fontWeight: '700', color: colors.charcoal,
      marginTop: SPACING.xl, marginBottom: SPACING.md,
    },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: SPACING.xl },
    refreshText: { fontSize: TYPOGRAPHY.fontSize.sm, color: colors.accent, fontWeight: '600' },
    statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.md },
    statCard: {
      flex: 1, minWidth: 140, backgroundColor: colors.backgroundCard, borderRadius: BORDER_RADIUS.lg,
      padding: SPACING.md, borderTopWidth: 4, alignItems: 'center', borderWidth: 1, borderColor: colors.lightGray, ...SHADOWS.sm,
    },
    statEmoji: { fontSize: 24, marginBottom: SPACING.xs },
    statValue: { fontSize: TYPOGRAPHY.fontSize['2xl'], fontWeight: '800' },
    statLabel: { fontSize: TYPOGRAPHY.fontSize.xs, color: colors.midGray, marginTop: 2, textAlign: 'center' },
    alertRow: {
      flexDirection: 'row', alignItems: 'center', backgroundColor: colors.backgroundCard,
      borderRadius: BORDER_RADIUS.md, padding: SPACING.md, marginBottom: SPACING.sm, borderWidth: 1, borderColor: colors.lightGray, ...SHADOWS.sm,
    },
    alertDot: {
      width: 10, height: 10, borderRadius: 5, backgroundColor: colors.success, marginRight: SPACING.md,
    },
    alertInfo: { flex: 1 },
    alertName: { fontSize: TYPOGRAPHY.fontSize.base, fontWeight: '600', color: colors.charcoal },
    alertTime: { fontSize: TYPOGRAPHY.fontSize.xs, color: colors.midGray, marginTop: 2 },
    alertBadge: {
      fontSize: TYPOGRAPHY.fontSize.xs, color: colors.accent, fontWeight: '700',
      backgroundColor: colors.backgroundPrimary, paddingHorizontal: SPACING.sm, paddingVertical: 4,
      borderRadius: BORDER_RADIUS.full, borderWidth: 1, borderColor: colors.lightGray,
    },
    emptyAlert: {
      backgroundColor: colors.backgroundCard, borderRadius: BORDER_RADIUS.md,
      padding: SPACING.lg, alignItems: 'center', borderWidth: 1, borderColor: colors.lightGray,
    },
    emptyAlertText: { color: colors.midGray, fontSize: TYPOGRAPHY.fontSize.sm, textAlign: 'center' },
    flaggedRow: {
      backgroundColor: colors.backgroundCard, borderRadius: BORDER_RADIUS.lg, padding: SPACING.md,
      marginBottom: SPACING.sm, borderLeftWidth: 4, borderLeftColor: colors.error, borderWidth: 1, borderColor: colors.lightGray, ...SHADOWS.sm,
    },
    flaggedInfo: { marginBottom: SPACING.sm },
    flaggedAuthor: { fontSize: TYPOGRAPHY.fontSize.base, fontWeight: '700', color: colors.charcoal },
    flaggedCaption: { fontSize: TYPOGRAPHY.fontSize.sm, color: colors.darkGray, marginTop: 4 },
    flaggedTime: { fontSize: TYPOGRAPHY.fontSize.xs, color: colors.midGray, marginTop: 4 },
    flaggedActions: { flexDirection: 'row', gap: SPACING.md },
    dismissBtn: {
      flex: 1, backgroundColor: colors.backgroundPrimary, borderRadius: BORDER_RADIUS.md,
      paddingVertical: SPACING.sm, alignItems: 'center', borderWidth: 1, borderColor: colors.lightGray,
    },
    dismissBtnText: { color: colors.success, fontWeight: '700', fontSize: TYPOGRAPHY.fontSize.sm },
    deleteBtn: {
      flex: 1, backgroundColor: colors.theme === 'dark' ? '#3B1A1A' : '#FFF5F5', borderRadius: BORDER_RADIUS.md,
      paddingVertical: SPACING.sm, alignItems: 'center', borderWidth: 1, borderColor: colors.theme === 'dark' ? '#6B2F2F' : '#FED7D7',
    },
    deleteBtnText: { color: colors.error, fontWeight: '700', fontSize: TYPOGRAPHY.fontSize.sm },
    quickAction: {
      flexDirection: 'row', alignItems: 'center', backgroundColor: colors.backgroundCard,
      borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.sm, borderWidth: 1, borderColor: colors.lightGray, ...SHADOWS.sm,
    },
    quickActionEmoji: { fontSize: 22, marginRight: SPACING.md },
    quickActionText: { flex: 1, fontSize: TYPOGRAPHY.fontSize.base, fontWeight: '600', color: colors.charcoal },
    quickChevron: { fontSize: 22, color: colors.midGray },
    ministryCard: {
      backgroundColor: colors.backgroundCard, borderRadius: BORDER_RADIUS.lg,
      padding: SPACING.md, marginBottom: SPACING.md, borderWidth: 1, borderColor: colors.lightGray, ...SHADOWS.sm,
    },
    ministryLabel: { fontSize: TYPOGRAPHY.fontSize.base, fontWeight: '700', color: colors.charcoal },
    ministrySubtext: { fontSize: TYPOGRAPHY.fontSize.xs, color: colors.midGray, marginTop: 2, marginBottom: SPACING.sm },
    fbInput: {
      backgroundColor: colors.backgroundPrimary, borderWidth: 1, borderColor: colors.lightGray,
      borderRadius: BORDER_RADIUS.md, padding: SPACING.md, fontSize: TYPOGRAPHY.fontSize.sm, color: colors.charcoal,
      marginBottom: SPACING.sm,
    },
    errorText: { color: colors.error, fontSize: TYPOGRAPHY.fontSize.xs, marginBottom: SPACING.sm },
    saveFbBtn: {
      backgroundColor: colors.accent, borderRadius: BORDER_RADIUS.md, paddingVertical: SPACING.sm,
      alignItems: 'center', justifyContent: 'center', marginTop: 4,
    },
    saveFbBtnText: { color: '#0A0D16', fontWeight: '700', fontSize: TYPOGRAPHY.fontSize.sm },
  });
