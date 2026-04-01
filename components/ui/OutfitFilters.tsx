import { Radius, Typography } from '@/constants/Colors';
import { useThemeColors } from '@/contexts/ThemeContext';
import * as Haptics from 'expo-haptics';
import {
  Briefcase,
  Check,
  Cloud,
  CloudRain,
  CloudSnow,
  Dumbbell,
  Flame,
  Home,
  LayoutGrid,
  Rows2,
  Rows3,
  Shirt,
  Snowflake,
  Square,
  Thermometer,
  Wine,
  Zap
} from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
} from 'react-native-reanimated';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface OutfitFiltersProps {
  visible: boolean;
  onClose: () => void;
  onApply: (filters: FilterState) => void;
  value?: FilterState;
}

export type LayoutFilter = 'full-piece' | 'two-piece' | 'three-piece' | 'four-piece';

export interface FilterState {
  style: string[];
  color: string[];
  weather: string[];
  layout: LayoutFilter;
}

const STYLE_OPTIONS = [
  { key: 'casual', label: 'Casual', icon: Shirt },
  { key: 'streetwear', label: 'Streetwear', icon: Zap },
  { key: 'smart-casual', label: 'Smart Casual', icon: Briefcase },
  { key: 'athleisure', label: 'Athleisure', icon: Dumbbell },
  { key: 'formal', label: 'Formal', icon: Briefcase },
  { key: 'going-out', label: 'Going Out', icon: Wine },
] as const;

const COLOR_OPTIONS = [
  { key: 'light', label: 'Light', color: '#F5F5F5' },
  { key: 'dark', label: 'Dark', color: '#1C1C1E' },
  { key: 'bright', label: 'Bright', color: '#FF5733' },
  { key: 'monochrome', label: 'Mono', color: '#888888' },
  { key: 'colorful', label: 'Colorful', color: null },
] as const;

const WEATHER_OPTIONS = [
  { key: 'cold', label: 'Cold', icon: Snowflake },
  { key: 'warm', label: 'Warm', icon: Thermometer },
  { key: 'hot', label: 'Hot', icon: Flame },
  { key: 'snow', label: 'Snow', icon: CloudSnow },
  { key: 'rain', label: 'Rain', icon: CloudRain },
  { key: 'indoor', label: 'Indoor', icon: Home },
  { key: 'transitional', label: 'Transitional', icon: Cloud },
] as const;

const LAYOUT_OPTIONS = [
  { key: 'four-piece', label: '4 Pieces', icon: LayoutGrid },
  { key: 'three-piece', label: '3 Pieces', icon: Rows3 },
  { key: 'two-piece', label: '2 Pieces', icon: Rows2 },
  { key: 'full-piece', label: 'Full Piece', icon: Square },
] as const;

export function OutfitFilters({ visible, onClose, onApply, value }: OutfitFiltersProps) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  const [selectedStyle, setSelectedStyle] = useState<string[]>([]);
  const [selectedColor, setSelectedColor] = useState<string[]>([]);
  const [selectedWeather, setSelectedWeather] = useState<string[]>([]);
  const [selectedLayout, setSelectedLayout] = useState<LayoutFilter>('four-piece');

  useEffect(() => {
    if (!visible) return;
    setSelectedStyle(value?.style || []);
    setSelectedColor(value?.color || []);
    setSelectedWeather(value?.weather || []);
    setSelectedLayout(value?.layout || 'four-piece');
  }, [visible, value]);

  if (!visible) return null;

  const toggleMulti = (key: string, setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    Haptics.selectionAsync();
    setter((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleClear = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedStyle([]);
    setSelectedColor([]);
    setSelectedWeather([]);
    setSelectedLayout('four-piece');
  };

  const handleApply = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onApply({
      style: selectedStyle,
      color: selectedColor,
      weather: selectedWeather,
      layout: selectedLayout,
    });
    onClose();
  };

  const activeCount =
    selectedStyle.length +
    selectedColor.length +
    selectedWeather.length +
    (selectedLayout !== 'four-piece' ? 1 : 0);

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
        {/* Handle */}
        <View style={styles.handleBar} />

        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={handleClear}>
            <Text style={styles.clearText}>Clear{activeCount > 0 ? ` (${activeCount})` : ''}</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Filters</Text>
          <Pressable style={styles.checkBtn} onPress={handleApply}>
            <Check size={18} color={Colors.background} />
          </Pressable>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
          {/* Style */}
          <Text style={styles.sectionTitle}>Style</Text>
          <View style={styles.chipGrid}>
            {STYLE_OPTIONS.map(({ key, label, icon: Icon }) => {
              const active = selectedStyle.includes(key);
              return (
                <Pressable
                  key={key}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => toggleMulti(key, setSelectedStyle)}
                >
                  <Icon size={16} color={active ? Colors.accentGreen : Colors.textSecondary} />
                  <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{label}</Text>
                </Pressable>
              );
            })}
          </View>

          {/* Color */}
          <Text style={styles.sectionTitle}>Color Palette</Text>
          <View style={styles.colorRow}>
            {COLOR_OPTIONS.map(({ key, label, color }) => {
              const active = selectedColor.includes(key);
              return (
                <Pressable
                  key={key}
                  style={[styles.colorCard, active && styles.colorCardActive]}
                  onPress={() => toggleMulti(key, setSelectedColor)}
                >
                  {key === 'colorful' ? (
                    <View style={styles.rainbowCircle}>
                      <View style={[styles.rainbowQuad, { backgroundColor: '#FF5733' }]} />
                      <View style={[styles.rainbowQuad, { backgroundColor: '#33B5FF' }]} />
                      <View style={[styles.rainbowQuad, { backgroundColor: '#FFC733' }]} />
                      <View style={[styles.rainbowQuad, { backgroundColor: '#33FF8C' }]} />
                    </View>
                  ) : (
                    <View style={[styles.colorDot, { backgroundColor: color! }, key === 'light' && { borderWidth: 1, borderColor: Colors.border }]} />
                  )}
                  <Text style={[styles.colorLabel, active && styles.colorLabelActive]}>{label}</Text>
                </Pressable>
              );
            })}
          </View>

          {/* Climate */}
          <Text style={styles.sectionTitle}>Climate</Text>
          <View style={styles.chipGrid}>
            {WEATHER_OPTIONS.map(({ key, label, icon: Icon }) => {
              const active = selectedWeather.includes(key);
              return (
                <Pressable
                  key={key}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => toggleMulti(key, setSelectedWeather)}
                >
                  <Icon size={16} color={active ? Colors.accentGreen : Colors.textSecondary} />
                  <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{label}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.sectionTitle}>Layout</Text>
          <View style={styles.layoutGrid}>
            {LAYOUT_OPTIONS.map(({ key, label, icon: Icon }) => {
              const active = selectedLayout === key;
              return (
                <Pressable
                  key={key}
                  style={[styles.layoutCard, active && styles.layoutCardActive]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setSelectedLayout(key);
                  }}
                >
                  <Icon size={24} color={active ? Colors.textPrimary : Colors.textSecondary} />
                  <Text style={[styles.layoutLabel, active && styles.layoutLabelActive]}>{label}</Text>
                </Pressable>
              );
            })}
          </View>

        </ScrollView>
      </Animated.View>
    </View>
  );
}

function createStyles(Colors: any) {
  return StyleSheet.create({
    overlay: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: 'flex-end',
      zIndex: 200,
    },
    layoutGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      marginBottom: 16,
    },
    layoutCard: {
      width: '47%',
      minHeight: 90,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: Colors.border,
      backgroundColor: Colors.background,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 14,
    },
    layoutCardActive: {
      borderWidth: 2,
      borderColor: '#3B82F6',
      backgroundColor: Colors.cardSurfaceAlt,
    },
    layoutLabel: {
      fontFamily: Typography.bodyFamilyMedium,
      fontSize: 12,
      color: Colors.textSecondary,
    },
    layoutLabelActive: {
      color: Colors.textPrimary,
      fontFamily: Typography.bodyFamilyBold,
    },
    backdropView: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    sheet: {
      backgroundColor: Colors.cardSurface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 20,
      paddingBottom: 48,
      maxHeight: SCREEN_HEIGHT * 0.8,
    },
    handleBar: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: Colors.borderLight,
      alignSelf: 'center',
      marginTop: 10,
      marginBottom: 16,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 20,
    },
    clearText: {
      fontFamily: Typography.bodyFamilyMedium,
      fontSize: 14,
      color: Colors.textSecondary,
    },
    headerTitle: {
      fontFamily: Typography.bodyFamilyBold,
      fontSize: 16,
      color: Colors.textPrimary,
    },
    checkBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: Colors.accentGreen,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sectionTitle: {
      fontFamily: Typography.bodyFamilyBold,
      fontSize: 14,
      color: Colors.textPrimary,
      marginBottom: 12,
      marginTop: 8,
    },
    // Chips for Style & Climate
    chipGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 20,
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: Radius.pill,
      backgroundColor: Colors.cardSurfaceAlt,
      borderWidth: 1,
      borderColor: Colors.border,
    },
    chipActive: {
      borderColor: Colors.accentGreen,
      backgroundColor: 'rgba(50, 213, 131, 0.08)',
    },
    chipLabel: {
      fontFamily: Typography.bodyFamilyMedium,
      fontSize: 13,
      color: Colors.textSecondary,
    },
    chipLabelActive: {
      color: Colors.accentGreen,
    },
    // Color palette
    colorRow: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 20,
    },
    colorCard: {
      flex: 1,
      alignItems: 'center',
      gap: 6,
      paddingVertical: 12,
      borderRadius: Radius.md,
      backgroundColor: Colors.cardSurfaceAlt,
      borderWidth: 1,
      borderColor: Colors.border,
    },
    colorCardActive: {
      borderColor: Colors.accentGreen,
      backgroundColor: 'rgba(50, 213, 131, 0.08)',
    },
    colorDot: {
      width: 24,
      height: 24,
      borderRadius: 12,
    },
    rainbowCircle: {
      width: 24,
      height: 24,
      borderRadius: 12,
      overflow: 'hidden',
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    rainbowQuad: {
      width: 12,
      height: 12,
    },
    colorLabel: {
      fontFamily: Typography.bodyFamilyMedium,
      fontSize: 11,
      color: Colors.textSecondary,
    },
    colorLabelActive: {
      color: Colors.accentGreen,
    },
  });
}
