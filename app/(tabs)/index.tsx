import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search } from 'lucide-react-native';
import { Colors, Radius, Spacing, Typography } from '@/constants/Colors';
import { CategoryPills } from '@/components/ui/CategoryPills';
import { PinCard } from '@/components/ui/PinCard';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;
const CATEGORIES = ['All', 'Streetwear', 'Minimal', 'Casual', 'Vintage'];

interface PinItem {
  id: string;
  imageUrl: string;
  title: string;
  username: string;
  avatarUrl?: string;
  likes: number;
  height: number;
}

const MOCK_PINS: PinItem[] = [
  { id: '1', imageUrl: 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=400', title: 'Summer layers', username: 'stylebyella', likes: 234, height: 220 },
  { id: '2', imageUrl: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=400', title: 'Monochrome fit', username: 'urban.fits', likes: 187, height: 260 },
  { id: '3', imageUrl: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400', title: 'Street casual', username: 'fashionkid', likes: 412, height: 240 },
  { id: '4', imageUrl: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=400', title: 'Date night look', username: 'vibecheck', likes: 89, height: 200 },
  { id: '5', imageUrl: 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=400', title: 'Boho vibes', username: 'earthtones', likes: 156, height: 280 },
  { id: '6', imageUrl: 'https://images.unsplash.com/photo-1485968579580-b6d095142e6e?w=400', title: 'Vintage denim', username: 'retrostyle', likes: 321, height: 210 },
  { id: '7', imageUrl: 'https://images.unsplash.com/photo-1558171813-4c088753af8f?w=400', title: 'Oversized fit', username: 'bigsilhouette', likes: 98, height: 250 },
  { id: '8', imageUrl: 'https://images.unsplash.com/photo-1544441893-675973e31985?w=400', title: 'Jacket season', username: 'layergame', likes: 445, height: 230 },
];

export default function BrowseScreen() {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  const leftColumn = MOCK_PINS.filter((_, i) => i % 2 === 0);
  const rightColumn = MOCK_PINS.filter((_, i) => i % 2 === 1);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        data={[1]}
        keyExtractor={() => 'browse'}
        renderItem={() => (
          <View style={styles.masonry}>
            <View style={styles.column}>
              {leftColumn.map((pin) => (
                <PinCard
                  key={pin.id}
                  imageUrl={pin.imageUrl}
                  title={pin.title}
                  username={pin.username}
                  avatarUrl={pin.avatarUrl}
                  likes={pin.likes}
                  height={pin.height}
                />
              ))}
            </View>
            <View style={styles.column}>
              {rightColumn.map((pin) => (
                <PinCard
                  key={pin.id}
                  imageUrl={pin.imageUrl}
                  title={pin.title}
                  username={pin.username}
                  avatarUrl={pin.avatarUrl}
                  likes={pin.likes}
                  height={pin.height}
                />
              ))}
            </View>
          </View>
        )}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.searchBar}>
              <Search size={18} color={Colors.textTertiary} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search outfits..."
                placeholderTextColor={Colors.textTertiary}
                value={search}
                onChangeText={setSearch}
              />
            </View>
            <CategoryPills
              categories={CATEGORIES}
              activeCategory={activeCategory}
              onSelect={setActiveCategory}
            />
          </View>
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingBottom: 100,
  },
  header: {
    gap: 12,
    marginBottom: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardSurfaceAlt,
    borderRadius: Radius.input,
    marginHorizontal: 16,
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: {
    flex: 1,
    fontFamily: Typography.bodyFamily,
    fontSize: 15,
    color: Colors.textPrimary,
    padding: 0,
  },
  masonry: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
  },
  column: {
    flex: 1,
  },
});
