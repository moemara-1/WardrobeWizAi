import { Radius, Typography } from '@/constants/Colors';
import { useThemeColors } from '@/contexts/ThemeContext';
import { analyzeClothingImage, analyzeOutfitImage, ClothingAnalysis, identifyProduct, ItemResearch, ProductIdentification, regenerateCleanImage, researchClothingItem } from '@/lib/ai';
import { classifyGarmentSlot, GarmentSlot, removeBackground } from '@/lib/backgroundRemoval';
import { saveToPermanentStorage } from '@/lib/storage';
import { useClosetStore } from '@/stores/closetStore';
import { ClosetItem, ClothingCategory } from '@/types';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { router, useLocalSearchParams } from 'expo-router';
import { Check, ImageIcon, Sparkles, X } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Pressable,
  Image as RNImage,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ─── Mode: 'single' = add one item, 'fitpic' = multi-item from outfit photo ───

type AnalysisStage = 'analyzing' | 'researching' | 'done' | 'error';

const STAGE_LABELS: Record<AnalysisStage, string> = {
  analyzing: 'Identifying item...',
  researching: 'Researching details...',
  done: 'Ready to save',
  error: 'Analysis failed',
};

const MULTI_STAGE_LABELS: Record<AnalysisStage, string> = {
  analyzing: 'Detecting outfit pieces...',
  researching: 'Researching items...',
  done: 'Review & save items',
  error: 'Analysis failed',
};

const CATEGORIES: ClothingCategory[] = [
  'top', 'bottom', 'outerwear', 'dress', 'shoe',
  'accessory', 'bag', 'hat', 'jewelry', 'other',
];

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Multi-item detected piece ───
interface DetectedPiece {
  id: string;
  name: string;
  category: ClothingCategory;
  brand: string;
  colors: string[];
  confidence: number;
  estimatedValue: string;
  tags: string[];
  garmentType: string;

  selected: boolean; // user can deselect items they don't want to save
  box_2d?: [number, number, number, number];
  cleanImageUri?: string;
  isCleaning?: boolean;
  cleanError?: string;
}

export default function AnalyzeScreen() {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const { imageUri, mode: modeParam } = useLocalSearchParams<{ imageUri: string; mode?: string }>();
  const addItem = useClosetStore((s) => s.addItem);

  const mode = modeParam === 'fitpic' ? 'fitpic' : 'single';

  // ─── Single-item state ───
  const [stage, setStage] = useState<AnalysisStage>('analyzing');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [cleanImageUri, setCleanImageUri] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [category, setCategory] = useState<ClothingCategory>('other');
  const [brand, setBrand] = useState('');
  const [colors, setColors] = useState<string[]>([]);
  const [estimatedValue, setEstimatedValue] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [garmentType, setGarmentType] = useState('');
  const [layerType, setLayerType] = useState<string>('');
  const [confidence, setConfidence] = useState(0);
  const [garmentSlot, setGarmentSlot] = useState<GarmentSlot>('unknown');

  // ─── Multi-item state ───
  const [detectedPieces, setDetectedPieces] = useState<DetectedPiece[]>([]);
  const [overallStyle, setOverallStyle] = useState<string | undefined>();
  const [occasion, setOccasion] = useState<string | undefined>();
  const [lastGenerationTime, setLastGenerationTime] = useState(0);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const imageDimsRef = useRef<{ width: number; height: number } | null>(null);
  const cooldownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const GENERATION_COOLDOWN_MS = 3000;

  // ─── Single-item pipeline ───
  const runSinglePipeline = useCallback(async (uri: string) => {
    setStage('analyzing');
    setErrorMsg(null);

    // Step 1: Identify product (like Google Lens) + basic vision analysis in parallel
    let product: ProductIdentification | null = null;
    let analysis: ClothingAnalysis;

    try {
      const [productResult, analysisResult] = await Promise.allSettled([
        identifyProduct(uri),
        analyzeClothingImage(uri),
      ]);

      if (analysisResult.status === 'fulfilled') {
        analysis = analysisResult.value;
      } else {
        throw new Error('Could not identify this piece. Try a clearer photo or zoom in on the item.');
      }

      if (productResult.status === 'fulfilled') {
        product = productResult.value;
      }

      // Merge product identification with analysis (product ID takes priority for name/brand)
      setName(product?.name || analysis.name);
      setCategory(product?.category || analysis.category);
      setBrand(product?.brand || analysis.brand || '');
      setColors(product?.colors || analysis.colors);
      setConfidence(analysis.confidence);
      setGarmentType(product?.garment_type || analysis.garment_type || '');
      setLayerType(analysis.layer_type || '');

      const resolvedCategory = product?.category || analysis.category;
      const resolvedGarmentType = product?.garment_type || analysis.garment_type || undefined;
      setGarmentSlot(classifyGarmentSlot(resolvedCategory, resolvedGarmentType));

      // Step 2: Crop and Clean
      // We need to wait for product identification to get the bounding box
      let workingUri = uri;

      if (product?.box_2d) {
        try {
          // box is [ymin, xmin, ymax, xmax] in 0-100 scale
          const [ymin, xmin, ymax, xmax] = product.box_2d;

          // Get image dimensions
          const dimensions = await new Promise<{ width: number, height: number }>((resolve, reject) => {
            RNImage.getSize(uri, (width, height) => resolve({ width, height }), reject);
          });

          // Add some padding (margin)
          const padding = 5; // 5%
          const y1 = Math.max(0, ymin - padding);
          const x1 = Math.max(0, xmin - padding);
          const y2 = Math.min(100, ymax + padding);
          const x2 = Math.min(100, xmax + padding);

          const cropX = (x1 / 100) * dimensions.width;
          const cropY = (y1 / 100) * dimensions.height;
          const cropW = ((x2 - x1) / 100) * dimensions.width;
          const cropH = ((y2 - y1) / 100) * dimensions.height;

          const cropped = await manipulateAsync(
            uri,
            [{ crop: { originX: cropX, originY: cropY, width: cropW, height: cropH } }],
            { format: SaveFormat.JPEG, compress: 0.9 }
          );

          workingUri = cropped.uri;
        } catch (e) {
          console.warn('Failed to crop single item:', e);
        }
      }

      setStage('researching');

      const researchPromise = researchClothingItem(
        product?.name || name || analysis!.name,
        product?.brand || analysis!.brand,
        product?.category || analysis!.category,
      ).then((research: ItemResearch) => {
        if (research.estimated_value) setEstimatedValue(String(research.estimated_value));
        if (research.brand && !brand) setBrand(research.brand);
        if (research.tags.length > 0) setTags(research.tags);
        if (research.subcategory) setGarmentType(research.subcategory);
      }).catch(() => { });

      // Generate clean product image from the (potentially cropped) working URI
      const effectiveProduct: ProductIdentification = product || {
        name: analysis!.name,
        brand: analysis!.brand,
        category: analysis!.category,
        garment_type: analysis!.garment_type,
        colors: analysis!.colors,
        material: null,
        description: analysis!.name,
      };

      const cleanImagePromise = regenerateCleanImage(workingUri, effectiveProduct)
        .then((cleanUri) => {
          if (cleanUri) setCleanImageUri(cleanUri);
        })
        .catch(() => {
          // Fallback: try removeBackground (remove.bg API)
          return removeBackground(workingUri)
            .then((r) => {
              if (r.success && r.cleanImageUri) setCleanImageUri(r.cleanImageUri);
            });
        }).catch(() => { });

      await Promise.allSettled([researchPromise, cleanImagePromise]);
      setStage('done');

    } catch (err) {
      setStage('error');
      setErrorMsg(err instanceof Error ? err.message : 'Could not identify this piece. Try a clearer photo or zoom in on the item.');
      return;
    }
  }, []);

  // ─── Multi-item pipeline (fit pic) ───
  const runMultiPipeline = useCallback(async (uri: string) => {
    setStage('analyzing');
    setErrorMsg(null);

    try {
      const result = await analyzeOutfitImage(uri);
      setOverallStyle(result.overallStyle);
      setOccasion(result.occasion);

      if (!result.detections || result.detections.length === 0) {
        setStage('error');
        setErrorMsg('No clothing items detected in image. Make sure the photo clearly shows a person wearing clothes.');
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

      setDetectedPieces(pieces);

      // Get image dimensions for later cropping, auto-generate first piece only
      RNImage.getSize(uri, (width, height) => {
        imageDimsRef.current = { width, height };
        const firstWithBox = pieces.find(p => p.box_2d && p.box_2d.length === 4);
        if (firstWithBox) {
          processPieceImage(uri, firstWithBox.id, firstWithBox.box_2d!, width, height, firstWithBox);
          setLastGenerationTime(Date.now());
          startCooldownTimer();
        }
      }, () => {});

      // Research each piece in parallel for better details
      setStage('researching');
      const researchPromises = pieces.map(async (piece, idx) => {
        try {
          const research = await researchClothingItem(piece.name, piece.brand || null, piece.category);
          setDetectedPieces((prev) =>
            prev.map((p, i) => i === idx ? {
              ...p,
              estimatedValue: research.estimated_value ? String(research.estimated_value) : p.estimatedValue,
              brand: research.brand || p.brand,
              tags: research.tags.length > 0 ? research.tags : p.tags,
              garmentType: research.subcategory || p.garmentType,
            } : p)
          );
        } catch { /* ignore research failures */ }
      });

      await Promise.allSettled(researchPromises);
      setStage('done');
    } catch (err) {
      setStage('error');
      setErrorMsg(err instanceof Error ? err.message : 'Could not detect pieces in this photo. Try a clearer image or zoom in closer.');
    }
  }, []);

  const processPieceImage = async (
    originalUri: string,
    pieceId: string,
    box: [number, number, number, number],
    imgWidth: number,
    imgHeight: number,
    piece: DetectedPiece
  ) => {
    try {
      // box is [ymin, xmin, ymax, xmax] in 0-100 scale
      const [ymin, xmin, ymax, xmax] = box;

      // Add some padding (margin) to the crop to ensure we don't cut off edges
      const padding = 5; // 5% padding
      const y1 = Math.max(0, ymin - padding);
      const x1 = Math.max(0, xmin - padding);
      const y2 = Math.min(100, ymax + padding);
      const x2 = Math.min(100, xmax + padding);

      const cropX = (x1 / 100) * imgWidth;
      const cropY = (y1 / 100) * imgHeight;
      const cropW = ((x2 - x1) / 100) * imgWidth;
      const cropH = ((y2 - y1) / 100) * imgHeight;

      // Crop
      const cropped = await manipulateAsync(
        originalUri,
        [{ crop: { originX: cropX, originY: cropY, width: cropW, height: cropH } }],
        { format: SaveFormat.JPEG, compress: 0.9 }
      );

      setDetectedPieces(prev => prev.map(p => p.id === pieceId ? { ...p, isCleaning: true } : p));

      const bgResult = await removeBackground(cropped.uri);
      const cleanUri = bgResult.success && bgResult.cleanImageUri ? bgResult.cleanImageUri : cropped.uri;

      setDetectedPieces(prev => prev.map(p => p.id === pieceId ? { ...p, cleanImageUri: cleanUri, isCleaning: false } : p));

    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn('Failed to clean piece image:', msg);
      setDetectedPieces(prev => prev.map(p => p.id === pieceId ? { ...p, isCleaning: false, cleanError: msg } : p));
    }
  };

  const startCooldownTimer = useCallback(() => {
    if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
    setCooldownRemaining(GENERATION_COOLDOWN_MS);
    cooldownTimerRef.current = setInterval(() => {
      setCooldownRemaining(prev => {
        if (prev <= 200) {
          if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
          return 0;
        }
        return prev - 200;
      });
    }, 200);
  }, []);

  const generatePieceImage = useCallback((pieceId: string) => {
    if (!imageUri || !imageDimsRef.current) return;
    const now = Date.now();
    if (now - lastGenerationTime < GENERATION_COOLDOWN_MS) return;

    const piece = detectedPieces.find(p => p.id === pieceId);
    if (!piece?.box_2d || piece.isCleaning || piece.cleanImageUri) return;

    setLastGenerationTime(now);
    startCooldownTimer();
    setDetectedPieces(prev => prev.map(p => p.id === pieceId ? { ...p, cleanError: undefined } : p));
    const { width, height } = imageDimsRef.current;
    processPieceImage(imageUri, pieceId, piece.box_2d, width, height, piece);
  }, [imageUri, lastGenerationTime, detectedPieces, startCooldownTimer]);

  useEffect(() => {
    if (!imageUri) return;
    if (mode === 'fitpic') {
      runMultiPipeline(imageUri);
    } else {
      runSinglePipeline(imageUri);
    }
  }, [imageUri, mode, runSinglePipeline, runMultiPipeline]);

  useEffect(() => {
    return () => {
      if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
    };
  }, []);

  // ─── Single-item save ───
  const handleSaveSingle = useCallback(async () => {
    if (!imageUri) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Ensure we save the original image to permanent storage
    let permanentImageUri = imageUri;
    // Check if it's a temp file (heuristic) and not already a remote URL
    if (!imageUri.startsWith('http')) {
      permanentImageUri = await saveToPermanentStorage(imageUri);
    }

    const newItem: ClosetItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      user_id: 'demo',
      image_url: permanentImageUri,
      clean_image_url: cleanImageUri || undefined,
      original_image_url: permanentImageUri,
      name: name || 'Clothing Item',
      category,
      brand: brand || undefined,
      colors,
      detected_confidence: confidence,
      estimated_value: estimatedValue ? Number(estimatedValue) : undefined,
      garment_type: garmentType || undefined,
      layer_type: (layerType as ClosetItem['layer_type']) || undefined,
      tags,
      wear_count: 0,
      favorite: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    addItem(newItem);
    router.back();
  }, [imageUri, cleanImageUri, name, category, brand, colors, confidence, estimatedValue, garmentType, layerType, tags, addItem]);

  // ─── Multi-item save ───
  const handleSaveMulti = useCallback(async () => {
    if (!imageUri) return;
    const selectedPieces = detectedPieces.filter((p) => p.selected);
    if (selectedPieces.length === 0) return;

    const missingClean = selectedPieces.filter(p => !p.cleanImageUri);
    if (missingClean.length > 0) {
      return new Promise<void>((resolve) => {
        Alert.alert(
          'Missing Clean Images',
          `${missingClean.length} selected piece${missingClean.length > 1 ? 's' : ''} don't have generated images yet. Save anyway?`,
          [
            { text: 'Cancel', style: 'cancel', onPress: () => resolve() },
            { text: 'Save Anyway', onPress: () => { doSaveMulti(selectedPieces); resolve(); } },
          ]
        );
      });
    }

    doSaveMulti(selectedPieces);
  }, [imageUri, detectedPieces, addItem]);

  const doSaveMulti = useCallback(async (selectedPieces: DetectedPiece[]) => {
    if (!imageUri) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    let permanentOriginalUri = imageUri;
    if (!imageUri.startsWith('http')) {
      permanentOriginalUri = await saveToPermanentStorage(imageUri);
    }

    for (const piece of selectedPieces) {
      let permanentCleanUri = piece.cleanImageUri;
      if (permanentCleanUri && !permanentCleanUri.startsWith('http')) {
        permanentCleanUri = await saveToPermanentStorage(permanentCleanUri);
      }

      const newItem: ClosetItem = {
        id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        user_id: 'demo',
        image_url: permanentCleanUri || permanentOriginalUri,
        clean_image_url: permanentCleanUri,
        original_image_url: permanentOriginalUri,
        name: piece.name || 'Clothing Item',
        category: piece.category,
        brand: piece.brand || undefined,
        colors: piece.colors,
        detected_confidence: piece.confidence,
        estimated_value: piece.estimatedValue ? Number(piece.estimatedValue) : undefined,
        garment_type: piece.garmentType || undefined,
        tags: piece.tags,
        wear_count: 0,
        favorite: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      addItem(newItem);
    }

    router.back();
  }, [imageUri, addItem]);

  const togglePiece = useCallback((id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDetectedPieces((prev) =>
      prev.map((p) => (p.id === id ? { ...p, selected: !p.selected } : p))
    );
  }, []);

  const updatePiece = useCallback((id: string, updates: Partial<DetectedPiece>) => {
    setDetectedPieces((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
    );
  }, []);

  // ─── No image ───
  if (!imageUri) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>No image provided</Text>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>Go back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const isLoading = stage === 'analyzing' || stage === 'researching';
  const stageLabel = mode === 'fitpic' ? MULTI_STAGE_LABELS : STAGE_LABELS;

  // ─────────── Multi-item (fit pic) UI ───────────
  if (mode === 'fitpic') {
    const selectedCount = detectedPieces.filter((p) => p.selected).length;
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} style={styles.closeBtn}>
            <X size={20} color={Colors.textPrimary} />
          </Pressable>
          <Text style={styles.topTitle}>Import from Fit</Text>
          <Pressable
            onPress={handleSaveMulti}
            style={[styles.saveBtn, (isLoading || selectedCount === 0) && styles.saveBtnDisabled]}
            disabled={isLoading || selectedCount === 0}
          >
            <Check size={18} color={(isLoading || selectedCount === 0) ? Colors.textTertiary : Colors.background} />
            <Text style={[styles.saveText, (isLoading || selectedCount === 0) && styles.saveTextDisabled]}>
              Save {selectedCount > 0 ? `(${selectedCount})` : ''}
            </Text>
          </Pressable>
        </View>

        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Outfit photo */}
          <View style={styles.imageArea}>
            <Image source={{ uri: imageUri }} style={styles.itemImage} contentFit="contain" />
            {isLoading && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color={Colors.accentGreen} />
                <Text style={styles.loadingText}>{stageLabel[stage]}</Text>
              </View>
            )}
          </View>

          {stage === 'error' && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{errorMsg}</Text>
              <Pressable onPress={() => runMultiPipeline(imageUri)}>
                <Text style={styles.retryText}>Retry</Text>
              </Pressable>
            </View>
          )}

          {/* Overall outfit info */}
          {(overallStyle || occasion) && (
            <View style={styles.outfitMeta}>
              {overallStyle && (
                <View style={styles.metaPill}>
                  <Text style={styles.metaPillText}>Style: {overallStyle}</Text>
                </View>
              )}
              {occasion && (
                <View style={styles.metaPill}>
                  <Text style={styles.metaPillText}>Occasion: {occasion}</Text>
                </View>
              )}
            </View>
          )}

          {/* Detected pieces list */}
          {detectedPieces.length > 0 && (
            <View style={styles.piecesSection}>
              <Text style={styles.piecesSectionTitle}>
                {detectedPieces.length} piece{detectedPieces.length !== 1 ? 's' : ''} detected
              </Text>
              {detectedPieces.map((piece) => (
                <Pressable
                  key={piece.id}
                  style={[styles.pieceCard, !piece.selected && styles.pieceCardDeselected]}
                  onPress={() => togglePiece(piece.id)}
                >
                  <View style={styles.pieceCardHeader}>
                    <View style={[styles.pieceCheckbox, piece.selected && styles.pieceCheckboxActive]}>
                      {piece.selected && <Check size={14} color={Colors.background} />}
                    </View>
                    <View style={styles.pieceInfo}>
                      <Text style={styles.pieceName}>{piece.name}</Text>
                      <Text style={styles.pieceCategory}>
                        {piece.category}{piece.brand ? ` · ${piece.brand}` : ''}
                      </Text>
                    </View>
                    <View style={styles.pieceConfidence}>
                      <Text style={styles.pieceConfidenceText}>
                        {Math.round(piece.confidence * 100)}%
                      </Text>
                    </View>
                  </View>
                  {piece.colors.length > 0 && (
                    <View style={styles.pieceColors}>
                      {piece.colors.slice(0, 4).map((c, i) => (
                        <View key={i} style={styles.colorChip}>
                          <Text style={styles.colorChipText}>{c}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                  {piece.cleanImageUri && (
                    <View style={styles.cleanImagePreview}>
                      <Image source={{ uri: piece.cleanImageUri }} style={styles.cleanImageThumb} contentFit="contain" />
                    </View>
                  )}
                  {piece.isCleaning && (
                    <View style={styles.cleaningIndicator}>
                      <ActivityIndicator size="small" color={Colors.accentGreen} />
                      <Text style={styles.cleaningText}>Generating clean image...</Text>
                    </View>
                  )}
                  {!piece.cleanImageUri && !piece.isCleaning && (
                    <View>
                      {piece.cleanError && (
                        <Text style={styles.pieceErrorText}>{piece.cleanError}</Text>
                      )}
                      <Pressable
                        style={[styles.generateBtn, cooldownRemaining > 0 && styles.generateBtnDisabled]}
                        onPress={(e) => { e.stopPropagation(); generatePieceImage(piece.id); }}
                        disabled={cooldownRemaining > 0}
                      >
                        <ImageIcon size={14} color={cooldownRemaining > 0 ? Colors.textTertiary : Colors.accentGreen} />
                        <Text style={[styles.generateBtnText, cooldownRemaining > 0 && styles.generateBtnTextDisabled]}>
                          {cooldownRemaining > 0 ? `Wait ${Math.ceil(cooldownRemaining / 1000)}s...` : piece.cleanError ? 'Retry' : 'Generate Image'}
                        </Text>
                      </Pressable>
                    </View>
                  )}
                  {piece.estimatedValue ? (
                    <Text style={styles.pieceValue}>~${piece.estimatedValue}</Text>
                  ) : null}
                </Pressable>
              ))}
            </View>
          )}

          <View style={{ height: 60 }} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ─────────── Single-item UI ───────────
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.closeBtn}>
          <X size={20} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.topTitle}>Add to Closet</Text>
        <Pressable
          onPress={handleSaveSingle}
          style={[styles.saveBtn, isLoading && styles.saveBtnDisabled]}
          disabled={isLoading}
        >
          <Check size={18} color={isLoading ? Colors.textTertiary : Colors.background} />
          <Text style={[styles.saveText, isLoading && styles.saveTextDisabled]}>Save</Text>
        </Pressable>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.imageArea}>
          <Image
            source={{ uri: cleanImageUri || imageUri }}
            style={styles.itemImage}
            contentFit="contain"
          />
          {isLoading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color={Colors.accentGreen} />
              <Text style={styles.loadingText}>{stageLabel[stage]}</Text>
            </View>
          )}
        </View>

        {stage === 'error' && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{errorMsg}</Text>
            <Pressable onPress={() => runSinglePipeline(imageUri)}>
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        )}

        {confidence > 0 && (
          <View style={styles.badgeRow}>
            <View style={styles.confidenceBadge}>
              <Sparkles size={14} color={Colors.accentGreen} />
              <Text style={styles.confidenceText}>
                {Math.round(confidence * 100)}% confident
              </Text>
            </View>
            {garmentSlot !== 'unknown' && (
              <View style={styles.slotBadge}>
                <Text style={styles.slotBadgeText}>{garmentSlot}</Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.formSection}>
          <Text style={styles.fieldLabel}>Name</Text>
          <TextInput
            style={styles.fieldInput}
            value={name}
            onChangeText={setName}
            placeholder="Item name..."
            placeholderTextColor={Colors.textTertiary}
          />

          <Text style={styles.fieldLabel}>Category</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryRow}
          >
            {CATEGORIES.map((cat) => (
              <Pressable
                key={cat}
                style={[styles.categoryPill, category === cat && styles.categoryPillActive]}
                onPress={() => setCategory(cat)}
              >
                <Text style={[styles.categoryPillText, category === cat && styles.categoryPillTextActive]}>
                  {cat}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <Text style={styles.fieldLabel}>Brand</Text>
          <TextInput
            style={styles.fieldInput}
            value={brand}
            onChangeText={setBrand}
            placeholder="Brand name..."
            placeholderTextColor={Colors.textTertiary}
          />

          <View style={styles.row}>
            <View style={styles.halfField}>
              <Text style={styles.fieldLabel}>Estimated Value</Text>
              <TextInput
                style={styles.fieldInput}
                value={estimatedValue}
                onChangeText={setEstimatedValue}
                placeholder="$"
                placeholderTextColor={Colors.textTertiary}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.halfField}>
              <Text style={styles.fieldLabel}>Type</Text>
              <TextInput
                style={styles.fieldInput}
                value={garmentType}
                onChangeText={setGarmentType}
                placeholder="e.g. polo shirt"
                placeholderTextColor={Colors.textTertiary}
              />
            </View>
          </View>

          {colors.length > 0 && (
            <>
              <Text style={styles.fieldLabel}>Colors</Text>
              <View style={styles.colorRow}>
                {colors.map((c, i) => (
                  <View key={i} style={styles.colorChip}>
                    <Text style={styles.colorChipText}>{c}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {tags.length > 0 && (
            <>
              <Text style={styles.fieldLabel}>Tags</Text>
              <View style={styles.colorRow}>
                {tags.map((t, i) => (
                  <View key={i} style={styles.colorChip}>
                    <Text style={styles.colorChipText}>{t}</Text>
                  </View>
                ))}
              </View>
            </>
          )}
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(C: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.background },
    topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
    closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.cardSurfaceAlt, alignItems: 'center', justifyContent: 'center' },
    topTitle: { fontFamily: Typography.bodyFamilyMedium, fontSize: 16, color: C.textPrimary },
    saveBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 8, borderRadius: Radius.pill, backgroundColor: C.accentGreen },
    saveBtnDisabled: { backgroundColor: C.cardSurfaceAlt },
    saveText: { fontFamily: Typography.bodyFamilyBold, fontSize: 14, color: C.background },
    saveTextDisabled: { color: C.textTertiary },
    scroll: { flex: 1 },
    imageArea: { marginHorizontal: 16, marginBottom: 12, borderRadius: Radius.xl, overflow: 'hidden', backgroundColor: '#FFFFFF', height: 300, alignItems: 'center', justifyContent: 'center' },
    itemImage: { width: '80%', height: '80%' },
    loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(11, 11, 14, 0.6)', alignItems: 'center', justifyContent: 'center', borderRadius: Radius.xl },
    loadingText: { fontFamily: Typography.bodyFamilyMedium, fontSize: 14, color: C.textPrimary, marginTop: 12 },
    errorContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
    errorText: { fontFamily: Typography.bodyFamily, fontSize: 16, color: C.textSecondary },
    backBtn: { padding: 12 },
    backBtnText: { fontFamily: Typography.bodyFamilyMedium, fontSize: 14, color: C.accentGreen },
    errorBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 16, marginBottom: 12, padding: 12, borderRadius: Radius.md, backgroundColor: 'rgba(232, 90, 79, 0.15)' },
    errorBannerText: { fontFamily: Typography.bodyFamily, fontSize: 13, color: C.accentCoral, flex: 1 },
    retryText: { fontFamily: Typography.bodyFamilyBold, fontSize: 13, color: C.accentCoral, marginLeft: 12 },
    confidenceBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.pill, backgroundColor: C.cardSurfaceAlt },
    confidenceText: { fontFamily: Typography.bodyFamilyMedium, fontSize: 13, color: C.accentGreen },
    badgeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 16 },
    slotBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.pill, backgroundColor: C.cardSurfaceAlt, borderWidth: 1, borderColor: C.border },
    slotBadgeText: { fontFamily: Typography.bodyFamilyMedium, fontSize: 12, color: C.textSecondary, textTransform: 'capitalize' },
    formSection: { paddingHorizontal: 16, gap: 4 },
    fieldLabel: { fontFamily: Typography.bodyFamilyBold, fontSize: 13, color: C.textSecondary, marginTop: 12, marginBottom: 4 },
    fieldInput: { fontFamily: Typography.bodyFamily, fontSize: 15, color: C.textPrimary, backgroundColor: C.cardSurface, borderRadius: Radius.input, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: C.border },
    row: { flexDirection: 'row', gap: 12 },
    halfField: { flex: 1 },
    categoryRow: { gap: 8, paddingVertical: 4 },
    categoryPill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.pill, backgroundColor: C.cardSurfaceAlt, borderWidth: 1, borderColor: C.border },
    categoryPillActive: { backgroundColor: C.accentGreen, borderColor: C.accentGreen },
    categoryPillText: { fontFamily: Typography.bodyFamilyMedium, fontSize: 13, color: C.textSecondary, textTransform: 'capitalize' },
    categoryPillTextActive: { color: C.background },
    colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingVertical: 4 },
    colorChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.pill, backgroundColor: C.cardSurfaceAlt, borderWidth: 1, borderColor: C.border },
    colorChipText: { fontFamily: Typography.bodyFamily, fontSize: 12, color: C.textPrimary, textTransform: 'capitalize' },
    // ─── Multi-item (fit pic) styles ───
    outfitMeta: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 12, flexWrap: 'wrap' },
    metaPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.pill, backgroundColor: C.cardSurfaceAlt, borderWidth: 1, borderColor: C.border },
    metaPillText: { fontFamily: Typography.bodyFamilyMedium, fontSize: 12, color: C.textSecondary, textTransform: 'capitalize' },
    piecesSection: { paddingHorizontal: 16, gap: 10 },
    piecesSectionTitle: { fontFamily: Typography.bodyFamilyBold, fontSize: 15, color: C.textPrimary, marginBottom: 4 },
    pieceCard: { backgroundColor: C.cardSurface, borderRadius: Radius.lg, padding: 14, borderWidth: 1, borderColor: C.border, gap: 8 },
    pieceCardDeselected: { opacity: 0.45, borderColor: C.border },
    pieceCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    pieceCheckbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: C.textTertiary, alignItems: 'center', justifyContent: 'center' },
    pieceCheckboxActive: { backgroundColor: C.accentGreen, borderColor: C.accentGreen },
    pieceInfo: { flex: 1, gap: 2 },
    pieceName: { fontFamily: Typography.bodyFamilyBold, fontSize: 15, color: C.textPrimary },
    pieceCategory: { fontFamily: Typography.bodyFamily, fontSize: 12, color: C.textSecondary, textTransform: 'capitalize' },
    pieceConfidence: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: Radius.pill, backgroundColor: C.cardSurfaceAlt },
    pieceConfidenceText: { fontFamily: Typography.bodyFamilyMedium, fontSize: 11, color: C.accentGreen },
    pieceColors: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    pieceValue: { fontFamily: Typography.bodyFamilyMedium, fontSize: 13, color: C.textSecondary },
    cleanImagePreview: { marginTop: 8, height: 100, backgroundColor: '#FFFFFF', borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border },
    cleanImageThumb: { width: '100%', height: '100%' },
    cleaningIndicator: { marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 6 },
    cleaningText: { fontFamily: Typography.bodyFamily, fontSize: 12, color: C.textTertiary },
    generateBtn: { marginTop: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, borderRadius: Radius.md, borderWidth: 1, borderColor: C.accentGreen, backgroundColor: `${C.accentGreen}10` },
    generateBtnDisabled: { borderColor: C.border, backgroundColor: C.cardSurfaceAlt },
    generateBtnText: { fontFamily: Typography.bodyFamilyMedium, fontSize: 12, color: C.accentGreen },
    generateBtnTextDisabled: { color: C.textTertiary },
    pieceErrorText: { fontFamily: Typography.bodyFamily, fontSize: 11, color: C.accentCoral, marginTop: 4, marginBottom: 2 },
  });
}
