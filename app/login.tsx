import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Mail, Lock, Eye, EyeOff, Sparkles } from 'lucide-react-native';
import { Colors, Radius, Typography } from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginScreen() {
  const { signInWithEmail, signUpWithEmail, signInWithApple, signInWithGoogle } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleEmailAuth = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Missing Fields', 'Please enter both email and password.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Weak Password', 'Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      if (mode === 'login') {
        await signInWithEmail(email, password);
      } else {
        await signUpWithEmail(email, password);
        Alert.alert('Check Your Email', 'We sent a confirmation link to your email address.');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong.';
      Alert.alert(mode === 'login' ? 'Login Failed' : 'Signup Failed', message);
    } finally {
      setLoading(false);
    }
  };

  const handleSocialAuth = async (provider: 'apple' | 'google') => {
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      if (provider === 'apple') {
        await signInWithApple();
      } else {
        await signInWithGoogle();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong.';
      Alert.alert('Sign In Failed', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          {/* Header */}
          <View style={styles.header}>
            <Sparkles size={32} color={Colors.accentGreen} />
            <Text style={styles.title}>WardrobeWiz</Text>
            <Text style={styles.subtitle}>Your AI-powered wardrobe assistant</Text>
          </View>

          {/* Email / Password */}
          <View style={styles.form}>
            <View style={styles.inputWrapper}>
              <Mail size={18} color={Colors.textTertiary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor={Colors.textTertiary}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                textContentType="emailAddress"
                autoComplete="email"
              />
            </View>

            <View style={styles.inputWrapper}>
              <Lock size={18} color={Colors.textTertiary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor={Colors.textTertiary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                textContentType={mode === 'login' ? 'password' : 'newPassword'}
                autoComplete={mode === 'login' ? 'password' : 'new-password'}
              />
              <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                {showPassword ? (
                  <EyeOff size={18} color={Colors.textTertiary} />
                ) : (
                  <Eye size={18} color={Colors.textTertiary} />
                )}
              </Pressable>
            </View>

            <Pressable
              style={[styles.primaryBtn, loading && styles.btnDisabled]}
              onPress={handleEmailAuth}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={styles.primaryBtnText}>
                  {mode === 'login' ? 'Sign In' : 'Create Account'}
                </Text>
              )}
            </Pressable>
          </View>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or continue with</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Social Buttons */}
          <View style={styles.socialRow}>
            {Platform.OS === 'ios' && (
              <Pressable style={styles.socialBtn} onPress={() => handleSocialAuth('apple')}>
                <Text style={styles.socialBtnIcon}>&#63743;</Text>
                <Text style={styles.socialBtnText}>Apple</Text>
              </Pressable>
            )}
            <Pressable style={styles.socialBtn} onPress={() => handleSocialAuth('google')}>
              <Text style={[styles.socialBtnIcon, { fontSize: 18 }]}>G</Text>
              <Text style={styles.socialBtnText}>Google</Text>
            </Pressable>
          </View>

          {/* Toggle mode */}
          <Pressable
            style={styles.toggleRow}
            onPress={() => {
              Haptics.selectionAsync();
              setMode(mode === 'login' ? 'signup' : 'login');
            }}
          >
            <Text style={styles.toggleText}>
              {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
              <Text style={styles.toggleLink}>
                {mode === 'login' ? 'Sign Up' : 'Sign In'}
              </Text>
            </Text>
          </Pressable>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  safeArea: { flex: 1 },
  keyboardView: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },

  header: { alignItems: 'center', marginBottom: 40 },
  title: {
    fontFamily: Typography.serifFamilyBold,
    fontSize: 32,
    color: Colors.textPrimary,
    marginTop: 12,
  },
  subtitle: {
    fontFamily: Typography.bodyFamily,
    fontSize: 15,
    color: Colors.textSecondary,
    marginTop: 6,
  },

  form: { gap: 12 },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardSurfaceAlt,
    borderRadius: Radius.input,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    height: 52,
  },
  inputIcon: { marginRight: 10 },
  input: {
    flex: 1,
    fontFamily: Typography.bodyFamily,
    fontSize: 15,
    color: Colors.textPrimary,
    padding: 0,
  },
  eyeBtn: { padding: 4 },

  primaryBtn: {
    height: 52,
    borderRadius: Radius.pill,
    backgroundColor: Colors.accentGreen,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  btnDisabled: { opacity: 0.6 },
  primaryBtnText: {
    fontFamily: Typography.bodyFamilyBold,
    fontSize: 16,
    color: '#FFF',
  },

  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerText: {
    fontFamily: Typography.bodyFamily,
    fontSize: 13,
    color: Colors.textTertiary,
    marginHorizontal: 12,
  },

  socialRow: { flexDirection: 'row', gap: 12 },
  socialBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: Radius.lg,
    backgroundColor: Colors.cardSurfaceAlt,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 8,
  },
  socialBtnIcon: {
    fontSize: 22,
    color: Colors.textPrimary,
  },
  socialBtnText: {
    fontFamily: Typography.bodyFamilyMedium,
    fontSize: 15,
    color: Colors.textPrimary,
  },

  toggleRow: { alignItems: 'center', marginTop: 24 },
  toggleText: {
    fontFamily: Typography.bodyFamily,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  toggleLink: {
    fontFamily: Typography.bodyFamilyBold,
    color: Colors.accentGreen,
  },
});
