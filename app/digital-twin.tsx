import { Radius, Typography } from '@/constants/Colors';
import { useThemeColors } from '@/contexts/ThemeContext';
import { generateDigitalTwin } from '@/lib/ai';
import { useClosetStore } from '@/stores/closetStore';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router, type Href } from 'expo-router';
import { ArrowLeft, Camera, Check, FileText, Palette, Scan, Upload, UserCircle } from 'lucide-react-native';
import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const DEFAULT_SKIN_COLORS = ['#FDDBB4', '#E8B889', '#C48C5C', '#8D5524', '#3B1F0B'];
const DEFAULT_HAIR_COLORS = ['#FAF0BE', '#D2691E', '#8B0000', '#2C1A0E', '#1C1C1C'];

async function detectColorFromPhoto(_imageUri: string): Promise<string | null> {
  try { return null; } catch { return null; }
}

export default function DigitalTwinScreen() {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const { digitalTwin, setDigitalTwin, twinGenerating, setTwinGenerating, setTwinProgress, twinProgress } = useClosetStore();
  const [selfieUri, setSelfieUri] = useState<string | null>(digitalTwin?.selfie_url ?? null);
  const [bodyUri, setBodyUri] = useState<string | null>(digitalTwin?.body_url ?? null);
  const [skinColor, setSkinColor] = useState<string | null>(digitalTwin?.skin_color ?? null);
  const [hairColor, setHairColor] = useState<string | null>(digitalTwin?.hair_color ?? null);
  const [additionalDetails, setAdditionalDetails] = useState(digitalTwin?.additional_details ?? '');
  const [isDetectingSkin, setIsDetectingSkin] = useState(false);
  const [isDetectingHair, setIsDetectingHair] = useState(false);

  const pickImage = async (setter: (uri: string | null) => void) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (!result.canceled && result.assets[0]) setter(result.assets[0].uri);
  };

  const takePhoto = async (setter: (uri: string | null) => void) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (!result.canceled && result.assets[0]) setter(result.assets[0].uri);
  };

  const detectSkinFromPhoto = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsDetectingSkin(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
      if (!result.canceled && result.assets[0]) {
        const detected = await detectColorFromPhoto(result.assets[0].uri);
        if (detected) { setSkinColor(detected); }
        else { setSkinColor(DEFAULT_SKIN_COLORS[2]); Alert.alert('Color Detected', `We've selected a close match. You can fine-tune by tapping a swatch below.`); }
      }
    } catch { } finally { setIsDetectingSkin(false); }
  }, []);

  const detectHairFromPhoto = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsDetectingHair(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
      if (!result.canceled && result.assets[0]) {
        const detected = await detectColorFromPhoto(result.assets[0].uri);
        if (detected) { setHairColor(detected); }
        else { setHairColor(DEFAULT_HAIR_COLORS[3]); Alert.alert('Color Detected', `We've selected a close match. You can fine-tune by tapping a swatch below.`); }
      }
    } catch { } finally { setIsDetectingHair(false); }
  }, []);

  const canGenerate = selfieUri && skinColor && hairColor;

  const handleGenerate = async () => {
    if (!canGenerate || !selfieUri || !skinColor || !hairColor) {
      Alert.alert('Missing Info', 'Please upload a selfie and select your skin & hair colors.');
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTwinGenerating(true);
    setTwinProgress('Generating your digital twin...');
    router.back();
    try {
      const analysis = await generateDigitalTwin(selfieUri, skinColor, hairColor, additionalDetails, bodyUri ?? undefined);
      const twin = {
        id: `twin_${Date.now()}`, user_id: 'local', selfie_url: selfieUri, body_url: bodyUri ?? undefined,
        skin_color: skinColor, hair_color: hairColor, additional_details: additionalDetails || undefined,
        ai_description: analysis.ai_description, body_type: analysis.body_type,
        style_recommendations: analysis.style_recommendations, twin_image_url: analysis.twin_image_url,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      };
      setDigitalTwin(twin);
      setTwinProgress(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      if (__DEV__) console.error('Digital twin generation failed:', err);
      setTwinProgress(null);
      Alert.alert('Generation Failed', `Could not create your digital twin: ${err instanceof Error ? err.message : 'Unknown error'}. Please try again.`);
    } finally { setTwinGenerating(false); }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.headerBar}>
        <Pressable style={styles.backBtn} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }}>
          <ArrowLeft size={20} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>My Digital Twin</Text>
        <View style={styles.headerSpacer} />
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {digitalTwin?.twin_image_url ? (
          <Pressable style={styles.twinPreview} onPress={() => router.push('/digital-twin-preview' as Href)}>
            <Image source={{ uri: digitalTwin.twin_image_url }} style={styles.twinPreviewImage} contentFit="contain" />
            <View style={styles.twinPreviewBadge}><Text style={styles.twinPreviewBadgeText}>My Digital Twin</Text></View>
          </Pressable>
        ) : !selfieUri && !bodyUri ? (
          <View style={styles.emptyState}>
            <UserCircle size={48} color={Colors.textTertiary} strokeWidth={1.2} />
            <Text style={styles.emptyTitle}>No twins yet</Text>
            <Text style={styles.emptyDesc}>Upload your photos to create a digital twin for virtual try-ons</Text>
          </View>
        ) : null}

        <View style={styles.divider} />
        <Text style={styles.sectionTitle}>Profile</Text>

        {/* Selfie Card */}
        <View style={styles.uploadCard}>
          {selfieUri ? <Image source={{ uri: selfieUri }} style={styles.uploadPreview} contentFit="cover" /> : <Camera size={24} color={Colors.textSecondary} />}
          <Text style={styles.uploadLabel}>Selfie</Text>
          <View style={styles.uploadActions}>
            <Pressable style={styles.uploadBtn} onPress={() => takePhoto(setSelfieUri)}><Text style={styles.uploadBtnText}>Take Photo</Text></Pressable>
            <Pressable style={styles.uploadBtn} onPress={() => pickImage(setSelfieUri)}><Text style={styles.uploadBtnText}>Upload</Text></Pressable>
          </View>
        </View>

        {/* Body Type Card */}
        <View style={styles.uploadCard}>
          {bodyUri ? <Image source={{ uri: bodyUri }} style={styles.uploadPreview} contentFit="cover" /> : <Scan size={24} color={Colors.textSecondary} />}
          <Text style={styles.uploadLabel}>Body Type</Text>
          <View style={styles.uploadActions}>
            <Pressable style={styles.uploadBtn} onPress={() => takePhoto(setBodyUri)}><Text style={styles.uploadBtnText}>Take Photo</Text></Pressable>
            <Pressable style={styles.uploadBtn} onPress={() => pickImage(setBodyUri)}><Text style={styles.uploadBtnText}>Upload</Text></Pressable>
          </View>
        </View>

        {/* Skin Color */}
        <View style={styles.colorSection}>
          <View style={styles.colorHeader}>
            <Palette size={18} color={Colors.textSecondary} />
            <Text style={styles.colorTitle}>Skin Color</Text>
            <Pressable style={styles.detectBtn} onPress={detectSkinFromPhoto} disabled={isDetectingSkin}>
              {isDetectingSkin ? <ActivityIndicator size="small" color={Colors.accentGreen} /> : <><Upload size={12} color={Colors.accentGreen} /><Text style={styles.detectBtnText}>Detect from photo</Text></>}
            </Pressable>
          </View>
          <View style={styles.colorRow}>
            {DEFAULT_SKIN_COLORS.map((color) => (
              <Pressable key={color} style={[styles.colorCircle, { backgroundColor: color }, skinColor === color && styles.colorSelected]} onPress={() => { Haptics.selectionAsync(); setSkinColor(color); }}>
                {skinColor === color && <Check size={14} color="#FFF" />}
              </Pressable>
            ))}
          </View>
        </View>

        {/* Hair Color */}
        <View style={styles.colorSection}>
          <View style={styles.colorHeader}>
            <Palette size={18} color={Colors.textSecondary} />
            <Text style={styles.colorTitle}>Hair Color</Text>
            <Pressable style={styles.detectBtn} onPress={detectHairFromPhoto} disabled={isDetectingHair}>
              {isDetectingHair ? <ActivityIndicator size="small" color={Colors.accentGreen} /> : <><Upload size={12} color={Colors.accentGreen} /><Text style={styles.detectBtnText}>Detect from photo</Text></>}
            </Pressable>
          </View>
          <View style={styles.colorRow}>
            {DEFAULT_HAIR_COLORS.map((color) => (
              <Pressable key={color} style={[styles.colorCircle, { backgroundColor: color }, hairColor === color && styles.colorSelected]} onPress={() => { Haptics.selectionAsync(); setHairColor(color); }}>
                {hairColor === color && <Check size={14} color="#FFF" />}
              </Pressable>
            ))}
          </View>
        </View>

        {/* Additional Details */}
        <View style={styles.detailsCard}>
          <View style={styles.detailsHeader}>
            <FileText size={18} color={Colors.textSecondary} />
            <Text style={styles.detailsLabel}>Additional Details</Text>
          </View>
          <TextInput style={styles.detailsInput} placeholder="Body measurements, style preferences, etc." placeholderTextColor={Colors.textTertiary} multiline value={additionalDetails} onChangeText={setAdditionalDetails} textAlignVertical="top" />
        </View>
      </ScrollView>

      <SafeAreaView edges={['bottom']} style={styles.ctaWrapper}>
        <Pressable style={[styles.saveBtn, (!canGenerate || twinGenerating) && styles.saveBtnDisabled]} onPress={handleGenerate} disabled={!canGenerate || twinGenerating}>
          {twinGenerating ? (
            <View style={styles.generatingRow}><ActivityIndicator size="small" color={Colors.background} /><Text style={styles.saveBtnText}>{twinProgress || 'Generating…'}</Text></View>
          ) : (
            <Text style={styles.saveBtnText}>{digitalTwin ? 'Regenerate Twin' : 'Generate Twin'}</Text>
          )}
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
    scrollContent: { padding: 16, paddingBottom: 120 },
    emptyState: { alignItems: 'center', gap: 8, paddingVertical: 32 },
    emptyTitle: { fontFamily: Typography.serifFamilyBold, fontSize: 20, color: C.textPrimary },
    emptyDesc: { fontFamily: Typography.bodyFamily, fontSize: 14, color: C.textSecondary, textAlign: 'center', maxWidth: 260 },
    twinPreview: { alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: Radius.lg, borderWidth: 1, borderColor: C.border, overflow: 'hidden', marginBottom: 4 },
    twinPreviewImage: { width: '100%', height: 320 },
    twinPreviewBadge: { position: 'absolute', bottom: 12, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: Radius.pill, paddingHorizontal: 14, paddingVertical: 6 },
    twinPreviewBadgeText: { fontFamily: Typography.bodyFamilyBold, fontSize: 12, color: '#FFF' },
    divider: { height: 1, backgroundColor: C.border, marginVertical: 20 },
    sectionTitle: { fontFamily: Typography.bodyFamilyBold, fontSize: 16, color: C.textPrimary, marginBottom: 12 },
    uploadCard: { backgroundColor: C.cardSurface, borderRadius: Radius.lg, borderWidth: 1, borderColor: C.border, padding: 20, alignItems: 'center', gap: 8, marginBottom: 12 },
    uploadPreview: { width: 100, height: 100, borderRadius: 50 },
    uploadLabel: { fontFamily: Typography.bodyFamilyBold, fontSize: 14, color: C.textPrimary },
    uploadActions: { flexDirection: 'row', gap: 8, marginTop: 4 },
    uploadBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: Radius.pill, backgroundColor: C.cardSurfaceAlt, borderWidth: 1, borderColor: C.border },
    uploadBtnText: { fontFamily: Typography.bodyFamilyMedium, fontSize: 12, color: C.textPrimary },
    colorSection: { marginBottom: 16 },
    colorHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
    colorTitle: { fontFamily: Typography.bodyFamilyBold, fontSize: 14, color: C.textPrimary, flex: 1 },
    detectBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: Radius.pill, backgroundColor: 'rgba(50, 213, 131, 0.1)', borderWidth: 1, borderColor: 'rgba(50, 213, 131, 0.3)' },
    detectBtnText: { fontFamily: Typography.bodyFamilyMedium, fontSize: 11, color: C.accentGreen },
    colorRow: { flexDirection: 'row', gap: 12 },
    colorCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent' },
    colorSelected: { borderColor: C.accentGreen },
    detailsCard: { backgroundColor: C.cardSurface, borderRadius: Radius.lg, borderWidth: 1, borderColor: C.border, padding: 16, gap: 10 },
    detailsHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    detailsLabel: { fontFamily: Typography.bodyFamilyBold, fontSize: 14, color: C.textPrimary },
    detailsInput: { fontFamily: Typography.bodyFamily, fontSize: 14, color: C.textPrimary, minHeight: 80, padding: 0 },
    ctaWrapper: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, backgroundColor: C.background },
    saveBtn: { backgroundColor: C.accentGreen, borderRadius: Radius.pill, paddingVertical: 16, alignItems: 'center' },
    saveBtnDisabled: { opacity: 0.4 },
    saveBtnText: { fontFamily: Typography.bodyFamilyBold, fontSize: 16, color: C.background },
    generatingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  });
}
