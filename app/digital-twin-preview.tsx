import { Colors, Radius, Typography } from '@/constants/Colors';
import { useClosetStore } from '@/stores/closetStore';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { router, type Href } from 'expo-router';
import { ArrowLeft, RefreshCw, Sparkles, User } from 'lucide-react-native';
import React from 'react';
import {
    Dimensions,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PREVIEW_WIDTH = (SCREEN_WIDTH - 48 - 12) / 2;

export default function DigitalTwinPreviewScreen() {
  const { digitalTwin } = useClosetStore();

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const handleGetStarted = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.push('/digital-twin' as Href);
  };

  const handleTryOn = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.push('/virtual-try-on' as Href);
  };

  // If twin exists, show the profile view
  if (digitalTwin) {
    return (
      <View style={styles.container}>
        <SafeAreaView edges={['top']} style={styles.headerBar}>
          <Pressable style={styles.backBtn} onPress={handleBack}>
            <ArrowLeft size={20} color={Colors.textPrimary} />
          </Pressable>
          <Text style={styles.headerTitle}>My Digital Twin</Text>
          <View style={styles.headerSpacer} />
        </SafeAreaView>

        <ScrollView contentContainerStyle={styles.twinScrollContent} showsVerticalScrollIndicator={false}>
          {/* Generated Twin Image */}
          <View style={styles.twinImageWrapper}>
            <Image source={{ uri: digitalTwin.twin_image_url }} style={styles.twinFullImage} contentFit="contain" />
          </View>

          {/* Selfie comparison + Color Badges */}
          <View style={styles.twinProfileRow}>
            <Image source={{ uri: digitalTwin.selfie_url }} style={styles.twinSelfie} contentFit="cover" />
            <View style={styles.twinMeta}>
              <View style={styles.colorBadgeRow}>
                <View style={[styles.colorDot, { backgroundColor: digitalTwin.skin_color }]} />
                <Text style={styles.colorBadgeLabel}>Skin</Text>
              </View>
              <View style={styles.colorBadgeRow}>
                <View style={[styles.colorDot, { backgroundColor: digitalTwin.hair_color }]} />
                <Text style={styles.colorBadgeLabel}>Hair</Text>
              </View>
              {digitalTwin.body_type && (
                <View style={styles.bodyBadge}>
                  <Text style={styles.bodyBadgeText}>{digitalTwin.body_type}</Text>
                </View>
              )}
            </View>
          </View>

          {/* AI Description */}
          <View style={styles.twinCard}>
            <View style={styles.twinCardHeader}>
              <Sparkles size={16} color={Colors.accentGreen} />
              <Text style={styles.twinCardTitle}>AI Profile</Text>
            </View>
            <Text style={styles.twinCardBody}>{digitalTwin.ai_description}</Text>
          </View>

          {/* Style Recommendations */}
          {digitalTwin.style_recommendations && (
            <View style={styles.twinCard}>
              <View style={styles.twinCardHeader}>
                <Sparkles size={16} color={Colors.accentBlue} />
                <Text style={styles.twinCardTitle}>Style Tips</Text>
              </View>
              <Text style={styles.twinCardBody}>{digitalTwin.style_recommendations}</Text>
            </View>
          )}
        </ScrollView>

        <SafeAreaView edges={['bottom']} style={styles.twinCtaWrapper}>
          <Pressable style={styles.tryOnCta} onPress={handleTryOn}>
            <User size={18} color="#FFF" />
            <Text style={styles.tryOnCtaText}>Virtual Try-On</Text>
          </Pressable>
          <Pressable style={styles.regenCta} onPress={handleGetStarted}>
            <RefreshCw size={16} color={Colors.textSecondary} />
            <Text style={styles.regenCtaText}>Regenerate</Text>
          </Pressable>
        </SafeAreaView>
      </View>
    );
  }

  // No twin yet — show onboarding CTA
  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.headerBar}>
        <Pressable style={styles.backBtn} onPress={handleBack}>
          <ArrowLeft size={20} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Digital Twin</Text>
        <View style={styles.headerSpacer} />
      </SafeAreaView>

      <View style={styles.content}>
        {/* Before/After Row */}
        <View style={styles.beforeAfterRow}>
          <View style={styles.previewCard}>
            <View style={styles.previewPlaceholder}>
              <Text style={styles.previewPlaceholderText}>Before</Text>
            </View>
            <Text style={styles.previewLabel}>Your Selfie</Text>
          </View>
          <View style={styles.previewCard}>
            <View style={[styles.previewPlaceholder, styles.previewPlaceholderAlt]}>
              <Text style={styles.previewPlaceholderText}>After</Text>
            </View>
            <Text style={styles.previewLabel}>Digital Twin</Text>
          </View>
        </View>

        {/* Heading */}
        <Text style={styles.heading}>
          Create Your Digital Twin{'\n'}& Try-On Fits
        </Text>
        <Text style={styles.subheading}>
          See how outfits look on you before buying or wearing them
        </Text>

        {/* Preview Images */}
        <View style={styles.previewRow}>
          <View style={[styles.demoCard, { backgroundColor: '#1E3A2F' }]}>
            <Text style={styles.demoText}>Outfit Preview 1</Text>
          </View>
          <View style={[styles.demoCard, { backgroundColor: '#2A1E3A' }]}>
            <Text style={styles.demoText}>Outfit Preview 2</Text>
          </View>
        </View>
      </View>

      {/* CTA */}
      <SafeAreaView edges={['bottom']} style={styles.ctaWrapper}>
        <Pressable style={styles.ctaBtn} onPress={handleGetStarted}>
          <Text style={styles.ctaText}>Get Started</Text>
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
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  backBtn: {
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
    flex: 1,
    fontFamily: Typography.bodyFamilyBold,
    fontSize: 18,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 24,
    gap: 24,
  },
  beforeAfterRow: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
  },
  previewCard: {
    alignItems: 'center',
    gap: 8,
  },
  previewPlaceholder: {
    width: PREVIEW_WIDTH,
    height: PREVIEW_WIDTH * 1.2,
    borderRadius: Radius.lg,
    backgroundColor: Colors.cardSurface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewPlaceholderAlt: {
    borderColor: Colors.accentGreen,
    borderWidth: 2,
  },
  previewPlaceholderText: {
    fontFamily: Typography.bodyFamilyMedium,
    fontSize: 14,
    color: Colors.textTertiary,
  },
  previewLabel: {
    fontFamily: Typography.bodyFamilyMedium,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  heading: {
    fontFamily: Typography.serifFamilyBold,
    fontSize: 24,
    color: Colors.textPrimary,
    textAlign: 'center',
    lineHeight: 32,
  },
  subheading: {
    fontFamily: Typography.bodyFamily,
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: -8,
  },
  previewRow: {
    flexDirection: 'row',
    gap: 12,
  },
  demoCard: {
    flex: 1,
    height: 140,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  demoText: {
    fontFamily: Typography.bodyFamily,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  ctaWrapper: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
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

  /* ─── Twin Profile Styles ─── */
  twinScrollContent: { padding: 16, paddingBottom: 140 },
  twinImageWrapper: { alignItems: 'center', marginBottom: 20, backgroundColor: Colors.cardSurface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  twinFullImage: { width: '100%', height: 420 },
  twinProfileRow: { flexDirection: 'row', gap: 16, marginBottom: 20 },
  twinSelfie: { width: 64, height: 64, borderRadius: 32, borderWidth: 2, borderColor: Colors.accentGreen },
  twinMeta: { justifyContent: 'center', gap: 8, flex: 1 },
  colorBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  colorDot: { width: 20, height: 20, borderRadius: 10, borderWidth: 1, borderColor: Colors.border },
  colorBadgeLabel: { fontFamily: Typography.bodyFamilyMedium, fontSize: 13, color: Colors.textSecondary },
  bodyBadge: { backgroundColor: Colors.cardSurfaceAlt, borderRadius: Radius.pill, paddingHorizontal: 12, paddingVertical: 4, alignSelf: 'flex-start', borderWidth: 1, borderColor: Colors.border },
  bodyBadgeText: { fontFamily: Typography.bodyFamilyMedium, fontSize: 12, color: Colors.textPrimary, textTransform: 'capitalize' },
  twinCard: { backgroundColor: Colors.cardSurface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, padding: 16, gap: 8, marginBottom: 12 },
  twinCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  twinCardTitle: { fontFamily: Typography.bodyFamilyBold, fontSize: 15, color: Colors.textPrimary },
  twinCardBody: { fontFamily: Typography.bodyFamily, fontSize: 14, color: Colors.textSecondary, lineHeight: 20 },
  twinCtaWrapper: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, backgroundColor: Colors.background, gap: 8 },
  tryOnCta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.accentGreen, borderRadius: Radius.pill, paddingVertical: 16 },
  tryOnCtaText: { fontFamily: Typography.bodyFamilyBold, fontSize: 16, color: '#FFF' },
  regenCta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10 },
  regenCtaText: { fontFamily: Typography.bodyFamilyMedium, fontSize: 14, color: Colors.textSecondary },
});
