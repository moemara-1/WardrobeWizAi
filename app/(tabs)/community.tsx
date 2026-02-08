import { Colors, Typography } from '@/constants/Colors';
import { Users } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function CommunityScreen() {
    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.content}>
                <Users size={48} color={Colors.textTertiary} />
                <Text style={styles.title}>Community</Text>
                <Text style={styles.subtitle}>Coming soon...</Text>
                <Text style={styles.description}>
                    Discover outfits from the community and share your looks
                </Text>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    content: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
        gap: 12,
    },
    title: {
        fontFamily: Typography.serifFamilyBold,
        fontSize: 24,
        color: Colors.textPrimary,
        marginTop: 16,
    },
    subtitle: {
        fontFamily: Typography.bodyFamilyMedium,
        fontSize: 16,
        color: Colors.accentGreen,
    },
    description: {
        fontFamily: Typography.bodyFamily,
        fontSize: 14,
        color: Colors.textSecondary,
        textAlign: 'center',
    },
});
