import { Colors, Radius, Typography } from '@/constants/Colors';
import * as Haptics from 'expo-haptics';
import {
  Check,
  Cloud,
  CloudRain,
  CloudSnow,
  Columns2,
  Flame,
  Grid2x2,
  Home,
  LayoutGrid,
  Snowflake,
  Square,
  Thermometer
} from 'lucide-react-native';
import React, { useState } from 'react';
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
}

interface FilterState {
  weather: string[];
  layout: string;
}

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
  { key: '4pieces', label: '4 Pieces', icon: LayoutGrid },
  { key: '3pieces', label: '3 Pieces', icon: Grid2x2 },
  { key: '2pieces', label: '2 Pieces', icon: Columns2 },
  { key: 'full', label: 'Full Piece', icon: Square },
] as const;

export function OutfitFilters({ visible, onClose, onApply }: OutfitFiltersProps) {
  const [selectedWeather, setSelectedWeather] = useState<string[]>([]);
  const [selectedLayout, setSelectedLayout] = useState('4pieces');

  if (!visible) return null;

  const toggleWeather = (key: string) => {
    Haptics.selectionAsync();
    setSelectedWeather((prev) =>
      prev.includes(key) ? prev.filter((w) => w !== key) : [...prev, key]
    );
  };

  const handleClear = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedWeather([]);
    setSelectedLayout('4pieces');
  };

  const handleApply = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onApply({ weather: selectedWeather, layout: selectedLayout });
    onClose();
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
        {/* Handle */}
        <View style={styles.handleBar} />

        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={handleClear}>
            <Text style={styles.clearText}>Clear</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Outfit Filters</Text>
          <Pressable style={styles.checkBtn} onPress={handleApply}>
            <Check size={18} color={Colors.background} />
          </Pressable>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Weather Grid — 3 column grid per .pen */}
          <Text style={styles.sectionTitle}>Weather</Text>
          <View style={styles.weatherGrid}>
            {WEATHER_OPTIONS.map(({ key, label, icon: Icon }) => {
              const active = selectedWeather.includes(key);
              return (
                <Pressable
                  key={key}
                  style={[styles.weatherCard, active && styles.weatherCardActive]}
                  onPress={() => toggleWeather(key)}
                >
                  <Icon
                    size={24}
                    color={active ? Colors.accentGreen : Colors.textSecondary}
                  />
                  <Text style={[styles.weatherLabel, active && styles.weatherLabelActive]}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Layout */}
          <Text style={styles.sectionTitle}>Layout</Text>
          <View style={styles.layoutRow}>
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
                  <Icon
                    size={22}
                    color={active ? Colors.accentGreen : Colors.textSecondary}
                  />
                  <Text style={[styles.layoutLabel, active && styles.layoutLabelActive]}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    zIndex: 200,
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
    maxHeight: SCREEN_HEIGHT * 0.75,
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
    marginTop: 4,
  },
  weatherGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  weatherCard: {
    width: '30.5%',
    aspectRatio: 1.1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: Radius.md,
    backgroundColor: Colors.cardSurfaceAlt,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  weatherCardActive: {
    borderColor: Colors.accentGreen,
    backgroundColor: 'rgba(50, 213, 131, 0.08)',
  },
  weatherLabel: {
    fontFamily: Typography.bodyFamilyMedium,
    fontSize: 11,
    color: Colors.textSecondary,
  },
  weatherLabelActive: {
    color: Colors.accentGreen,
  },
  layoutRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  layoutCard: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: Radius.md,
    backgroundColor: Colors.cardSurfaceAlt,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  layoutCardActive: {
    borderColor: Colors.accentGreen,
    backgroundColor: 'rgba(50, 213, 131, 0.08)',
  },
  layoutLabel: {
    fontFamily: Typography.bodyFamilyMedium,
    fontSize: 11,
    color: Colors.textSecondary,
  },
  layoutLabelActive: {
    color: Colors.accentGreen,
  },
});
