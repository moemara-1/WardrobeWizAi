import { Typography } from '@/constants/Colors';
import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, StyleSheet, View } from 'react-native';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

interface AnimatedSplashProps {
    onFinish: () => void;
}

export default function AnimatedSplash({ onFinish }: AnimatedSplashProps) {
    // Logo scale + opacity
    const logoScale = useRef(new Animated.Value(0.6)).current;
    const logoOpacity = useRef(new Animated.Value(0)).current;

    // Glow ring
    const glowScale = useRef(new Animated.Value(0.5)).current;
    const glowOpacity = useRef(new Animated.Value(0)).current;

    // Title text
    const titleOpacity = useRef(new Animated.Value(0)).current;
    const titleY = useRef(new Animated.Value(20)).current;

    // Tagline text
    const taglineOpacity = useRef(new Animated.Value(0)).current;

    // Sparkle particles
    const sparkle1 = useRef(new Animated.Value(0)).current;
    const sparkle2 = useRef(new Animated.Value(0)).current;
    const sparkle3 = useRef(new Animated.Value(0)).current;
    const sparkle1Y = useRef(new Animated.Value(0)).current;
    const sparkle2Y = useRef(new Animated.Value(0)).current;
    const sparkle3Y = useRef(new Animated.Value(0)).current;

    // Fade out
    const containerOpacity = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        // Phase 1: Logo appears with scale + glow (0-600ms)
        Animated.parallel([
            Animated.timing(logoOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
            Animated.spring(logoScale, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
            Animated.timing(glowOpacity, { toValue: 0.6, duration: 600, useNativeDriver: true }),
            Animated.spring(glowScale, { toValue: 1.3, tension: 40, friction: 10, useNativeDriver: true }),
        ]).start();

        // Phase 2: Sparkles float up (300-800ms)
        setTimeout(() => {
            const sparkleAnim = (opacity: Animated.Value, y: Animated.Value, delay: number) => {
                Animated.sequence([
                    Animated.delay(delay),
                    Animated.parallel([
                        Animated.sequence([
                            Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
                            Animated.timing(opacity, { toValue: 0, duration: 400, useNativeDriver: true }),
                        ]),
                        Animated.timing(y, { toValue: -30, duration: 700, useNativeDriver: true }),
                    ]),
                ]).start();
            };
            sparkleAnim(sparkle1, sparkle1Y, 0);
            sparkleAnim(sparkle2, sparkle2Y, 150);
            sparkleAnim(sparkle3, sparkle3Y, 300);
        }, 300);

        // Phase 3: Title slides in (600-1000ms)
        setTimeout(() => {
            Animated.parallel([
                Animated.timing(titleOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
                Animated.spring(titleY, { toValue: 0, tension: 80, friction: 12, useNativeDriver: true }),
            ]).start();
        }, 600);

        // Phase 4: Tagline fades in (900-1200ms)
        setTimeout(() => {
            Animated.timing(taglineOpacity, { toValue: 1, duration: 400, useNativeDriver: true }).start();
        }, 900);

        // Phase 5: Glow pulse (1200-1600ms)
        setTimeout(() => {
            Animated.sequence([
                Animated.timing(glowOpacity, { toValue: 0.9, duration: 200, useNativeDriver: true }),
                Animated.timing(glowOpacity, { toValue: 0.3, duration: 300, useNativeDriver: true }),
            ]).start();
        }, 1200);

        // Phase 6: Fade out entire screen (2000-2500ms)
        setTimeout(() => {
            Animated.timing(containerOpacity, {
                toValue: 0,
                duration: 400,
                useNativeDriver: true,
            }).start(() => {
                onFinish();
            });
        }, 2200);
    }, []);

    return (
        <Animated.View style={[styles.container, { opacity: containerOpacity }]}>
            {/* Background gradient-like layers */}
            <View style={styles.bgGradientTop} />
            <View style={styles.bgGradientBottom} />



            {/* Logo */}
            <Animated.Image
                source={require('@/assets/images/icon.png')}
                style={[
                    styles.logo,
                    {
                        opacity: logoOpacity,
                        transform: [{ scale: logoScale }],
                    },
                ]}
                resizeMode="contain"
            />

            {/* Sparkle particles */}
            <Animated.View style={[styles.sparkle, styles.sparkle1, { opacity: sparkle1, transform: [{ translateY: sparkle1Y }] }]}>
                <View style={styles.sparkleInner} />
            </Animated.View>
            <Animated.View style={[styles.sparkle, styles.sparkle2, { opacity: sparkle2, transform: [{ translateY: sparkle2Y }] }]}>
                <View style={styles.sparkleInner} />
            </Animated.View>
            <Animated.View style={[styles.sparkle, styles.sparkle3, { opacity: sparkle3, transform: [{ translateY: sparkle3Y }] }]}>
                <View style={styles.sparkleInner} />
            </Animated.View>

            {/* Title */}
            <Animated.Text
                style={[
                    styles.title,
                    {
                        opacity: titleOpacity,
                        transform: [{ translateY: titleY }],
                    },
                ]}
            >
                WardrobeWiz
            </Animated.Text>

            {/* Tagline */}
            <Animated.Text style={[styles.tagline, { opacity: taglineOpacity }]}>
                Your AI-Powered Closet
            </Animated.Text>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#0B0B0E',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
    },
    bgGradientTop: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: SCREEN_H * 0.4,
        backgroundColor: 'transparent',
        borderBottomWidth: 0,
    },
    bgGradientBottom: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: SCREEN_H * 0.3,
        backgroundColor: 'transparent',
    },
    glowRing: {
        position: 'absolute',
        width: 200,
        height: 200,
        borderRadius: 100,
        backgroundColor: 'rgba(110, 231, 183, 0.15)',
        shadowColor: '#6EE7B7',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 60,
        elevation: 20,
    },
    logo: {
        width: 140,
        height: 140,
        marginBottom: 24,
    },
    sparkle: {
        position: 'absolute',
        width: 8,
        height: 8,
    },
    sparkleInner: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#6EE7B7',
        shadowColor: '#6EE7B7',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 6,
    },
    sparkle1: {
        top: SCREEN_H / 2 - 90,
        left: SCREEN_W / 2 + 50,
    },
    sparkle2: {
        top: SCREEN_H / 2 - 70,
        left: SCREEN_W / 2 + 30,
    },
    sparkle3: {
        top: SCREEN_H / 2 - 60,
        left: SCREEN_W / 2 - 60,
    },
    title: {
        fontFamily: Typography.serifFamilyBold,
        fontSize: 32,
        color: '#FFFFFF',
        letterSpacing: 1,
    },
    tagline: {
        fontFamily: Typography.bodyFamily,
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.5)',
        marginTop: 8,
        letterSpacing: 2,
    },
});
