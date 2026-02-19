import { Radius, Typography } from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme, useThemeColors } from '@/contexts/ThemeContext';
import Constants from 'expo-constants';
import * as Haptics from 'expo-haptics';
import * as Linking from 'expo-linking';
import { router, type Href } from 'expo-router';
import {
    ArrowLeft,
    Bell,
    ChevronRight,
    FileText,
    LogOut,
    Monitor,
    Moon,
    Shield,
    Sun,
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

const APP_VERSION = Constants.expoConfig?.version || '1.0.0';
const PRIVACY_URL = 'https://wardrobewiz.app/privacy';
const TERMS_URL = 'https://wardrobewiz.app/terms';

type ThemeMode = 'light' | 'dark' | 'system';
const THEME_OPTIONS: { key: ThemeMode; label: string; Icon: typeof Sun }[] = [
    { key: 'light', label: 'Light', Icon: Sun },
    { key: 'dark', label: 'Dark', Icon: Moon },
    { key: 'system', label: 'System', Icon: Monitor },
];

export default function SettingsScreen() {
  const Colors = useThemeColors();
  const { mode, setMode } = useTheme();
  const { user, signOut } = useAuth();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  const handleSignOut = async () => {
    try {
      await signOut();
      router.replace('/login' as Href);
    } catch {
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
            Alert.alert('Coming Soon', 'Account deletion will be available in a future update.');
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
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
              thumbColor={'#FFFFFF'}
            />
          </View>
          <View style={styles.separator} />
          <View style={[styles.row, { flexDirection: 'column', alignItems: 'flex-start', gap: 10 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Moon size={18} color={Colors.textSecondary} />
              <Text style={[styles.rowLabel, { marginLeft: 10 }]}>Appearance</Text>
            </View>
            <View style={styles.themeRow}>
              {THEME_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.key}
                  style={[styles.themePill, mode === opt.key && styles.themePillActive]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setMode(opt.key);
                  }}
                >
                  <opt.Icon size={14} color={mode === opt.key ? Colors.background : Colors.textSecondary} />
                  <Text style={[styles.themePillText, mode === opt.key && styles.themePillTextActive]}>
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        {/* About Section */}
        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Version</Text>
            <Text style={styles.rowValue}>{APP_VERSION}</Text>
          </View>
          <View style={styles.separator} />
          <Pressable
            style={styles.row}
            onPress={() => {
              Haptics.selectionAsync();
              Linking.openURL(PRIVACY_URL);
            }}
          >
            <Shield size={18} color={Colors.textSecondary} />
            <Text style={[styles.rowLabel, { marginLeft: 10, flex: 1 }]}>Privacy Policy</Text>
            <ChevronRight size={18} color={Colors.textTertiary} />
          </Pressable>
          <View style={styles.separator} />
          <Pressable
            style={styles.row}
            onPress={() => {
              Haptics.selectionAsync();
              Linking.openURL(TERMS_URL);
            }}
          >
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

function createStyles(C: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.background },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.cardSurfaceAlt, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border },
    headerTitle: { fontFamily: Typography.serifFamilyBold, fontSize: 20, color: C.textPrimary },
    headerSpacer: { width: 40 },
    scroll: { flex: 1 },
    scrollContent: { paddingHorizontal: 16, paddingTop: 8 },
    sectionTitle: { fontFamily: Typography.bodyFamilyBold, fontSize: 13, color: C.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 24, marginBottom: 8, marginLeft: 4 },
    card: { backgroundColor: C.cardSurface, borderRadius: Radius.lg, borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
    row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
    rowLabel: { fontFamily: Typography.bodyFamilyMedium, fontSize: 15, color: C.textPrimary },
    rowValue: { fontFamily: Typography.bodyFamily, fontSize: 15, color: C.textSecondary, marginLeft: 'auto', maxWidth: '60%', textAlign: 'right' },
    separator: { height: 1, backgroundColor: C.border, marginLeft: 16 },
    themeRow: { flexDirection: 'row', gap: 8 },
    themePill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.pill, backgroundColor: C.cardSurfaceAlt, borderWidth: 1, borderColor: C.border },
    themePillActive: { backgroundColor: C.accentGreen, borderColor: C.accentGreen },
    themePillText: { fontFamily: Typography.bodyFamilyMedium, fontSize: 13, color: C.textSecondary },
    themePillTextActive: { color: C.background },
  });
}
