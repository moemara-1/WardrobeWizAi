import { Colors, Radius, Typography } from '@/constants/Colors';
import { Image } from 'expo-image';
import { X } from 'lucide-react-native';
import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface WornItemCardProps {
    imageUrl: string;
    name: string;
    brand?: string;
    badge?: string;
    onRemove?: () => void;
}

function WornItemCardComponent({ imageUrl, name, brand, badge, onRemove }: WornItemCardProps) {
    return (
        <View style={styles.card}>
            <View style={styles.imageContainer}>
                <Image source={{ uri: imageUrl }} style={styles.image} contentFit="cover" />

                {badge && (
                    <View style={styles.badge}>
                        <View style={styles.badgeDot} />
                        <Text style={styles.badgeText}>In Closet</Text>
                    </View>
                )}

                {onRemove && (
                    <Pressable style={styles.removeBtn} onPress={onRemove}>
                        <X size={14} color={Colors.textPrimary} />
                    </Pressable>
                )}
            </View>

            <Text style={styles.name} numberOfLines={1}>{name}</Text>
            {brand && <Text style={styles.brand} numberOfLines={1}>{brand}</Text>}
        </View>
    );
}

export const WornItemCard = memo(WornItemCardComponent);

const styles = StyleSheet.create({
    card: {
        width: 130,
        marginRight: 12,
    },
    imageContainer: {
        position: 'relative',
        borderRadius: Radius.md,
        overflow: 'hidden',
    },
    image: {
        width: '100%',
        height: 120,
        backgroundColor: Colors.cardSurface,
    },
    badge: {
        position: 'absolute',
        top: 4,
        left: 4,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(50, 213, 131, 0.2)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        gap: 4,
    },
    badgeDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: Colors.accentGreen,
    },
    badgeText: {
        fontFamily: Typography.bodyFamilyBold,
        fontSize: 10,
        color: Colors.accentGreen,
    },
    removeBtn: {
        position: 'absolute',
        top: 4,
        right: 4,
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: 'rgba(26, 26, 30, 0.8)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    name: {
        fontFamily: Typography.bodyFamilyBold,
        fontSize: 12,
        color: Colors.textPrimary,
        marginTop: 4,
    },
    brand: {
        fontFamily: Typography.bodyFamily,
        fontSize: 11,
        color: Colors.textSecondary,
    },
});
