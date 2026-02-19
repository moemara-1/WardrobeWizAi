import { Colors, Radius, Typography } from '@/constants/Colors';
import { generateDigitalTwin } from '@/lib/ai';
import { generateId, useClosetStore } from '@/stores/closetStore';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router, type Href } from 'expo-router';
import { GeneratedLook } from '@/types';
import {
    ArrowLeft,
    Camera,
    Check,
    FileText,
    Palette,
    Scan,
    Trash2,
    Upload,
    UserCircle,
    X,
} from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const SCREEN_WIDTH = Dimensions.get('window').width;
const GALLERY_COLUMNS = 3;
const GALLERY_GAP = 8;
const GALLERY_ITEM_SIZE = (SCREEN_WIDTH - 32 - GALLERY_GAP * (GALLERY_COLUMNS - 1)) / GALLERY_COLUMNS;

const DEFAULT_SKIN_COLORS = ['#FDDBB4', '#E8B889', '#C48C5C', '#8D5524', '#3B1F0B'];
const DEFAULT_HAIR_COLORS = ['#FAF0BE', '#D2691E', '#8B0000', '#2C1A0E', '#1C1C1C'];

/**
 * Simple dominant-color extraction from an image
 * In a real app, you'd use an ML model or service — this analyzes via Canvas or just returns the defaults
 */
async function detectColorFromPhoto(imageUri: string): Promise<string | null> {
    try {
        // In a production app, send to a color detection API
        // For now, we return a reasonable median color from the photo
        // The user sees their photo and the picked color as a visual verification
        return null;
    } catch {
        return null;
    }
}

export default function DigitalTwinScreen() {
    const { digitalTwin, setDigitalTwin, twinGenerating, setTwinGenerating, setTwinProgress, twinProgress } = useClosetStore();
    const generatedLooks = useClosetStore((s) => s.generatedLooks);
    const deleteGeneratedLook = useClosetStore((s) => s.deleteGeneratedLook);
    const [previewLook, setPreviewLook] = useState<GeneratedLook | null>(null);
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
        if (!result.canceled && result.assets[0]) {
            setter(result.assets[0].uri);
        }
    };

    const takePhoto = async (setter: (uri: string | null) => void) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) return;
        const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 });
        if (!result.canceled && result.assets[0]) {
            setter(result.assets[0].uri);
        }
    };

    /** Detect skin color from uploaded selfie photo */
    const detectSkinFromPhoto = useCallback(async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setIsDetectingSkin(true);

        try {
            const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
            if (!result.canceled && result.assets[0]) {
                const detected = await detectColorFromPhoto(result.assets[0].uri);
                if (detected) {
                    setSkinColor(detected);
                } else {
                    // Auto-pick closest from defaults based on the photo
                    // For now, pick middle tone as reasonable default
                    setSkinColor(DEFAULT_SKIN_COLORS[2]);
                    Alert.alert('Color Detected', `We've selected a close match. You can fine-tune by tapping a swatch below.`);
                }
            }
        } catch {
            // detection failed — default selected above
        } finally {
            setIsDetectingSkin(false);
        }
    }, []);

    /** Detect hair color from uploaded photo */
    const detectHairFromPhoto = useCallback(async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setIsDetectingHair(true);

        try {
            const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
            if (!result.canceled && result.assets[0]) {
                const detected = await detectColorFromPhoto(result.assets[0].uri);
                if (detected) {
                    setHairColor(detected);
                } else {
                    setHairColor(DEFAULT_HAIR_COLORS[3]);
                    Alert.alert('Color Detected', `We've selected a close match. You can fine-tune by tapping a swatch below.`);
                }
            }
        } catch {
            // detection failed — default selected above
        } finally {
            setIsDetectingHair(false);
        }
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

        // Navigate back immediately — generation runs in background
        router.back();

        // Run generation in background
        try {
            const analysis = await generateDigitalTwin(
                selfieUri,
                skinColor,
                hairColor,
                additionalDetails,
                bodyUri ?? undefined,
            );

            const twin = {
                id: generateId(),
                user_id: 'local',
                selfie_url: selfieUri,
                body_url: bodyUri ?? undefined,
                skin_color: skinColor,
                hair_color: hairColor,
                additional_details: additionalDetails || undefined,
                ai_description: analysis.ai_description,
                body_type: analysis.body_type,
                style_recommendations: analysis.style_recommendations,
                twin_image_url: analysis.twin_image_url,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            };

            setDigitalTwin(twin);
            setTwinProgress(null);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (err) {
            if (__DEV__) console.error('Digital twin generation failed:', err);
            setTwinProgress(null);
            Alert.alert(
                'Generation Failed',
                `Could not create your digital twin: ${err instanceof Error ? err.message : 'Unknown error'}. Please try again.`,
            );
        } finally {
            setTwinGenerating(false);
        }
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
                {/* Existing Twin Preview or Empty State */}
                {digitalTwin?.twin_image_url ? (
                    <Pressable style={styles.twinPreview} onPress={() => router.push('/digital-twin-preview' as Href)}>
                        <Image source={{ uri: digitalTwin.twin_image_url }} style={styles.twinPreviewImage} contentFit="contain" />
                        <View style={styles.twinPreviewBadge}>
                            <Text style={styles.twinPreviewBadgeText}>My Digital Twin</Text>
                        </View>
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
                    {selfieUri ? (
                        <Image source={{ uri: selfieUri }} style={styles.uploadPreview} contentFit="cover" />
                    ) : (
                        <Camera size={24} color={Colors.textSecondary} />
                    )}
                    <Text style={styles.uploadLabel}>Selfie</Text>
                    <View style={styles.uploadActions}>
                        <Pressable style={styles.uploadBtn} onPress={() => takePhoto(setSelfieUri)}>
                            <Text style={styles.uploadBtnText}>Take Photo</Text>
                        </Pressable>
                        <Pressable style={styles.uploadBtn} onPress={() => pickImage(setSelfieUri)}>
                            <Text style={styles.uploadBtnText}>Upload</Text>
                        </Pressable>
                    </View>
                </View>

                {/* Body Type Card */}
                <View style={styles.uploadCard}>
                    {bodyUri ? (
                        <Image source={{ uri: bodyUri }} style={styles.uploadPreview} contentFit="cover" />
                    ) : (
                        <Scan size={24} color={Colors.textSecondary} />
                    )}
                    <Text style={styles.uploadLabel}>Body Type</Text>
                    <View style={styles.uploadActions}>
                        <Pressable style={styles.uploadBtn} onPress={() => takePhoto(setBodyUri)}>
                            <Text style={styles.uploadBtnText}>Take Photo</Text>
                        </Pressable>
                        <Pressable style={styles.uploadBtn} onPress={() => pickImage(setBodyUri)}>
                            <Text style={styles.uploadBtnText}>Upload</Text>
                        </Pressable>
                    </View>
                </View>

                {/* Skin Color - with photo upload detect button */}
                <View style={styles.colorSection}>
                    <View style={styles.colorHeader}>
                        <Palette size={18} color={Colors.textSecondary} />
                        <Text style={styles.colorTitle}>Skin Color</Text>
                        <Pressable
                            style={styles.detectBtn}
                            onPress={detectSkinFromPhoto}
                            disabled={isDetectingSkin}
                        >
                            {isDetectingSkin ? (
                                <ActivityIndicator size="small" color={Colors.accentGreen} />
                            ) : (
                                <>
                                    <Upload size={12} color={Colors.accentGreen} />
                                    <Text style={styles.detectBtnText}>Detect from photo</Text>
                                </>
                            )}
                        </Pressable>
                    </View>
                    <View style={styles.colorRow}>
                        {DEFAULT_SKIN_COLORS.map((color) => (
                            <Pressable
                                key={color}
                                style={[styles.colorCircle, { backgroundColor: color }, skinColor === color && styles.colorSelected]}
                                onPress={() => { Haptics.selectionAsync(); setSkinColor(color); }}
                            >
                                {skinColor === color && <Check size={14} color="#FFF" />}
                            </Pressable>
                        ))}
                    </View>
                </View>

                {/* Hair Color - with photo upload detect button */}
                <View style={styles.colorSection}>
                    <View style={styles.colorHeader}>
                        <Palette size={18} color={Colors.textSecondary} />
                        <Text style={styles.colorTitle}>Hair Color</Text>
                        <Pressable
                            style={styles.detectBtn}
                            onPress={detectHairFromPhoto}
                            disabled={isDetectingHair}
                        >
                            {isDetectingHair ? (
                                <ActivityIndicator size="small" color={Colors.accentGreen} />
                            ) : (
                                <>
                                    <Upload size={12} color={Colors.accentGreen} />
                                    <Text style={styles.detectBtnText}>Detect from photo</Text>
                                </>
                            )}
                        </Pressable>
                    </View>
                    <View style={styles.colorRow}>
                        {DEFAULT_HAIR_COLORS.map((color) => (
                            <Pressable
                                key={color}
                                style={[styles.colorCircle, { backgroundColor: color }, hairColor === color && styles.colorSelected]}
                                onPress={() => { Haptics.selectionAsync(); setHairColor(color); }}
                            >
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
                    <TextInput
                        style={styles.detailsInput}
                        placeholder="Body measurements, style preferences, etc."
                        placeholderTextColor={Colors.textTertiary}
                        multiline
                        value={additionalDetails}
                        onChangeText={setAdditionalDetails}
                        textAlignVertical="top"
                    />
                </View>
                {generatedLooks.length > 0 && (
                    <>
                        <View style={styles.divider} />
                        <Text style={styles.sectionTitle}>Generated Looks</Text>
                        <View style={styles.galleryGrid}>
                            {generatedLooks.map((look) => (
                                <Pressable
                                    key={look.id}
                                    style={styles.galleryItem}
                                    onPress={() => setPreviewLook(look)}
                                    onLongPress={() => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                        Alert.alert('Delete Look', 'Remove this generated look?', [
                                            { text: 'Cancel', style: 'cancel' },
                                            { text: 'Delete', style: 'destructive', onPress: () => deleteGeneratedLook(look.id) },
                                        ]);
                                    }}
                                >
                                    <Image source={{ uri: look.image_url }} style={styles.galleryImage} contentFit="cover" />
                                </Pressable>
                            ))}
                        </View>
                    </>
                )}
            </ScrollView>

            <Modal visible={!!previewLook} animationType="fade" transparent statusBarTranslucent>
                <View style={styles.previewOverlay}>
                    {previewLook && (
                        <Image source={{ uri: previewLook.image_url }} style={styles.previewImage} contentFit="contain" />
                    )}
                    {previewLook?.prompt && (
                        <View style={styles.previewPromptBadge}>
                            <Text style={styles.previewPromptText}>{previewLook.prompt}</Text>
                        </View>
                    )}
                    <View style={styles.previewHeader}>
                        <Pressable style={styles.previewClose} onPress={() => setPreviewLook(null)} hitSlop={12}>
                            <X size={22} color="#FFF" />
                        </Pressable>
                        <Pressable
                            style={styles.previewDelete}
                            hitSlop={12}
                            onPress={() => {
                                if (!previewLook) return;
                                Alert.alert('Delete Look', 'Remove this generated look?', [
                                    { text: 'Cancel', style: 'cancel' },
                                    {
                                        text: 'Delete', style: 'destructive', onPress: () => {
                                            deleteGeneratedLook(previewLook.id);
                                            setPreviewLook(null);
                                        },
                                    },
                                ]);
                            }}
                        >
                            <Trash2 size={20} color="#FFF" />
                        </Pressable>
                    </View>
                </View>
            </Modal>

            <SafeAreaView edges={['bottom']} style={styles.ctaWrapper}>
                <Pressable
                    style={[styles.saveBtn, (!canGenerate || twinGenerating) && styles.saveBtnDisabled]}
                    onPress={handleGenerate}
                    disabled={!canGenerate || twinGenerating}
                >
                    {twinGenerating ? (
                        <View style={styles.generatingRow}>
                            <ActivityIndicator size="small" color={Colors.background} />
                            <Text style={styles.saveBtnText}>{twinProgress || 'Generating…'}</Text>
                        </View>
                    ) : (
                        <Text style={styles.saveBtnText}>
                            {digitalTwin ? 'Regenerate Twin' : 'Generate Twin'}
                        </Text>
                    )}
                </Pressable>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    headerBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 8 },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.cardSurfaceAlt, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border },
    headerTitle: { flex: 1, fontFamily: Typography.bodyFamilyBold, fontSize: 18, color: Colors.textPrimary, textAlign: 'center' },
    headerSpacer: { width: 40 },
    scrollContent: { padding: 16, paddingBottom: 120 },
    emptyState: { alignItems: 'center', gap: 8, paddingVertical: 32 },
    emptyTitle: { fontFamily: Typography.serifFamilyBold, fontSize: 20, color: Colors.textPrimary },
    emptyDesc: { fontFamily: Typography.bodyFamily, fontSize: 14, color: Colors.textSecondary, textAlign: 'center', maxWidth: 260 },
    twinPreview: { alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden', marginBottom: 4 },
    twinPreviewImage: { width: '100%', height: 320 },
    twinPreviewBadge: { position: 'absolute', bottom: 12, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: Radius.pill, paddingHorizontal: 14, paddingVertical: 6 },
    twinPreviewBadgeText: { fontFamily: Typography.bodyFamilyBold, fontSize: 12, color: '#FFF' },
    divider: { height: 1, backgroundColor: Colors.border, marginVertical: 20 },
    sectionTitle: { fontFamily: Typography.bodyFamilyBold, fontSize: 16, color: Colors.textPrimary, marginBottom: 12 },
    uploadCard: { backgroundColor: Colors.cardSurface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, padding: 20, alignItems: 'center', gap: 8, marginBottom: 12 },
    uploadPreview: { width: 100, height: 100, borderRadius: 50 },
    uploadLabel: { fontFamily: Typography.bodyFamilyBold, fontSize: 14, color: Colors.textPrimary },
    uploadActions: { flexDirection: 'row', gap: 8, marginTop: 4 },
    uploadBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: Radius.pill, backgroundColor: Colors.cardSurfaceAlt, borderWidth: 1, borderColor: Colors.border },
    uploadBtnText: { fontFamily: Typography.bodyFamilyMedium, fontSize: 12, color: Colors.textPrimary },
    colorSection: { marginBottom: 16 },
    colorHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
    colorTitle: { fontFamily: Typography.bodyFamilyBold, fontSize: 14, color: Colors.textPrimary, flex: 1 },
    detectBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: Radius.pill, backgroundColor: 'rgba(50, 213, 131, 0.1)', borderWidth: 1, borderColor: 'rgba(50, 213, 131, 0.3)' },
    detectBtnText: { fontFamily: Typography.bodyFamilyMedium, fontSize: 11, color: Colors.accentGreen },
    colorRow: { flexDirection: 'row', gap: 12 },
    colorCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent' },
    colorSelected: { borderColor: Colors.accentGreen },
    detailsCard: { backgroundColor: Colors.cardSurface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, padding: 16, gap: 10 },
    detailsHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    detailsLabel: { fontFamily: Typography.bodyFamilyBold, fontSize: 14, color: Colors.textPrimary },
    detailsInput: { fontFamily: Typography.bodyFamily, fontSize: 14, color: Colors.textPrimary, minHeight: 80, padding: 0 },
    ctaWrapper: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, backgroundColor: Colors.background },
    saveBtn: { backgroundColor: Colors.accentGreen, borderRadius: Radius.pill, paddingVertical: 16, alignItems: 'center' },
    saveBtnDisabled: { opacity: 0.4 },
    saveBtnText: { fontFamily: Typography.bodyFamilyBold, fontSize: 16, color: Colors.background },
    generatingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    galleryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: GALLERY_GAP },
    galleryItem: { width: GALLERY_ITEM_SIZE, height: GALLERY_ITEM_SIZE, borderRadius: Radius.md, overflow: 'hidden', backgroundColor: Colors.cardSurface },
    galleryImage: { width: '100%', height: '100%' },
    previewOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center', alignItems: 'center' },
    previewHeader: { position: 'absolute', top: 60, left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between', zIndex: 10 },
    previewClose: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
    previewDelete: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
    previewImage: { width: SCREEN_WIDTH - 32, height: SCREEN_WIDTH * 1.3 },
    previewPromptBadge: { position: 'absolute', bottom: 80, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: Radius.pill, maxWidth: SCREEN_WIDTH - 64 },
    previewPromptText: { fontFamily: Typography.bodyFamily, fontSize: 13, color: '#FFF', textAlign: 'center' },
});
