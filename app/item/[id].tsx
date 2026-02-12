import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { Bookmark, Share2, Sparkles, X } from 'lucide-react-native';
import { Colors, Radius, Typography } from '@/constants/Colors';
import { useClosetStore } from '@/stores/closetStore';

interface MetadataRow {
  label: string;
  value: string;
  badge?: boolean;
}

export default function ItemDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { items } = useClosetStore();

  const item = items.find((i) => i.id === id);

  if (!item) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>Item not found</Text>
          <Pressable style={styles.backLink} onPress={() => router.back()}>
            <Text style={styles.backLinkText}>Go back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const handleShare = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleBookmark = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleCreateFit = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/(tabs)/stylist' as Href);
  };

  const handleTryOn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/virtual-try-on' as Href);
  };

  const metadata: MetadataRow[] = [
    { label: 'Fitted Value', value: item.estimated_value ? `$${item.estimated_value}` : '$—' },
    { label: 'Brand', value: item.brand || 'Unknown' },
    { label: 'Type', value: item.category },
    { label: 'Size', value: item.size || '—' },
    { label: 'Garment Type', value: item.garment_type || '—' },
    { label: 'Layer Type', value: item.layer_type || '—', badge: !!item.layer_type },
  ];

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <SafeAreaView edges={['top']} style={styles.headerBar}>
          <Pressable style={styles.headerBtn} onPress={handleBack}>
            <X size={20} color={Colors.textPrimary} />
          </Pressable>
          <Text style={styles.headerTitle} numberOfLines={1}>{item.name}</Text>
          <View style={styles.headerRight}>
            <Pressable style={styles.headerBtn} onPress={handleShare}>
              <Share2 size={18} color={Colors.textPrimary} />
            </Pressable>
            <Pressable style={styles.headerBtn} onPress={handleBookmark}>
              <Bookmark size={18} color={Colors.textPrimary} />
            </Pressable>
          </View>
        </SafeAreaView>

        {/* Product Image */}
        <View style={styles.imageArea}>
          <Image
            source={{ uri: item.clean_image_url || item.image_url }}
            style={styles.productImage}
            contentFit="contain"
          />
        </View>

        {/* Action Row */}
        <View style={styles.actionRow}>
          <Pressable style={styles.createFitBtn} onPress={handleCreateFit}>
            <Sparkles size={16} color={Colors.background} />
            <Text style={styles.createFitText}>Create Fit</Text>
          </Pressable>
          <Pressable onPress={handleCreateFit}>
            <Text style={styles.enhanceText}>Enhance</Text>
          </Pressable>
        </View>

        {/* Metadata */}
        <View style={styles.metadataSection}>
          {metadata.map((row) => (
            <View key={row.label} style={styles.metadataRow}>
              <Text style={styles.metadataLabel}>{row.label}</Text>
              {row.badge ? (
                <View style={styles.badgePill}>
                  <Text style={styles.badgeText}>{row.value}</Text>
                </View>
              ) : (
                <Text style={styles.metadataValue}>{row.value}</Text>
              )}
            </View>
          ))}
        </View>
      </ScrollView>

      {/* CTA */}
      <SafeAreaView edges={['bottom']} style={styles.ctaWrapper}>
        <Pressable style={styles.ctaBtn} onPress={handleTryOn}>
          <Text style={styles.ctaText}>Try on Piece</Text>
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.cardSurfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  headerTitle: {
    fontFamily: Typography.bodyFamilyBold,
    fontSize: 16,
    color: Colors.textPrimary,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  headerRight: {
    flexDirection: 'row',
    gap: 8,
  },
  imageArea: {
    marginHorizontal: 16,
    marginTop: 8,
    height: 360,
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  productImage: {
    width: '80%',
    height: '80%',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 16,
  },
  createFitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.accentGreen,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: Radius.pill,
  },
  createFitText: {
    fontFamily: Typography.bodyFamilyBold,
    fontSize: 14,
    color: Colors.background,
  },
  enhanceText: {
    fontFamily: Typography.bodyFamilyMedium,
    fontSize: 14,
    color: Colors.accentGreen,
  },
  metadataSection: {
    marginTop: 20,
    marginHorizontal: 16,
  },
  metadataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  metadataLabel: {
    fontFamily: Typography.bodyFamily,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  metadataValue: {
    fontFamily: Typography.bodyFamilyMedium,
    fontSize: 14,
    color: Colors.textPrimary,
    textTransform: 'capitalize',
  },
  badgePill: {
    backgroundColor: Colors.cardSurfaceAlt,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  badgeText: {
    fontFamily: Typography.bodyFamilyMedium,
    fontSize: 12,
    color: Colors.textPrimary,
    textTransform: 'capitalize',
  },
  ctaWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: Colors.background,
  },
  ctaBtn: {
    backgroundColor: Colors.accentGreen,
    borderRadius: Radius.pill,
    paddingVertical: 16,
    alignItems: 'center',
  },
  ctaText: {
    fontFamily: Typography.bodyFamilyBold,
    fontSize: 16,
    color: Colors.background,
  },
  notFound: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  notFoundText: {
    fontFamily: Typography.bodyFamily,
    fontSize: 16,
    color: Colors.textSecondary,
  },
  backLink: {
    padding: 12,
  },
  backLinkText: {
    fontFamily: Typography.bodyFamilyMedium,
    fontSize: 14,
    color: Colors.accentGreen,
  },
});
