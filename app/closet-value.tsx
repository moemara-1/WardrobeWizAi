import { Radius, Typography } from '@/constants/Colors';
import { useThemeColors } from '@/contexts/ThemeContext';
import { useClosetStore } from '@/stores/closetStore';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { router, type Href } from 'expo-router';
import { ArrowLeft, TrendingUp } from 'lucide-react-native';
import React, { useMemo } from 'react';
import {
    Dimensions,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Category colors matching the .pen mockup
const CATEGORY_COLORS: Record<string, string> = {
    shoes: '#32D583',
    tops: '#3B82F6',
    bottoms: '#A855F7',
    accessories: '#F59E0B',
    outerwear: '#EF4444',
    dresses: '#EC4899',
};

export default function ClosetValueScreen() {
    const Colors = useThemeColors();
    const styles = useMemo(() => createStyles(Colors), [Colors]);
    const { items } = useClosetStore();

    // Calculate total value and category breakdown
    const { totalValue, categoryBreakdown, topItems, itemCount } = useMemo(() => {
        let total = 0;
        const catMap: Record<string, number> = {};

        const valued = items
            .filter(i => i.estimated_value && i.estimated_value > 0)
            .sort((a, b) => (b.estimated_value || 0) - (a.estimated_value || 0));

        for (const item of items) {
            const val = item.estimated_value || 0;
            total += val;
            const cat = item.category.toLowerCase();
            catMap[cat] = (catMap[cat] || 0) + val;
        }

        // Sort categories by value descending
        const breakdown = Object.entries(catMap)
            .sort((a, b) => b[1] - a[1])
            .map(([category, value]) => ({
                category,
                value,
                color: CATEGORY_COLORS[category] || Colors.textSecondary,
                pct: total > 0 ? (value / total) * 100 : 0,
            }));

        return {
            totalValue: total,
            categoryBreakdown: breakdown,
            topItems: valued.slice(0, 5),
            itemCount: items.length,
        };
    }, [items, Colors.textSecondary]);

    const formatCurrency = (val: number) =>
        `$${val.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

    // Estimate earnings (20% of rarely-worn items)
    const potentialEarnings = useMemo(() => {
        const rarely = items.filter(i => (i.wear_count ?? 0) < 3 && (i.estimated_value || 0) > 0);
        return rarely.reduce((sum, i) => sum + (i.estimated_value || 0) * 0.2, 0);
    }, [items]);


    return (
        <View style={styles.container}>
            <SafeAreaView edges={['top']} style={styles.header}>
                <Pressable
                    style={styles.backBtn}
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }}
                >
                    <ArrowLeft size={20} color={Colors.textPrimary} />
                </Pressable>
                <Text style={styles.headerTitle}>Neckworth</Text>
                <View style={styles.headerSpacer} />
            </SafeAreaView>


            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Total Value Card */}
                <View style={styles.valueCard}>
                    <Text style={styles.valueLabel}>Your Closet Value</Text>
                    <Text style={styles.valueAmount}>{formatCurrency(totalValue)}</Text>
                    <Text style={styles.valueSub}>Based on {itemCount} pieces</Text>
                </View>

                {/* Category Breakdown */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Category Breakdown</Text>
                    {categoryBreakdown.map((cat) => (
                        <View key={cat.category} style={styles.catRow}>
                            <View style={styles.catLabelRow}>
                                <Text style={styles.catName}>{cat.category.charAt(0).toUpperCase() + cat.category.slice(1)}</Text>
                                <Text style={styles.catValue}>{formatCurrency(cat.value)}</Text>
                            </View>
                            <View style={styles.catBarBg}>
                                <View style={[styles.catBarFill, { width: `${Math.max(cat.pct, 4)}%`, backgroundColor: cat.color }]} />
                            </View>
                        </View>
                    ))}
                    {categoryBreakdown.length === 0 && (
                        <Text style={styles.emptyText}>Add items with estimated values to see breakdown</Text>
                    )}
                </View>

                {/* You Could Earn */}
                {potentialEarnings > 50 && (
                    <View style={styles.earnCard}>
                        <TrendingUp size={18} color={Colors.accentGreen} />
                        <View style={styles.earnContent}>
                            <Text style={styles.earnTitle}>You could earn {formatCurrency(potentialEarnings)}</Text>
                            <Text style={styles.earnSub}>List {items.filter(i => (i.wear_count ?? 0) < 3).length} rarely worn items on marketplace</Text>
                        </View>
                    </View>
                )}

                {/* Most Valuable Pieces */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Most Valuable Pieces</Text>
                    {topItems.map((item) => (
                        <Pressable
                            key={item.id}
                            style={styles.itemRow}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                router.push({ pathname: '/item/[id]', params: { id: item.id } } as Href);
                            }}
                        >
                            <Image
                                source={{ uri: item.clean_image_url || item.image_url }}
                                style={styles.itemThumb}
                                contentFit="contain"
                            />
                            <View style={styles.itemInfo}>
                                <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                                <Text style={styles.itemCategory}>{item.category}</Text>
                            </View>
                            <Text style={styles.itemPrice}>{formatCurrency(item.estimated_value || 0)}</Text>
                        </Pressable>
                    ))}
                    {topItems.length === 0 && (
                        <Text style={styles.emptyText}>No items with estimated values yet</Text>
                    )}
                </View>
            </ScrollView>
        </View>
    );
}

function createStyles(C: any) {
    return StyleSheet.create({
        container: { flex: 1, backgroundColor: C.background },
        header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 8 },
        backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.cardSurfaceAlt, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border },
        headerTitle: { flex: 1, textAlign: 'center', fontFamily: Typography.bodyFamilyBold, fontSize: 20, color: C.textPrimary },
        headerSpacer: { width: 40 },
        // Tabs
        tabBar: { flexDirection: 'row', marginHorizontal: 16, backgroundColor: C.cardSurfaceAlt, borderRadius: Radius.pill, padding: 4, marginBottom: 16 },
        tab: { flex: 1, paddingVertical: 10, borderRadius: Radius.pill, alignItems: 'center' },
        tabActive: { backgroundColor: C.accentGreen },
        tabText: { fontFamily: Typography.bodyFamilyMedium, fontSize: 14, color: C.textTertiary },
        tabTextActive: { fontFamily: Typography.bodyFamilyBold, color: '#FFFFFF' },
        scrollContent: { paddingHorizontal: 16, paddingBottom: 120 },
        // Value Card
        valueCard: { backgroundColor: C.cardSurface, borderRadius: Radius.lg, borderWidth: 1, borderColor: C.border, padding: 24, marginBottom: 20 },
        valueCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
        valueLabel: { fontFamily: Typography.bodyFamilyMedium, fontSize: 14, color: C.textSecondary, marginBottom: 4 },
        valueAmount: { fontFamily: Typography.serifFamilyBold, fontSize: 42, color: C.textPrimary },
        valueSub: { fontFamily: Typography.bodyFamily, fontSize: 13, color: C.textTertiary, marginTop: 2 },
        rankBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFD70020', paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.pill },
        rankBadgeText: { fontFamily: Typography.bodyFamilyBold, fontSize: 12, color: '#FFD700' },
        // Sections
        section: { marginBottom: 20 },
        sectionTitle: { fontFamily: Typography.bodyFamilyBold, fontSize: 16, color: C.textPrimary, marginBottom: 12 },
        // Category Breakdown
        catRow: { marginBottom: 12 },
        catLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
        catName: { fontFamily: Typography.bodyFamilyMedium, fontSize: 14, color: C.textPrimary },
        catValue: { fontFamily: Typography.bodyFamilyBold, fontSize: 14, color: C.textSecondary },
        catBarBg: { height: 8, borderRadius: 4, backgroundColor: C.cardSurfaceAlt, overflow: 'hidden' },
        catBarFill: { height: '100%', borderRadius: 4 },
        // Earn Card
        earnCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: `${C.accentGreen}15`, borderRadius: Radius.lg, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: `${C.accentGreen}30` },
        earnContent: { flex: 1 },
        earnTitle: { fontFamily: Typography.bodyFamilyBold, fontSize: 14, color: C.accentGreen },
        earnSub: { fontFamily: Typography.bodyFamily, fontSize: 12, color: C.textSecondary, marginTop: 2 },
        // Most Valuable Items
        itemRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border },
        itemThumb: { width: 48, height: 48, borderRadius: Radius.sm, backgroundColor: '#FFFFFF' },
        itemInfo: { flex: 1, gap: 2 },
        itemName: { fontFamily: Typography.bodyFamilyBold, fontSize: 14, color: C.textPrimary },
        itemCategory: { fontFamily: Typography.bodyFamily, fontSize: 12, color: C.textSecondary, textTransform: 'capitalize' },
        itemPrice: { fontFamily: Typography.bodyFamilyBold, fontSize: 15, color: C.accentGreen },
        // Leaderboard
        leaderRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 14, borderRadius: Radius.md, marginBottom: 8, borderWidth: 1, borderColor: C.border },
        leaderRank: { fontFamily: Typography.bodyFamilyBold, fontSize: 16, width: 24, textAlign: 'center' },
        leaderAvatar: { width: 36, height: 36, borderRadius: 18 },
        leaderInfo: { flex: 1, gap: 2 },
        leaderName: { fontFamily: Typography.bodyFamilyMedium, fontSize: 14, color: C.textPrimary },
        leaderPieces: { fontFamily: Typography.bodyFamily, fontSize: 12, color: C.textSecondary },
        leaderValue: { fontFamily: Typography.bodyFamilyBold, fontSize: 14 },
        emptyText: { fontFamily: Typography.bodyFamily, fontSize: 14, color: C.textTertiary, textAlign: 'center', paddingVertical: 24 },
    });
}
