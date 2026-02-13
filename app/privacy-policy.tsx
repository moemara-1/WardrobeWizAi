import { Typography } from '@/constants/Colors';
import { useThemeColors } from '@/contexts/ThemeContext';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function PrivacyPolicyScreen() {
    const Colors = useThemeColors();
    const styles = useMemo(() => createStyles(Colors), [Colors]);
    return (
        <View style={styles.container}>
            <SafeAreaView edges={['top']} style={styles.header}>
                <Pressable
                    style={styles.backBtn}
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }}
                >
                    <ArrowLeft size={20} color={Colors.textPrimary} />
                </Pressable>
                <Text style={styles.headerTitle}>Privacy Policy</Text>
                <View style={styles.headerSpacer} />
            </SafeAreaView>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <Text style={styles.lastUpdated}>Last updated: February 2025</Text>

                <Text style={styles.sectionTitle}>1. Information We Collect</Text>
                <Text style={styles.body}>
                    WardrobeWizAI ("the App") collects the following information when you create an account and use our services:
                </Text>
                <Text style={styles.body}>
                    • <Text style={styles.bold}>Account Information:</Text> Email address, display name, and authentication credentials when you sign up via email, Apple Sign In, or Google Sign In.{'\n'}
                    • <Text style={styles.bold}>Closet Data:</Text> Photos of clothing items you upload, along with AI-generated metadata such as category, brand, colors, and estimated value.{'\n'}
                    • <Text style={styles.bold}>Digital Twin Data:</Text> Selfie photos and body reference images you provide for creating your digital twin. These images are processed by AI to generate your virtual avatar.{'\n'}
                    • <Text style={styles.bold}>Generated Content:</Text> Virtual try-on images, outfit suggestions, and saved fits created through the App's AI features.{'\n'}
                    • <Text style={styles.bold}>Usage Data:</Text> App interactions, feature usage patterns, and device information for improving our services.
                </Text>

                <Text style={styles.sectionTitle}>2. How We Use Your Information</Text>
                <Text style={styles.body}>
                    We use your information to:{'\n\n'}
                    • Provide and maintain the App's core features, including closet management, AI styling, virtual try-on, and digital twin generation.{'\n'}
                    • Process your photos through AI services (Google Gemini, OpenAI) to analyze clothing items and generate virtual representations.{'\n'}
                    • Store your closet inventory and outfits securely so you can access them across sessions.{'\n'}
                    • Improve and optimize the App's AI accuracy and user experience.{'\n'}
                    • Communicate important updates about the App and your account.
                </Text>

                <Text style={styles.sectionTitle}>3. AI Processing & Third-Party Services</Text>
                <Text style={styles.body}>
                    The App uses third-party AI services to power its features. When you upload photos or use AI features, your images and related data may be sent to:{'\n\n'}
                    • <Text style={styles.bold}>Google Gemini API</Text> — for clothing analysis, style recommendations, and digital twin generation.{'\n'}
                    • <Text style={styles.bold}>OpenAI API</Text> — for outfit generation and virtual try-on rendering.{'\n'}
                    • <Text style={styles.bold}>Supabase</Text> — for secure data storage and user authentication.{'\n\n'}
                    These services process your data according to their own privacy policies. We do not sell your photos or personal data to any third party.
                </Text>

                <Text style={styles.sectionTitle}>4. Data Storage & Security</Text>
                <Text style={styles.body}>
                    Your data is stored securely using Supabase's cloud infrastructure with row-level security policies. Photos are stored in encrypted cloud storage buckets. Authentication tokens are stored locally on your device using encrypted secure storage. We implement industry-standard security measures to protect your information from unauthorized access.
                </Text>

                <Text style={styles.sectionTitle}>5. Your Rights & Data Control</Text>
                <Text style={styles.body}>
                    You have the right to:{'\n\n'}
                    • <Text style={styles.bold}>Access</Text> your personal data stored in the App at any time through your profile.{'\n'}
                    • <Text style={styles.bold}>Delete</Text> individual items, outfits, or your digital twin from within the App.{'\n'}
                    • <Text style={styles.bold}>Delete your account</Text> entirely through Settings → Delete Account, which will permanently remove all your data from our servers.{'\n'}
                    • <Text style={styles.bold}>Export</Text> your closet data by contacting us at support@wardrobewiz.ai.
                </Text>

                <Text style={styles.sectionTitle}>6. Children's Privacy</Text>
                <Text style={styles.body}>
                    The App is not intended for children under 13. We do not knowingly collect personal information from children under 13. If you believe a child has provided us with personal information, please contact us and we will delete that information.
                </Text>

                <Text style={styles.sectionTitle}>7. Changes to This Policy</Text>
                <Text style={styles.body}>
                    We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new policy in the App and updating the "Last Updated" date.
                </Text>

                <Text style={styles.sectionTitle}>8. Contact Us</Text>
                <Text style={styles.body}>
                    If you have questions about this Privacy Policy, please contact us at support@wardrobewiz.ai.
                </Text>

                <View style={styles.bottomSpacer} />
            </ScrollView>
        </View>
    );
}

function createStyles(C: any) {
    return StyleSheet.create({
        container: { flex: 1, backgroundColor: C.background },
        header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 8 },
        backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.cardSurfaceAlt, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border },
        headerTitle: { flex: 1, textAlign: 'center', fontFamily: Typography.bodyFamilyBold, fontSize: 18, color: C.textPrimary },
        headerSpacer: { width: 40 },
        content: { paddingHorizontal: 20, paddingTop: 12 },
        lastUpdated: { fontFamily: Typography.bodyFamily, fontSize: 13, color: C.textTertiary, marginBottom: 20 },
        sectionTitle: { fontFamily: Typography.bodyFamilyBold, fontSize: 17, color: C.textPrimary, marginTop: 24, marginBottom: 8 },
        body: { fontFamily: Typography.bodyFamily, fontSize: 14, color: C.textSecondary, lineHeight: 22 },
        bold: { fontFamily: Typography.bodyFamilyBold, color: C.textPrimary },
        bottomSpacer: { height: 80 },
    });
}
