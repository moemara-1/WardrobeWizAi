import { Colors, Radius, Typography } from '@/constants/Colors';
import { Image } from 'expo-image';
import { Heart } from 'lucide-react-native';
import React, { memo } from 'react';
import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

interface PinCardProps {
  imageUrl: string;
  title: string;
  avatarUrl?: string;
  username: string;
  likes: number;
  height?: number;
  onPress?: () => void;
}

function PinCardComponent({
  imageUrl,
  title,
  avatarUrl,
  username,
  likes,
  height = 200,
  onPress,
}: PinCardProps) {
  return (
    <Pressable style={[styles.card, { width: CARD_WIDTH }]} onPress={onPress}>
      <Image
        source={{ uri: imageUrl }}
        style={[styles.image, { height }]}
        contentFit="cover"
      />
      <View style={styles.footer}>
        <View style={styles.userRow}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]} />
          )}
          <Text style={styles.username} numberOfLines={1}>
            {username}
          </Text>
        </View>
        <View style={styles.likesRow}>
          <Heart size={12} color={Colors.textSecondary} strokeWidth={2} />
          <Text style={styles.likesText}>{likes}</Text>
        </View>
      </View>
    </Pressable>
  );
}

export const PinCard = memo(PinCardComponent);

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.cardSurface,
    borderRadius: Radius.md,
    overflow: 'hidden',
    marginBottom: 12,
  },
  image: {
    width: '100%',
  },
  footer: {
    padding: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 6,
  },
  avatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  avatarPlaceholder: {
    backgroundColor: Colors.borderLight,
  },
  username: {
    fontFamily: Typography.bodyFamily,
    fontSize: 12,
    color: Colors.textSecondary,
    flex: 1,
  },
  likesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  likesText: {
    fontFamily: Typography.bodyFamily,
    fontSize: 11,
    color: Colors.textSecondary,
  },
});
