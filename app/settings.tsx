import { Radius, Typography } from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme, useThemeColors } from '@/contexts/ThemeContext';
import * as Haptics from 'expo-haptics';
import { router, type Href } from 'expo-router';
import {
  ArrowLeft,
  Bell,
  ChevronRight,
  FileText,
  LogOut,
  Moon,
  Shield,
  Trash2,
} from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SettingsScreen() {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const { user, signOut } = useAuth();
  const { mode, setMode } = useTheme();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const handleSignOut = async () => {
    try {
      await signOut();
      router.replace('/login' as Href);
    } catch (error) {
      Alert.alert('Error', 'Failed to sign out. Please try again.');
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently lost.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            // TODO: Implement account deletion via Supabase
            Alert.alert('Coming Soon', 'Account deletion will be available in a future update.');
          },
        },
      ],
    );
  };

  const cycleTheme = () => {
    Haptics.selectionAsync();
    const nextMode = mode === 'system' ? 'dark' : mode === 'dark' ? 'light' : 'system';
    setMode(nextMode);
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
          <View style={styles.row}>
            <Bell size={18} color={Colors.textSecondary} />
            <Text style={[styles.rowLabel, { marginLeft: 10, flex: 1 }]}>Notifications</Text>
            <Switch
              value={notificationsEnabled}
              onValueChange={(val) => {
                Haptics.selectionAsync();
                setNotificationsEnabled(val);
              }}
              trackColor={{ false: Colors.border, true: Colors.accentGreen }}
              thumbColor={Colors.white}
            />
          </View>
          <View style={styles.separator} />
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
        </View>

        {/* Danger Zone */}
        <Text style={[styles.sectionTitle, { color: Colors.accentCoral }]}>Danger Zone</Text>
        <View style={styles.card}>
          <Pressable
            style={styles.row}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
              handleDeleteAccount();
            }}
          >
            <Trash2 size={18} color={Colors.accentCoral} />
            <Text style={[styles.rowLabel, { color: Colors.accentCoral, marginLeft: 10 }]}>
              Delete Account
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
