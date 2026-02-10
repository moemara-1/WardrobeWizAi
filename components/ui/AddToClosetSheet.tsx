import { Colors, Radius, Typography } from '@/constants/Colors';
import * as Haptics from 'expo-haptics';
import { X } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';

interface AddToClosetSheetProps {
  visible: boolean;
  onClose: () => void;
  onAction: (action: string) => void;
}

export function AddToClosetSheet({ visible, onClose, onAction }: AddToClosetSheetProps) {
  if (!visible) return null;

  const handleAction = (action: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onAction(action);
  };

  return (
    <View style={styles.overlay}>
      <Animated.View
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(150)}
        style={styles.backdropView}
      >
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
      </Animated.View>

      <Animated.View
        entering={SlideInDown.duration(350).damping(24)}
        exiting={SlideOutDown.duration(250)}
        style={styles.sheet}
      >
        <View style={styles.handleBar} />

        <Pressable style={styles.closeBtn} onPress={onClose}>
          <X size={18} color={Colors.textTertiary} />
        </Pressable>

        <Text style={styles.title}>Add to Closet</Text>
        <Text style={styles.subtitle}>
          Personalize your closet by adding pieces{'\n'}in a way that works for you
        </Text>

        <Pressable style={styles.primaryBtn} onPress={() => handleAction('search')}>
          <Text style={styles.primaryBtnText}>Search Items</Text>
        </Pressable>

        <Pressable style={styles.secondaryBtn} onPress={() => handleAction('import')}>
          <Text style={styles.secondaryBtnText}>Import from Fit Pic</Text>
        </Pressable>

        <Pressable style={styles.secondaryBtn} onPress={() => handleAction('camera')}>
          <Text style={styles.secondaryBtnText}>Take Photo</Text>
        </Pressable>

        <Pressable style={styles.secondaryBtn} onPress={() => handleAction('library')}>
          <Text style={styles.secondaryBtnText}>Choose from Photo Library</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end', zIndex: 200 },
  backdropView: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { backgroundColor: Colors.cardSurface, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 24, paddingBottom: 48, alignItems: 'center' },
  handleBar: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.textTertiary, alignSelf: 'center', marginTop: 10, marginBottom: 16 },
  closeBtn: { position: 'absolute', top: 16, right: 16, width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.cardSurfaceAlt, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: Typography.bodyFamilyBold, fontSize: 20, color: Colors.textPrimary, marginBottom: 8 },
  subtitle: { fontFamily: Typography.bodyFamily, fontSize: 14, color: Colors.textSecondary, textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  primaryBtn: { width: '100%', paddingVertical: 16, borderRadius: Radius.pill, backgroundColor: Colors.textPrimary, alignItems: 'center', marginBottom: 12 },
  primaryBtnText: { fontFamily: Typography.bodyFamilyBold, fontSize: 16, color: Colors.background },
  secondaryBtn: { width: '100%', paddingVertical: 16, borderRadius: Radius.pill, backgroundColor: Colors.cardSurfaceAlt, alignItems: 'center', marginBottom: 8 },
  secondaryBtnText: { fontFamily: Typography.bodyFamilyBold, fontSize: 16, color: Colors.textPrimary },
});
