import { Colors, Radius } from '@/constants/Colors';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Compass, Sparkles, Shirt, User } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const TAB_ICONS = [Compass, Sparkles, Shirt, User] as const;

export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
    const insets = useSafeAreaInsets();

    return (
        <View style={[styles.wrapper, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <LinearGradient
                colors={['transparent', Colors.background]}
                style={styles.fadeOverlay}
                pointerEvents="none"
            />
            <View style={styles.container}>
                {state.routes.map((route, index) => {
                    const { options } = descriptors[route.key];
                    const isFocused = state.index === index;
                    const IconComponent = TAB_ICONS[index];

                    const onPress = () => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        const event = navigation.emit({
                            type: 'tabPress',
                            target: route.key,
                            canPreventDefault: true,
                        });

                        if (!isFocused && !event.defaultPrevented) {
                            navigation.navigate(route.name, route.params);
                        }
                    };

                    return (
                        <Pressable
                            key={route.key}
                            onPress={onPress}
                            style={styles.tab}
                            accessibilityRole="button"
                            accessibilityState={isFocused ? { selected: true } : {}}
                            accessibilityLabel={options.tabBarAccessibilityLabel}
                        >
                            <IconComponent
                                size={22}
                                color={isFocused ? Colors.textPrimary : Colors.textTertiary}
                                strokeWidth={isFocused ? 2.2 : 1.8}
                            />
                        </Pressable>
                    );
                })}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        alignItems: 'center',
        paddingBottom: 16,
    },
    fadeOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 120,
    },
    container: {
        flexDirection: 'row',
        backgroundColor: Colors.tabBar,
        borderRadius: Radius.tabBar,
        paddingHorizontal: 8,
        paddingVertical: 12,
        alignItems: 'center',
        width: 240,
        justifyContent: 'space-around',
        borderWidth: 1,
        borderColor: Colors.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.25,
        shadowRadius: 24,
        elevation: 10,
    },
    tab: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 12,
        paddingVertical: 4,
    },
});
