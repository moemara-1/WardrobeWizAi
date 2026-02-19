import { Radius, Typography } from '@/constants/Colors';
import { useThemeColors } from '@/contexts/ThemeContext';
import { useClosetStore } from '@/stores/closetStore';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import * as MediaLibrary from 'expo-media-library';
import { router, type Href } from 'expo-router';
import { ArrowLeft, Download, RefreshCw, Sparkles, Trash2, User } from 'lucide-react-native';
import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Dimensions,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PREVIEW_WIDTH = (SCREEN_WIDTH - 48 - 12) / 2;
const FIT_CARD_SIZE = 140;

export default function DigitalTwinPreviewScreen() {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const { digitalTwin, savedFits, generatedLooks, deleteSavedFit, deleteGeneratedLook } = useClosetStore();
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [showGallery, setShowGallery] = useState(false);

  const allLooks = useMemo(() => {
    const fromSaved = savedFits.map(f => ({ id: f.id, image_url: f.image_url, label: f.scene || 'Saved Fit', source: 'saved' as const }));
    const fromGenerated = generatedLooks.map(l => ({ id: l.id, image_url: l.image_url, label: l.prompt || 'Generated Look', source: 'generated' as const }));
    return [...fromGenerated, ...fromSaved];
  }, [savedFits, generatedLooks]);

  const saveToPhone = useCallback(async (imageUri: string) => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Allow access to save images to your gallery.');
        return;
      }
      await MediaLibrary.saveToLibraryAsync(imageUri);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Saved', 'Image saved to your photo library.');
    } catch {
      Alert.alert('Error', 'Could not save image.');
    }
  }, []);

  const openGallery = useCallback((index: number) => {
    setGalleryIndex(index);
    setShowGallery(true);
  }, []);

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
          {/* Twin Image — show latest generated look or base twin */}
          <View style={styles.twinImageWrapper}>
            <Image
              source={{ uri: (generatedLooks.length > 0 ? generatedLooks[0].image_url : digitalTwin.twin_image_url) }}
              style={styles.twinFullImage}
              contentFit="contain"
            />
          </View>

          {/* Selfie comparison + Color Badges */}
          <View style={styles.twinProfileRow}>
            {digitalTwin.selfie_url ? (
              <Image source={{ uri: digitalTwin.selfie_url }} style={styles.twinSelfie} contentFit="cover" />
            ) : (
              <View style={[styles.twinSelfie, { backgroundColor: Colors.cardSurfaceAlt, alignItems: 'center', justifyContent: 'center' }]}>
                <User size={24} color={Colors.textTertiary} />
              </View>
            )}
            <View style={styles.twinMeta}>
              {digitalTwin.skin_color ? (
                <View style={styles.colorBadgeRow}>
                  <View style={[styles.colorDot, { backgroundColor: digitalTwin.skin_color }]} />
                  <Text style={styles.colorBadgeLabel}>Skin</Text>
                </View>
              ) : null}
              {digitalTwin.hair_color ? (
                <View style={styles.colorBadgeRow}>
                  <View style={[styles.colorDot, { backgroundColor: digitalTwin.hair_color }]} />
                  <Text style={styles.colorBadgeLabel}>Hair</Text>
                </View>
              ) : null}
              {digitalTwin.body_type && (
                <View style={styles.bodyBadge}>
                  <Text style={styles.bodyBadgeText}>{digitalTwin.body_type}</Text>
                </View>
              )}
            </View>
          </View>

          {/* AI Description */}
          {digitalTwin.ai_description ? (
            <View style={styles.twinCard}>
              <View style={styles.twinCardHeader}>
                <Sparkles size={16} color={Colors.accentGreen} />
                <Text style={styles.twinCardTitle}>AI Profile</Text>
              </View>
              <Text style={styles.twinCardBody}>{digitalTwin.ai_description}</Text>
            </View>
          ) : null}

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

          {/* Save Twin Image to Phone */}
          <Pressable style={styles.saveToPhoneBtn} onPress={() => digitalTwin.twin_image_url && saveToPhone(digitalTwin.twin_image_url)}>
            <Download size={16} color={Colors.accentGreen} />
            <Text style={styles.saveToPhoneBtnText}>Save to Phone</Text>
          </Pressable>

          {/* Generated Looks Gallery */}
          {allLooks.length > 0 && (
            <View style={styles.savedFitsSection}>
              <Text style={styles.savedFitsTitle}>Your Looks ({allLooks.length})</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.savedFitsRow}
              >
                {allLooks.map((look, idx) => (
                  <Pressable key={look.id} style={styles.savedFitCard} onPress={() => openGallery(idx)}>
                    <Image
                      source={{ uri: look.image_url }}
                      style={styles.savedFitImage}
                      contentFit="cover"
                    />
                    <View style={styles.savedFitOverlay}>
                      <Text style={styles.savedFitScene} numberOfLines={1}>{look.label}</Text>
                      <View style={{ flexDirection: 'row', gap: 4 }}>
                        <Pressable
                          style={styles.savedFitDeleteBtn}
                          onPress={(e) => {
                            e.stopPropagation();
                            saveToPhone(look.image_url);
                          }}
                        >
                          <Download size={12} color="#FFF" />
                        </Pressable>
                        <Pressable
                          style={styles.savedFitDeleteBtn}
                          onPress={(e) => {
                            e.stopPropagation();
                            Alert.alert('Delete', 'Remove this look?', [
                              { text: 'Cancel', style: 'cancel' },
                              { text: 'Delete', style: 'destructive', onPress: () => {
                                if (look.source === 'saved') deleteSavedFit(look.id);
                                else deleteGeneratedLook(look.id);
                              }},
                            ]);
                          }}
                        >
                          <Trash2 size={12} color="#FF6B6B" />
                        </Pressable>
                      </View>
                    </View>
                  </Pressable>
                ))}
              </ScrollView>
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

        {/* Fullscreen Swipeable Gallery */}
        <Modal visible={showGallery} transparent animationType="fade">
          <View style={styles.galleryOverlay}>
            <SafeAreaView edges={['top']} style={styles.galleryHeader}>
              <Pressable onPress={() => setShowGallery(false)} style={styles.galleryCloseBtn}>
                <ArrowLeft size={20} color="#FFF" />
              </Pressable>
              <Text style={styles.galleryTitle}>{galleryIndex + 1} / {allLooks.length}</Text>
              <Pressable onPress={() => allLooks[galleryIndex] && saveToPhone(allLooks[galleryIndex].image_url)} style={styles.galleryCloseBtn}>
                <Download size={20} color="#FFF" />
              </Pressable>
            </SafeAreaView>
            <FlatList
              data={allLooks}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              initialScrollIndex={Math.min(galleryIndex, allLooks.length - 1)}
              getItemLayout={(_, index) => ({ length: SCREEN_WIDTH, offset: SCREEN_WIDTH * index, index })}
              onMomentumScrollEnd={(e) => {
                const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
                setGalleryIndex(idx);
              }}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={{ width: SCREEN_WIDTH, flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                  <Image source={{ uri: item.image_url }} style={styles.galleryFullImage} contentFit="contain" />
                  <Text style={styles.galleryLabel}>{item.label}</Text>
                </View>
              )}
            />
          </View>
        </Modal>
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

function createStyles(C: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.background },
    headerBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 8 },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.cardSurfaceAlt, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border },
    headerTitle: { flex: 1, fontFamily: Typography.bodyFamilyBold, fontSize: 18, color: C.textPrimary, textAlign: 'center' },
    headerSpacer: { width: 40 },
    content: { flex: 1, padding: 24, gap: 24 },
    beforeAfterRow: { flexDirection: 'row', gap: 12, justifyContent: 'center' },
    previewCard: { alignItems: 'center', gap: 8 },
    previewPlaceholder: { width: PREVIEW_WIDTH, height: PREVIEW_WIDTH * 1.2, borderRadius: Radius.lg, backgroundColor: C.cardSurface, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
    previewPlaceholderAlt: { borderColor: C.accentGreen, borderWidth: 2 },
    previewPlaceholderText: { fontFamily: Typography.bodyFamilyMedium, fontSize: 14, color: C.textTertiary },
    previewLabel: { fontFamily: Typography.bodyFamilyMedium, fontSize: 12, color: C.textSecondary },
    heading: { fontFamily: Typography.serifFamilyBold, fontSize: 24, color: C.textPrimary, textAlign: 'center', lineHeight: 32 },
    subheading: { fontFamily: Typography.bodyFamily, fontSize: 14, color: C.textSecondary, textAlign: 'center', marginTop: -8 },
    previewRow: { flexDirection: 'row', gap: 12 },
    demoCard: { flex: 1, height: 140, borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center' },
    demoText: { fontFamily: Typography.bodyFamily, fontSize: 13, color: C.textSecondary },
    ctaWrapper: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
    ctaBtn: { backgroundColor: C.accentGreen, borderRadius: Radius.pill, paddingVertical: 16, alignItems: 'center' },
    ctaText: { fontFamily: Typography.bodyFamilyBold, fontSize: 16, color: C.background },

    /* Twin Profile Styles */
    twinScrollContent: { padding: 16, paddingBottom: 140 },
    twinImageWrapper: { alignItems: 'center', marginBottom: 20, backgroundColor: C.cardSurface, borderRadius: Radius.lg, borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
    twinFullImage: { width: '100%', height: 420 },
    twinProfileRow: { flexDirection: 'row', gap: 16, marginBottom: 20 },
    twinSelfie: { width: 64, height: 64, borderRadius: 32, borderWidth: 2, borderColor: C.accentGreen },
    twinMeta: { justifyContent: 'center', gap: 8, flex: 1 },
    colorBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    colorDot: { width: 20, height: 20, borderRadius: 10, borderWidth: 1, borderColor: C.border },
    colorBadgeLabel: { fontFamily: Typography.bodyFamilyMedium, fontSize: 13, color: C.textSecondary },
    bodyBadge: { backgroundColor: C.cardSurfaceAlt, borderRadius: Radius.pill, paddingHorizontal: 12, paddingVertical: 4, alignSelf: 'flex-start', borderWidth: 1, borderColor: C.border },
    bodyBadgeText: { fontFamily: Typography.bodyFamilyMedium, fontSize: 12, color: C.textPrimary, textTransform: 'capitalize' },
    twinCard: { backgroundColor: C.cardSurface, borderRadius: Radius.lg, borderWidth: 1, borderColor: C.border, padding: 16, gap: 8, marginBottom: 12 },
    twinCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    twinCardTitle: { fontFamily: Typography.bodyFamilyBold, fontSize: 15, color: C.textPrimary },
    twinCardBody: { fontFamily: Typography.bodyFamily, fontSize: 14, color: C.textSecondary, lineHeight: 20 },
    twinCtaWrapper: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, backgroundColor: C.background, gap: 8 },
    tryOnCta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.accentGreen, borderRadius: Radius.pill, paddingVertical: 16 },
    tryOnCtaText: { fontFamily: Typography.bodyFamilyBold, fontSize: 16, color: '#FFF' },
    regenCta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10 },
    regenCtaText: { fontFamily: Typography.bodyFamilyMedium, fontSize: 14, color: C.textSecondary },
    // Saved Fits
    savedFitsSection: { marginTop: 8, marginBottom: 16 },
    savedFitsTitle: { fontFamily: Typography.bodyFamilyBold, fontSize: 16, color: C.textPrimary, marginBottom: 12 },
    savedFitsRow: { gap: 12 },
    savedFitCard: { width: FIT_CARD_SIZE, height: FIT_CARD_SIZE * 1.4, borderRadius: Radius.md, overflow: 'hidden', backgroundColor: C.cardSurfaceAlt, borderWidth: 1, borderColor: C.border },
    savedFitImage: { width: '100%', height: '100%' },
    savedFitOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 6, backgroundColor: 'rgba(0,0,0,0.6)' },
    savedFitScene: { fontFamily: Typography.bodyFamilyMedium, fontSize: 11, color: '#FFF', textTransform: 'capitalize' },
    savedFitDeleteBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
    saveToPhoneBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 16, paddingVertical: 10, borderRadius: Radius.pill, borderWidth: 1, borderColor: C.accentGreen, backgroundColor: `${C.accentGreen}10` },
    saveToPhoneBtnText: { fontFamily: Typography.bodyFamilyMedium, fontSize: 14, color: C.accentGreen },
    galleryOverlay: { flex: 1, backgroundColor: '#000' },
    galleryHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 8 },
    galleryCloseBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
    galleryTitle: { fontFamily: Typography.bodyFamilyBold, fontSize: 16, color: '#FFF' },
    galleryFullImage: { width: SCREEN_WIDTH - 32, height: '80%' },
    galleryLabel: { fontFamily: Typography.bodyFamilyMedium, fontSize: 14, color: 'rgba(255,255,255,0.7)', marginTop: 12, textAlign: 'center' },
  });
}
