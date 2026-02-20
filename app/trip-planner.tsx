import { Radius, Typography } from '@/constants/Colors';
import { useThemeColors } from '@/contexts/ThemeContext';
import * as Haptics from 'expo-haptics';
import { router, type Href } from 'expo-router';
import {
  Bookmark,
  Briefcase,
  Heart,
  MapPin,
  Minus,
  PartyPopper,
  Plane,
  Plus,
  Search,
  Shirt,
  Sparkles,
  UserCircle
} from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// World cities dataset (200+ popular destinations)
const WORLD_CITIES = [
  'New York, USA', 'Los Angeles, USA', 'Chicago, USA', 'Miami, USA', 'San Francisco, USA',
  'Las Vegas, USA', 'Seattle, USA', 'Boston, USA', 'Washington DC, USA', 'Austin, USA',
  'Nashville, USA', 'Denver, USA', 'Portland, USA', 'Dallas, USA', 'Houston, USA',
  'Atlanta, USA', 'Orlando, USA', 'San Diego, USA', 'Honolulu, USA', 'New Orleans, USA',
  'Philadelphia, USA', 'Phoenix, USA', 'Minneapolis, USA', 'Detroit, USA', 'Charlotte, USA',
  'London, UK', 'Manchester, UK', 'Edinburgh, UK', 'Birmingham, UK', 'Liverpool, UK',
  'Paris, France', 'Nice, France', 'Lyon, France', 'Marseille, France', 'Bordeaux, France',
  'Rome, Italy', 'Milan, Italy', 'Florence, Italy', 'Venice, Italy', 'Naples, Italy',
  'Barcelona, Spain', 'Madrid, Spain', 'Seville, Spain', 'Valencia, Spain', 'Malaga, Spain',
  'Berlin, Germany', 'Munich, Germany', 'Hamburg, Germany', 'Frankfurt, Germany', 'Cologne, Germany',
  'Amsterdam, Netherlands', 'Rotterdam, Netherlands', 'The Hague, Netherlands',
  'Brussels, Belgium', 'Antwerp, Belgium', 'Zurich, Switzerland', 'Geneva, Switzerland',
  'Vienna, Austria', 'Salzburg, Austria', 'Prague, Czech Republic', 'Budapest, Hungary',
  'Warsaw, Poland', 'Krakow, Poland', 'Copenhagen, Denmark', 'Stockholm, Sweden',
  'Oslo, Norway', 'Helsinki, Finland', 'Dublin, Ireland', 'Lisbon, Portugal', 'Porto, Portugal',
  'Athens, Greece', 'Santorini, Greece', 'Istanbul, Turkey', 'Antalya, Turkey',
  'Dubai, UAE', 'Abu Dhabi, UAE', 'Doha, Qatar', 'Riyadh, Saudi Arabia', 'Jeddah, Saudi Arabia',
  'Tokyo, Japan', 'Osaka, Japan', 'Kyoto, Japan', 'Seoul, South Korea', 'Busan, South Korea',
  'Beijing, China', 'Shanghai, China', 'Hong Kong, China', 'Shenzhen, China', 'Guangzhou, China',
  'Taipei, Taiwan', 'Singapore', 'Kuala Lumpur, Malaysia', 'Jakarta, Indonesia', 'Bali, Indonesia',
  'Bangkok, Thailand', 'Phuket, Thailand', 'Chiang Mai, Thailand', 'Ho Chi Minh City, Vietnam',
  'Hanoi, Vietnam', 'Manila, Philippines', 'Mumbai, India', 'Delhi, India', 'Bangalore, India',
  'Goa, India', 'Jaipur, India',
  'Sydney, Australia', 'Melbourne, Australia', 'Brisbane, Australia', 'Perth, Australia',
  'Auckland, New Zealand', 'Queenstown, New Zealand',
  'Cairo, Egypt', 'Marrakech, Morocco', 'Cape Town, South Africa', 'Johannesburg, South Africa',
  'Nairobi, Kenya', 'Lagos, Nigeria', 'Accra, Ghana', 'Addis Ababa, Ethiopia',
  'São Paulo, Brazil', 'Rio de Janeiro, Brazil', 'Buenos Aires, Argentina', 'Lima, Peru',
  'Bogotá, Colombia', 'Medellín, Colombia', 'Santiago, Chile', 'Mexico City, Mexico',
  'Cancún, Mexico', 'Havana, Cuba', 'San Juan, Puerto Rico', 'Cartagena, Colombia',
  'Toronto, Canada', 'Vancouver, Canada', 'Montreal, Canada', 'Calgary, Canada',
  'Moscow, Russia', 'St. Petersburg, Russia', 'Reykjavik, Iceland',
  'Dubrovnik, Croatia', 'Split, Croatia', 'Tallinn, Estonia', 'Riga, Latvia',
  'Bucharest, Romania', 'Sofia, Bulgaria', 'Belgrade, Serbia',
];

type Occasion = 'business' | 'fun' | 'romantic' | 'casual' | 'formal';

const OCCASIONS: { key: Occasion; label: string; icon: React.ComponentType<{ size: number; color: string }> }[] = [
  { key: 'business', label: 'Business', icon: Briefcase },
  { key: 'fun', label: 'Fun', icon: PartyPopper },
  { key: 'romantic', label: 'Romantic', icon: Heart },
  { key: 'casual', label: 'Casual', icon: Shirt },
  { key: 'formal', label: 'Formal', icon: UserCircle },
];

export default function TripPlannerScreen() {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const [days, setDays] = useState(3);
  const [destinations, setDestinations] = useState<string[]>(['']);
  const [occasion, setOccasion] = useState<Occasion>('fun');
  const [multiCity, setMultiCity] = useState(false);
  const [activeSearchIndex, setActiveSearchIndex] = useState<number | null>(null);

  const filteredCities = useMemo(() => {
    if (activeSearchIndex === null) return [];
    const query = destinations[activeSearchIndex]?.toLowerCase().trim();
    if (!query || query.length < 1) return [];
    return WORLD_CITIES.filter((city) =>
      city.toLowerCase().includes(query)
    ).slice(0, 8);
  }, [activeSearchIndex, destinations]);

  const updateDestination = (index: number, value: string) => {
    setDestinations((prev) => prev.map((d, i) => (i === index ? value : d)));
    setActiveSearchIndex(index);
  };

  const selectCity = (city: string) => {
    if (activeSearchIndex !== null) {
      Haptics.selectionAsync();
      setDestinations((prev) => prev.map((d, i) => (i === activeSearchIndex ? city : d)));
      setActiveSearchIndex(null);
    }
  };

  const addDestination = () => {
    setDestinations((prev) => [...prev, '']);
  };

  const removeDestination = (index: number) => {
    if (destinations.length <= 1) return;
    setDestinations((prev) => prev.filter((_, i) => i !== index));
  };

  const handleBuild = () => {
    const validDests = destinations.filter(d => d.trim().length > 0);
    if (validDests.length === 0) {
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.push({
      pathname: '/trip-result',
      params: {
        days: String(days),
        destinations: JSON.stringify(validDests),
        occasion,
      },
    } as Href);
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
          <View key={index} style={{ zIndex: activeSearchIndex === index ? 100 : 1 }}>
            <View style={styles.destinationRow}>
              <Search size={16} color={Colors.textSecondary} />
              <TextInput
                style={styles.destInput}
                placeholder={multiCity ? `City ${index + 1}...` : 'Search for a city...'}
                placeholderTextColor={Colors.textTertiary}
                value={dest}
                onChangeText={(v) => updateDestination(index, v)}
                onFocus={() => setActiveSearchIndex(index)}
                // Increased timeout to allow tap to register
                onBlur={() => setTimeout(() => setActiveSearchIndex(null), 500)}
              />
              {dest.length > 0 && (
                <Pressable onPress={() => { updateDestination(index, ''); setActiveSearchIndex(index); }}>
                  <Minus size={16} color={Colors.textSecondary} />
                </Pressable>
              )}
              {multiCity && destinations.length > 1 && (
                <Pressable onPress={() => removeDestination(index)}>
                  <Minus size={16} color={Colors.textSecondary} />
                </Pressable>
              )}
            </View>
            {/* City dropdown */}
            {activeSearchIndex === index && filteredCities.length > 0 && (
              <View style={styles.cityDropdown}>
                {filteredCities.map((city) => (
                  <Pressable
                    key={city}
                    style={styles.cityDropdownItem}
                    onPress={() => selectCity(city)}
                  >
                    <MapPin size={14} color={Colors.textTertiary} />
                    <Text style={styles.cityDropdownText}>{city}</Text>
                  </Pressable>
                ))}
              </View>
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
        <Pressable
          style={[styles.buildBtn, destinations.filter(d => d.trim().length > 0).length === 0 && { opacity: 0.5 }]}
          onPress={handleBuild}
        >
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

function createStyles(C: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.background },
    cancelBtn: { paddingHorizontal: 24, paddingVertical: 8 },
    cancelText: { fontFamily: Typography.bodyFamilyMedium, fontSize: 15, color: C.textPrimary },
    scrollContent: { padding: 24, alignItems: 'center' },
    iconCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: C.accentBlue, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
    title: { fontFamily: Typography.bodyFamilyBold, fontSize: 24, color: C.textPrimary, marginBottom: 4 },
    subtitle: { fontFamily: Typography.bodyFamily, fontSize: 14, color: C.textSecondary, marginBottom: 24 },
    toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', backgroundColor: C.cardSurface, borderRadius: Radius.md, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 20 },
    toggleLabel: { fontFamily: Typography.bodyFamilyBold, fontSize: 15, color: C.textPrimary },
    toggle: { width: 48, height: 28, borderRadius: 14, backgroundColor: C.border, justifyContent: 'center', paddingHorizontal: 3 },
    toggleActive: { backgroundColor: C.accentBlue },
    toggleThumb: { width: 22, height: 22, borderRadius: 11, backgroundColor: C.textPrimary },
    toggleThumbActive: { alignSelf: 'flex-end' },
    sectionLabel: { fontFamily: Typography.bodyFamilyBold, fontSize: 15, color: C.textPrimary, marginBottom: 8, alignSelf: 'center' },
    durationRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 24 },
    durationBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.cardSurfaceAlt, alignItems: 'center', justifyContent: 'center' },
    durationCenter: { alignItems: 'center' },
    durationNum: { fontFamily: Typography.bodyFamilyBold, fontSize: 36, color: C.textPrimary },
    durationLabel: { fontFamily: Typography.bodyFamily, fontSize: 13, color: C.textSecondary },
    destinationRow: { flexDirection: 'row', alignItems: 'center', width: '100%', backgroundColor: C.cardSurface, borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 14, gap: 8, marginBottom: 4 },
    destInput: { flex: 1, fontFamily: Typography.bodyFamily, fontSize: 15, color: C.textPrimary, padding: 0 },
    cityDropdown: { width: '100%', backgroundColor: C.cardSurface, borderRadius: Radius.md, borderWidth: 1, borderColor: C.border, marginBottom: 16, overflow: 'hidden' },
    cityDropdownItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
    cityDropdownText: { fontFamily: Typography.bodyFamily, fontSize: 14, color: C.textPrimary },
    occasionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
    occasionRow: { gap: 12, marginBottom: 24, paddingHorizontal: 4 },
    occasionChip: { alignItems: 'center', gap: 6, width: 72 },
    occasionChipActive: {},
    occasionIcon: { width: 52, height: 52, borderRadius: 16, backgroundColor: C.cardSurfaceAlt, alignItems: 'center', justifyContent: 'center' },
    occasionIconActive: { backgroundColor: C.cardSurface, borderWidth: 2, borderColor: C.accentBlue },
    occasionLabel: { fontFamily: Typography.bodyFamily, fontSize: 12, color: C.textSecondary },
    occasionLabelActive: { fontFamily: Typography.bodyFamilyBold, color: C.accentBlue },
    buildBtn: { width: '100%', paddingVertical: 16, borderRadius: Radius.pill, backgroundColor: C.accentGreen, alignItems: 'center', marginBottom: 10 },
    buildBtnText: { fontFamily: Typography.bodyFamilyBold, fontSize: 16, color: C.background },
    savedBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%', paddingVertical: 14, borderRadius: Radius.pill, backgroundColor: C.cardSurfaceAlt, borderWidth: 1, borderColor: C.border },
    savedBtnText: { fontFamily: Typography.bodyFamilyBold, fontSize: 15, color: C.accentBlue },
    addCityBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%', paddingVertical: 12, borderRadius: Radius.md, backgroundColor: C.cardSurfaceAlt, marginBottom: 24, borderWidth: 1, borderColor: C.border, borderStyle: 'dashed' },
    addCityText: { fontFamily: Typography.bodyFamilyMedium, fontSize: 14, color: C.accentBlue },
  });
}
