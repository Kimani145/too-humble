// =============================================================================
// TOO HUMBLE - WEB FEED SECTION
// Web-only desktop 2-column grid layout for home feed posts
// =============================================================================

import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Share,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../context/ThemeContext';
import { useTranslation } from '../../context/LanguageContext';
import { HomeFeedPost } from '../../types/database.types';

interface WebFeedSectionProps {
  posts: HomeFeedPost[];
  reactedPosts: Set<string>;
  savedPosts: Set<string>;
  onReact: (id: string) => void;
  onSave: (id: string) => void;
  onLoadMore: () => void;
  hasMore: boolean;
  isLoading: boolean;
  singleColumn?: boolean;
}

interface WebPostCardProps {
  item: HomeFeedPost;
  hasReacted: boolean;
  hasSaved: boolean;
  onReact: (id: string) => void;
  onSave: (id: string) => void;
  singleColumn?: boolean;
}

function WebPostCard({
  item,
  hasReacted,
  hasSaved,
  onReact,
  onSave,
  singleColumn,
}: WebPostCardProps): React.JSX.Element {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const isVideo = item.content_type === 'video';

  const handleShare = useCallback(async () => {
    try {
      await Share.share({
        message: `${item.title}\n\n${item.body_text ?? ''}\n— ${item.author_reference}\n\nShared via Too Humble 🙏`,
        title: item.title,
      });
    } catch {
      // Dismissed
    }
  }, [item]);

  // web-only CSS — calc() not available in RN StyleSheet
  const cardResponsiveStyle = {
    width: singleColumn ? '100%' : 'calc(50% - 8px)',
  } as any;

  return (
    <View
      style={[
        styles.postCard,
        cardResponsiveStyle,
        {
          backgroundColor: colors.backgroundCard,
          borderColor: colors.border,
        },
      ]}
    >
      {/* Header Badge */}
      <View style={styles.cardHeader}>
        <LinearGradient
          colors={[colors.primary, colors.primaryLight]}
          style={styles.contentTypeBadge}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <Text style={styles.contentTypeText}>
            {item.content_type === 'quote' ? '💬' :
             item.content_type === 'video' ? '▶️' : '📖'}{' '}
            {item.content_type.charAt(0).toUpperCase() + item.content_type.slice(1)}
          </Text>
        </LinearGradient>
      </View>

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
                <Ionicons name="play" size={32} color="#FFFFFF" />
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
        <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>{item.title}</Text>
        {item.body_text ? (
          <Text style={[styles.cardBodyText, { color: colors.textSecondary }]} numberOfLines={3}>
            {item.body_text}
          </Text>
        ) : null}
        <Text style={[styles.cardAuthor, { color: colors.accent }]}>— {item.author_reference}</Text>
      </View>

      {/* Actions */}
      <View style={[styles.cardActions, { borderTopColor: colors.border }]}>
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
          <Text style={[styles.actionText, { color: colors.darkGray }, hasReacted ? styles.actionTextActive : null]}>
            {item.reaction_count}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionBtn}
          onPress={handleShare}
          activeOpacity={0.75}
        >
          <Ionicons name="share-social-outline" size={18} color={colors.darkGray} />
          <Text style={[styles.actionText, { color: colors.darkGray }]}>{t('share')}</Text>
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
          <Text style={[styles.actionText, { color: colors.darkGray }, hasSaved ? styles.actionTextSaved : null]}>
            {hasSaved ? t('saved') : t('save')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function WebFeedSection({
  posts,
  reactedPosts,
  savedPosts,
  onReact,
  onSave,
  onLoadMore,
  hasMore,
  isLoading,
  singleColumn,
}: WebFeedSectionProps): React.JSX.Element {
  const { colors } = useTheme();

  return (
    <View style={styles.sectionContainer}>
      <View style={styles.gridContainer}>
        {posts.map((post) => (
          <WebPostCard
            key={post.id}
            item={post}
            hasReacted={reactedPosts.has(post.id)}
            hasSaved={savedPosts.has(post.id)}
            onReact={onReact}
            onSave={onSave}
            singleColumn={singleColumn}
          />
        ))}
      </View>

      {/* Footer / Load More */}
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="small" color={colors.accent} />
        </View>
      ) : hasMore ? (
        <TouchableOpacity
          onPress={onLoadMore}
          activeOpacity={0.75}
          style={[
            styles.loadMoreBtn,
            {
              backgroundColor: colors.accent,
            },
          ]}
        >
          <Text style={styles.loadMoreText}>Load More</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionContainer: {
    width: '100%',
    paddingBottom: 40,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    width: '100%',
  },
  postCard: {
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  contentTypeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  contentTypeText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  cardMediaContainer: {
    width: '100%',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 12,
  },
  videoThumbnail: {
    position: 'relative',
    width: '100%',
  },
  mediaImage: {
    width: '100%',
    height: 180,
  },
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
  cardBody: {
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  cardBodyText: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 8,
  },
  cardAuthor: {
    fontSize: 13,
    fontWeight: '700',
  },
  cardActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: 12,
    justifyContent: 'space-between',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 9999,
  },
  actionBtnActive: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  actionTextActive: {
    color: '#EF4444',
  },
  actionBtnSaved: {
    backgroundColor: 'rgba(240, 165, 0, 0.08)',
  },
  actionTextSaved: {
    color: '#FFB347',
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  loadMoreBtn: {
    alignSelf: 'center',
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 9999,
  },
  loadMoreText: {
    color: '#0A0D16',
    fontWeight: '700',
    fontSize: 14,
  },
});
