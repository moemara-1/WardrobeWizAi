import React from 'react';
import {
  View,
  Text,
  Pressable,
  Image,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { ArrowLeft } from 'lucide-react-native';
import { Colors, Radius, Typography } from '@/constants/Colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PREVIEW_WIDTH = (SCREEN_WIDTH - 48 - 12) / 2;

export default function DigitalTwinPreviewScreen() {
  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const handleGetStarted = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.push('/digital-twin' as never);
  };

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
});
