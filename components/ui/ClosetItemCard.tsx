import { Colors, Radius, Typography } from '@/constants/Colors';
import { ClosetItem } from '@/types';
import { Image } from 'expo-image';
import { Link } from 'expo-router';
import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface ClosetItemCardProps {
    item: ClosetItem;
    onPress?: () => void;
    showBrandInfo?: boolean;
}

function ClosetItemCardComponent({ item, onPress, showBrandInfo = true }: ClosetItemCardProps) {
    // Use clean image (white bg) if available, otherwise original
    const imageUrl = item.clean_image_url || item.image_url;

    // Format estimated value
    const formattedValue = item.estimated_value
        ? `$${item.estimated_value.toLocaleString()}`
        : null;

    return (
        <Link href={`/item/${item.id}` as any} asChild>
            <Pressable style={styles.card} onPress={onPress}>
                <View style={styles.imageContainer}>
                    <Image
                        source={{ uri: imageUrl }}
                        style={styles.image}
                        contentFit="contain"
                    />

                    {/* Brand confidence indicator */}
                    {item.brand && item.brand_confidence && item.brand_confidence > 0.8 && (
                        <View style={styles.verifiedBadge}>
                            <Text style={styles.verifiedText}>✓</Text>
                        </View>
                    )}
                </View>

                {showBrandInfo && (
                    <View style={styles.footer}>
                        <View style={styles.textInfo}>
                            {item.brand && (
                                <Text style={styles.brand} numberOfLines={1}>
                                    {item.brand}
                                </Text>
                            )}
                            {item.model_name && (
                                <Text style={styles.modelName} numberOfLines={1}>
                                    {item.model_name}
                                </Text>
                            )}
                        </View>

                        {formattedValue && (
                            <Text style={styles.value}>{formattedValue}</Text>
                        )}
                    </View>
                )}
            </Pressable>
        </Link>
    );
}

export const ClosetItemCard = memo(ClosetItemCardComponent);

const styles = StyleSheet.create({
    card: {
        marginBottom: 12,
    },
    imageContainer: {
        position: 'relative',
        borderRadius: Radius.lg,
        overflow: 'hidden',
        backgroundColor: '#FFFFFF', // White background for clean product look
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
    },
    image: {
        width: '100%',
        height: 180,
        backgroundColor: '#FFFFFF',
    },
    verifiedBadge: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: Colors.accentGreen,
        alignItems: 'center',
        justifyContent: 'center',
    },
    verifiedText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginTop: 8,
        paddingHorizontal: 2,
    },
    textInfo: {
        flex: 1,
    },
    brand: {
        fontFamily: Typography.bodyFamilyBold,
        fontSize: 13,
        color: Colors.textPrimary,
    },
    modelName: {
        fontFamily: Typography.bodyFamily,
        fontSize: 11,
        color: Colors.textSecondary,
        marginTop: 2,
    },
    value: {
        fontFamily: Typography.bodyFamilyBold,
        fontSize: 13,
        color: Colors.textSecondary,
        marginLeft: 8,
    },
});
