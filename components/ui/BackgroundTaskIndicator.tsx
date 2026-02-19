import { Radius, Typography } from '@/constants/Colors';
import { useThemeColors } from '@/contexts/ThemeContext';
import { useClosetStore } from '@/stores/closetStore';
import { Sparkles } from 'lucide-react-native';
import React, { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

export function BackgroundTaskIndicator() {
    const Colors = useThemeColors();
    const tasks = useClosetStore((s) => s.backgroundTasks);
    const twinGenerating = useClosetStore((s) => s.twinGenerating);
    const twinProgress = useClosetStore((s) => s.twinProgress);
    const styles = useMemo(() => createStyles(Colors), [Colors]);

    const activeTasks = [
        ...tasks.map(t => t.progress),
        ...(twinGenerating ? [twinProgress || 'Generating twin...'] : []),
    ];

    if (activeTasks.length === 0) return null;

    return (
        <View style={styles.container}>
            <View style={styles.pill}>
                <ActivityIndicator size="small" color={Colors.accentGreen} />
                <Sparkles size={12} color={Colors.accentGreen} />
                <Text style={styles.text} numberOfLines={1}>
                    {activeTasks[0]}
                </Text>
                {activeTasks.length > 1 && (
                    <Text style={styles.badge}>+{activeTasks.length - 1}</Text>
                )}
            </View>
        </View>
    );
}

function createStyles(C: any) {
    return StyleSheet.create({
        container: { position: 'absolute', bottom: 90, left: 0, right: 0, alignItems: 'center', zIndex: 50 },
        pill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.pill, backgroundColor: C.cardSurface, borderWidth: 1, borderColor: C.accentGreen, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
        text: { fontFamily: Typography.bodyFamilyMedium, fontSize: 12, color: C.textPrimary, maxWidth: 200 },
        badge: { fontFamily: Typography.bodyFamilyBold, fontSize: 11, color: C.accentGreen, marginLeft: 2 },
    });
}
