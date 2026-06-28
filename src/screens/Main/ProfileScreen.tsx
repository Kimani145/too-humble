// =============================================================================
// TOO HUMBLE - PROFILE SCREEN
// Theme switching, language, password update, account switching, YouTube parser
// Supports dynamic theme toggling, translation, and vector icons.
// =============================================================================

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  StatusBar,
  Image,
  TextInput,
  ActivityIndicator,
  Switch,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { supabase, uploadToStorage } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useTranslation, Language } from '../../context/LanguageContext';
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
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  danger?: boolean;
  colors: any;
}

function SectionRow({
  icon,
  label,
  value,
  onPress,
  rightElement,
  danger,
  colors,
}: SectionRowProps): React.JSX.Element {
  const styles = getRowStyles(colors);
  return (
    <TouchableOpacity
      style={styles.sectionRow}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      <Ionicons
        name={icon}
        size={20}
        color={danger ? colors.error : colors.accent}
        style={styles.rowIcon}
      />
      <View style={styles.rowContent}>
        <Text style={[styles.rowLabel, danger ? { color: colors.error } : { color: colors.charcoal }]}>
          {label}
        </Text>
        {value ? <Text style={styles.rowValue}>{value}</Text> : null}
      </View>
      {rightElement ?? (onPress ? <Ionicons name="chevron-forward" size={16} color={colors.midGray} /> : null)}
    </TouchableOpacity>
  );
}

// -----------------------------------------------------------------------
// ProfileScreen
// -----------------------------------------------------------------------
export default function ProfileScreen(): React.JSX.Element {
  const router = useRouter();
  const { user, profile, logout, updateProfile, refreshProfile, role } = useAuth();
  const { colors, isDarkMode, toggleTheme } = useTheme();
  const { t, language, setLanguage } = useTranslation();
  const styles = getStyles(colors);

  const [isUpdatingAvatar, setIsUpdatingAvatar] = useState(false);

  // Password update state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [isPwdUpdating, setIsPwdUpdating] = useState(false);

  const isAdmin = role === 'admin';

  // ----------------------------------------------------------------
  // Avatar update
  // ----------------------------------------------------------------
  const handleUpdateAvatar = useCallback(async (): Promise<void> => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Photo access needed.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    if ((asset.fileSize ?? 0) > 2 * 1024 * 1024) {
      Alert.alert('Image Too Large', 'Avatar must be under 2 MB.');
      return;
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
    if (!newPwd || newPwd.length < 8) {
      Alert.alert('Weak Password', 'Min 8 characters required.');
      return;
    }
    if (newPwd !== confirmPwd) {
      Alert.alert('Mismatch', 'Passwords do not match.');
      return;
    }

    setIsPwdUpdating(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPwd });
      if (error) throw error;
      Alert.alert('Password Updated ✅', 'Your password has been changed successfully.');
      setShowPasswordModal(false);
      setCurrentPwd('');
      setNewPwd('');
      setConfirmPwd('');
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
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/auth/login');
        },
      },
    ]);
  }, [logout, router]);

  // ----------------------------------------------------------------
  // Language toggle
  // ----------------------------------------------------------------
  const handleLanguageToggle = useCallback((): void => {
    const langs: Language[] = ['English', 'Swahili', 'French'];
    const currentIdx = langs.indexOf(language);
    const nextLang = langs[(currentIdx + 1) % langs.length];
    setLanguage(nextLang);
    Alert.alert('Language Updated', `App language set to ${nextLang}.`);
  }, [language, setLanguage]);

  // ----------------------------------------------------------------
  // Account switch
  // ----------------------------------------------------------------
  const handleAccountSwitch = useCallback((): void => {
    Alert.alert('Switch Account', 'You will be signed out of the current account.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Switch',
        onPress: async () => {
          await logout();
          router.replace('/auth/login');
        },
      },
    ]);
  }, [logout, router]);

  // ----------------------------------------------------------------
  // Render
  // ----------------------------------------------------------------
  const avatarUrl = profile?.avatar_url;
  const displayName = profile?.full_name ?? user?.email ?? 'User';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primaryDark} />
      <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.header}>
        {/* Avatar */}
        <TouchableOpacity
          onPress={handleUpdateAvatar}
          disabled={isUpdatingAvatar}
          style={styles.avatarContainer}
        >
          {isUpdatingAvatar ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          ) : (
            <Text style={styles.avatarPlaceholder}>{displayName.charAt(0).toUpperCase()}</Text>
          )}
          <View style={styles.avatarEditBadge}>
            <Ionicons name="pencil" size={12} color="#0A0D16" />
          </View>
        </TouchableOpacity>

        <Text style={styles.profileName}>{displayName}</Text>
        <Text style={styles.profileEmail}>{user?.email}</Text>

        {/* ONLY Render Role Badge if Admin user (removes 'CLIENT' badge) */}
        {isAdmin && (
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>ADMIN</Text>
          </View>
        )}
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Admin Section — Exposes Admin Dashboard link */}
        {isAdmin && (
          <>
            <Text style={styles.sectionTitle}>{t('profile.admin_dashboard')}</Text>
            <View style={styles.card}>
              <SectionRow
                icon="settings-outline"
                label={t('profile.admin_dashboard')}
                onPress={() => router.push('/(admin)/dashboard' as any)}
                colors={colors}
              />
            </View>
          </>
        )}

        {/* Account */}
        <Text style={styles.sectionTitle}>{t('profile.account')}</Text>
        <View style={styles.card}>
          <SectionRow
            icon="key-outline"
            label={t('profile.update_pwd')}
            onPress={() => setShowPasswordModal(true)}
            colors={colors}
          />
          <View style={styles.divider} />
          <SectionRow
            icon="logo-facebook"
            label={t('profile.fb_link')}
            value={profile?.fb_link ?? 'Not set'}
            onPress={() => router.push('/profile/edit-social' as any)}
            colors={colors}
          />
          <View style={styles.divider} />
          <SectionRow
            icon="swap-horizontal-outline"
            label={t('profile.switch_account')}
            onPress={handleAccountSwitch}
            colors={colors}
          />
        </View>

        {/* Preferences */}
        <Text style={styles.sectionTitle}>{t('profile.preferences')}</Text>
        <View style={styles.card}>
          <SectionRow
            icon="moon-outline"
            label={t('profile.dark_mode')}
            rightElement={
              <Switch
                value={isDarkMode}
                onValueChange={toggleTheme}
                trackColor={{ false: colors.lightGray, true: colors.accent }}
                thumbColor={isDarkMode ? colors.white : '#FFFFFF'}
              />
            }
            colors={colors}
          />
          <View style={styles.divider} />
          <SectionRow
            icon="globe-outline"
            label={t('profile.language')}
            value={language}
            onPress={handleLanguageToggle}
            colors={colors}
          />
        </View>

        {/* Activity */}
        <Text style={styles.sectionTitle}>{t('profile.activity')}</Text>
        <View style={styles.card}>
          <SectionRow
            icon="cash-outline"
            label={t('profile.giving_history')}
            onPress={() => router.push('/profile/monetization')}
            colors={colors}
          />
          <View style={styles.divider} />
          <SectionRow
            icon="notifications-outline"
            label={t('profile.notifications')}
            onPress={() => router.push('/(tabs)/notifications')}
            colors={colors}
          />
          <View style={styles.divider} />
          <SectionRow
            icon="bookmark-outline"
            label={t('profile.saved_posts')}
            onPress={() => router.push('/profile/saved' as any)}
            colors={colors}
          />
        </View>

        {/* Danger zone */}
        <Text style={styles.sectionTitle}>{t('profile.session')}</Text>
        <View style={styles.card}>
          <SectionRow
            icon="log-out-outline"
            label={t('profile.logout')}
            onPress={handleLogout}
            danger
            colors={colors}
          />
        </View>
      </ScrollView>

      {/* Password Update Modal */}
      {showPasswordModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>{t('profile.update_pwd')}</Text>
            <TextInput
              style={styles.modalInput}
              value={currentPwd}
              onChangeText={setCurrentPwd}
              placeholder="Current password"
              placeholderTextColor={colors.midGray}
              secureTextEntry
            />
            <TextInput
              style={styles.modalInput}
              value={newPwd}
              onChangeText={setNewPwd}
              placeholder="New password (min 8 chars)"
              placeholderTextColor={colors.midGray}
              secureTextEntry
            />
            <TextInput
              style={styles.modalInput}
              value={confirmPwd}
              onChangeText={setConfirmPwd}
              placeholder="Confirm new password"
              placeholderTextColor={colors.midGray}
              secureTextEntry
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowPasswordModal(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={handlePasswordUpdate}
                disabled={isPwdUpdating}
              >
                {isPwdUpdating ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSaveText}>Update</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

// -----------------------------------------------------------------------
// Styles
// -----------------------------------------------------------------------
const getRowStyles = (colors: any) =>
  StyleSheet.create({
    sectionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: SPACING.base,
      paddingVertical: SPACING.md,
    },
    rowIcon: { marginRight: SPACING.md, width: 24, textAlign: 'center' },
    rowContent: { flex: 1 },
    rowLabel: { fontSize: TYPOGRAPHY.fontSize.base, fontWeight: '600' },
    rowValue: { fontSize: TYPOGRAPHY.fontSize.sm, color: colors.midGray, marginTop: 2 },
  });

const getStyles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.backgroundPrimary },
    header: { paddingTop: 52, paddingBottom: SPACING['2xl'], alignItems: 'center' },
    avatarContainer: {
      width: 88,
      height: 88,
      borderRadius: 44,
      backgroundColor: colors.overlayLight,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: SPACING.md,
      borderWidth: 3,
      borderColor: colors.accent,
      overflow: 'hidden',
    },
    avatar: { width: 88, height: 88 },
    avatarPlaceholder: { fontSize: TYPOGRAPHY.fontSize['3xl'], fontWeight: '800', color: '#FFFFFF' },
    avatarEditBadge: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    profileName: { fontSize: TYPOGRAPHY.fontSize.xl, fontWeight: '800', color: '#FFFFFF' },
    profileEmail: { fontSize: TYPOGRAPHY.fontSize.sm, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
    roleBadge: {
      backgroundColor: colors.accent,
      borderRadius: BORDER_RADIUS.full,
      paddingHorizontal: SPACING.md,
      paddingVertical: 4,
      marginTop: SPACING.sm,
    },
    roleBadgeText: { fontSize: TYPOGRAPHY.fontSize.xs, fontWeight: '800', color: '#0A0D16', letterSpacing: 1 },
    content: { padding: SPACING.base, paddingBottom: SPACING['5xl'] },
    sectionTitle: {
      fontSize: TYPOGRAPHY.fontSize.sm,
      fontWeight: '700',
      color: colors.midGray,
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginTop: SPACING.xl,
      marginBottom: SPACING.sm,
      paddingHorizontal: SPACING.xs,
    },
    card: {
      backgroundColor: colors.backgroundCard,
      borderRadius: BORDER_RADIUS.xl,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.lightGray,
      ...SHADOWS.sm,
    },
    divider: { height: 1, backgroundColor: colors.lightGray, marginLeft: 58 },
    modalOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: colors.overlayDark,
      justifyContent: 'flex-end',
    },
    modalSheet: {
      backgroundColor: colors.backgroundCard,
      borderTopLeftRadius: BORDER_RADIUS.xl,
      borderTopRightRadius: BORDER_RADIUS.xl,
      padding: SPACING['2xl'],
      paddingBottom: 40,
    },
    modalTitle: { fontSize: TYPOGRAPHY.fontSize.lg, fontWeight: '700', color: colors.charcoal, marginBottom: SPACING.xl },
    modalInput: {
      backgroundColor: colors.backgroundPrimary,
      borderWidth: 1.5,
      borderColor: colors.lightGray,
      borderRadius: BORDER_RADIUS.md,
      padding: SPACING.base,
      marginBottom: SPACING.md,
      fontSize: TYPOGRAPHY.fontSize.base,
      color: colors.charcoal,
    },
    modalActions: { flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.md },
    modalCancelBtn: {
      flex: 1,
      borderWidth: 1.5,
      borderColor: colors.lightGray,
      borderRadius: BORDER_RADIUS.md,
      paddingVertical: SPACING.md,
      alignItems: 'center',
    },
    modalCancelText: { color: colors.darkGray, fontWeight: '600' },
    modalSaveBtn: {
      flex: 1,
      backgroundColor: colors.accent,
      borderRadius: BORDER_RADIUS.md,
      paddingVertical: SPACING.md,
      alignItems: 'center',
    },
    modalSaveText: { color: '#0A0D16', fontWeight: '700' },
  });
