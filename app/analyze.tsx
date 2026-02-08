import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  Image,
  TextInput,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Sparkles, Camera } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { Colors, Radius, Spacing, Typography } from '@/constants/Colors';
import { AIOverlay } from '@/components/ui/AIOverlay';
import { WornItemCard } from '@/components/ui/WornItemCard';
import { usePhotoAnalyzer } from '@/hooks/usePhotoAnalyzer';
import { useClosetStore } from '@/stores/closetStore';
import { ClosetItem } from '@/types';

const FUN_FACTS = [
  'The average person only wears 20% of their wardrobe regularly.',
  'Coco Chanel popularized the "little black dress" in 1926.',
  'Denim jeans were originally made for gold miners in the 1850s.',
  'The fashion industry is the second-largest polluter in the world.',
];

export default function AnalyzeScreen() {
  const params = useLocalSearchParams<{ imageUri?: string }>();
  const [imageUri, setImageUri] = useState<string | null>(params.imageUri || null);
  const [outfitName, setOutfitName] = useState('');
  const { analyze, isAnalyzing, detections, progress, clearDetections } = usePhotoAnalyzer();
  const { addItem, items } = useClosetStore();
  const [funFact] = useState(FUN_FACTS[Math.floor(Math.random() * FUN_FACTS.length)]);

  useEffect(() => {
    if (imageUri) {
      analyze(imageUri, { useCloudFallback: true, enhanceWithAI: true });
    }
  }, [imageUri]);

  const pickImage = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      clearDetections();
      setImageUri(result.assets[0].uri);
    }
  }, [clearDetections]);

  const handlePost = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    for (const det of detections) {
      const newItem: ClosetItem = {
        id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        user_id: 'demo',
        image_url: imageUri!,
        name: det.suggested_name || `${det.category} item`,
        category: det.category,
        colors: det.colors,
        detected_confidence: det.confidence,
        tags: [],
        wear_count: 0,
        favorite: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      addItem(newItem);
    }
    router.back();
  }, [detections, imageUri, addItem]);

  const wornItems = items.slice(0, 4);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.closeBtn}>
          <X size={20} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.topTitle}>Outfit Analyzer</Text>
        <Pressable
          onPress={handlePost}
          style={[styles.postBtn, !imageUri && styles.postBtnDisabled]}
          disabled={!imageUri}
        >
          <Text style={[styles.postText, !imageUri && styles.postTextDisabled]}>Post</Text>
        </Pressable>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <Pressable style={styles.imageArea} onPress={pickImage}>
          {imageUri ? (
            <View style={styles.imageWrapper}>
              <Image source={{ uri: imageUri }} style={styles.outfitImage} resizeMode="cover" />
              {isAnalyzing && (
                <View style={styles.loadingOverlay}>
                  <ActivityIndicator size="large" color={Colors.accentGreen} />
                  <Text style={styles.loadingText}>
                    Analyzing... {Math.round(progress * 100)}%
                  </Text>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.placeholder}>
              <Camera size={40} color={Colors.textTertiary} />
              <Text style={styles.placeholderText}>Tap to add outfit photo</Text>
            </View>
          )}
        </Pressable>

        {imageUri && <AIOverlay funFact={funFact} isLoading={isAnalyzing} />}

        <Pressable style={styles.analyzeBtn} onPress={pickImage}>
          <Sparkles size={18} color={Colors.background} />
          <Text style={styles.analyzeBtnText}>Analyze Outfit</Text>
        </Pressable>

        <View style={styles.nameSection}>
          <TextInput
            style={styles.nameInput}
            placeholder="Name this outfit..."
            placeholderTextColor={Colors.textTertiary}
            value={outfitName}
            onChangeText={setOutfitName}
          />
        </View>

        {wornItems.length > 0 && (
          <View style={styles.wornSection}>
            <Text style={styles.sectionTitle}>Worn Items</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.wornScroll}>
              {wornItems.map((item) => (
                <WornItemCard
                  key={item.id}
                  imageUrl={item.image_url}
                  name={item.name}
                  brand={item.brand}
                  badge={item.category}
                />
              ))}
            </ScrollView>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.cardSurfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitle: {
    fontFamily: Typography.bodyFamilyMedium,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  postBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Radius.pill,
    backgroundColor: Colors.accentGreen,
  },
  postBtnDisabled: {
    backgroundColor: Colors.cardSurfaceAlt,
  },
  postText: {
    fontFamily: Typography.bodyFamilyBold,
    fontSize: 14,
    color: Colors.background,
  },
  postTextDisabled: {
    color: Colors.textTertiary,
  },
  scroll: {
    flex: 1,
  },
  imageArea: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    backgroundColor: Colors.cardSurface,
    minHeight: 300,
  },
  imageWrapper: {
    position: 'relative',
  },
  outfitImage: {
    width: '100%',
    aspectRatio: 0.75,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(11, 11, 14, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.xl,
  },
  loadingText: {
    fontFamily: Typography.bodyFamilyMedium,
    fontSize: 14,
    color: Colors.textPrimary,
    marginTop: 12,
  },
  placeholder: {
    flex: 1,
    minHeight: 300,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  placeholderText: {
    fontFamily: Typography.bodyFamily,
    fontSize: 15,
    color: Colors.textTertiary,
  },
  analyzeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginVertical: 12,
    paddingVertical: 14,
    borderRadius: Radius.pill,
    backgroundColor: Colors.textPrimary,
  },
  analyzeBtnText: {
    fontFamily: Typography.bodyFamilyBold,
    fontSize: 15,
    color: Colors.background,
  },
  nameSection: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  nameInput: {
    fontFamily: Typography.serifFamily,
    fontSize: 20,
    color: Colors.textPrimary,
    backgroundColor: Colors.cardSurface,
    borderRadius: Radius.input,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  wornSection: {
    paddingLeft: 16,
  },
  sectionTitle: {
    fontFamily: Typography.bodyFamilyBold,
    fontSize: 16,
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  wornScroll: {
    paddingRight: 16,
  },
});
