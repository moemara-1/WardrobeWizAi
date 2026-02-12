export const Colors = {
  background: '#0B0B0E',
  cardSurface: '#16161A',
  cardSurfaceAlt: '#1A1A1E',
  textPrimary: '#FAFAF9',
  textSecondary: '#8E8E93',
  textTertiary: '#4A4A50',
  border: '#2A2A2E',
  borderLight: '#3A3A40',
  accentGreen: '#32D583',
  accentCoral: '#E85A4F',
  accentBlue: '#3B82F6',
  white: '#FFFFFF',
  tabBar: '#1A1A1E',
  overlay: 'rgba(11, 11, 14, 0.85)',
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 100,
  input: 16,
  tabBar: 31,
} as const;

export const Typography = {
  serifFamily: 'Fraunces_400Regular',
  serifFamilyBold: 'Fraunces_700Bold',
  bodyFamily: 'DMSans_400Regular',
  bodyFamilyMedium: 'DMSans_500Medium',
  bodyFamilyBold: 'DMSans_700Bold',
  systemFamily: 'Inter',
} as const;

export default Colors;
