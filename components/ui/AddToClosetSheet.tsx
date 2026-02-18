import { Radius, Typography } from '@/constants/Colors';
import { useThemeColors } from '@/contexts/ThemeContext';
import * as Haptics from 'expo-haptics';
import { Camera, ImageIcon, Layers, Search, X } from 'lucide-react-native';
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';

interface AddToClosetSheetProps {
  visible: boolean;
  onClose: () => void;
  onAction: (action: string) => void;
}

export function AddToClosetSheet({ visible, onClose, onAction }: AddToClosetSheetProps) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  if (!visible) return null;

  const handleAction = (action: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onAction(action);
  };

  return (
    <View style={styles.overlay}>
      <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)} style={styles.backdropView}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
      </Animated.View>
      <Animated.View entering={SlideInDown.duration(350).damping(24)} exiting={SlideOutDown.duration(250)} style={styles.sheet}>
        <View style={styles.handleBar} />
        <Pressable style={styles.closeBtn} onPress={onClose}>
          <X size={18} color={Colors.textTertiary} />
        </Pressable>
        <Text style={styles.title}>Add to Closet</Text>

        <Text style={styles.groupLabel}>Single Piece</Text>
        <View style={styles.row}>
          <Pressable style={styles.tileBtn} onPress={() => handleAction('camera')}>
            <Camera size={22} color={Colors.accentGreen} />
            <Text style={styles.tileBtnText}>Camera</Text>
          </Pressable>
          <Pressable style={styles.tileBtn} onPress={() => handleAction('library')}>
            <ImageIcon size={22} color={Colors.accentGreen} />
            <Text style={styles.tileBtnText}>Library</Text>
          </Pressable>
        </View>

        <Text style={styles.groupLabel}>From Outfit Photo</Text>
        <Pressable style={styles.wideBtn} onPress={() => handleAction('import')}>
          <Layers size={20} color={Colors.textPrimary} />
          <View style={styles.wideBtnTextWrap}>
            <Text style={styles.wideBtnTitle}>Import from Fit Pic</Text>
            <Text style={styles.wideBtnDesc}>Detect multiple pieces from one photo</Text>
          </View>
        </Pressable>

        <Text style={styles.groupLabel}>Browse Existing</Text>
        <Pressable style={styles.primaryBtn} onPress={() => handleAction('search')}>
          <Search size={18} color={Colors.background} />
          <Text style={styles.primaryBtnText}>Search Items</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

function createStyles(C: ReturnType<typeof import('@/contexts/ThemeContext').useThemeColors>) {
  return StyleSheet.create({
    overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end', zIndex: 200 },
    backdropView: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
    sheet: { backgroundColor: C.cardSurface, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 24, paddingBottom: 110 },
    handleBar: { width: 40, height: 4, borderRadius: 2, backgroundColor: C.textTertiary, alignSelf: 'center', marginTop: 10, marginBottom: 16 },
    closeBtn: { position: 'absolute', top: 16, right: 16, width: 32, height: 32, borderRadius: 16, backgroundColor: C.cardSurfaceAlt, alignItems: 'center', justifyContent: 'center', zIndex: 10 },
    title: { fontFamily: Typography.bodyFamilyBold, fontSize: 20, color: C.textPrimary, marginBottom: 20, alignSelf: 'center' },
    groupLabel: { fontFamily: Typography.bodyFamilyBold, fontSize: 12, color: C.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, marginTop: 4 },
    row: { flexDirection: 'row', gap: 10, marginBottom: 16 },
    tileBtn: { flex: 1, paddingVertical: 18, borderRadius: Radius.lg, backgroundColor: C.cardSurfaceAlt, alignItems: 'center', justifyContent: 'center', gap: 6 },
    tileBtnText: { fontFamily: Typography.bodyFamilyMedium, fontSize: 14, color: C.textPrimary },
    wideBtn: { flexDirection: 'row', alignItems: 'center', gap: 14, width: '100%', paddingVertical: 16, paddingHorizontal: 18, borderRadius: Radius.lg, backgroundColor: C.cardSurfaceAlt, marginBottom: 16 },
    wideBtnTextWrap: { flex: 1 },
    wideBtnTitle: { fontFamily: Typography.bodyFamilyBold, fontSize: 15, color: C.textPrimary },
    wideBtnDesc: { fontFamily: Typography.bodyFamily, fontSize: 12, color: C.textSecondary, marginTop: 2 },
    primaryBtn: { flexDirection: 'row', width: '100%', paddingVertical: 16, borderRadius: Radius.pill, backgroundColor: C.textPrimary, alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 8 },
    primaryBtnText: { fontFamily: Typography.bodyFamilyBold, fontSize: 16, color: C.background },
  });
}
