import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  Dimensions,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { ArrowLeft, Clock, Sparkles } from 'lucide-react-native';
import { Colors, Radius, Typography } from '@/constants/Colors';
import { useClosetStore } from '@/stores/closetStore';
import { generateDigitalTwin } from '@/lib/ai';

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
  const [activeScene, setActiveScene] = useState('studio');
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const { items, digitalTwin } = useClosetStore();
  const selectedItems = items.slice(0, 3);

  const handleGenerate = async () => {
    if (!digitalTwin?.twin_image_url) {
      Alert.alert('Digital Twin Required', 'Please create your digital twin first in your Profile.');
      return;
    }

    const outfitDesc = selectedItems.map(i => `${i.name} (${i.colors.join(', ')})`).join(', ');
    const sceneLabel = SCENES.find(s => s.key === activeScene)?.label ?? activeScene;
    const fullPrompt = `Outfit: ${outfitDesc}. Scene: ${sceneLabel} setting.${prompt ? ` ${prompt}` : ''}`;

    setGenerating(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const result = await generateDigitalTwin(
        digitalTwin.selfie_url,
        digitalTwin.skin_color,
        digitalTwin.hair_color,
        fullPrompt,
        digitalTwin.body_url,
      );
      Alert.alert('Try-On Complete!', 'Your virtual try-on image has been generated.', [
        { text: 'OK' },
      ]);
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
          {selectedItems.map((item, i) => (
            <Image
              key={item.id}
              source={{ uri: item.image_url }}
              style={[styles.canvasItem, { top: 20 + i * 120, zIndex: selectedItems.length - i }]}
              contentFit="contain"
            />
          ))}
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
  canvasArea: { height: 400, backgroundColor: Colors.background, borderRadius: Radius.lg, position: 'relative', overflow: 'hidden' },
  canvasItem: { position: 'absolute', width: 200, height: 200, alignSelf: 'center' },
  ctaWrapper: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8, alignItems: 'center', gap: 6 },
  generateBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', paddingVertical: 16, borderRadius: Radius.pill, backgroundColor: Colors.accentCoral },
  generateText: { fontFamily: Typography.bodyFamilyBold, fontSize: 16, color: '#FFF' },
  costText: { fontFamily: Typography.bodyFamily, fontSize: 12, color: Colors.textTertiary },
});
