export const DarkColors = {
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

export const LightColors = {
  background: '#FAFAFA',
  cardSurface: '#FFFFFF',
  cardSurfaceAlt: '#F2F2F5',
  textPrimary: '#1A1A1A',
  textSecondary: '#6B6B70',
  textTertiary: '#A0A0A5',
  border: '#E5E5E8',
  borderLight: '#D0D0D5',
  accentGreen: '#32D583',
  accentCoral: '#E85A4F',
  accentBlue: '#3B82F6',
  white: '#FFFFFF',
  tabBar: '#FFFFFF',
  overlay: 'rgba(250, 250, 250, 0.85)',
} as const;

export type ColorTheme = {
  readonly background: string;
  readonly cardSurface: string;
  readonly cardSurfaceAlt: string;
  readonly textPrimary: string;
  readonly textSecondary: string;
  readonly textTertiary: string;
  readonly border: string;
  readonly borderLight: string;
  readonly accentGreen: string;
  readonly accentCoral: string;
  readonly accentBlue: string;
  readonly white: string;
  readonly tabBar: string;
  readonly overlay: string;
};

/** Default export — used as fallback outside React tree */
export const Colors = DarkColors;

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
