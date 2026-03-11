import { Radius, Typography } from '@/constants/Colors';
import { useThemeColors } from '@/contexts/ThemeContext';
import { useClosetStore } from '@/stores/closetStore';
import { Href, router } from 'expo-router';
import { ChevronRight, Loader2, RefreshCw, XCircle } from 'lucide-react-native';
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';

export function PendingImportsBanner() {
    const Colors = useThemeColors();
    const { pendingImports, removePendingImport } = useClosetStore();
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

    if (pendingImports.length === 0) return null;

    return (
        <View style={styles.container}>
            {pendingImports.map((importData) => {
                const isProcessing = importData.status === 'processing';
                const isReady = importData.status === 'ready';
                const isError = importData.status === 'error';

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
                            {isReady && <RefreshCw size={20} color={Colors.textPrimary} />}
                            {isError && <XCircle size={20} color={Colors.accentCoral} />}
                        </View>

                        <View style={styles.textContainer}>
                            {isProcessing && (
                                <>
                                    <Text style={[styles.title, { color: Colors.textPrimary }]}>Analyzing outfit...</Text>
                                    <Text style={[styles.subtitle, { color: Colors.textSecondary }]}>Detecting clothing pieces in your photo</Text>
                                </>
                            )}
                            {isReady && (
                                <>
                                    <Text style={[styles.title, { color: Colors.textPrimary }]}>Outfit ready for review</Text>
                                    <Text style={[styles.subtitle, { color: Colors.textSecondary }]}>Tap to generate images and add to closet</Text>
                                </>
                            )}
                            {isError && (
                                <>
                                    <Text style={[styles.title, { color: Colors.accentCoral }]}>Analysis failed</Text>
                                    <Text style={[styles.subtitle, { color: Colors.textSecondary }]}>{importData.errorMsg || 'Could not detect items.'}</Text>
                                </>
                            )}
                        </View>

                        {isReady ? (
                            <ChevronRight size={20} color={Colors.textTertiary} />
                        ) : isError ? (
                            <Pressable onPress={() => removePendingImport(importData.id)} style={styles.dismissBtn}>
                                <Text style={[styles.dismissText, { color: Colors.textTertiary }]}>Dismiss</Text>
                            </Pressable>
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
    dismissBtn: {
        padding: 4,
    },
    dismissText: {
        fontFamily: Typography.bodyFamilyMedium,
        fontSize: 12,
    },
});
