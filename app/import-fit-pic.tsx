import { Radius, Typography } from '@/constants/Colors';
import { useThemeColors } from '@/contexts/ThemeContext';
import { analyzeOutfitImage } from '@/lib/ai';
import { useClosetStore } from '@/stores/closetStore';
import { ClothingCategory, DetectedPiece } from '@/types';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { router, type Href } from 'expo-router';
import { ArrowLeft, Camera, ImageIcon } from 'lucide-react-native';
import React, { useMemo } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const CATEGORIES: ClothingCategory[] = [
  'top', 'bottom', 'outerwear', 'dress', 'shoe',
  'accessory', 'bag', 'hat', 'jewelry', 'other',
];

export default function ImportFitPicScreen() {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  const startBackgroundImport = (uri: string) => {
    const importId = `import-${Date.now()}`;
    const { addPendingImport, updatePendingImport } = useClosetStore.getState();

    addPendingImport({
      id: importId,
      imageUri: uri,
      status: 'processing',
      pieces: [],
      created_at: new Date().toISOString(),
    });

    // Go back to where they came from (usually feed or closet)
    router.replace('/(tabs)/closet' as Href);

    // Run detection + research in background
    (async () => {
      try {
        const result = await analyzeOutfitImage(uri);

        if (!result.detections || result.detections.length === 0) {
          updatePendingImport(importId, { status: 'error', errorMsg: 'No clothing items detected in image.' });
          return;
        }

        const pieces: DetectedPiece[] = result.detections.map((det, idx: number) => ({
          id: `piece-${Date.now()}-${idx}`,
          name: det.name,
          category: (CATEGORIES.includes(det.category as ClothingCategory) ? det.category : 'other') as ClothingCategory,
          brand: det.brand || '',
          colors: det.colors || [],
          confidence: det.confidence,
          estimatedValue: det.estimatedValue ? String(det.estimatedValue) : '',
          tags: [],
          garmentType: det.modelName || '',
          selected: true,
          box_2d: det.box_2d,
          isCleaning: false,
        }));

        // Detection already provides name, brand, colors, category, estimated value
        // No need for a separate research step — saves significant time
        updatePendingImport(importId, {
          status: 'ready',
          pieces,
          overallStyle: result.overallStyle,
          occasion: result.occasion
        });

      } catch (e) {
        updatePendingImport(importId, {
          status: 'error',
          errorMsg: e instanceof Error ? e.message : 'Detection failed'
        });
      }
    })();
  };

  const handleTakePhoto = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      startBackgroundImport(result.assets[0].uri);
    }
  };

  const handleChooseLibrary = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      startBackgroundImport(result.assets[0].uri);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.headerBar}>
        <Pressable
          style={styles.backBtn}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }}
        >
          <ArrowLeft size={20} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Import from Fit Pic</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <ImageIcon size={48} color={Colors.textTertiary} />
        </View>

        <Text style={styles.title}>Upload a Fit Pic</Text>
        <Text style={styles.desc}>
          Take or upload a photo of yourself wearing an outfit. We'll detect and extract each clothing piece from the image.
        </Text>

        <View style={styles.tipRow}>
          <Text style={styles.tipText}>
            Tip: Make sure you're the only person in the photo
          </Text>
        </View>
      </View>

      <View style={styles.actions}>
        <Pressable style={styles.primaryBtn} onPress={handleTakePhoto}>
          <Camera size={20} color={Colors.background} />
          <Text style={styles.primaryBtnText}>Take Photo</Text>
        </Pressable>

        <Pressable style={styles.secondaryBtn} onPress={handleChooseLibrary}>
          <ImageIcon size={20} color={Colors.textPrimary} />
          <Text style={styles.secondaryBtnText}>Choose from Library</Text>
        </Pressable>


      </View>
    </SafeAreaView>
  );
}

function createStyles(C: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.background },
    headerBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12 },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.cardSurfaceAlt, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { flex: 1, fontFamily: Typography.bodyFamilyBold, fontSize: 18, color: C.textPrimary, textAlign: 'center' },
    headerSpacer: { width: 40 },
    content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 16 },
    iconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: C.cardSurfaceAlt, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
    title: { fontFamily: Typography.serifFamilyBold, fontSize: 24, color: C.textPrimary },
    desc: { fontFamily: Typography.bodyFamily, fontSize: 14, color: C.textSecondary, textAlign: 'center', lineHeight: 20 },
    tipRow: { backgroundColor: C.cardSurface, borderRadius: Radius.md, paddingHorizontal: 16, paddingVertical: 12 },
    tipText: { fontFamily: Typography.bodyFamily, fontSize: 13, color: C.textSecondary },
    actions: { paddingHorizontal: 24, paddingBottom: 32, gap: 10 },
    primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: Radius.pill, backgroundColor: C.textPrimary },
    primaryBtnText: { fontFamily: Typography.bodyFamilyBold, fontSize: 16, color: C.background },
    secondaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: Radius.pill, backgroundColor: C.cardSurfaceAlt },
    secondaryBtnText: { fontFamily: Typography.bodyFamilyBold, fontSize: 16, color: C.textPrimary },
    creditRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 4 },
    creditText: { fontFamily: Typography.bodyFamily, fontSize: 12, color: C.textTertiary },
  });
}
