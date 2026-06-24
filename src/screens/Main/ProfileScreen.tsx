// =============================================================================
// TOO HUMBLE - PROFILE SCREEN (PROMPT 9)
// Theme switching, language, password update, account switching, YouTube parser
// =============================================================================

import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert,
  ScrollView, StatusBar, Image, TextInput, ActivityIndicator, Switch,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase, uploadToStorage } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS, STORAGE_BUCKETS } from '../../constants/theme';

// -----------------------------------------------------------------------
// YouTube URL → Video ID parser
// -----------------------------------------------------------------------
export function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}

export function getYouTubeThumbnail(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

export function getYouTubeEmbedUrl(videoId: string): string {
  return `https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0&modestbranding=1`;
}

// -----------------------------------------------------------------------
// Section row component
// -----------------------------------------------------------------------
interface SectionRowProps {
  icon: string;
  label: string;
  value?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  danger?: boolean;
}

function SectionRow({ icon, label, value, onPress, rightElement, danger }: SectionRowProps): React.JSX.Element {
  return (
    <TouchableOpacity style={styles.sectionRow} onPress={onPress} activeOpacity={onPress ? 0.7 : 1} disabled={!onPress}>
      <Text style={styles.rowIcon}>{icon}</Text>
      <View style={styles.rowContent}>
        <Text style={[styles.rowLabel, danger ? { color: COLORS.error } : null]}>{label}</Text>
        {value ? <Text style={styles.rowValue}>{value}</Text> : null}
      </View>
      {rightElement ?? (onPress ? <Text style={styles.rowChevron}>›</Text> : null)}
    </TouchableOpacity>
  );
}

// -----------------------------------------------------------------------
// ProfileScreen
// -----------------------------------------------------------------------
export default function ProfileScreen(): React.JSX.Element {
  const router = useRouter();
  const { user, profile, logout, updateProfile, refreshProfile } = useAuth();

  const [isDarkMode, setIsDarkMode] = useState(false);
  const [language, setLanguage] = useState('English');
  const [isUpdatingAvatar, setIsUpdatingAvatar] = useState(false);

  // Password update state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [isPwdUpdating, setIsPwdUpdating] = useState(false);

  // ----------------------------------------------------------------
  // Avatar update
  // ----------------------------------------------------------------
  const handleUpdateAvatar = useCallback(async (): Promise<void> => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission Required', 'Photo access needed.'); return; }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7, allowsEditing: true, aspect: [1, 1],
    });
    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    if ((asset.fileSize ?? 0) > 2 * 1024 * 1024) {
      Alert.alert('Image Too Large', 'Avatar must be under 2 MB.'); return;
    }

    setIsUpdatingAvatar(true);
    try {
      const ext = asset.uri.split('.').pop() ?? 'jpg';
      const path = `${user?.id}/${Date.now()}.${ext}`;
      const response = await fetch(asset.uri);
      const blob = await response.blob();
      const url = await uploadToStorage(STORAGE_BUCKETS.avatars, path, blob, `image/${ext}`);
      await updateProfile({ avatar_url: url });
      await refreshProfile();
    } catch (err: unknown) {
      Alert.alert('Upload Failed', err instanceof Error ? err.message : 'Try again.');
    } finally {
      setIsUpdatingAvatar(false);
    }
  }, [user, updateProfile, refreshProfile]);

  // ----------------------------------------------------------------
  // Password update
  // ----------------------------------------------------------------
  const handlePasswordUpdate = useCallback(async (): Promise<void> => {
    if (!newPwd || newPwd.length < 8) { Alert.alert('Weak Password', 'Min 8 characters required.'); return; }
    if (newPwd !== confirmPwd) { Alert.alert('Mismatch', 'Passwords do not match.'); return; }

    setIsPwdUpdating(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPwd });
      if (error) throw error;
      Alert.alert('Password Updated ✅', 'Your password has been changed successfully.');
      setShowPasswordModal(false);
      setCurrentPwd(''); setNewPwd(''); setConfirmPwd('');
    } catch (err: unknown) {
      Alert.alert('Update Failed', err instanceof Error ? err.message : 'Try again.');
    } finally {
      setIsPwdUpdating(false);
    }
  }, [newPwd, confirmPwd]);

  // ----------------------------------------------------------------
  // Logout
  // ----------------------------------------------------------------
  const handleLogout = useCallback((): void => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out', style: 'destructive',
        onPress: async () => { await logout(); router.replace('/auth/login'); },
      },
    ]);
  }, [logout, router]);

  // ----------------------------------------------------------------
  // Language toggle (localization placeholder — extend with i18n)
  // ----------------------------------------------------------------
  const handleLanguageToggle = useCallback((): void => {
    const langs = ['English', 'Swahili', 'French'];
    const currentIdx = langs.indexOf(language);
    setLanguage(langs[(currentIdx + 1) % langs.length]);
    Alert.alert('Language Updated', `App language set to ${langs[(currentIdx + 1) % langs.length]}.`);
  }, [language]);

  // ----------------------------------------------------------------
  // Account switch (navigate to login for alternate account)
  // ----------------------------------------------------------------
  const handleAccountSwitch = useCallback((): void => {
    Alert.alert(
      'Switch Account',
      'You will be signed out of the current account.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Switch',
          onPress: async () => { await logout(); router.replace('/auth/login'); },
        },
      ]
    );
  }, [logout, router]);

  // ----------------------------------------------------------------
  // Render
  // ----------------------------------------------------------------
  const avatarUrl = profile?.avatar_url;
  const displayName = profile?.full_name ?? user?.email ?? 'User';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={styles.header}>
        {/* Avatar */}
        <TouchableOpacity onPress={handleUpdateAvatar} disabled={isUpdatingAvatar} style={styles.avatarContainer}>
          {isUpdatingAvatar ? (
            <ActivityIndicator color={COLORS.white} />
          ) : avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          ) : (
            <Text style={styles.avatarPlaceholder}>{displayName.charAt(0).toUpperCase()}</Text>
          )}
          <View style={styles.avatarEditBadge}><Text style={styles.avatarEditIcon}>✏️</Text></View>
        </TouchableOpacity>

        <Text style={styles.profileName}>{displayName}</Text>
        <Text style={styles.profileEmail}>{user?.email}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleBadgeText}>{profile?.role?.toUpperCase() ?? 'CLIENT'}</Text>
        </View>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

        {/* Account */}
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.card}>
          <SectionRow
            icon="🔒" label="Update Password"
            onPress={() => setShowPasswordModal(true)}
          />
          <View style={styles.divider} />
          <SectionRow
            icon="🔗" label="Facebook Link"
            value={profile?.fb_link ?? 'Not set'}
            onPress={() => router.push('/profile/edit-social' as any)}
          />
          <View style={styles.divider} />
          <SectionRow
            icon="🔄" label="Switch Account"
            onPress={handleAccountSwitch}
          />
        </View>

        {/* Preferences */}
        <Text style={styles.sectionTitle}>Preferences</Text>
        <View style={styles.card}>
          <SectionRow
            icon="🌙" label="Dark Mode"
            rightElement={
              <Switch
                value={isDarkMode}
                onValueChange={setIsDarkMode}
                trackColor={{ false: COLORS.lightGray, true: COLORS.primary }}
              />
            }
          />
          <View style={styles.divider} />
          <SectionRow
            icon="🌍" label="Language"
            value={language}
            onPress={handleLanguageToggle}
          />
        </View>

        {/* Activity */}
        <Text style={styles.sectionTitle}>My Activity</Text>
        <View style={styles.card}>
          <SectionRow icon="💳" label="Giving History" onPress={() => router.push('/profile/monetization')} />
          <View style={styles.divider} />
          <SectionRow icon="🔔" label="Notifications" onPress={() => router.push('/(tabs)/notifications')} />
          <View style={styles.divider} />
          <SectionRow icon="⭐" label="Saved Posts" onPress={() => router.push('/profile/saved' as any)} />
        </View>

        {/* Danger zone */}
        <Text style={styles.sectionTitle}>Session</Text>
        <View style={styles.card}>
          <SectionRow icon="🚪" label="Log Out" onPress={handleLogout} danger />
        </View>
      </ScrollView>

      {/* Password Update Modal */}
      {showPasswordModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Update Password</Text>
            <TextInput
              style={styles.modalInput} value={currentPwd} onChangeText={setCurrentPwd}
              placeholder="Current password" placeholderTextColor={COLORS.midGray} secureTextEntry
            />
            <TextInput
              style={styles.modalInput} value={newPwd} onChangeText={setNewPwd}
              placeholder="New password (min 8 chars)" placeholderTextColor={COLORS.midGray} secureTextEntry
            />
            <TextInput
              style={styles.modalInput} value={confirmPwd} onChangeText={setConfirmPwd}
              placeholder="Confirm new password" placeholderTextColor={COLORS.midGray} secureTextEntry
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowPasswordModal(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveBtn} onPress={handlePasswordUpdate} disabled={isPwdUpdating}>
                {isPwdUpdating ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.modalSaveText}>Update</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.backgroundPrimary },
  header: { paddingTop: 52, paddingBottom: SPACING['2xl'], alignItems: 'center' },
  avatarContainer: {
    width: 88, height: 88, borderRadius: 44, backgroundColor: COLORS.overlayLight,
    alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.md,
    borderWidth: 3, borderColor: COLORS.accent, overflow: 'hidden',
  },
  avatar: { width: 88, height: 88 },
  avatarPlaceholder: { fontSize: TYPOGRAPHY.fontSize['3xl'], fontWeight: '800', color: COLORS.white },
  avatarEditBadge: {
    position: 'absolute', bottom: 0, right: 0, width: 26, height: 26, borderRadius: 13,
    backgroundColor: COLORS.accent, alignItems: 'center', justifyContent: 'center',
  },
  avatarEditIcon: { fontSize: 12 },
  profileName: { fontSize: TYPOGRAPHY.fontSize.xl, fontWeight: '800', color: COLORS.white },
  profileEmail: { fontSize: TYPOGRAPHY.fontSize.sm, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  roleBadge: {
    backgroundColor: COLORS.accent, borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: SPACING.md, paddingVertical: 4, marginTop: SPACING.sm,
  },
  roleBadgeText: { fontSize: TYPOGRAPHY.fontSize.xs, fontWeight: '800', color: COLORS.primary, letterSpacing: 1 },
  content: { padding: SPACING.base, paddingBottom: SPACING['5xl'] },
  sectionTitle: {
    fontSize: TYPOGRAPHY.fontSize.sm, fontWeight: '700', color: COLORS.midGray,
    textTransform: 'uppercase', letterSpacing: 1, marginTop: SPACING.xl, marginBottom: SPACING.sm,
    paddingHorizontal: SPACING.xs,
  },
  card: { backgroundColor: COLORS.white, borderRadius: BORDER_RADIUS.xl, overflow: 'hidden', ...SHADOWS.sm },
  sectionRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.base, paddingVertical: SPACING.md },
  rowIcon: { fontSize: 22, marginRight: SPACING.md, width: 30, textAlign: 'center' },
  rowContent: { flex: 1 },
  rowLabel: { fontSize: TYPOGRAPHY.fontSize.base, fontWeight: '600', color: COLORS.charcoal },
  rowValue: { fontSize: TYPOGRAPHY.fontSize.sm, color: COLORS.midGray, marginTop: 2 },
  rowChevron: { fontSize: 22, color: COLORS.midGray },
  divider: { height: 1, backgroundColor: COLORS.lightGray, marginLeft: 58 },
  modalOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: COLORS.overlayDark, justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: COLORS.white, borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl, padding: SPACING['2xl'], paddingBottom: 40,
  },
  modalTitle: { fontSize: TYPOGRAPHY.fontSize.lg, fontWeight: '700', color: COLORS.charcoal, marginBottom: SPACING.xl },
  modalInput: {
    backgroundColor: COLORS.offWhite, borderWidth: 1.5, borderColor: COLORS.lightGray,
    borderRadius: BORDER_RADIUS.md, padding: SPACING.base, marginBottom: SPACING.md,
    fontSize: TYPOGRAPHY.fontSize.base, color: COLORS.charcoal,
  },
  modalActions: { flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.md },
  modalCancelBtn: {
    flex: 1, borderWidth: 1.5, borderColor: COLORS.lightGray, borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.md, alignItems: 'center',
  },
  modalCancelText: { color: COLORS.darkGray, fontWeight: '600' },
  modalSaveBtn: {
    flex: 1, backgroundColor: COLORS.primary, borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.md, alignItems: 'center',
  },
  modalSaveText: { color: COLORS.white, fontWeight: '700' },
});
