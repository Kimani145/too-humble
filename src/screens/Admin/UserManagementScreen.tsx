// =============================================================================
// TOO HUMBLE - ADMIN: USER MANAGEMENT SCREEN
// Lists all profiles, allows role inspection, admin flagging, user search
// Admins can: search users, view roles, delete community posts by user
// =============================================================================

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Image,
  ListRenderItemInfo,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Profile } from '../../types/database.types';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../../constants/theme';

interface UserCardProps {
  profile: Profile;
  onViewPosts: (userId: string, userName: string) => void;
  onDeleteAllPosts: (userId: string, userName: string) => void;
}

function UserCard({ profile, onViewPosts, onDeleteAllPosts }: UserCardProps): React.JSX.Element {
  const isAdmin = profile.role === 'admin';
  return (
    <View style={styles.userCard}>
      <View style={styles.userRow}>
        {/* Avatar */}
        <View style={[styles.avatar, isAdmin ? styles.avatarAdmin : null]}>
          {profile.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={styles.avatarImg} />
          ) : (
            <Text style={styles.avatarInitial}>{profile.full_name.charAt(0).toUpperCase()}</Text>
          )}
        </View>

        {/* Info */}
        <View style={styles.userInfo}>
          <View style={styles.userNameRow}>
            <Text style={styles.userName} numberOfLines={1}>{profile.full_name}</Text>
            <View style={[styles.roleBadge, isAdmin ? styles.roleBadgeAdmin : null]}>
              <Text style={[styles.roleBadgeText, isAdmin ? styles.roleBadgeTextAdmin : null]}>
                {profile.role.toUpperCase()}
              </Text>
            </View>
          </View>
          <Text style={styles.userId} numberOfLines={1}>ID: {profile.id.split('-')[0]}…</Text>
          <Text style={styles.joinDate}>
            Joined {new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
          </Text>
        </View>
      </View>

      {/* Actions (only for client users) */}
      {!isAdmin && (
        <View style={styles.userActions}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => onViewPosts(profile.id, profile.full_name)}
          >
            <Text style={styles.actionBtnText}>📋 View Posts</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnDanger]}
            onPress={() => onDeleteAllPosts(profile.id, profile.full_name)}
          >
            <Text style={[styles.actionBtnText, styles.actionBtnTextDanger]}>🗑️ Delete Posts</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

export default function AdminUserManagementScreen(): React.JSX.Element {
  const router = useRouter();
  const { role } = useAuth();

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [filtered, setFiltered] = useState<Profile[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [stats, setStats] = useState<{ total: number; admins: number; clients: number }>({
    total: 0, admins: 0, clients: 0,
  });

  // Guard
  if (role !== 'admin') {
    return (
      <View style={styles.forbidden}>
        <Text style={styles.forbiddenEmoji}>🚫</Text>
        <Text style={styles.forbiddenText}>Admin access required</Text>
      </View>
    );
  }

  const fetchProfiles = useCallback(async (showLoader = true): Promise<void> => {
    if (showLoader) setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      const rows = (data ?? []) as Profile[];
      setProfiles(rows);
      setFiltered(rows);
      setStats({
        total: rows.length,
        admins: rows.filter((p) => p.role === 'admin').length,
        clients: rows.filter((p) => p.role === 'client').length,
      });
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to load users.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchProfiles(); }, [fetchProfiles]);

  const handleSearch = useCallback((query: string): void => {
    setSearchQuery(query);
    const q = query.toLowerCase().trim();
    if (!q) {
      setFiltered(profiles);
      return;
    }
    setFiltered(profiles.filter(
      (p) => p.full_name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q)
    ));
  }, [profiles]);

  const handleRefresh = useCallback(async (): Promise<void> => {
    setIsRefreshing(true);
    await fetchProfiles(false);
  }, [fetchProfiles]);

  const handleViewPosts = useCallback((userId: string, userName: string): void => {
    Alert.alert(
      `${userName}'s Posts`,
      'Navigate to Community screen to view and moderate this user\'s posts.',
      [{ text: 'OK' }]
    );
  }, []);

  const handleDeleteAllPosts = useCallback((userId: string, userName: string): void => {
    Alert.alert(
      'Delete All Posts',
      `Delete ALL community posts by ${userName}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All', style: 'destructive',
          onPress: async () => {
            const { error } = await supabase
              .from('community_posts')
              .delete()
              .eq('user_id', userId);

            if (error) {
              Alert.alert('Error', error.message);
            } else {
              Alert.alert('Done', `All posts by ${userName} have been deleted.`);
            }
          },
        },
      ]
    );
  }, []);

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<Profile>): React.JSX.Element => (
      <UserCard
        profile={item}
        onViewPosts={handleViewPosts}
        onDeleteAllPosts={handleDeleteAllPosts}
      />
    ),
    [handleViewPosts, handleDeleteAllPosts]
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>User Management</Text>
        <View style={styles.headerRight} />
      </LinearGradient>

      {/* Stats bar */}
      <View style={styles.statsBar}>
        <View style={styles.statChip}>
          <Text style={styles.statValue}>{stats.total}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statChip}>
          <Text style={[styles.statValue, { color: COLORS.success }]}>{stats.clients}</Text>
          <Text style={styles.statLabel}>Clients</Text>
        </View>
        <View style={styles.statChip}>
          <Text style={[styles.statValue, { color: COLORS.accent }]}>{stats.admins}</Text>
          <Text style={styles.statLabel}>Admins</Text>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchWrapper}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={handleSearch}
          placeholder="Search by name or ID..."
          placeholderTextColor={COLORS.midGray}
          autoCapitalize="none"
          clearButtonMode="while-editing"
        />
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading users...</Text>
        </View>
      ) : (
        <FlatList<Profile>
          data={filtered}
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
              <Text style={styles.emptyEmoji}>👤</Text>
              <Text style={styles.emptyText}>
                {searchQuery ? 'No users match your search.' : 'No users registered yet.'}
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
    flexDirection: 'row', alignItems: 'center',
    paddingTop: 52, paddingBottom: SPACING.base, paddingHorizontal: SPACING.base,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.overlayLight,
    alignItems: 'center', justifyContent: 'center',
  },
  backIcon: { fontSize: 20, color: COLORS.white, fontWeight: '700' },
  headerTitle: {
    flex: 1, fontSize: TYPOGRAPHY.fontSize.lg, fontWeight: '700',
    color: COLORS.white, textAlign: 'center',
  },
  headerRight: { width: 40 },
  statsBar: {
    flexDirection: 'row', backgroundColor: COLORS.white,
    paddingVertical: SPACING.md, paddingHorizontal: SPACING['2xl'],
    borderBottomWidth: 1, borderBottomColor: COLORS.lightGray,
    gap: SPACING['2xl'],
  },
  statChip: { alignItems: 'center' },
  statValue: { fontSize: TYPOGRAPHY.fontSize.xl, fontWeight: '800', color: COLORS.charcoal },
  statLabel: { fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.midGray, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  searchWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.white, marginHorizontal: SPACING.base,
    marginVertical: SPACING.md, borderRadius: BORDER_RADIUS.md,
    borderWidth: 1.5, borderColor: COLORS.lightGray,
    paddingHorizontal: SPACING.base, ...SHADOWS.sm,
  },
  searchIcon: { fontSize: 18, marginRight: SPACING.sm },
  searchInput: {
    flex: 1, height: 48, fontSize: TYPOGRAPHY.fontSize.base, color: COLORS.charcoal,
  },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: SPACING.md, fontSize: TYPOGRAPHY.fontSize.sm, color: COLORS.midGray },
  listContent: { padding: SPACING.base, paddingBottom: SPACING['5xl'] },
  userCard: {
    backgroundColor: COLORS.white, borderRadius: BORDER_RADIUS.xl,
    marginBottom: SPACING.base, overflow: 'hidden', ...SHADOWS.md,
  },
  userRow: { flexDirection: 'row', alignItems: 'center', padding: SPACING.base },
  avatar: {
    width: 52, height: 52, borderRadius: 26, backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center', marginRight: SPACING.md, overflow: 'hidden',
  },
  avatarAdmin: { backgroundColor: COLORS.accent },
  avatarImg: { width: 52, height: 52 },
  avatarInitial: { color: COLORS.white, fontWeight: '800', fontSize: TYPOGRAPHY.fontSize.lg },
  userInfo: { flex: 1 },
  userNameRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: 2 },
  userName: { fontSize: TYPOGRAPHY.fontSize.base, fontWeight: '700', color: COLORS.charcoal, flex: 1 },
  roleBadge: {
    backgroundColor: COLORS.lightGray, borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  roleBadgeAdmin: { backgroundColor: COLORS.accent },
  roleBadgeText: { fontSize: 9, fontWeight: '800', color: COLORS.darkGray, letterSpacing: 0.5 },
  roleBadgeTextAdmin: { color: COLORS.primary },
  userId: { fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.midGray, fontFamily: 'monospace' },
  joinDate: { fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.midGray, marginTop: 2 },
  userActions: {
    flexDirection: 'row', gap: SPACING.sm,
    paddingHorizontal: SPACING.base, paddingBottom: SPACING.base,
  },
  actionBtn: {
    flex: 1, backgroundColor: COLORS.offWhite, borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.sm, alignItems: 'center', borderWidth: 1, borderColor: COLORS.lightGray,
  },
  actionBtnDanger: { backgroundColor: '#FFF0F0', borderColor: '#FFCDD2' },
  actionBtnText: { fontSize: TYPOGRAPHY.fontSize.xs, fontWeight: '700', color: COLORS.darkGray },
  actionBtnTextDanger: { color: COLORS.error },
  emptyContainer: { alignItems: 'center', paddingTop: SPACING['5xl'] },
  emptyEmoji: { fontSize: 48, marginBottom: SPACING.base },
  emptyText: { fontSize: TYPOGRAPHY.fontSize.base, color: COLORS.midGray, textAlign: 'center' },
  forbidden: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.backgroundPrimary },
  forbiddenEmoji: { fontSize: 48, marginBottom: SPACING.base },
  forbiddenText: { fontSize: TYPOGRAPHY.fontSize.lg, fontWeight: '700', color: COLORS.charcoal },
});
