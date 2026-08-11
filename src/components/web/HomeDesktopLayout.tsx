// =============================================================================
// TOO HUMBLE - HOME DESKTOP LAYOUT
// Purpose-built 3-panel dashboard composition for the home screen.
// Takes all state from HomeScreen as props — no data fetching here.
// Layout:  GreetingBanner (full-width)
//          CalendarWidget (full-width)
//          ┌────────────────────────────┬──────────────────────┐
//          │  VerseWidget (hero)        │  PrayerWidget        │
//          │  Section header            │  ReadingProgressWidget│
//          │  WebFeedSection (2-col)    │  SupportWidget       │
//          └────────────────────────────┴──────────────────────┘
// =============================================================================

import React, { useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { useTranslation } from '../../context/LanguageContext';
import { WEB_GRID } from '../../constants/webLayout';
import { TYPOGRAPHY, SPACING, BORDER_RADIUS } from '../../constants/theme';
import { HomeFeedPost } from '../../types/database.types';

import GreetingBanner from '../widgets/GreetingBanner';
import CalendarWidget, { CalendarDay } from '../widgets/CalendarWidget';
import VerseWidget from '../widgets/VerseWidget';
import PrayerWidget from '../widgets/PrayerWidget';
import ReadingProgressWidget from '../widgets/ReadingProgressWidget';
import SupportWidget from '../widgets/SupportWidget';
import WebFeedSection from '../widgets/WebFeedSection';
import OfflineBanner from '../OfflineBanner';
import ContextPanel from './ContextPanel';

// -----------------------------------------------------------------------
// Props
// -----------------------------------------------------------------------
export interface HomeDesktopLayoutProps {
  // User identity
  userName: string;
  avatarUrl: string | null;

  // Calendar
  calendarDays: CalendarDay[];
  selectedDayIndex: number;
  todayIndex: number;
  onSelectDay: (index: number) => void;

  // Feed
  posts: HomeFeedPost[];
  reactedPosts: Set<string>;
  savedPosts: Set<string>;
  onReact: (id: string) => void;
  onSave: (id: string) => void;
  onLoadMore: () => void;
  hasMore: boolean;
  isLoading: boolean;
  hasError: boolean;
  onRetry: () => void;
  isRefreshing: boolean;
  onRefresh: () => void;

  // State
  isOffline: boolean;
  isWide: boolean;  // true → show right context panel
}

// -----------------------------------------------------------------------
// Section header
// -----------------------------------------------------------------------
function SectionHeader({
  title,
  subtitle,
  colors,
}: {
  title: string;
  subtitle: string;
  colors: any;
}): React.JSX.Element {
  return (
    <View style={sectionHeaderStyles.row}>
      <Text style={[sectionHeaderStyles.title, { color: colors.charcoal }]}>{title}</Text>
      <Text style={[sectionHeaderStyles.subtitle, { color: colors.midGray }]}>{subtitle}</Text>
    </View>
  );
}

const sectionHeaderStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
    marginBottom: SPACING.sm,
  },
  title: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
  },
});

// -----------------------------------------------------------------------
// Feed state: loader / error / empty / content
// -----------------------------------------------------------------------
function FeedStateView({
  isLoading,
  hasError,
  isEmpty,
  onRetry,
  colors,
  t,
}: {
  isLoading: boolean;
  hasError: boolean;
  isEmpty: boolean;
  onRetry: () => void;
  colors: any;
  t: (k: string) => string;
}): React.JSX.Element | null {
  if (isLoading) {
    return (
      <View style={feedStateStyles.centered}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={[feedStateStyles.message, { color: colors.midGray }]}>{t('loading.feed')}</Text>
      </View>
    );
  }
  if (hasError) {
    return (
      <View style={feedStateStyles.centered}>
        <Ionicons name="warning-outline" size={40} color={colors.error} style={{ marginBottom: 12 }} />
        <Text style={[feedStateStyles.message, { color: colors.darkGray }]}>{t('error.load')}</Text>
        <TouchableOpacity
          style={[feedStateStyles.retryBtn, { backgroundColor: colors.accent }]}
          onPress={onRetry}
        >
          <Text style={feedStateStyles.retryText}>{t('retry')}</Text>
        </TouchableOpacity>
      </View>
    );
  }
  if (isEmpty) {
    return (
      <View style={feedStateStyles.centered}>
        <View style={[feedStateStyles.emptyIcon, { backgroundColor: colors.backgroundCard, borderColor: colors.lightGray }]}>
          <Ionicons name="newspaper-outline" size={40} color={colors.accent} />
        </View>
        <Text style={[feedStateStyles.emptyTitle, { color: colors.charcoal }]}>{t('home.empty.title')}</Text>
        <Text style={[feedStateStyles.emptySubtext, { color: colors.midGray }]}>{t('home.empty.subtitle')}</Text>
      </View>
    );
  }
  return null;
}

const feedStateStyles = StyleSheet.create({
  centered: {
    alignItems: 'center',
    paddingVertical: SPACING['4xl'],
    paddingHorizontal: SPACING['2xl'],
  },
  message: {
    marginTop: SPACING.md,
    fontSize: TYPOGRAPHY.fontSize.sm,
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: SPACING.md,
    paddingHorizontal: SPACING['2xl'],
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.full,
  },
  retryText: {
    color: '#0A0D16',
    fontWeight: '700',
    fontSize: TYPOGRAPHY.fontSize.sm,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  emptyTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: '700',
    marginBottom: SPACING.xs,
  },
  emptySubtext: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    textAlign: 'center',
    lineHeight: 22,
  },
});

// -----------------------------------------------------------------------
// Main layout
// -----------------------------------------------------------------------
export default function HomeDesktopLayout({
  userName,
  avatarUrl,
  calendarDays,
  selectedDayIndex,
  todayIndex,
  onSelectDay,
  posts,
  reactedPosts,
  savedPosts,
  onReact,
  onSave,
  onLoadMore,
  hasMore,
  isLoading,
  hasError,
  onRetry,
  isRefreshing,
  onRefresh,
  isOffline,
  isWide,
}: HomeDesktopLayoutProps): React.JSX.Element {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();

  const selectedDay = calendarDays[selectedDayIndex];
  const feedDateLabel = selectedDay ? `${selectedDay.month} ${selectedDay.dayNum}` : '';

  const mainContent = (
    <ScrollView
      showsVerticalScrollIndicator={false}
      style={styles.mainScroll}
      // Pull-to-refresh is mouse-unfriendly on desktop; omit RefreshControl here
    >
      <OfflineBanner visible={isOffline} />

      {/* Greeting */}
      <GreetingBanner
        userName={userName}
        avatarUrl={avatarUrl}
        onNotifications={() => router.push('/(tabs)/notifications')}
      />

      {/* Calendar */}
      <CalendarWidget
        days={calendarDays}
        selectedIndex={selectedDayIndex}
        todayIndex={todayIndex}
        onSelectDay={onSelectDay}
      />

      {/* Verse hero */}
      <View style={[styles.section, { paddingHorizontal: WEB_GRID.CONTENT_PADDING }]}>
        <VerseWidget />
      </View>

      {/* Feed section */}
      <View style={[styles.section, { paddingHorizontal: WEB_GRID.CONTENT_PADDING }]}>
        <SectionHeader
          title={t('home.title')}
          subtitle={feedDateLabel}
          colors={colors}
        />

        {isLoading || hasError || posts.length === 0 ? (
          <FeedStateView
            isLoading={isLoading}
            hasError={hasError}
            isEmpty={!isLoading && !hasError && posts.length === 0}
            onRetry={onRetry}
            colors={colors}
            t={t}
          />
        ) : (
          <WebFeedSection
            posts={posts}
            reactedPosts={reactedPosts}
            savedPosts={savedPosts}
            onReact={onReact}
            onSave={onSave}
            onLoadMore={onLoadMore}
            hasMore={hasMore}
            isLoading={isLoading}
            singleColumn={!isWide}
          />
        )}
      </View>
    </ScrollView>
  );

  if (isWide) {
    return (
      <View style={styles.root}>
        {/* Main pane (65%) */}
        <View style={styles.mainPane}>
          {mainContent}
        </View>

        {/* Context panel (35%) */}
        <ContextPanel>
          <PrayerWidget />
          <ReadingProgressWidget />
          <SupportWidget />
        </ContextPanel>
      </View>
    );
  }

  // Medium width: single main pane, no context panel
  return (
    <View style={styles.root}>
      <View style={styles.mainPaneFull}>
        {mainContent}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'row',
  },
  mainPane: {
    flex: 1,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    overflow: 'hidden' as any,
  },
  mainPaneFull: {
    flex: 1,
  },
  mainScroll: {
    flex: 1,
  },
  section: {
    marginVertical: SPACING.md,
  },
});
