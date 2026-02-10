import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  Bell,
  ChevronRight,
  HelpCircle,
  LogOut,
  Settings,
  User,
  UserCircle,
} from 'lucide-react-native';
import { Colors, Radius, Typography } from '@/constants/Colors';

interface SettingsRow {
  key: string;
  label: string;
  icon: React.ComponentType<{ size: number; color: string; strokeWidth?: number }>;
  onPress: () => void;
}

export default function ProfileScreen() {
  const settingsRows: SettingsRow[] = [
    {
      key: 'twin',
      label: 'My Digital Twin',
      icon: UserCircle,
      onPress: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push('/digital-twin' as never);
      },
    },
    {
      key: 'notifications',
      label: 'Notifications',
      icon: Bell,
      onPress: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
    },
    {
      key: 'settings',
      label: 'Settings',
      icon: Settings,
      onPress: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
    },
    {
      key: 'help',
      label: 'Help & Support',
      icon: HelpCircle,
      onPress: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={styles.screenTitle}>Profile</Text>

        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarCircle}>
            <User size={36} color={Colors.textTertiary} strokeWidth={1.5} />
          </View>
          <Text style={styles.displayName}>User</Text>
          <Text style={styles.email}>user@example.com</Text>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statBlock}>
            <Text style={styles.statValue}>0</Text>
            <Text style={styles.statLabel}>Items</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBlock}>
            <Text style={styles.statValue}>0</Text>
            <Text style={styles.statLabel}>Outfits</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBlock}>
            <Text style={styles.statValue}>0</Text>
            <Text style={styles.statLabel}>Looks</Text>
          </View>
        </View>

        {/* Settings List */}
        <View style={styles.settingsList}>
          {settingsRows.map((row) => (
            <Pressable
              key={row.key}
              style={styles.settingsItem}
              onPress={row.onPress}
            >
              <View style={styles.settingsItemLeft}>
                <row.icon size={20} color={Colors.textSecondary} />
                <Text style={styles.settingsLabel}>{row.label}</Text>
              </View>
              <ChevronRight size={18} color={Colors.textTertiary} />
            </Pressable>
          ))}
        </View>

        {/* Logout */}
        <Pressable
          style={styles.logoutBtn}
          onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)}
        >
          <LogOut size={18} color={Colors.accentCoral} />
          <Text style={styles.logoutText}>Log Out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  screenTitle: {
    fontFamily: Typography.serifFamilyBold,
    fontSize: 28,
    color: Colors.textPrimary,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 20,
  },
  avatarSection: {
    alignItems: 'center',
    gap: 8,
    paddingBottom: 20,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.cardSurfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.border,
  },
  displayName: {
    fontFamily: Typography.bodyFamilyBold,
    fontSize: 20,
    color: Colors.textPrimary,
  },
  email: {
    fontFamily: Typography.bodyFamily,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    backgroundColor: Colors.cardSurface,
    borderRadius: Radius.lg,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 24,
  },
  statBlock: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontFamily: Typography.bodyFamilyBold,
    fontSize: 20,
    color: Colors.textPrimary,
  },
  statLabel: {
    fontFamily: Typography.bodyFamily,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: Colors.border,
  },
  settingsList: {
    marginHorizontal: 16,
    backgroundColor: Colors.cardSurface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  settingsItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingsLabel: {
    fontFamily: Typography.bodyFamilyMedium,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 24,
    paddingVertical: 14,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.accentCoral,
    backgroundColor: 'rgba(232, 90, 79, 0.08)',
  },
  logoutText: {
    fontFamily: Typography.bodyFamilyBold,
    fontSize: 15,
    color: Colors.accentCoral,
  },
});
