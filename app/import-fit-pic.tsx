import { Radius, Typography } from '@/constants/Colors';
import { useThemeColors } from '@/contexts/ThemeContext';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { router, type Href } from 'expo-router';
import { ArrowLeft, Camera, ImageIcon, Sparkles } from 'lucide-react-native';
import React, { useMemo } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ImportFitPicScreen() {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  const handleTakePhoto = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      router.replace({ pathname: '/analyze', params: { imageUri: result.assets[0].uri, mode: 'fitpic' } } as Href);
    }
  };

  const handleChooseLibrary = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      router.replace({ pathname: '/analyze', params: { imageUri: result.assets[0].uri, mode: 'fitpic' } } as Href);
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

        <View style={styles.creditRow}>
          <Sparkles size={14} color={Colors.accentGreen} />
          <Text style={styles.creditText}>Costs 1 AI credit per photo</Text>
        </View>
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
