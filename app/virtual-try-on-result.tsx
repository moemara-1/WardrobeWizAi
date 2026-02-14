import { Colors, Radius, Typography } from '@/constants/Colors';
import { generateOutfitTwin } from '@/lib/ai';
import { useClosetStore } from '@/stores/closetStore';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Clock, Sparkles } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const SCENES = [
  { key: 'studio', label: 'Studio' },
  { key: 'penthouse', label: 'Penthouse' },
  { key: 'yacht', label: 'Yacht' },
  { key: 'golf', label: 'Golf' },
  { key: 'tennis', label: 'Tennis' },
  { key: 'party', label: 'House Party' },
] as const;

export default function VirtualTryOnResultScreen() {
  const { selectedItems: selectedItemIds } = useLocalSearchParams<{ selectedItems: string }>();
  const [activeScene, setActiveScene] = useState('studio');
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const { items, digitalTwin } = useClosetStore();

  // Resolve the selected items from the IDs passed via route params
  const selectedItems = useMemo(() => {
    const ids = selectedItemIds?.split(',').filter(Boolean) ?? [];
    return items.filter(i => ids.includes(i.id));
  }, [selectedItemIds, items]);

  const handleGenerate = async () => {
    if (!digitalTwin?.twin_image_url) {
      Alert.alert('Digital Twin Required', 'Please create your digital twin first in your Profile.');
      return;
    }

    if (selectedItems.length === 0) {
      Alert.alert('No Items', 'Please go back and select clothing items to try on.');
      return;
    }

    const sceneLabel = SCENES.find(s => s.key === activeScene)?.label ?? activeScene;
    const scenePrompt = `${sceneLabel} setting.${prompt ? ` ${prompt}` : ''}`;

    setGenerating(true);
    setResultImage(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      // Build outfit items using clean_image_url (white bg) when available
      const outfitItems = selectedItems.map(item => ({
        name: item.name,
        category: item.category,
        imageUri: item.clean_image_url || item.image_url,
      }));

      const resultUrl = await generateOutfitTwin(
        digitalTwin.twin_image_url,
        outfitItems,
        scenePrompt,
        digitalTwin.selfie_url || digitalTwin.twin_image_url,
      );
      setResultImage(resultUrl);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      Alert.alert('Generation Failed', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.header}>
        <Pressable
          style={styles.backBtn}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }}
        >
          <ArrowLeft size={20} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Virtual Try On</Text>
        <View style={styles.headerRight}>
          <Pressable style={styles.iconBtn}>
            <Clock size={18} color={Colors.textPrimary} />
          </Pressable>
          <View style={styles.avatarSmall}>
            <Text style={styles.avatarSmallText}>U</Text>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Scene Selector */}
        <Text style={styles.sectionLabel}>Scene</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sceneRow}>
          {SCENES.map(({ key, label }) => (
            <Pressable
              key={key}
              style={[styles.sceneChip, activeScene === key && styles.sceneChipActive]}
              onPress={() => { Haptics.selectionAsync(); setActiveScene(key); }}
            >
              <Text style={[styles.sceneLabel, activeScene === key && styles.sceneLabelActive]}>{label}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Prompt Input */}
        <View style={styles.promptBar}>
          <Text style={styles.aiPrefix}>AI</Text>
          <TextInput
            style={styles.promptInput}
            placeholder="Describe the scene..."
            placeholderTextColor={Colors.textTertiary}
            value={prompt}
            onChangeText={setPrompt}
          />
        </View>

        {/* Preview Canvas */}
        <View style={styles.canvasArea}>
          {resultImage ? (
            <Image
              source={{ uri: resultImage }}
              style={styles.resultImage}
              contentFit="contain"
            />
          ) : (
            <View style={styles.selectedItemsGrid}>
              {selectedItems.map((item) => (
                <Image
                  key={item.id}
                  source={{ uri: item.clean_image_url || item.image_url }}
                  style={styles.selectedItemThumb}
                  contentFit="contain"
                />
              ))}
              {selectedItems.length === 0 && (
                <Text style={styles.emptyCanvasText}>No items selected</Text>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Generate CTA */}
      <SafeAreaView edges={['bottom']} style={styles.ctaWrapper}>
        <Pressable
          style={[styles.generateBtn, generating && { opacity: 0.6 }]}
          onPress={handleGenerate}
          disabled={generating}
        >
          {generating ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Sparkles size={18} color="#FFF" />
          )}
          <Text style={styles.generateText}>{generating ? 'Generating...' : 'Generate Image'}</Text>
        </Pressable>
        <Text style={styles.costText}>Costs 1 AI credit</Text>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 8 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.cardSurfaceAlt, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border },
  headerTitle: { fontFamily: Typography.bodyFamilyBold, fontSize: 18, color: Colors.textPrimary },
  headerRight: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  iconBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.cardSurfaceAlt, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border },
  avatarSmall: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.accentGreen, alignItems: 'center', justifyContent: 'center' },
  avatarSmallText: { fontFamily: Typography.bodyFamilyBold, fontSize: 13, color: '#FFF' },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 120 },
  sectionLabel: { fontFamily: Typography.bodyFamilyMedium, fontSize: 14, color: Colors.textSecondary, marginTop: 8, marginBottom: 8 },
  sceneRow: { gap: 8, marginBottom: 12 },
  sceneChip: { width: 64, height: 64, borderRadius: Radius.md, backgroundColor: Colors.cardSurfaceAlt, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border },
  sceneChipActive: { borderColor: Colors.textPrimary, backgroundColor: Colors.cardSurface },
  sceneLabel: { fontFamily: Typography.bodyFamily, fontSize: 11, color: Colors.textSecondary, textAlign: 'center' },
  sceneLabelActive: { color: Colors.textPrimary },
  promptBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.cardSurfaceAlt, borderRadius: Radius.input, paddingHorizontal: 14, paddingVertical: 10, gap: 8, borderWidth: 1, borderColor: Colors.border, marginBottom: 16 },
  aiPrefix: { fontFamily: Typography.bodyFamilyBold, fontSize: 14, color: Colors.textTertiary },
  promptInput: { flex: 1, fontFamily: Typography.bodyFamily, fontSize: 14, color: Colors.textPrimary, padding: 0 },
  canvasArea: { height: 400, backgroundColor: Colors.cardSurfaceAlt, borderRadius: Radius.lg, position: 'relative', overflow: 'hidden', borderWidth: 1, borderColor: Colors.border },
  resultImage: { width: '100%', height: '100%' },
  selectedItemsGrid: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', padding: 16, gap: 12 },
  selectedItemThumb: { width: 100, height: 120, borderRadius: Radius.sm },
  emptyCanvasText: { fontFamily: Typography.bodyFamily, fontSize: 14, color: Colors.textTertiary },
  canvasItem: { position: 'absolute', width: 200, height: 200, alignSelf: 'center' },
  ctaWrapper: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8, alignItems: 'center', gap: 6 },
  generateBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', paddingVertical: 16, borderRadius: Radius.pill, backgroundColor: Colors.accentCoral },
  generateText: { fontFamily: Typography.bodyFamilyBold, fontSize: 16, color: '#FFF' },
  costText: { fontFamily: Typography.bodyFamily, fontSize: 12, color: Colors.textTertiary },
});
