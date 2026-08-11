import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { BUNDLED_TRANSLATIONS } from '../constants/bibleTranslations';

interface BibleOfflineStateProps {
  cachedChapters: Array<{
    translationId: string;
    bookId:        string;
    chapter:       number;
    bookName:      string;
  }>;
  onSelectCached: (bookId: string, chapter: number, translationId: string) => void;
}

export default function BibleOfflineState({
  cachedChapters,
  onSelectCached,
}: BibleOfflineStateProps): React.JSX.Element {
  const { colors } = useTheme();

  const getTranslationLabel = (id: string) => {
    const found = BUNDLED_TRANSLATIONS.find((t) => t.id === id);
    return found ? found.label : id;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.backgroundPrimary }]}>
      {/* Top icon area */}
      <View style={styles.iconContainer}>
        <Text style={styles.iconText}>📖</Text>
        <View style={[styles.offlineBadge, { backgroundColor: colors.midGray || '#8E8E93' }]}>
          <Text style={styles.offlineText}>OFFLINE</Text>
        </View>
      </View>

      {/* Heading */}
      <Text style={[styles.heading, { color: colors.textPrimary }]}>You're offline</Text>

      {cachedChapters.length === 0 ? (
        <Text style={[styles.subtext, { color: colors.textMuted }]}>
          {"Connect to the internet to start reading.\nOnce you read chapters online,\nthey're saved here automatically."}
        </Text>
      ) : (
        <View style={styles.listContainer}>
          <Text style={[styles.subtextLabel, { color: colors.textMuted }]}>
            Here's what you can read right now:
          </Text>

          <FlatList
            data={cachedChapters}
            keyExtractor={(item) => `${item.translationId}_${item.bookId}_${item.chapter}`}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => onSelectCached(item.bookId, item.chapter, item.translationId)}
                style={[
                  styles.row,
                  {
                    backgroundColor: colors.backgroundCard,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text style={[styles.rowLeft, { color: colors.textPrimary }]}>
                  {item.bookName} {item.chapter}
                </Text>
                <Text style={[styles.rowRight, { color: colors.textMuted }]}>
                  {getTranslationLabel(item.translationId)}
                </Text>
              </TouchableOpacity>
            )}
            contentContainerStyle={styles.listContent}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 32,
    paddingTop: 48,
    alignItems: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  iconText: {
    fontSize: 56,
  },
  offlineBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 8,
  },
  offlineText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  heading: {
    fontSize: 22,
    fontWeight: '700',
    marginTop: 20,
    textAlign: 'center',
  },
  subtext: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 24,
    marginTop: 12,
  },
  listContainer: {
    flex: 1,
    width: '100%',
    marginTop: 12,
  },
  subtextLabel: {
    fontSize: 14,
    marginBottom: 20,
    textAlign: 'center',
  },
  listContent: {
    paddingBottom: 24,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
  },
  rowLeft: {
    fontSize: 15,
    fontWeight: '600',
  },
  rowRight: {
    fontSize: 12,
  },
});
