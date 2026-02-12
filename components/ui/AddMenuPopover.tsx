import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Gem, Shirt, Puzzle } from 'lucide-react-native';
import { Colors, Radius, Typography } from '@/constants/Colors';

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

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  menu: {
    position: 'absolute',
    left: 20,
    bottom: 180,
    backgroundColor: Colors.cardSurface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
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
    backgroundColor: Colors.cardSurfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: {
    fontFamily: Typography.bodyFamilyMedium,
    fontSize: 14,
    color: Colors.textPrimary,
  },
});
