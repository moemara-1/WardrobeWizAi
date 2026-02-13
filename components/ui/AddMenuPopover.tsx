import { Radius, Typography } from '@/constants/Colors';
import { useThemeColors } from '@/contexts/ThemeContext';
import { Gem, Puzzle, Shirt } from 'lucide-react-native';
import React, { useMemo } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

interface AddMenuPopoverProps {
  onClose: () => void;
  onSelect: (action: string) => void;
}

const MENU_ITEMS = [
  { key: 'pieces', label: 'Add Pieces', icon: Puzzle },
  { key: 'accessories', label: 'Add Accessories', icon: Gem },
  { key: 'fits', label: 'Load Saved Fit', icon: Shirt },
] as const;

export function AddMenuPopover({ onClose, onSelect }: AddMenuPopoverProps) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  return (
    <Modal transparent animationType="fade" visible onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.menu}>
        {MENU_ITEMS.map(({ key, label, icon: Icon }) => (
          <Pressable
            key={key}
            style={styles.menuItem}
            onPress={() => onSelect(key)}
          >
            <View style={styles.menuIconCircle}>
              <Icon size={16} color={Colors.textPrimary} />
            </View>
            <Text style={styles.menuLabel}>{label}</Text>
          </Pressable>
        ))}
      </View>
    </Modal>
  );
}

function createStyles(C: any) {
  return StyleSheet.create({
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.25)',
    },
    menu: {
      position: 'absolute',
      left: 20,
      bottom: 180,
      backgroundColor: C.cardSurface,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: C.border,
      paddingVertical: 6,
      minWidth: 185,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.25,
      shadowRadius: 16,
      elevation: 12,
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 13,
    },
    menuIconCircle: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: C.cardSurfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
    },
    menuLabel: {
      fontFamily: Typography.bodyFamilyMedium,
      fontSize: 14,
      color: C.textPrimary,
    },
  });
}
