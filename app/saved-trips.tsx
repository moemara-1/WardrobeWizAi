import { Radius, Typography } from '@/constants/Colors';
import { useThemeColors } from '@/contexts/ThemeContext';
import { useClosetStore } from '@/stores/closetStore';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { ArrowLeft, Calendar, MapPin, Trash2 } from 'lucide-react-native';
import React, { useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SavedTripsScreen() {
    const Colors = useThemeColors();
    const styles = useMemo(() => createStyles(Colors), [Colors]);
    const savedTrips = useClosetStore((s) => s.savedTrips);
    const deleteSavedTrip = useClosetStore((s) => s.deleteSavedTrip);

    const handleDelete = (id: string, destination: string) => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        deleteSavedTrip(id);
    };

    return (
        <View style={styles.container}>
            <SafeAreaView edges={['top']} style={styles.header}>
                <Pressable
                    style={styles.backBtn}
                    onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        router.back();
                    }}
                >
                    <ArrowLeft size={20} color={Colors.textPrimary} />
                </Pressable>
                <Text style={styles.headerTitle}>Saved Trips</Text>
                <View style={{ width: 44 }} />
            </SafeAreaView>

            <FlatList
                data={savedTrips}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>No saved trips yet.</Text>
                        <Text style={styles.emptySubtext}>Plan a trip and save it to see it here!</Text>
                    </View>
                }
                renderItem={({ item }) => (
                    <Pressable
                        style={styles.tripCard}
                        onPress={() => {
                            Haptics.selectionAsync();
                            router.push({
                                pathname: '/trip-result',
                                params: {
                                    days: String(item.days),
                                    destination: item.destination,
                                    occasion: item.occasion,
                                    outfits: item.outfits ? JSON.stringify(item.outfits) : undefined,
                                }
                            } as any);
                        }}
                    >
                        <View style={styles.tripInfo}>
                            <Text style={styles.destinationText}>{item.destination}</Text>
                            <View style={styles.metaRow}>
                                <View style={styles.metaItem}>
                                    <Calendar size={14} color={Colors.textSecondary} />
                                    <Text style={styles.metaText}>{item.days} Days</Text>
                                </View>
                                <View style={styles.metaItem}>
                                    <MapPin size={14} color={Colors.textSecondary} />
                                    <Text style={styles.metaText}>{item.occasion}</Text>
                                </View>
                            </View>
                        </View>
                        <Pressable
                            style={styles.deleteBtn}
                            onPress={() => handleDelete(item.id, item.destination)}
                        >
                            <Trash2 size={18} color={Colors.accentCoral} />
                        </Pressable>
                    </Pressable>
                )}
            />
        </View>
    );
}

function createStyles(C: any) {
    return StyleSheet.create({
        container: { flex: 1, backgroundColor: C.background },
        header: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
            paddingBottom: 12,
            borderBottomWidth: 1,
            borderBottomColor: C.border,
        },
        backBtn: {
            width: 44,
            height: 44,
            borderRadius: Radius.pill,
            backgroundColor: C.cardSurfaceAlt,
            alignItems: 'center',
            justifyContent: 'center',
        },
        headerTitle: {
            fontFamily: Typography.bodyFamilyBold,
            fontSize: 18,
            color: C.textPrimary,
        },
        listContent: {
            padding: 16,
            flexGrow: 1,
        },
        emptyContainer: {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 40,
        },
        emptyText: {
            fontFamily: Typography.bodyFamilyBold,
            fontSize: 18,
            color: C.textPrimary,
            marginBottom: 8,
        },
        emptySubtext: {
            fontFamily: Typography.bodyFamily,
            fontSize: 14,
            color: C.textSecondary,
            textAlign: 'center',
        },
        tripCard: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: C.cardSurface,
            borderRadius: Radius.lg,
            padding: 16,
            marginBottom: 12,
            borderWidth: 1,
            borderColor: C.border,
        },
        tripInfo: {
            flex: 1,
        },
        destinationText: {
            fontFamily: Typography.bodyFamilyBold,
            fontSize: 18,
            color: C.textPrimary,
            marginBottom: 8,
        },
        metaRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 16,
        },
        metaItem: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
        },
        metaText: {
            fontFamily: Typography.bodyFamily,
            fontSize: 13,
            color: C.textSecondary,
            textTransform: 'capitalize',
        },
        deleteBtn: {
            width: 40,
            height: 40,
            borderRadius: Radius.pill,
            backgroundColor: C.cardSurfaceAlt,
            alignItems: 'center',
            justifyContent: 'center',
            marginLeft: 12,
        },
    });
}
