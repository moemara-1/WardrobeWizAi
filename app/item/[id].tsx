import { Colors, Typography } from '@/constants/Colors';
import { useClosetStore } from '@/stores/closetStore';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, Heart, Sparkles } from 'lucide-react-native';
import React, { useState } from 'react';
import {
    Image,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ItemDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { items, updateItem } = useClosetStore();
    const [isWishlisted, setIsWishlisted] = useState(false);

    const item = items.find((i) => i.id === id);

    if (!item) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.notFound}>
                    <Text style={styles.notFoundText}>Item not found</Text>
                    <Pressable style={styles.backLink} onPress={() => router.back()}>
                        <Text style={styles.backLinkText}>Go back</Text>
                    </Pressable>
                </View>
            </SafeAreaView>
        );
    }

    const handleBack = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.back();
    };

    const handleWishlist = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setIsWishlisted((v) => !v);
    };

    const handleAddToCloset = () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        updateItem(item.id, { favorite: !item.favorite });
    };

    return (
        <View style={styles.container}>
            {/* Hero Image Area */}
            <View style={styles.imageArea}>
                <Image
                    source={{ uri: item.image_url }}
                    style={styles.heroImage}
                    resizeMode="cover"
                />

                {/* Back Button */}
                <SafeAreaView edges={['top']} style={styles.backBtnWrapper}>
                    <Pressable style={styles.backBtn} onPress={handleBack}>
                        <ChevronLeft size={22} color={Colors.textPrimary} />
                    </Pressable>
                </SafeAreaView>
            </View>

            {/* Details Section */}
            <View style={styles.details}>
                <Text style={styles.productName}>{item.name}</Text>

                <View style={styles.brandRow}>
                    <Text style={styles.brandName}>{item.brand || 'Unknown Brand'}</Text>

                    {/* Color Dots */}
                    <View style={styles.colorDots}>
                        {item.colors?.slice(0, 3).map((color, i) => (
                            <View
                                key={i}
                                style={[styles.colorDot, { backgroundColor: color }]}
                            />
                        ))}
                    </View>
                </View>

                {/* Item Stats */}
                <View style={styles.statsRow}>
                    <Text style={styles.statLabel}>Category</Text>
                    <Text style={styles.statValue}>{item.category}</Text>
                </View>
                <View style={styles.statsRow}>
                    <Text style={styles.statLabel}>Times Worn</Text>
                    <Text style={styles.statValue}>{item.wear_count || 0}</Text>
                </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actions}>
                <Pressable
                    style={[styles.actionBtn, isWishlisted && styles.actionBtnActive]}
                    onPress={handleWishlist}
                >
                    <Heart
                        size={20}
                        color={isWishlisted ? Colors.accentCoral : Colors.textPrimary}
                        fill={isWishlisted ? Colors.accentCoral : 'none'}
                    />
                    <Text style={styles.actionBtnText}>
                        {isWishlisted ? 'Wishlisted' : 'Add to Wishlist'}
                    </Text>
                </Pressable>

                <Pressable
                    style={[styles.actionBtn, styles.primaryBtn]}
                    onPress={handleAddToCloset}
                >
                    <Sparkles size={20} color={Colors.background} />
                    <Text style={[styles.actionBtnText, styles.primaryBtnText]}>
                        Add to Closet
                    </Text>
                </Pressable>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    imageArea: {
        position: 'relative',
        height: 480,
        backgroundColor: '#F5F5F5',
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        overflow: 'hidden',
    },
    heroImage: {
        width: '100%',
        height: '100%',
    },
    backBtnWrapper: {
        position: 'absolute',
        top: 0,
        left: 16,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 100,
        backgroundColor: Colors.cardSurface,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 8,
    },
    details: {
        padding: 24,
        gap: 8,
    },
    productName: {
        fontFamily: Typography.serifFamilyBold,
        fontSize: 24,
        color: Colors.textPrimary,
        letterSpacing: -0.5,
    },
    brandRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    brandName: {
        fontFamily: Typography.bodyFamily,
        fontSize: 16,
        color: Colors.textSecondary,
    },
    colorDots: {
        flexDirection: 'row',
        gap: 8,
    },
    colorDot: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 1.5,
        borderColor: Colors.borderLight,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    statLabel: {
        fontFamily: Typography.bodyFamily,
        fontSize: 14,
        color: Colors.textSecondary,
    },
    statValue: {
        fontFamily: Typography.bodyFamilyMedium,
        fontSize: 14,
        color: Colors.textPrimary,
        textTransform: 'capitalize',
    },
    actions: {
        padding: 24,
        gap: 12,
    },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        height: 52,
        borderRadius: 100,
        backgroundColor: Colors.cardSurface,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    actionBtnActive: {
        borderColor: Colors.accentCoral,
        backgroundColor: 'rgba(232, 90, 79, 0.1)',
    },
    actionBtnText: {
        fontFamily: Typography.bodyFamilyBold,
        fontSize: 15,
        color: Colors.textPrimary,
    },
    primaryBtn: {
        backgroundColor: Colors.accentGreen,
        borderColor: Colors.accentGreen,
    },
    primaryBtnText: {
        color: Colors.background,
    },
    notFound: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
    },
    notFoundText: {
        fontFamily: Typography.bodyFamily,
        fontSize: 16,
        color: Colors.textSecondary,
    },
    backLink: {
        padding: 12,
    },
    backLinkText: {
        fontFamily: Typography.bodyFamilyMedium,
        fontSize: 14,
        color: Colors.accentGreen,
    },
});
