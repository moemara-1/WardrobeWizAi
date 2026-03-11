import { Radius, Typography } from '@/constants/Colors';
import { useThemeColors } from '@/contexts/ThemeContext';
import { analyzeCleanItem, analyzeOutfitImage, ProductIdentification, regenerateCleanImage, researchClothingItem } from '@/lib/ai';
import { classifyGarmentSlot, GarmentSlot, removeBackground } from '@/lib/backgroundRemoval';
import { uploadImage } from '@/lib/storage';
import { useClosetStore } from '@/stores/closetStore';
import { ClosetItem, ClothingCategory } from '@/types';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { Check, ImageIcon, RefreshCw, Sparkles, X } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Easing,
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

type AnalysisStage = 'analyzing' | 'researching' | 'enhancing' | 'done' | 'error';

type StepStatus = 'pending' | 'active' | 'done' | 'error';
interface PipelineStep {
  key: string;
  label: string;
  status: StepStatus;
}

const SINGLE_STEPS: PipelineStep[] = [
  { key: 'clean', label: 'Generating clean image', status: 'pending' },
  { key: 'research', label: 'Extracting details', status: 'pending' },
  { key: 'upload', label: 'Saving', status: 'pending' },
];

const MULTI_STEPS: PipelineStep[] = [
  { key: 'detect', label: 'Detecting outfit pieces', status: 'pending' },
  { key: 'generate', label: 'Generating piece images', status: 'pending' },
  { key: 'research', label: 'Researching items', status: 'pending' },
  { key: 'upload', label: 'Saving', status: 'pending' },
];

// ─── ProgressStepper component ───
function ProgressStepper({ steps, colors: C }: { steps: PipelineStep[]; colors: any }) {
  const spin = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 1000, easing: Easing.linear, useNativeDriver: true })
    ).start();
  }, [spin]);
  const rotation = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <View style={{ gap: 2 }}>
      {steps.map((step, i) => {
        const isLast = i === steps.length - 1;
        const isDone = step.status === 'done';
        const isActive = step.status === 'active';
        const isError = step.status === 'error';
        const isPending = step.status === 'pending';
        return (
          <View key={step.key} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
            {/* Indicator column */}
            <View style={{ alignItems: 'center', width: 22 }}>
              {isDone ? (
                <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: C.accentGreen, alignItems: 'center', justifyContent: 'center' }}>
                  <Check size={13} color="#FFF" />
                </View>
              ) : isActive ? (
                <Animated.View style={{ transform: [{ rotate: rotation }] }}>
                  <RefreshCw size={18} color={C.accentGreen} />
                </Animated.View>
              ) : isError ? (
                <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: C.accentCoral, alignItems: 'center', justifyContent: 'center' }}>
                  <X size={13} color="#FFF" />
                </View>
              ) : (
                <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: C.border }} />
              )}
              {/* Connector line */}
              {!isLast && (
                <View style={{ width: 2, height: 14, backgroundColor: isDone ? C.accentGreen : C.border, marginVertical: 1 }} />
              )}
            </View>
            {/* Label */}
            <Text style={{
              fontFamily: Typography.bodyFamilyMedium,
              fontSize: 13,
              color: isDone ? C.accentGreen : isActive ? C.textPrimary : isError ? C.accentCoral : C.textTertiary,
              paddingTop: 2,
            }}>
              {step.label}{isActive ? '...' : ''}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

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
  const { imageUri, mode: modeParam, pendingImportId } = useLocalSearchParams<{ imageUri: string; mode?: string; pendingImportId?: string }>();
  const { addItem, userId } = useClosetStore();

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
  const [isReEnhancing, setIsReEnhancing] = useState(false);
  const singleProductRef = useRef<ProductIdentification | null>(null);
  const isResearchingRef = useRef(true);

  // ─── Multi-item state ───
  const [detectedPieces, setDetectedPieces] = useState<DetectedPiece[]>([]);
  const [overallStyle, setOverallStyle] = useState<string | undefined>();
  const [occasion, setOccasion] = useState<string | undefined>();
  const [lastGenerationTime, setLastGenerationTime] = useState(0);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const imageDimsRef = useRef<{ width: number; height: number } | null>(null);
  const cooldownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const savedItemIdRef = useRef<string | null>(null);

  // ─── Pipeline progress ───
  const [pipelineSteps, setPipelineSteps] = useState<PipelineStep[]>(
    () => (mode === 'fitpic' ? MULTI_STEPS : SINGLE_STEPS).map(s => ({ ...s }))
  );

  const setStep = useCallback((key: string, status: StepStatus) => {
    setPipelineSteps(prev => prev.map(s => s.key === key ? { ...s, status } : s));
  }, []);

  const GENERATION_COOLDOWN_MS = 3000;

  // ─── Ultra-Fast Single-item pipeline ───
  const runSinglePipeline = useCallback(async (uri: string) => {
    setStage('enhancing');
    setErrorMsg(null);
    setStep('clean', 'active');
    isResearchingRef.current = true;

    let cleanUri = uri; // Fallback if generation completely fails

    // Step 1: Instantly generate clean image from raw photo
    try {
      const resultUri = await regenerateCleanImage(uri, null);
      if (resultUri) {
        cleanUri = resultUri;
        setCleanImageUri(resultUri);
      }
    } catch (e) {
      try {
        const r = await removeBackground(uri);
        if (r.success && r.cleanImageUri) {
          cleanUri = r.cleanImageUri;
          setCleanImageUri(r.cleanImageUri);
        }
      } catch (e2) { }
    }
    setStep('clean', 'done');
    setStage('done');

    // Start Step 2 (Research Details) in the background using the CLEAN photo 
    (async () => {
      try {
        setStep('research', 'active');
        const result = await analyzeCleanItem(cleanUri);
        const product = result.product;
        const analysis = result.analysis;
        singleProductRef.current = product;

        // Only update if user hasn't typed their own values yet (or overwrite defaults)
        setName((prev) => prev ? prev : (product.name || analysis.name || 'Clothing Item'));
        setCategory((prev) => prev !== 'other' ? prev : (product.category || analysis.category || 'other'));
        setBrand((prev) => prev ? prev : (product.brand || analysis.brand || ''));
        setColors((prev) => prev.length > 0 ? prev : (product.colors || analysis.colors || []));
        setConfidence(analysis.confidence);
        setGarmentType((prev) => prev ? prev : (product.garment_type || analysis.garment_type || ''));
        setLayerType(analysis.layer_type || '');

        const resolvedCategory = product.category || analysis.category;
        const resolvedGarmentType = product.garment_type || analysis.garment_type || undefined;
        setGarmentSlot(classifyGarmentSlot(resolvedCategory as any, resolvedGarmentType));

        // Quick text research for value/tags using the extracted name/brand
        const research = await researchClothingItem(
          product.name,
          product.brand,
          product.category,
        );
        if (research.estimated_value) setEstimatedValue((prev) => prev ? prev : String(research.estimated_value));
        if (research.brand) setBrand((prev) => prev ? prev : (research.brand || ''));
        if (research.tags && research.tags.length > 0) setTags((prev) => prev.length > 0 ? prev : research.tags);
        if (research.subcategory) setGarmentType((prev) => prev ? prev : (research.subcategory || ''));

        isResearchingRef.current = false;

        // If the user already tapped Save while this was running, we manually patch the item.
        if (savedItemIdRef.current) {
          const updateClosetItem = useClosetStore.getState().updateItem;
          // We don't want to blindly overwrite, so we merge
          const updates: Partial<ClosetItem> = {};

          updates.name = product.name || analysis.name || 'Clothing Item';
          updates.category = (product.category || analysis.category || 'other') as ClothingCategory;
          updates.brand = product.brand || analysis.brand || research.brand || undefined;
          updates.colors = product.colors || analysis.colors || [];
          updates.detected_confidence = analysis.confidence;
          updates.garment_type = product.garment_type || analysis.garment_type || research.subcategory || undefined;
          updates.layer_type = (analysis.layer_type as ClosetItem['layer_type']) || undefined;
          updates.is_researching = false;

          if (research.estimated_value) updates.estimated_value = Number(research.estimated_value);
          if (research.tags && research.tags.length > 0) updates.tags = research.tags;

          updateClosetItem(savedItemIdRef.current, updates);
        }

      } catch (err) {
        console.warn('Failed to extract details from clean image:', err);
        isResearchingRef.current = false;
        if (savedItemIdRef.current) {
          useClosetStore.getState().updateItem(savedItemIdRef.current, { is_researching: false });
        }
      }
      setStep('research', 'done');
    })();

  }, [setStep]);

  // ─── Multi-item pipeline (fit pic) ───
  const runMultiPipeline = useCallback(async (uri: string) => {
    setStage('analyzing');
    setErrorMsg(null);
    setStep('detect', 'active');

    try {
      const result = await analyzeOutfitImage(uri);
      setOverallStyle(result.overallStyle);
      setOccasion(result.occasion);

      if (!result.detections || result.detections.length === 0) {
        setStage('error');
        setStep('detect', 'error');
        setErrorMsg('No clothing items detected in image. Make sure the photo clearly shows a person wearing clothes.');
        return;
      }

      const pieces: DetectedPiece[] = result.detections.map((det, idx: number) => ({
        id: `piece - ${Date.now()} -${idx} `,
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
      setStep('detect', 'done');

      // Step 2: Generate first piece image (Await this before doing rest of research)
      setStage('enhancing');
      setStep('generate', 'active');

      const dimensions = await new Promise<{ width: number, height: number }>((resolve, reject) => {
        RNImage.getSize(uri, (width, height) => resolve({ width, height }), reject);
      });
      imageDimsRef.current = dimensions;

      const firstWithBox = pieces.find(p => p.box_2d && p.box_2d.length === 4);
      if (firstWithBox) {
        // Explicitly await the first generation so the image pops into the UI fast
        await processPieceImage(uri, firstWithBox.id, firstWithBox.box_2d!, dimensions.width, dimensions.height, firstWithBox);
        setLastGenerationTime(Date.now());
        startCooldownTimer();
      }
      setStep('generate', 'done');

      // The deep research will be done in the background after the user hits "Save"
      setStage('done');
    } catch (err) {
      setStage('error');
      setErrorMsg(err instanceof Error ? err.message : 'Could not detect pieces in this photo. Try a clearer image or zoom in closer.');
    }
  }, [setStep]);

  const processPieceImage = async (
    originalUri: string,
    pieceId: string,
    _box: [number, number, number, number],
    _imgWidth: number,
    _imgHeight: number,
    piece: DetectedPiece
  ) => {
    try {
      setDetectedPieces(prev => prev.map(p => p.id === pieceId ? { ...p, isCleaning: true } : p));

      const colorDesc = piece.colors.length > 0 ? piece.colors.join(' and ') : '';
      const brandDesc = piece.brand ? `${piece.brand} ` : '';
      const richDescription = `${brandDesc}${colorDesc} ${piece.name} `.trim();

      const tempProduct: ProductIdentification = {
        name: piece.name,
        brand: piece.brand || null,
        category: piece.category,
        garment_type: piece.garmentType || null,
        colors: piece.colors,
        material: null,
        description: `Extract ONLY the ${richDescription} from this outfit photo.Remove the person, background, and all other clothing items.Show just the ${piece.category} item alone on a white background, fully visible from top to bottom.`,
      };

      const cleanUri = await regenerateCleanImage(originalUri, tempProduct, 'detect-fit-seedream');

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

  const reEnhancePiece = useCallback((pieceId: string) => {
    if (!imageUri || !imageDimsRef.current) return;
    const piece = detectedPieces.find(p => p.id === pieceId);
    if (!piece?.box_2d || piece.isCleaning) return;

    setDetectedPieces(prev => prev.map(p => p.id === pieceId ? { ...p, cleanImageUri: undefined, cleanError: undefined } : p));
    const { width, height } = imageDimsRef.current;
    processPieceImage(imageUri, pieceId, piece.box_2d, width, height, piece);
  }, [imageUri, detectedPieces]);

  useEffect(() => {
    if (pendingImportId) {
      const pendingImport = useClosetStore.getState().pendingImports.find((pi) => pi.id === pendingImportId);
      if (pendingImport) {
        setDetectedPieces(pendingImport.pieces);
        if (pendingImport.overallStyle) setOverallStyle(pendingImport.overallStyle);
        if (pendingImport.occasion) setOccasion(pendingImport.occasion);
        setStep('detect', 'done');

        // Grab image dimensions too (since detection is skipped)
        if (imageUri) {
          RNImage.getSize(imageUri, (width, height) => {
            imageDimsRef.current = { width, height };
          });
        }

        setStage('done');
        return;
      }
    }

    if (!imageUri) return;
    if (mode === 'fitpic') {
      runMultiPipeline(imageUri);
    } else {
      runSinglePipeline(imageUri);
    }
  }, [imageUri, mode, pendingImportId, runSinglePipeline, runMultiPipeline]);

  useEffect(() => {
    return () => {
      if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
    };
  }, []);

  // ─── Re-enhance single item ───
  const handleReEnhanceSingle = useCallback(async () => {
    if (!imageUri || isReEnhancing) return;
    setIsReEnhancing(true);
    try {
      const product = singleProductRef.current || {
        name: name || 'Clothing Item',
        brand: brand || null,
        category,
        garment_type: garmentType || null,
        colors,
        material: null,
        description: name || 'Clothing item',
      };
      const newCleanUri = await regenerateCleanImage(imageUri, product);
      if (newCleanUri) setCleanImageUri(newCleanUri);
    } catch (e) {
      Alert.alert('Re-enhance failed', 'Could not regenerate the image. Please try again.');
    } finally {
      setIsReEnhancing(false);
    }
  }, [imageUri, isReEnhancing, name, brand, category, garmentType, colors]);

  // ─── Single-item save ───
  const handleSaveSingle = useCallback(async () => {
    if (!imageUri || !userId) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    setStage('enhancing');
    setStep('upload', 'active');

    try {
      const baseId = `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const newItem: ClosetItem = {
        id: baseId,
        user_id: userId,
        image_url: cleanImageUri || imageUri,
        clean_image_url: cleanImageUri || undefined,
        original_image_url: imageUri,
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
        is_researching: isResearchingRef.current,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      savedItemIdRef.current = newItem.id;
      addItem(newItem);
      setStep('upload', 'done');
      router.back();

      // Background upload
      (async () => {
        const uploadPromises = [];
        let permanentOriginalUri = imageUri;
        let finalCleanUri = cleanImageUri;

        if (!imageUri.startsWith('http')) {
          uploadPromises.push(
            uploadImage(imageUri, userId, 'item_orig').then(uri => { permanentOriginalUri = uri; })
          );
        }
        if (cleanImageUri && !cleanImageUri.startsWith('http')) {
          uploadPromises.push(
            uploadImage(cleanImageUri, userId, 'item_clean').then(uri => { finalCleanUri = uri; })
          );
        }

        await Promise.all(uploadPromises);

        // Update the item safely
        if (permanentOriginalUri !== imageUri || finalCleanUri !== cleanImageUri) {
          useClosetStore.getState().updateItem(baseId, {
            image_url: finalCleanUri || permanentOriginalUri,
            clean_image_url: finalCleanUri || undefined,
            original_image_url: permanentOriginalUri,
          });
        }
      })();
    } catch (e) {
      setStep('upload', 'error');
      setStage('done');
      console.error('Failed to save or upload image:', e);
      Alert.alert('Save Failed', 'Could not upload the image. Please try again.');
    }
  }, [imageUri, cleanImageUri, name, category, brand, colors, confidence, estimatedValue, garmentType, layerType, tags, addItem, userId, setStep]);

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
    if (!imageUri || !userId) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    setStage('enhancing');
    setStep('upload', 'active');

    try {
      const savedPieces = selectedPieces.map(piece => {
        const newItem: ClosetItem = {
          id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          user_id: userId,
          image_url: piece.cleanImageUri || imageUri,
          clean_image_url: piece.cleanImageUri,
          original_image_url: imageUri,
          name: piece.name || 'Clothing Item',
          category: piece.category,
          brand: piece.brand || undefined,
          colors: piece.colors || [],
          detected_confidence: piece.confidence,
          estimated_value: piece.estimatedValue ? Number(piece.estimatedValue) : undefined,
          garment_type: piece.garmentType || undefined,
          tags: piece.tags || [],
          wear_count: 0,
          favorite: false,
          is_researching: true, // Multi-import always does deep research in background
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        addItem(newItem);
        return { item: newItem, originalPiece: piece };
      });

      setStep('upload', 'done');
      router.back();

      if (pendingImportId) {
        useClosetStore.getState().removePendingImport(pendingImportId);
      }

      // Background upload and deep AI research
      (async () => {
        let permanentOriginalUri = imageUri;
        const uploadPromises = [];

        if (!imageUri.startsWith('http')) {
          uploadPromises.push(
            uploadImage(imageUri, userId, 'fitpic_orig').then(uri => {
              permanentOriginalUri = uri;
            })
          );
        }

        const cleanUris: Record<string, string | undefined> = {};

        for (const piece of selectedPieces) {
          if (piece.cleanImageUri && !piece.cleanImageUri.startsWith('http')) {
            uploadPromises.push(
              uploadImage(piece.cleanImageUri, userId, 'item_clean').then(uri => {
                cleanUris[piece.id] = uri;
              })
            );
          } else {
            cleanUris[piece.id] = piece.cleanImageUri;
          }
        }

        await Promise.all(uploadPromises);

        // Research each piece and update store
        const updateStore = useClosetStore.getState().updateItem;
        for (const { item, originalPiece } of savedPieces) {
          const permanentCleanUri = cleanUris[originalPiece.id];
          let imageUpdates: Partial<ClosetItem> = {};

          if (permanentCleanUri !== originalPiece.cleanImageUri || permanentOriginalUri !== imageUri) {
            imageUpdates = {
              image_url: permanentCleanUri || permanentOriginalUri,
              clean_image_url: permanentCleanUri,
              original_image_url: permanentOriginalUri,
            };
          }

          // Initial update for image URIs if changed
          if (Object.keys(imageUpdates).length > 0) {
            updateStore(item.id, imageUpdates);
          }

          // Perform deep AI research for this piece quietly
          try {
            const research = await researchClothingItem(
              originalPiece.name,
              originalPiece.brand || null,
              originalPiece.category
            );

            const researchUpdates: Partial<ClosetItem> = {
              is_researching: false,
            };

            if (research.estimated_value) researchUpdates.estimated_value = Number(research.estimated_value);
            if (research.brand) researchUpdates.brand = research.brand;
            if (research.tags && research.tags.length > 0) researchUpdates.tags = research.tags;
            if (research.subcategory) researchUpdates.garment_type = research.subcategory;

            updateStore(item.id, researchUpdates);
          } catch (err) {
            console.warn(`Failed background research for multi-item ${item.id}`, err);
            updateStore(item.id, { is_researching: false });
          }
        }
      })();
    } catch (e) {
      setStep('upload', 'error');
      setStage('done');
      console.error('Failed to upload some images during multi-save:', e);
      Alert.alert('Save error', 'Some images failed to upload. Check your connection.');
    }
  }, [imageUri, addItem, userId, setStep]);

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

  const isLoading = stage === 'analyzing' || stage === 'researching' || stage === 'enhancing';

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
                <ProgressStepper steps={pipelineSteps} colors={Colors} />
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
                    <>
                      <View style={styles.cleanImagePreview}>
                        <Image source={{ uri: piece.cleanImageUri }} style={styles.cleanImageThumb} contentFit="contain" />
                      </View>
                      <Pressable
                        style={[styles.generateBtn, piece.isCleaning && styles.generateBtnDisabled]}
                        onPress={(e) => { e.stopPropagation(); reEnhancePiece(piece.id); }}
                        disabled={piece.isCleaning}
                      >
                        <RefreshCw size={14} color={piece.isCleaning ? Colors.textTertiary : Colors.accentGreen} />
                        <Text style={[styles.generateBtnText, piece.isCleaning && styles.generateBtnTextDisabled]}>Re-Enhance</Text>
                      </Pressable>
                    </>
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
              <ProgressStepper steps={pipelineSteps} colors={Colors} />
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

        {/* Re-enhance button */}
        {stage === 'done' && (
          <Pressable
            style={[styles.reEnhanceBtn, isReEnhancing && { opacity: 0.5 }]}
            onPress={handleReEnhanceSingle}
            disabled={isReEnhancing}
          >
            {isReEnhancing ? (
              <ActivityIndicator size="small" color={Colors.accentGreen} />
            ) : (
              <RefreshCw size={16} color={Colors.accentGreen} />
            )}
            <Text style={styles.reEnhanceText}>
              {isReEnhancing ? 'Re-enhancing...' : 'Not happy? Re-enhance image'}
            </Text>
          </Pressable>
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
    badgeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 16, marginBottom: 16 },
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
    cleanImagePreview: { marginTop: 8, height: 120, backgroundColor: C.cardSurfaceAlt, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border },
    cleanImageThumb: { width: '100%', height: '100%' },
    cleaningIndicator: { marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 6 },
    cleaningText: { fontFamily: Typography.bodyFamily, fontSize: 12, color: C.textTertiary },
    generateBtn: { marginTop: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, borderRadius: Radius.md, borderWidth: 1, borderColor: C.accentGreen, backgroundColor: `${C.accentGreen}10` },
    generateBtnDisabled: { borderColor: C.border, backgroundColor: C.cardSurfaceAlt },
    generateBtnText: { fontFamily: Typography.bodyFamilyMedium, fontSize: 12, color: C.accentGreen },
    generateBtnTextDisabled: { color: C.textTertiary },
    pieceErrorText: { fontFamily: Typography.bodyFamily, fontSize: 11, color: C.accentCoral, marginTop: 4, marginBottom: 2 },
    reEnhanceBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginHorizontal: 16, marginTop: 12, paddingVertical: 12, borderRadius: Radius.pill, borderWidth: 1, borderColor: `${C.accentGreen}40`, backgroundColor: `${C.accentGreen}10` },
    reEnhanceText: { fontFamily: Typography.bodyFamilyMedium, fontSize: 13, color: C.accentGreen },
  });
}
