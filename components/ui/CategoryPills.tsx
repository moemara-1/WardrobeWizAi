import { Radius, Typography } from '@/constants/Colors';
import { useThemeColors } from '@/contexts/ThemeContext';
import * as Haptics from 'expo-haptics';
import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

interface CategoryPillsProps {
  categories: string[];
  activeCategory: string;
  onSelect: (category: string) => void;
}

export function CategoryPills({ categories, activeCategory, onSelect }: CategoryPillsProps) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {categories.map((cat) => {
        const isActive = cat === activeCategory;
        return (
          <Pressable
            key={cat}
            style={[styles.pill, isActive && styles.pillActive]}
            onPress={() => {
              Haptics.selectionAsync();
              onSelect(cat);
            }}
          >
            <Text style={[styles.pillText, isActive && styles.pillTextActive]}>
              {cat}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function createStyles(C: any) {
  return StyleSheet.create({
    container: { paddingHorizontal: 16, gap: 8, paddingVertical: 4 },
    pill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: Radius.pill, backgroundColor: C.cardSurfaceAlt, borderWidth: 1, borderColor: C.border },
    pillActive: { backgroundColor: C.textPrimary, borderColor: C.textPrimary },
    pillText: { fontFamily: Typography.bodyFamilyMedium, fontSize: 13, color: C.textSecondary },
    pillTextActive: { color: C.background },
  });
}
