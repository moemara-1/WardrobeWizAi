import { Colors, Radius, Typography } from '@/constants/Colors';
import { ClosetItem } from '@/types';
import { Link } from 'expo-router';
import { GripHorizontal } from 'lucide-react-native';
import React, { memo } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

interface ClosetItemCardProps {
    item: ClosetItem;
    onPress?: () => void;
}

function ClosetItemCardComponent({ item, onPress }: ClosetItemCardProps) {
    const showInClosetBadge = item.detected_confidence && item.detected_confidence > 0.8;

    return (
        <Link href={`/item/${item.id}` as any} asChild>
            <Pressable style={styles.card} onPress={onPress}>
                <View style={styles.imageContainer}>
                    <Image
                        source={{ uri: item.image_url }}
                        style={styles.image}
                        resizeMode="cover"
                    />

                    {/* Selection/Drag badge */}
                    <View style={styles.dragBadge}>
                        <GripHorizontal size={16} color={Colors.textSecondary} />
                    </View>

                    {/* In Closet badge */}
                    {showInClosetBadge && (
                        <View style={styles.inClosetBadge}>
                            <View style={styles.inClosetDot} />
                            <Text style={styles.inClosetText}>In Closet</Text>
                        </View>
                    )}

                    {/* Item name overlay */}
                    <Text style={styles.itemName} numberOfLines={1}>
                        {item.name}
                    </Text>
                </View>

                <View style={styles.footer}>
                    <Text style={styles.brand} numberOfLines={1}>
                        {item.brand || 'Unknown'}
                    </Text>
                    {item.colors?.[0] && (
                        <View style={[styles.colorDot, { backgroundColor: item.colors[0] }]} />
                    )}
                </View>
            </Pressable>
        </Link>
    );
}

export const ClosetItemCard = memo(ClosetItemCardComponent);

const styles = StyleSheet.create({
    card: {
        marginBottom: 16,
    },
    imageContainer: {
        position: 'relative',
        borderRadius: Radius.lg,
        overflow: 'hidden',
    },
    image: {
        width: '100%',
        height: 200,
        backgroundColor: Colors.cardSurface,
    },
    dragBadge: {
        position: 'absolute',
        top: 8,
        left: 8,
        width: 28,
        height: 28,
        borderRadius: 100,
        backgroundColor: 'rgba(26, 26, 30, 0.8)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    inClosetBadge: {
        position: 'absolute',
        top: 8,
        left: 44,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(50, 213, 131, 0.2)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        gap: 4,
    },
    inClosetDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: Colors.accentGreen,
    },
    inClosetText: {
        fontFamily: Typography.bodyFamilyBold,
        fontSize: 10,
        color: Colors.accentGreen,
    },
    itemName: {
        position: 'absolute',
        bottom: 10,
        left: 10,
        right: 10,
        fontFamily: Typography.bodyFamilyBold,
        fontSize: 14,
        color: Colors.textPrimary,
        textShadowColor: 'rgba(0, 0, 0, 0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 6,
    },
    brand: {
        fontFamily: Typography.bodyFamily,
        fontSize: 13,
        color: Colors.textSecondary,
        flex: 1,
    },
    colorDot: {
        width: 16,
        height: 16,
        borderRadius: 8,
        borderWidth: 1.5,
        borderColor: Colors.borderLight,
    },
});
