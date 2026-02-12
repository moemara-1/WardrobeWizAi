import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  Bookmark,
  Briefcase,
  ChevronRight,
  Heart,
  Minus,
  PartyPopper,
  Plane,
  Plus,
  Search,
  Shirt,
  Sparkles,
  UserCircle,
} from 'lucide-react-native';
import { Colors, Radius, Typography } from '@/constants/Colors';

type Occasion = 'business' | 'fun' | 'romantic' | 'casual' | 'formal';

const OCCASIONS: { key: Occasion; label: string; icon: React.ComponentType<{ size: number; color: string }> }[] = [
  { key: 'business', label: 'Business', icon: Briefcase },
  { key: 'fun', label: 'Fun', icon: PartyPopper },
  { key: 'romantic', label: 'Romantic', icon: Heart },
  { key: 'casual', label: 'Casual', icon: Shirt },
  { key: 'formal', label: 'Formal', icon: UserCircle },
];

export default function TripPlannerScreen() {
  const [days, setDays] = useState(3);
  const [destinations, setDestinations] = useState<string[]>(['']);
  const [occasion, setOccasion] = useState<Occasion>('fun');
  const [multiCity, setMultiCity] = useState(false);

  const updateDestination = (index: number, value: string) => {
    setDestinations((prev) => prev.map((d, i) => (i === index ? value : d)));
  };

  const addDestination = () => {
    setDestinations((prev) => [...prev, '']);
  };

  const removeDestination = (index: number) => {
    if (destinations.length <= 1) return;
    setDestinations((prev) => prev.filter((_, i) => i !== index));
  };

  const handleBuild = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.push('/trip-result' as never);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Pressable style={styles.cancelBtn} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }}>
        <Text style={styles.cancelText}>Cancel</Text>
      </Pressable>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.iconCircle}>
          <Plane size={32} color="#FFF" />
        </View>
        <Text style={styles.title}>Trip Planner</Text>
        <Text style={styles.subtitle}>Plan your perfect travel wardrobe</Text>

        {/* Multi-City Toggle */}
        <Pressable style={styles.toggleRow} onPress={() => {
          Haptics.selectionAsync();
          const next = !multiCity;
          setMultiCity(next);
          if (!next) setDestinations((prev) => [prev[0] || '']);
        }}>
          <Text style={styles.toggleLabel}>Multi-City Trip</Text>
          <View style={[styles.toggle, multiCity && styles.toggleActive]}>
            <View style={[styles.toggleThumb, multiCity && styles.toggleThumbActive]} />
          </View>
        </Pressable>

        {/* Duration */}
        <Text style={styles.sectionLabel}>Trip Duration</Text>
        <View style={styles.durationRow}>
          <Pressable style={styles.durationBtn} onPress={() => { Haptics.selectionAsync(); setDays(Math.max(1, days - 1)); }}>
            <Minus size={18} color={Colors.textPrimary} />
          </Pressable>
          <View style={styles.durationCenter}>
            <Text style={styles.durationNum}>{days}</Text>
            <Text style={styles.durationLabel}>days</Text>
          </View>
          <Pressable style={styles.durationBtn} onPress={() => { Haptics.selectionAsync(); setDays(days + 1); }}>
            <Plus size={18} color={Colors.textPrimary} />
          </Pressable>
        </View>

        {/* Destinations */}
        <Text style={styles.sectionLabel}>{multiCity ? 'Cities' : 'Destination'}</Text>
        {destinations.map((dest, index) => (
          <View key={index} style={styles.destinationRow}>
            <Search size={16} color={Colors.textSecondary} />
            <TextInput
              style={styles.destInput}
              placeholder={multiCity ? `City ${index + 1}...` : 'Search for a city...'}
              placeholderTextColor={Colors.textTertiary}
              value={dest}
              onChangeText={(v) => updateDestination(index, v)}
            />
            {multiCity && destinations.length > 1 && (
              <Pressable onPress={() => removeDestination(index)}>
                <Minus size={16} color={Colors.textSecondary} />
              </Pressable>
            )}
          </View>
        ))}
        {multiCity && (
          <Pressable style={styles.addCityBtn} onPress={addDestination}>
            <Plus size={16} color={Colors.accentBlue} />
            <Text style={styles.addCityText}>Add City</Text>
          </Pressable>
        )}

        {/* Occasion */}
        <View style={styles.occasionHeader}>
          <Sparkles size={14} color="#3B82F6" />
          <Text style={styles.sectionLabel}>Trip Occasion</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.occasionRow}>
          {OCCASIONS.map(({ key, label, icon: Icon }) => (
            <Pressable
              key={key}
              style={[styles.occasionChip, occasion === key && styles.occasionChipActive]}
              onPress={() => { Haptics.selectionAsync(); setOccasion(key); }}
            >
              <View style={[styles.occasionIcon, occasion === key && styles.occasionIconActive]}>
                <Icon size={20} color={occasion === key ? Colors.accentBlue : Colors.textSecondary} />
              </View>
              <Text style={[styles.occasionLabel, occasion === key && styles.occasionLabelActive]}>{label}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* CTA */}
        <Pressable style={styles.buildBtn} onPress={handleBuild}>
          <Text style={styles.buildBtnText}>Build My Trip</Text>
        </Pressable>

        <Pressable style={styles.savedBtn}>
          <Bookmark size={16} color="#3B82F6" />
          <Text style={styles.savedBtnText}>Saved Trips</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  cancelBtn: { paddingHorizontal: 24, paddingVertical: 8 },
  cancelText: { fontFamily: Typography.bodyFamilyMedium, fontSize: 15, color: Colors.textPrimary },
  scrollContent: { padding: 24, alignItems: 'center' },
  iconCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: Colors.accentBlue, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  title: { fontFamily: Typography.bodyFamilyBold, fontSize: 24, color: Colors.textPrimary, marginBottom: 4 },
  subtitle: { fontFamily: Typography.bodyFamily, fontSize: 14, color: Colors.textSecondary, marginBottom: 24 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', backgroundColor: Colors.cardSurface, borderRadius: Radius.md, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 20 },
  toggleLabel: { fontFamily: Typography.bodyFamilyBold, fontSize: 15, color: Colors.textPrimary },
  toggle: { width: 48, height: 28, borderRadius: 14, backgroundColor: Colors.border, justifyContent: 'center', paddingHorizontal: 3 },
  toggleActive: { backgroundColor: Colors.accentBlue },
  toggleThumb: { width: 22, height: 22, borderRadius: 11, backgroundColor: Colors.textPrimary },
  toggleThumbActive: { alignSelf: 'flex-end' },
  sectionLabel: { fontFamily: Typography.bodyFamilyBold, fontSize: 15, color: Colors.textPrimary, marginBottom: 8, alignSelf: 'center' },
  durationRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 24 },
  durationBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.cardSurfaceAlt, alignItems: 'center', justifyContent: 'center' },
  durationCenter: { alignItems: 'center' },
  durationNum: { fontFamily: Typography.bodyFamilyBold, fontSize: 36, color: Colors.textPrimary },
  durationLabel: { fontFamily: Typography.bodyFamily, fontSize: 13, color: Colors.textSecondary },
  destinationRow: { flexDirection: 'row', alignItems: 'center', width: '100%', backgroundColor: Colors.cardSurface, borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 14, gap: 8, marginBottom: 24 },
  destInput: { flex: 1, fontFamily: Typography.bodyFamily, fontSize: 15, color: Colors.textPrimary, padding: 0 },
  occasionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  occasionRow: { gap: 12, marginBottom: 24, paddingHorizontal: 4 },
  occasionChip: { alignItems: 'center', gap: 6, width: 72 },
  occasionChipActive: {},
  occasionIcon: { width: 52, height: 52, borderRadius: 16, backgroundColor: Colors.cardSurfaceAlt, alignItems: 'center', justifyContent: 'center' },
  occasionIconActive: { backgroundColor: Colors.cardSurface, borderWidth: 2, borderColor: Colors.accentBlue },
  occasionLabel: { fontFamily: Typography.bodyFamily, fontSize: 12, color: Colors.textSecondary },
  occasionLabelActive: { fontFamily: Typography.bodyFamilyBold, color: Colors.accentBlue },
  buildBtn: { width: '100%', paddingVertical: 16, borderRadius: Radius.pill, backgroundColor: Colors.accentGreen, alignItems: 'center', marginBottom: 10 },
  buildBtnText: { fontFamily: Typography.bodyFamilyBold, fontSize: 16, color: Colors.background },
  savedBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%', paddingVertical: 14, borderRadius: Radius.pill, backgroundColor: Colors.cardSurfaceAlt, borderWidth: 1, borderColor: Colors.border },
  savedBtnText: { fontFamily: Typography.bodyFamilyBold, fontSize: 15, color: Colors.accentBlue },
  addCityBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%', paddingVertical: 12, borderRadius: Radius.md, backgroundColor: Colors.cardSurfaceAlt, marginBottom: 24, borderWidth: 1, borderColor: Colors.border, borderStyle: 'dashed' },
  addCityText: { fontFamily: Typography.bodyFamilyMedium, fontSize: 14, color: Colors.accentBlue },
});
