import { Radius, Typography } from '@/constants/Colors';
import { useThemeColors } from '@/contexts/ThemeContext';
import { regenerateCleanImage } from '@/lib/ai';
import { classifyGarmentSlot } from '@/lib/backgroundRemoval';
import { useClosetStore } from '@/stores/closetStore';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { Bookmark, BookmarkCheck, Pencil, Share2, Sparkles, Trash2, X } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface MetadataRow {
  label: string;
  value: string;
  badge?: boolean;
}

export default function ItemDetailScreen() {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const { items } = useClosetStore();
  const updateItem = useClosetStore((s) => s.updateItem);
  const deleteItem = useClosetStore((s) => s.deleteItem);
  const setCanvasItem = useClosetStore((s) => s.setCanvasItem);

  const item = items.find((i) => i.id === id);

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editBrand, setEditBrand] = useState('');
  const [editSize, setEditSize] = useState('');
  const [editGarmentType, setEditGarmentType] = useState('');
  const [editColors, setEditColors] = useState('');
  const [editTags, setEditTags] = useState('');
  const [isEnhancing, setIsEnhancing] = useState(false);

  if (!item) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>Item not found</Text>
          <Pressable style={styles.backLink} onPress={() => router.back()}>
            <Text style={styles.backLinkText}>Go back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const handleShare = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await Share.share({
        message: `Check out my ${item.name}${item.brand ? ` by ${item.brand}` : ''} on WardrobeWiz!`,
      });
    } catch { /* user cancelled */ }
  };

  const handleBookmark = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updateItem(item.id, { favorite: !item.favorite });
  };

  const handleDelete = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert(
      'Delete Item',
      `Are you sure you want to delete "${item.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive', onPress: () => {
            deleteItem(item.id);
            router.back();
          }
        },
      ]
    );
  };

  const handleCreateFit = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/(tabs)/stylist' as Href);
  };

  const openEditModal = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditName(item.name);
    setEditBrand(item.brand || '');
    setEditSize(item.size || '');
    setEditGarmentType(item.garment_type || '');
    setEditColors((item.colors || []).join(', '));
    setEditTags((item.tags || []).join(', '));
    setShowEditModal(true);
  };

  const handleSaveEdits = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    updateItem(item.id, {
      name: editName.trim() || item.name,
      brand: editBrand.trim() || undefined,
      size: editSize.trim() || undefined,
      garment_type: editGarmentType.trim() || undefined,
      colors: editColors.split(',').map(c => c.trim()).filter(Boolean),
      tags: editTags.split(',').map(t => t.trim()).filter(Boolean),
    });
    setShowEditModal(false);
  };

  const handleEnhanceImage = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsEnhancing(true);
    try {
      const sourceUrl = item.clean_image_url || item.image_url;
      const newUrl = await regenerateCleanImage(sourceUrl, {
        name: editName || item.name,
        category: item.category,
        description: editName || item.name,
        colors: editColors ? editColors.split(',').map(c => c.trim()) : item.colors,
        brand: editBrand || item.brand || null,
        garment_type: editGarmentType || item.garment_type || null,
        material: null,
      });
      updateItem(item.id, { clean_image_url: newUrl });
      Alert.alert('Enhanced!', 'Item image has been re-processed with AI.');
    } catch {
      Alert.alert('Error', 'Could not enhance image. Try again later.');
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleTryOn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // Classify item into its garment slot, store it, then navigate to canvas
    const slot = classifyGarmentSlot(item.category, item.garment_type || undefined);
    if (setCanvasItem) {
      setCanvasItem(slot, item);
    }
    router.push('/(tabs)/stylist' as Href);
  };

  const metadata: MetadataRow[] = [
    { label: 'Resell Value', value: item.estimated_value ? `$${item.estimated_value}` : '$—' },
    { label: 'Brand', value: item.brand || 'Unknown' },
    { label: 'Type', value: item.category },
    { label: 'Size', value: item.size || '—' },
    { label: 'Garment Type', value: item.garment_type || '—' },
    { label: 'Layer Type', value: item.layer_type || '—', badge: !!item.layer_type },
  ];

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <SafeAreaView edges={['top']} style={styles.headerBar}>
          <Pressable style={styles.headerBtn} onPress={handleBack}>
            <X size={20} color={Colors.textPrimary} />
          </Pressable>
          <Text style={styles.headerTitle} numberOfLines={1}>{item.name}</Text>
          <View style={styles.headerRight}>
            <Pressable style={styles.headerBtn} onPress={handleShare}>
              <Share2 size={18} color={Colors.textPrimary} />
            </Pressable>
            <Pressable style={styles.headerBtn} onPress={handleBookmark}>
              {item.favorite ? (
                <BookmarkCheck size={18} color={Colors.accentGreen} />
              ) : (
                <Bookmark size={18} color={Colors.textPrimary} />
              )}
            </Pressable>
          </View>
        </SafeAreaView>

        {/* Product Image */}
        <View style={styles.imageArea}>
          <Image
            source={{ uri: item.clean_image_url || item.image_url }}
            style={styles.productImage}
            contentFit="contain"
          />
        </View>

        {/* Action Row */}
        <View style={styles.actionRow}>
          <Pressable style={styles.createFitBtn} onPress={handleCreateFit}>
            <Sparkles size={16} color={Colors.background} />
            <Text style={styles.createFitText}>Create Fit</Text>
          </Pressable>
          <Pressable onPress={openEditModal}>
            <Text style={styles.enhanceText}>Enhance</Text>
          </Pressable>
        </View>

        {/* Metadata */}
        <View style={styles.metadataSection}>
          {metadata.map((row) => (
            <View key={row.label} style={styles.metadataRow}>
              <Text style={styles.metadataLabel}>{row.label}</Text>
              {row.badge ? (
                <View style={styles.badgePill}>
                  <Text style={styles.badgeText}>{row.value}</Text>
                </View>
              ) : (
                <Text style={styles.metadataValue}>{row.value}</Text>
              )}
            </View>
          ))}
        </View>

        {/* Delete */}
        <Pressable style={styles.deleteBtn} onPress={handleDelete}>
          <Trash2 size={16} color="#FF4444" />
          <Text style={styles.deleteBtnText}>Delete Item</Text>
        </Pressable>
      </ScrollView>

      {/* CTA */}
      <SafeAreaView edges={['bottom']} style={styles.ctaWrapper}>
        <Pressable style={styles.ctaBtn} onPress={handleTryOn}>
          <Text style={styles.ctaText}>Try on Canvas</Text>
        </Pressable>
      </SafeAreaView>

      {/* Edit / Enhance Modal */}
      <Modal visible={showEditModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalKeyboard}>
            <View style={styles.modalSheet}>
              <View style={styles.modalHandle} />
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Edit Item</Text>
                <Pressable onPress={() => setShowEditModal(false)}>
                  <X size={20} color={Colors.textSecondary} />
                </Pressable>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} style={styles.modalScroll}>
                <Text style={styles.fieldLabel}>Name</Text>
                <TextInput style={styles.fieldInput} value={editName} onChangeText={setEditName} placeholderTextColor={Colors.textTertiary} />

                <Text style={styles.fieldLabel}>Brand</Text>
                <TextInput style={styles.fieldInput} value={editBrand} onChangeText={setEditBrand} placeholder="e.g. Nike" placeholderTextColor={Colors.textTertiary} />

                <Text style={styles.fieldLabel}>Size</Text>
                <TextInput style={styles.fieldInput} value={editSize} onChangeText={setEditSize} placeholder="e.g. M, 32, 10" placeholderTextColor={Colors.textTertiary} />

                <Text style={styles.fieldLabel}>Garment Type</Text>
                <TextInput style={styles.fieldInput} value={editGarmentType} onChangeText={setEditGarmentType} placeholder="e.g. crewneck, jogger" placeholderTextColor={Colors.textTertiary} />

                <Text style={styles.fieldLabel}>Colors (comma separated)</Text>
                <TextInput style={styles.fieldInput} value={editColors} onChangeText={setEditColors} placeholder="black, white" placeholderTextColor={Colors.textTertiary} />

                <Text style={styles.fieldLabel}>Tags (comma separated)</Text>
                <TextInput style={styles.fieldInput} value={editTags} onChangeText={setEditTags} placeholder="casual, summer" placeholderTextColor={Colors.textTertiary} />
              </ScrollView>

              <View style={styles.modalActions}>
                <Pressable style={styles.enhanceImgBtn} onPress={handleEnhanceImage} disabled={isEnhancing}>
                  {isEnhancing ? (
                    <ActivityIndicator size="small" color={Colors.accentGreen} />
                  ) : (
                    <>
                      <Sparkles size={14} color={Colors.accentGreen} />
                      <Text style={styles.enhanceImgText}>Re-enhance Image</Text>
                    </>
                  )}
                </Pressable>
                <Pressable style={styles.saveBtn} onPress={handleSaveEdits}>
                  <Pencil size={14} color={Colors.background} />
                  <Text style={styles.saveBtnText}>Save</Text>
                </Pressable>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

function createStyles(C: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.background },
    scrollContent: { paddingBottom: 120 },
    headerBar: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 16, paddingBottom: 8,
    },
    headerBtn: {
      width: 40, height: 40, borderRadius: 20,
      backgroundColor: C.cardSurfaceAlt, alignItems: 'center', justifyContent: 'center',
      borderWidth: 1, borderColor: C.border,
    },
    headerTitle: {
      fontFamily: Typography.bodyFamilyBold, fontSize: 16, color: C.textPrimary,
      flex: 1, textAlign: 'center', marginHorizontal: 8,
    },
    headerRight: { flexDirection: 'row', gap: 8 },
    imageArea: {
      marginHorizontal: 16, marginTop: 8, height: 360,
      backgroundColor: C.white, borderRadius: Radius.xl,
      overflow: 'hidden', alignItems: 'center', justifyContent: 'center',
    },
    productImage: { width: '80%', height: '80%' },
    actionRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 16, marginTop: 16,
    },
    createFitBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      backgroundColor: C.accentGreen, paddingHorizontal: 20, paddingVertical: 10, borderRadius: Radius.pill,
    },
    createFitText: { fontFamily: Typography.bodyFamilyBold, fontSize: 14, color: C.background },
    enhanceText: { fontFamily: Typography.bodyFamilyMedium, fontSize: 14, color: C.accentGreen },
    metadataSection: { marginTop: 20, marginHorizontal: 16 },
    metadataRow: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border,
    },
    metadataLabel: { fontFamily: Typography.bodyFamily, fontSize: 14, color: C.textSecondary },
    metadataValue: { fontFamily: Typography.bodyFamilyMedium, fontSize: 14, color: C.textPrimary, textTransform: 'capitalize' },
    badgePill: {
      backgroundColor: C.cardSurfaceAlt, paddingHorizontal: 12, paddingVertical: 4,
      borderRadius: Radius.pill, borderWidth: 1, borderColor: C.border,
    },
    badgeText: { fontFamily: Typography.bodyFamilyMedium, fontSize: 12, color: C.textPrimary, textTransform: 'capitalize' },
    deleteBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
      marginHorizontal: 16, marginTop: 24, paddingVertical: 14,
      borderRadius: Radius.md, borderWidth: 1, borderColor: 'rgba(255,68,68,0.3)',
    },
    deleteBtnText: { fontFamily: Typography.bodyFamilyMedium, fontSize: 14, color: '#FF4444' },
    ctaWrapper: {
      position: 'absolute', bottom: 0, left: 0, right: 0,
      paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, backgroundColor: C.background,
    },
    ctaBtn: { backgroundColor: C.accentGreen, borderRadius: Radius.pill, paddingVertical: 16, alignItems: 'center' },
    ctaText: { fontFamily: Typography.bodyFamilyBold, fontSize: 16, color: C.background },
    notFound: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
    notFoundText: { fontFamily: Typography.bodyFamily, fontSize: 16, color: C.textSecondary },
    backLink: { padding: 12 },
    backLinkText: { fontFamily: Typography.bodyFamilyMedium, fontSize: 14, color: C.accentGreen },
    // Edit Modal styles
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalKeyboard: { justifyContent: 'flex-end' },
    modalSheet: { backgroundColor: C.cardSurface, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingBottom: 40, maxHeight: '80%' },
    modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: C.borderLight, alignSelf: 'center', marginTop: 10, marginBottom: 16 },
    modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
    modalTitle: { fontFamily: Typography.bodyFamilyBold, fontSize: 18, color: C.textPrimary },
    modalScroll: { maxHeight: 340 },
    fieldLabel: { fontFamily: Typography.bodyFamilyMedium, fontSize: 12, color: C.textSecondary, marginBottom: 4, marginTop: 12 },
    fieldInput: {
      backgroundColor: C.cardSurfaceAlt, borderRadius: Radius.md, borderWidth: 1, borderColor: C.border,
      paddingHorizontal: 14, paddingVertical: 12, fontFamily: Typography.bodyFamily, fontSize: 14, color: C.textPrimary,
    },
    modalActions: { flexDirection: 'row', gap: 12, marginTop: 20 },
    enhanceImgBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14, borderRadius: Radius.pill, borderWidth: 1, borderColor: C.accentGreen },
    enhanceImgText: { fontFamily: Typography.bodyFamilyMedium, fontSize: 13, color: C.accentGreen },
    saveBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14, borderRadius: Radius.pill, backgroundColor: C.accentGreen },
    saveBtnText: { fontFamily: Typography.bodyFamilyBold, fontSize: 14, color: C.background },
  });
}
