import { Typography } from '@/constants/Colors';
import { useThemeColors } from '@/contexts/ThemeContext';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function TermsOfServiceScreen() {
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
                <Text style={styles.headerTitle}>Terms of Service</Text>
                <View style={styles.headerSpacer} />
            </SafeAreaView>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <Text style={styles.lastUpdated}>Last updated: February 2025</Text>

                <Text style={styles.sectionTitle}>1. Acceptance of Terms</Text>
                <Text style={styles.body}>
                    By downloading, installing, or using WardrobeWizAI ("the App"), you agree to be bound by these Terms of Service. If you do not agree to these terms, do not use the App.
                </Text>

                <Text style={styles.sectionTitle}>2. Description of Service</Text>
                <Text style={styles.body}>
                    WardrobeWizAI is a personal wardrobe management and AI styling application that allows you to:{'\n\n'}
                    • Photograph and catalog your clothing items with AI-powered analysis.{'\n'}
                    • Create a digital twin — a virtual avatar based on your appearance.{'\n'}
                    • Generate virtual try-on images to see how outfits look on your digital twin.{'\n'}
                    • Receive AI-powered outfit suggestions and style recommendations.{'\n'}
                    • Organize your wardrobe with categories, tags, and outfit collections.{'\n'}
                    • Track the estimated value of your closet.
                </Text>

                <Text style={styles.sectionTitle}>3. User Accounts</Text>
                <Text style={styles.body}>
                    You must create an account to use the App. You are responsible for maintaining the confidentiality of your account credentials. You agree to provide accurate information when creating your account and to update it as needed. You may not share your account with others or create multiple accounts.
                </Text>

                <Text style={styles.sectionTitle}>4. User Content</Text>
                <Text style={styles.body}>
                    You retain ownership of all photos and content you upload to the App. By uploading content, you grant WardrobeWizAI a limited, non-exclusive license to process, store, and display your content solely for the purpose of providing the App's features to you. We will not use your content for marketing or share it with other users without your explicit consent.
                </Text>

                <Text style={styles.sectionTitle}>5. AI-Generated Content</Text>
                <Text style={styles.body}>
                    The App uses artificial intelligence to generate content, including:{'\n\n'}
                    • Clothing analysis and categorization{'\n'}
                    • Digital twin avatars{'\n'}
                    • Virtual try-on images{'\n'}
                    • Style recommendations and outfit suggestions{'\n'}
                    • Estimated item values{'\n\n'}
                    AI-generated content is provided "as is" and may not always be perfectly accurate. Estimated values are approximations and should not be relied upon for insurance, resale, or financial decisions. Virtual try-on images are artistic representations and may not perfectly reflect real-world appearance.
                </Text>

                <Text style={styles.sectionTitle}>6. Acceptable Use</Text>
                <Text style={styles.body}>
                    You agree not to:{'\n\n'}
                    • Upload inappropriate, offensive, or illegal content.{'\n'}
                    • Use the App to harass, impersonate, or harm others.{'\n'}
                    • Attempt to reverse-engineer, modify, or tamper with the App.{'\n'}
                    • Use automated systems or bots to interact with the App.{'\n'}
                    • Violate any applicable laws or regulations while using the App.
                </Text>

                <Text style={styles.sectionTitle}>7. AI Credits & Features</Text>
                <Text style={styles.body}>
                    Certain AI features (such as virtual try-on generation and digital twin creation) may consume AI credits. The availability and cost of AI credits may change. We reserve the right to modify feature availability, introduce premium tiers, or adjust credit allocations with reasonable notice to users.
                </Text>

                <Text style={styles.sectionTitle}>8. Limitation of Liability</Text>
                <Text style={styles.body}>
                    WardrobeWizAI is provided "as is" without warranties of any kind. We are not liable for any indirect, incidental, or consequential damages arising from your use of the App. Our total liability is limited to the amount you have paid for the App in the 12 months preceding the claim.
                </Text>

                <Text style={styles.sectionTitle}>9. Account Termination</Text>
                <Text style={styles.body}>
                    You may delete your account at any time through Settings → Delete Account. We may suspend or terminate accounts that violate these terms. Upon deletion, your data will be permanently removed from our servers in accordance with our Privacy Policy.
                </Text>

                <Text style={styles.sectionTitle}>10. Changes to Terms</Text>
                <Text style={styles.body}>
                    We may update these Terms of Service from time to time. Continued use of the App after changes constitutes acceptance of the updated terms. We will notify you of material changes through the App.
                </Text>

                <Text style={styles.sectionTitle}>11. Contact Us</Text>
                <Text style={styles.body}>
                    For questions about these Terms of Service, contact us at support@wardrobewiz.ai.
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
