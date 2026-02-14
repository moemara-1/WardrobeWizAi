import { Radius, Typography } from '@/constants/Colors';
import { useThemeColors } from '@/contexts/ThemeContext';
import { useSocialStore, PostComment } from '@/stores/socialStore';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  Heart,
  MessageCircle,
  Send,
  Shirt,
  User,
} from 'lucide-react-native';
import React, { useCallback, useMemo, useState } from 'react';
import {
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function PostDetailScreen() {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const posts = useSocialStore((s) => s.posts);
  const likePost = useSocialStore((s) => s.likePost);
  const addComment = useSocialStore((s) => s.addComment);

  const post = useMemo(() => posts.find((p) => p.id === id), [posts, id]);
  const [commentText, setCommentText] = useState('');

  const handleLike = useCallback(() => {
    if (!post) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    likePost(post.id);
  }, [post, likePost]);

  const handleSendComment = useCallback(() => {
    if (!post || !commentText.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const comment: PostComment = {
      id: `comment-${Date.now()}`,
      userId: 'me',
      username: 'You',
      avatarUrl: null,
      text: commentText.trim(),
      createdAt: new Date().toISOString(),
    };
    addComment(post.id, comment);
    setCommentText('');
  }, [post, commentText, addComment]);

  if (!post) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Post not found</Text>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.backText}>Go back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const timeAgo = getTimeAgo(post.createdAt);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            style={styles.backBtn}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }}
          >
            <ArrowLeft size={20} color={Colors.textPrimary} />
          </Pressable>
          <Text style={styles.headerTitle}>Post</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Poster info */}
          <View style={styles.posterRow}>
            {post.avatarUrl ? (
              <Image source={{ uri: post.avatarUrl }} style={styles.avatar} contentFit="cover" />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <User size={18} color={Colors.textTertiary} />
              </View>
            )}
            <View style={styles.posterInfo}>
              <Text style={styles.posterName}>{post.username}</Text>
              <Text style={styles.posterTime}>{timeAgo}</Text>
            </View>
          </View>

          {/* Post image */}
          <Image
            source={{ uri: post.imageUrl }}
            style={styles.postImage}
            contentFit="cover"
          />

          {/* Actions */}
          <View style={styles.actionsRow}>
            <Pressable style={styles.actionBtn} onPress={handleLike}>
              <Heart
                size={22}
                color={post.liked ? '#E85A4F' : Colors.textPrimary}
                fill={post.liked ? '#E85A4F' : 'transparent'}
              />
              <Text style={[styles.actionText, post.liked && { color: '#E85A4F' }]}>
                {post.likes}
              </Text>
            </Pressable>
            <View style={styles.actionBtn}>
              <MessageCircle size={22} color={Colors.textPrimary} />
              <Text style={styles.actionText}>{post.comments.length}</Text>
            </View>
          </View>

          {/* Caption */}
          {post.caption ? (
            <View style={styles.captionRow}>
              <Text style={styles.captionUser}>{post.username}</Text>
              <Text style={styles.captionText}> {post.caption}</Text>
            </View>
          ) : null}

          {/* Clothing pieces in this post */}
          {post.clothingPieces.length > 0 && (
            <View style={styles.piecesSection}>
              <View style={styles.piecesSectionHeader}>
                <Shirt size={16} color={Colors.textSecondary} />
                <Text style={styles.piecesSectionTitle}>Clothing in this outfit</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.piecesScroll}>
                {post.clothingPieces.map((piece, idx) => (
                  <View key={idx} style={styles.pieceEmblem}>
                    {piece.imageUrl ? (
                      <Image source={{ uri: piece.imageUrl }} style={styles.pieceEmblemImage} contentFit="contain" />
                    ) : (
                      <View style={styles.pieceEmblemPlaceholder}>
                        <Shirt size={16} color={Colors.textTertiary} />
                      </View>
                    )}
                    <Text style={styles.pieceEmblemName} numberOfLines={1}>{piece.name}</Text>
                    <Text style={styles.pieceEmblemBrand} numberOfLines={1}>{piece.brand || piece.category}</Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Comments */}
          <View style={styles.commentsSection}>
            <Text style={styles.commentsSectionTitle}>
              Comments ({post.comments.length})
            </Text>
            {post.comments.map((comment) => (
              <View key={comment.id} style={styles.commentRow}>
                {comment.avatarUrl ? (
                  <Image source={{ uri: comment.avatarUrl }} style={styles.commentAvatar} />
                ) : (
                  <View style={styles.commentAvatarPlaceholder}>
                    <User size={12} color={Colors.textTertiary} />
                  </View>
                )}
                <View style={styles.commentContent}>
                  <Text style={styles.commentUser}>{comment.username}</Text>
                  <Text style={styles.commentText}>{comment.text}</Text>
                  <Text style={styles.commentTime}>{getTimeAgo(comment.createdAt)}</Text>
                </View>
              </View>
            ))}
            {post.comments.length === 0 && (
              <Text style={styles.noComments}>No comments yet</Text>
            )}
          </View>

          <View style={{ height: 80 }} />
        </ScrollView>

        {/* Comment input */}
        <View style={styles.commentInputBar}>
          <TextInput
            style={styles.commentInput}
            placeholder="Add a comment..."
            placeholderTextColor={Colors.textTertiary}
            value={commentText}
            onChangeText={setCommentText}
            multiline
          />
          <Pressable
            style={[styles.sendBtn, !commentText.trim() && styles.sendBtnDisabled]}
            onPress={handleSendComment}
            disabled={!commentText.trim()}
          >
            <Send size={18} color={commentText.trim() ? Colors.accentGreen : Colors.textTertiary} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

function createStyles(C: ReturnType<typeof import('@/contexts/ThemeContext').useThemeColors>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.background },
    errorContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
    errorText: { fontFamily: Typography.bodyFamily, fontSize: 16, color: C.textSecondary },
    backText: { fontFamily: Typography.bodyFamilyMedium, fontSize: 14, color: C.accentGreen },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12 },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.cardSurfaceAlt, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { flex: 1, fontFamily: Typography.bodyFamilyBold, fontSize: 18, color: C.textPrimary, textAlign: 'center' },
    headerSpacer: { width: 40 },
    scroll: { flex: 1 },
    posterRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingBottom: 12 },
    avatar: { width: 40, height: 40, borderRadius: 20 },
    avatarPlaceholder: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.cardSurfaceAlt, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border },
    posterInfo: { gap: 2 },
    posterName: { fontFamily: Typography.bodyFamilyBold, fontSize: 15, color: C.textPrimary },
    posterTime: { fontFamily: Typography.bodyFamily, fontSize: 12, color: C.textTertiary },
    postImage: { width: SCREEN_WIDTH, height: SCREEN_WIDTH, backgroundColor: C.cardSurfaceAlt },
    actionsRow: { flexDirection: 'row', gap: 20, paddingHorizontal: 16, paddingVertical: 12 },
    actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    actionText: { fontFamily: Typography.bodyFamilyMedium, fontSize: 14, color: C.textPrimary },
    captionRow: { flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 12, flexWrap: 'wrap' },
    captionUser: { fontFamily: Typography.bodyFamilyBold, fontSize: 14, color: C.textPrimary },
    captionText: { fontFamily: Typography.bodyFamily, fontSize: 14, color: C.textPrimary },
    piecesSection: { marginHorizontal: 16, marginBottom: 16, backgroundColor: C.cardSurface, borderRadius: Radius.lg, padding: 14, borderWidth: 1, borderColor: C.border, gap: 10 },
    piecesSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    piecesSectionTitle: { fontFamily: Typography.bodyFamilyBold, fontSize: 14, color: C.textPrimary },
    piecesScroll: { gap: 12, paddingVertical: 4 },
    pieceEmblem: { width: 72, alignItems: 'center', gap: 4 },
    pieceEmblemImage: { width: 56, height: 56, borderRadius: 12, backgroundColor: '#FFFFFF' },
    pieceEmblemPlaceholder: { width: 56, height: 56, borderRadius: 12, backgroundColor: C.cardSurfaceAlt, alignItems: 'center', justifyContent: 'center' },
    pieceEmblemName: { fontFamily: Typography.bodyFamilyMedium, fontSize: 11, color: C.textPrimary, textAlign: 'center' },
    pieceEmblemBrand: { fontFamily: Typography.bodyFamily, fontSize: 10, color: C.textTertiary, textAlign: 'center', textTransform: 'capitalize' },
    commentsSection: { paddingHorizontal: 16, gap: 12 },
    commentsSectionTitle: { fontFamily: Typography.bodyFamilyBold, fontSize: 14, color: C.textPrimary },
    commentRow: { flexDirection: 'row', gap: 10 },
    commentAvatar: { width: 28, height: 28, borderRadius: 14 },
    commentAvatarPlaceholder: { width: 28, height: 28, borderRadius: 14, backgroundColor: C.cardSurfaceAlt, alignItems: 'center', justifyContent: 'center' },
    commentContent: { flex: 1, gap: 2 },
    commentUser: { fontFamily: Typography.bodyFamilyBold, fontSize: 13, color: C.textPrimary },
    commentText: { fontFamily: Typography.bodyFamily, fontSize: 13, color: C.textPrimary, lineHeight: 18 },
    commentTime: { fontFamily: Typography.bodyFamily, fontSize: 11, color: C.textTertiary },
    noComments: { fontFamily: Typography.bodyFamily, fontSize: 13, color: C.textTertiary, textAlign: 'center', paddingVertical: 16 },
    commentInputBar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 1, borderTopColor: C.border, backgroundColor: C.background },
    commentInput: { flex: 1, fontFamily: Typography.bodyFamily, fontSize: 14, color: C.textPrimary, backgroundColor: C.cardSurfaceAlt, borderRadius: Radius.pill, paddingHorizontal: 16, paddingVertical: 10, maxHeight: 80 },
    sendBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    sendBtnDisabled: { opacity: 0.5 },
  });
}
