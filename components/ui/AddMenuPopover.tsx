import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Gem, Shirt, Puzzle } from 'lucide-react-native';
import { Colors, Radius, Typography } from '@/constants/Colors';

interface AddMenuPopoverProps {
  onClose: () => void;
  onSelect: (action: string) => void;
}

const MENU_ITEMS = [
  { key: 'accessories', label: 'Add Accessories', icon: Gem },
  { key: 'fits', label: 'Add Fits', icon: Shirt },
  { key: 'pieces', label: 'Add Pieces', icon: Puzzle },
] as const;

export function AddMenuPopover({ onClose, onSelect }: AddMenuPopoverProps) {
  return (
    <>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.menu}>
        {MENU_ITEMS.map(({ key, label, icon: Icon }) => (
          <Pressable
            key={key}
            style={styles.menuItem}
            onPress={() => onSelect(key)}
          >
            <Icon size={18} color={Colors.textPrimary} />
            <Text style={styles.menuLabel}>{label}</Text>
          </Pressable>
        ))}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  menu: {
    position: 'absolute',
    left: 16,
    bottom: 140,
    backgroundColor: Colors.cardSurface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 4,
    minWidth: 170,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  menuLabel: {
    fontFamily: Typography.bodyFamilyMedium,
    fontSize: 14,
    color: Colors.textPrimary,
  },
});
