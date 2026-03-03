import { Radius, Typography } from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { useThemeColors } from '@/contexts/ThemeContext';
import * as Haptics from 'expo-haptics';
import { Href, useRouter } from 'expo-router';
import { ArrowLeft, Calendar, Check, CheckCircle, Eye, EyeOff, Lock, Mail, Sparkles, User } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LoginScreen() {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const router = useRouter();
  const { signInWithEmail, signUpWithEmail, signInWithApple, signInWithGoogle } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dob, setDob] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState(false);

  const handleEmailAuth = async () => {
    if (mode === 'login') {
      if (!email.trim() || !password.trim()) {
        Alert.alert('Missing Fields', 'Please enter both email and password.');
        return;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        Alert.alert('Invalid Email', 'Please enter a valid email address.');
        return;
      }
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
        if (!username.trim() || !firstName.trim() || !lastName.trim() || !dob.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
          Alert.alert('Missing Fields', 'Please fill out all details to create your account.');
          setLoading(false);
          return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
          Alert.alert('Invalid Email', 'Please enter a valid email address.');
          setLoading(false);
          return;
        }

        // Validate and convert Date of Birth (MM/DD/YYYY to YYYY-MM-DD)
        const dobRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
        const match = dob.trim().match(dobRegex);
        if (!match) {
          Alert.alert('Invalid Date Format', 'Please enter your Date of Birth in MM/DD/YYYY format. (e.g. 05/25/1990)');
          setLoading(false);
          return;
        }

        const [_, monthStr, dayStr, yearStr] = match;
        const month = parseInt(monthStr, 10);
        const day = parseInt(dayStr, 10);
        const year = parseInt(yearStr, 10);

        if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1900 || year > new Date().getFullYear()) {
          Alert.alert('Invalid Date', 'The Date of Birth provided is not a valid date.');
          setLoading(false);
          return;
        }

        // Minimum age: 13 years
        const today = new Date();
        const birthDate = new Date(year, month - 1, day);
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age--;
        if (age < 13) {
          Alert.alert('Age Requirement', 'You must be at least 13 years old to use WardrobeWiz.');
          setLoading(false);
          return;
        }

        const formattedDob = `${year}-${monthStr}-${dayStr}`;

        if (password !== confirmPassword) {
          Alert.alert('Password Mismatch', 'Passwords do not match.');
          setLoading(false);
          return;
        }
        if (!termsAccepted) {
          Alert.alert('Terms Required', 'Please accept the Terms of Service and Privacy Policy.');
          setLoading(false);
          return;
        }
        const { needsConfirmation } = await signUpWithEmail(email, password, username, firstName, lastName, formattedDob);
        if (needsConfirmation) {
          setConfirmationSent(true);
        }
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
      // Don't show error for user cancellation
      if (!message.includes('canceled') && !message.includes('cancelled') && !message.includes('dismiss')) {
        Alert.alert('Sign In Failed', message);
      }
    } finally {
      setLoading(false);
    }
  };

  // Confirmation email sent screen
  if (confirmationSent) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.confirmationView}>
            <View style={styles.confirmationIcon}>
              <CheckCircle size={48} color={Colors.accentGreen} />
            </View>
            <Text style={styles.confirmationTitle}>Check your email</Text>
            <Text style={styles.confirmationEmail}>{email}</Text>
            <Text style={styles.confirmationDesc}>
              We sent a confirmation link to your email.{'\n'}
              Tap the link to verify your account, then come back here to sign in.
            </Text>

            <View style={styles.confirmationTips}>
              <Text style={styles.tipHeader}>Can't find it?</Text>
              <Text style={styles.tipText}>• Check your spam or junk folder</Text>
              <Text style={styles.tipText}>• The email comes from noreply@mail.app.supabase.io</Text>
              <Text style={styles.tipText}>• It may take a minute to arrive</Text>
            </View>

            <Pressable
              style={styles.openMailBtn}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                Linking.openURL('message://');
              }}
            >
              <Mail size={18} color={Colors.background} />
              <Text style={styles.openMailText}>Open Mail App</Text>
            </Pressable>

            <Pressable
              style={styles.backToLoginBtn}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setConfirmationSent(false);
                setMode('login');
              }}
            >
              <ArrowLeft size={16} color={Colors.accentGreen} />
              <Text style={styles.backToLoginText}>Back to Sign In</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    );
  }

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
            <Text style={styles.subtitle}>{mode === 'login' ? 'Your AI-powered wardrobe assistant' : 'Create an account to continue'}</Text>
          </View>

          {/* Email / Password */}
          <View style={styles.form}>
            {mode === 'signup' && (
              <>
                <View style={styles.inputWrapper}>
                  <User size={18} color={Colors.textTertiary} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Username"
                    placeholderTextColor={Colors.textTertiary}
                    value={username}
                    onChangeText={setUsername}
                    autoCapitalize="none"
                  />
                </View>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={[styles.inputWrapper, { flex: 1 }]}>
                    <User size={18} color={Colors.textTertiary} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="First Name"
                      placeholderTextColor={Colors.textTertiary}
                      value={firstName}
                      onChangeText={setFirstName}
                    />
                  </View>
                  <View style={[styles.inputWrapper, { flex: 1 }]}>
                    <User size={18} color={Colors.textTertiary} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Last Name"
                      placeholderTextColor={Colors.textTertiary}
                      value={lastName}
                      onChangeText={setLastName}
                    />
                  </View>
                </View>
                <View style={styles.inputWrapper}>
                  <Calendar size={18} color={Colors.textTertiary} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Date of Birth (MM/DD/YYYY)"
                    placeholderTextColor={Colors.textTertiary}
                    value={dob}
                    onChangeText={setDob}
                    keyboardType="numbers-and-punctuation"
                  />
                </View>
              </>
            )}

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

            {mode === 'signup' && (
              <View style={styles.inputWrapper}>
                <Lock size={18} color={Colors.textTertiary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Confirm Password"
                  placeholderTextColor={Colors.textTertiary}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  textContentType="newPassword"
                />
                <Pressable onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeBtn}>
                  {showConfirmPassword ? (
                    <EyeOff size={18} color={Colors.textTertiary} />
                  ) : (
                    <Eye size={18} color={Colors.textTertiary} />
                  )}
                </Pressable>
              </View>
            )}

            {mode === 'signup' && (
              <Pressable style={styles.termsRow} onPress={() => setTermsAccepted(!termsAccepted)}>
                <View style={[styles.checkbox, termsAccepted && styles.checkboxChecked]}>
                  {termsAccepted && <Check size={14} color="#FFF" strokeWidth={3} />}
                </View>
                <Text style={styles.termsText}>
                  I agree to the{' '}
                  <Text style={styles.termsLink} onPress={() => router.push('/terms-of-service' as Href)}>
                    Terms of Service
                  </Text>
                  {' '}and{' '}
                  <Text style={styles.termsLink} onPress={() => router.push('/privacy-policy' as Href)}>
                    Privacy Policy
                  </Text>
                </Text>
              </Pressable>
            )}

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

const createStyles = (Colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  safeArea: { flex: 1 },
  keyboardView: { flex: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 24 },

  header: { alignItems: 'center', marginBottom: 24 },
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

  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingHorizontal: 2,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: Colors.textTertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxChecked: {
    backgroundColor: Colors.accentGreen,
    borderColor: Colors.accentGreen,
  },
  termsText: {
    flex: 1,
    fontFamily: Typography.bodyFamily,
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  termsLink: {
    fontFamily: Typography.bodyFamilyBold,
    color: Colors.accentGreen,
  },

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

  // Confirmation screen
  confirmationView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  confirmationIcon: {
    marginBottom: 20,
  },
  confirmationTitle: {
    fontFamily: Typography.serifFamilyBold,
    fontSize: 26,
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  confirmationEmail: {
    fontFamily: Typography.bodyFamilyBold,
    fontSize: 15,
    color: Colors.accentGreen,
    marginBottom: 16,
  },
  confirmationDesc: {
    fontFamily: Typography.bodyFamily,
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  confirmationTips: {
    width: '100%',
    backgroundColor: Colors.cardSurfaceAlt,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    gap: 6,
    marginBottom: 24,
  },
  tipHeader: {
    fontFamily: Typography.bodyFamilyBold,
    fontSize: 13,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  tipText: {
    fontFamily: Typography.bodyFamily,
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  openMailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: Radius.pill,
    backgroundColor: Colors.accentGreen,
    width: '100%',
    marginBottom: 16,
  },
  openMailText: {
    fontFamily: Typography.bodyFamilyBold,
    fontSize: 16,
    color: Colors.background,
  },
  backToLoginBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  backToLoginText: {
    fontFamily: Typography.bodyFamilyMedium,
    fontSize: 14,
    color: Colors.accentGreen,
  },
});
