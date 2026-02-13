import { Radius, Typography } from '@/constants/Colors';
import { useThemeColors } from '@/contexts/ThemeContext';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { ArrowLeft, Search } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const POPULAR_SEARCHES = [
  'Nike Air Force 1 white',
  'Adidas Samba black',
  'Blue jeans',
  'Ralph Lauren polo shirt',
  'Uggs',
  'The North Face puffer jacket',
  'White t-shirt',
  'Converse Chuck Taylor',
  'Levis 501 jeans',
];

export default function SearchToAddScreen() {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const [query, setQuery] = useState('');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.headerBar}>
        <Pressable
          style={styles.backBtn}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }}
        >
          <ArrowLeft size={20} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Search to Add</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.searchBar}>
        <Search size={18} color={Colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search for clothes"
          placeholderTextColor={Colors.textTertiary}
          value={query}
          onChangeText={setQuery}
          autoFocus
        />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.sectionTitle}>Popular searches</Text>
        {POPULAR_SEARCHES.map((term) => (
          <Pressable
            key={term}
            style={styles.searchRow}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setQuery(term);
            }}
          >
            <Text style={styles.dash}>-</Text>
            <Text style={styles.searchTerm}>{term}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(C: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.background },
    headerBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12 },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.cardSurfaceAlt, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { flex: 1, fontFamily: Typography.bodyFamilyBold, fontSize: 18, color: C.textPrimary, textAlign: 'center' },
    headerSpacer: { width: 40 },
    searchBar: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: C.cardSurface, borderRadius: Radius.input, gap: 10, marginBottom: 20, borderWidth: 1, borderColor: C.border },
    searchInput: { flex: 1, fontFamily: Typography.bodyFamily, fontSize: 15, color: C.textPrimary, padding: 0 },
    scrollContent: { paddingHorizontal: 16, paddingBottom: 40 },
    sectionTitle: { fontFamily: Typography.bodyFamilyBold, fontSize: 16, color: C.textPrimary, marginBottom: 16 },
    searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 14 },
    dash: { fontFamily: Typography.bodyFamily, fontSize: 16, color: C.textSecondary },
    searchTerm: { fontFamily: Typography.bodyFamily, fontSize: 16, color: C.textPrimary },
  });
}
