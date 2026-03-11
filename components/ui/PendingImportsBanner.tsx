import { Radius, Typography } from '@/constants/Colors';
import { useThemeColors } from '@/contexts/ThemeContext';
import { analyzeOutfitImage, researchClothingItem } from '@/lib/ai';
import { useClosetStore } from '@/stores/closetStore';
import { ClothingCategory, DetectedPiece } from '@/types';
import { Href, router } from 'expo-router';
import { CheckCircle, ChevronRight, Loader2, RotateCcw, XCircle } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';

const CATEGORIES: ClothingCategory[] = [
    'top', 'bottom', 'outerwear', 'dress', 'shoe',
    'accessory', 'bag', 'hat', 'jewelry', 'other',
];

export function PendingImportsBanner() {
    const Colors = useThemeColors();
    const { pendingImports, removePendingImport, updatePendingImport } = useClosetStore();
    const spinValue = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.loop(
            Animated.timing(spinValue, {
                toValue: 1,
                duration: 2000,
                easing: Easing.linear,
                useNativeDriver: true,
            })
        ).start();
    }, []);

    const spin = spinValue.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    const retryImport = useCallback((importId: string, imageUri: string) => {
        updatePendingImport(importId, { status: 'processing', errorMsg: undefined, pieces: [] });

        (async () => {
            try {
                const result = await analyzeOutfitImage(imageUri);
                if (!result.detections || result.detections.length === 0) {
                    updatePendingImport(importId, { status: 'error', errorMsg: 'No clothing items detected in image.' });
                    return;
                }

                const pieces: DetectedPiece[] = result.detections.map((det, idx: number) => ({
                    id: `piece-${Date.now()}-${idx}`,
                    name: det.name,
                    category: (CATEGORIES.includes(det.category as ClothingCategory) ? det.category : 'other') as ClothingCategory,
                    brand: det.brand || '',
                    colors: det.colors || [],
                    confidence: det.confidence,
                    estimatedValue: det.estimatedValue ? String(det.estimatedValue) : '',
                    tags: [],
                    garmentType: det.modelName || '',
                    selected: true,
                    box_2d: det.box_2d,
                    isCleaning: false,
                }));

                const researchedPieces = await Promise.all(
                    pieces.map(async (piece) => {
                        try {
                            const research = await researchClothingItem(piece.name, piece.brand || null, piece.category);
                            return {
                                ...piece,
                                estimatedValue: research.estimated_value ? String(research.estimated_value) : piece.estimatedValue,
                                brand: research.brand || piece.brand,
                                tags: research.tags && research.tags.length > 0 ? research.tags : piece.tags,
                                garmentType: research.subcategory || piece.garmentType,
                            };
                        } catch {
                            return piece;
                        }
                    })
                );

                updatePendingImport(importId, {
                    status: 'ready',
                    pieces: researchedPieces,
                    overallStyle: result.overallStyle,
                    occasion: result.occasion,
                });
            } catch (e) {
                updatePendingImport(importId, {
                    status: 'error',
                    errorMsg: e instanceof Error ? e.message : 'Detection failed',
                });
            }
        })();
    }, [updatePendingImport]);

    if (pendingImports.length === 0) return null;

    return (
        <View style={styles.container}>
            {pendingImports.map((importData) => {
                const isProcessing = importData.status === 'processing';
                const isReady = importData.status === 'ready';
                const isError = importData.status === 'error';
                const pieceCount = importData.pieces?.length ?? 0;

                return (
                    <Pressable
                        key={importData.id}
                        style={[styles.banner, { backgroundColor: Colors.cardSurface }]}
                        onPress={() => {
                            if (isReady) {
                                router.push({ pathname: '/analyze', params: { pendingImportId: importData.id, mode: 'fitpic', imageUri: importData.imageUri } } as Href);
                            }
                        }}
                    >
                        <View style={styles.iconContainer}>
                            {isProcessing && (
                                <Animated.View style={{ transform: [{ rotate: spin }] }}>
                                    <Loader2 size={20} color={Colors.accentGreen} />
                                </Animated.View>
                            )}
                            {isReady && <CheckCircle size={20} color={Colors.accentGreen} />}
                            {isError && <XCircle size={20} color={Colors.accentCoral} />}
                        </View>

                        <View style={styles.textContainer}>
                            {isProcessing && (
                                <>
                                    <Text style={[styles.title, { color: Colors.textPrimary }]}>Analyzing outfit...</Text>
                                    <Text style={[styles.subtitle, { color: Colors.textSecondary }]}>Detecting and researching clothing pieces</Text>
                                </>
                            )}
                            {isReady && (
                                <>
                                    <Text style={[styles.title, { color: Colors.textPrimary }]}>
                                        {pieceCount} piece{pieceCount !== 1 ? 's' : ''} ready for review
                                    </Text>
                                    <Text style={[styles.subtitle, { color: Colors.textSecondary }]}>Tap to generate images and add to closet</Text>
                                </>
                            )}
                            {isError && (
                                <>
                                    <Text style={[styles.title, { color: Colors.accentCoral }]}>Analysis failed</Text>
                                    <Text numberOfLines={2} style={[styles.subtitle, { color: Colors.textSecondary }]}>{importData.errorMsg || 'Could not detect items.'}</Text>
                                </>
                            )}
                        </View>

                        {isReady ? (
                            <ChevronRight size={20} color={Colors.textTertiary} />
                        ) : isError ? (
                            <View style={styles.errorActions}>
                                <Pressable
                                    onPress={() => retryImport(importData.id, importData.imageUri)}
                                    style={[styles.retryBtn, { backgroundColor: Colors.accentGreen + '20' }]}
                                >
                                    <RotateCcw size={14} color={Colors.accentGreen} />
                                    <Text style={[styles.retryText, { color: Colors.accentGreen }]}>Retry</Text>
                                </Pressable>
                                <Pressable onPress={() => removePendingImport(importData.id)} style={styles.dismissBtn}>
                                    <Text style={[styles.dismissText, { color: Colors.textTertiary }]}>Dismiss</Text>
                                </Pressable>
                            </View>
                        ) : null}
                    </Pressable>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 16,
        paddingTop: 8,
        gap: 8,
    },
    banner: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: Radius.md,
        gap: 12,
    },
    iconContainer: {
        width: 32,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
    textContainer: {
        flex: 1,
        gap: 2,
    },
    title: {
        fontFamily: Typography.bodyFamilyBold,
        fontSize: 14,
    },
    subtitle: {
        fontFamily: Typography.bodyFamily,
        fontSize: 12,
    },
    errorActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    retryBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: Radius.sm,
    },
    retryText: {
        fontFamily: Typography.bodyFamilyMedium,
        fontSize: 12,
    },
    dismissBtn: {
        padding: 4,
    },
    dismissText: {
        fontFamily: Typography.bodyFamilyMedium,
        fontSize: 12,
    },
});

