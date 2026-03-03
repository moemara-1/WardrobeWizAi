import { Radius, Typography } from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme, useThemeColors } from '@/contexts/ThemeContext';
import * as Haptics from 'expo-haptics';
import { router, type Href } from 'expo-router';
import {
  ArrowLeft,
  ChevronRight,
  FileText,
  LogOut,
  Mail,
  Moon,
  Shield,
  Trash2,
} from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SettingsScreen() {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const { user, signOut, deleteAccount } = useAuth();
  const { mode, setMode } = useTheme();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
      router.replace('/login' as Href);
    } catch (error) {
      Alert.alert('Error', 'Failed to sign out. Please try again.');
    }
  };

  const performDeletion = async () => {
    setIsDeleting(true);
    try {
      await deleteAccount();
      router.replace('/login' as Href);
    } catch {
      Alert.alert('Error', 'Failed to delete account. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteAccount = () => {
    if (isDeleting) return;
    Alert.alert(
      'Delete Account',
      'Are you sure? This will permanently delete your account and all your data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: () => {
            if (Platform.OS === 'ios') {
              Alert.prompt(
                'Type DELETE to confirm',
                'This action is irreversible.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: (input?: string) => {
                      if (input === 'DELETE') {
                        performDeletion();
                      }
                    },
                  },
                ],
                'plain-text',
              );
            } else {
              Alert.alert(
                'Final Confirmation',
                'This will permanently delete your account. Are you absolutely sure?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Delete My Account',
                    style: 'destructive',
                    onPress: performDeletion,
                  },
                ],
              );
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          style={styles.backBtn}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
        >
          <ArrowLeft size={20} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Account Section */}
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Email</Text>
            <Text style={styles.rowValue} numberOfLines={1}>
              {user?.email ?? '—'}
            </Text>
          </View>
          <View style={styles.separator} />
          <Pressable
            style={styles.row}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              handleSignOut();
            }}
          >
            <LogOut size={18} color={Colors.accentCoral} />
            <Text style={[styles.rowLabel, { color: Colors.accentCoral, marginLeft: 10 }]}>
              Sign Out
            </Text>
          </Pressable>
        </View>

        {/* Preferences Section */}
        <Text style={styles.sectionTitle}>Preferences</Text>
        <View style={styles.card}>
          <View style={[styles.row, { flexDirection: 'column', alignItems: 'flex-start', gap: 12 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Moon size={18} color={Colors.textSecondary} />
              <Text style={[styles.rowLabel, { marginLeft: 10 }]}>Appearance</Text>
            </View>
            <View style={styles.segmentContainer}>
              {(['system', 'light', 'dark'] as const).map((m) => {
                const isActive = mode === m;
                return (
                  <Pressable
                    key={m}
                    style={[styles.segmentButton, isActive && { backgroundColor: Colors.accentGreen }]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setMode(m);
                    }}
                  >
                    <Text style={[styles.segmentText, isActive && { color: Colors.white, fontFamily: Typography.bodyFamilyBold }]}>
                      {m.charAt(0).toUpperCase() + m.slice(1)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>

        {/* About Section */}
        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Version</Text>
            <Text style={styles.rowValue}>1.0.0</Text>
          </View>
          <View style={styles.separator} />
          <Pressable style={styles.row} onPress={() => {
            Haptics.selectionAsync();
            router.push('/privacy-policy' as Href);
          }}>
            <Shield size={18} color={Colors.textSecondary} />
            <Text style={[styles.rowLabel, { marginLeft: 10, flex: 1 }]}>Privacy Policy</Text>
            <ChevronRight size={18} color={Colors.textTertiary} />
          </Pressable>
          <View style={styles.separator} />
          <Pressable style={styles.row} onPress={() => {
            Haptics.selectionAsync();
            router.push('/terms-of-service' as Href);
          }}>
            <FileText size={18} color={Colors.textSecondary} />
            <Text style={[styles.rowLabel, { marginLeft: 10, flex: 1 }]}>Terms of Service</Text>
            <ChevronRight size={18} color={Colors.textTertiary} />
          </Pressable>
          <View style={styles.separator} />
          <Pressable style={styles.row} onPress={() => {
            Haptics.selectionAsync();
            Linking.openURL('mailto:support@wardrobewizai.com');
          }}>
            <Mail size={18} color={Colors.textSecondary} />
            <Text style={[styles.rowLabel, { marginLeft: 10, flex: 1 }]}>Contact Support</Text>
            <ChevronRight size={18} color={Colors.textTertiary} />
          </Pressable>
        </View>

        {/* Danger Zone */}
        <Text style={[styles.sectionTitle, { color: Colors.accentCoral }]}>Danger Zone</Text>
        <View style={styles.card}>
          <Pressable
            style={[styles.row, isDeleting && { opacity: 0.5 }]}
            disabled={isDeleting}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
              handleDeleteAccount();
            }}
          >
            {isDeleting ? (
              <ActivityIndicator size="small" color={Colors.accentCoral} />
            ) : (
              <Trash2 size={18} color={Colors.accentCoral} />
            )}
            <Text style={[styles.rowLabel, { color: Colors.accentCoral, marginLeft: 10 }]}>
              {isDeleting ? 'Deleting...' : 'Delete Account'}
            </Text>
          </Pressable>
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(Colors: any) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: Colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    backBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: Colors.cardSurfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: Colors.border,
    },
    headerTitle: {
      fontFamily: Typography.serifFamilyBold,
      fontSize: 20,
      color: Colors.textPrimary,
    },
    headerSpacer: {
      width: 40,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 16,
      paddingTop: 8,
    },
    sectionTitle: {
      fontFamily: Typography.bodyFamilyBold,
      fontSize: 13,
      color: Colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginTop: 24,
      marginBottom: 8,
      marginLeft: 4,
    },
    card: {
      backgroundColor: Colors.cardSurface,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: Colors.border,
      overflow: 'hidden',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    rowLabel: {
      fontFamily: Typography.bodyFamilyMedium,
      fontSize: 15,
      color: Colors.textPrimary,
    },
    rowValue: {
      fontFamily: Typography.bodyFamily,
      fontSize: 15,
      color: Colors.textSecondary,
      marginLeft: 'auto',
      maxWidth: '60%',
      textAlign: 'right',
    },
    separator: {
      height: 1,
      backgroundColor: Colors.border,
      marginLeft: 16,
    },
    segmentContainer: {
      flexDirection: 'row',
      backgroundColor: Colors.background,
      borderRadius: Radius.md,
      padding: 4,
      width: '100%',
      borderWidth: 1,
      borderColor: Colors.border,
    },
    segmentButton: {
      flex: 1,
      paddingVertical: 8,
      alignItems: 'center',
      borderRadius: Radius.sm,
    },
    segmentText: {
      fontFamily: Typography.bodyFamilyMedium,
      fontSize: 13,
      color: Colors.textSecondary,
    },
  });
}
