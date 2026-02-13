import { Radius, Typography } from '@/constants/Colors';
import { useThemeColors } from '@/contexts/ThemeContext';
import { BlurView } from 'expo-blur';
import { Sparkles } from 'lucide-react-native';
import React, { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

interface AIOverlayProps {
  funFact?: string;
  isLoading?: boolean;
}

export function AIOverlay({ funFact, isLoading }: AIOverlayProps) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  return (
    <BlurView intensity={40} tint="dark" style={styles.container}>
      <View style={styles.inner}>
        <View style={styles.header}>
          <Sparkles size={16} color={Colors.accentGreen} />
          <Text style={styles.label}>Fashion Fun Fact</Text>
        </View>
        {isLoading ? (
          <ActivityIndicator color={Colors.accentGreen} style={styles.loader} />
        ) : (
          <Text style={styles.fact}>
            {funFact || 'Analyzing your outfit...'}
          </Text>
        )}
      </View>
    </BlurView>
  );
}

function createStyles(C: any) {
  return StyleSheet.create({
    container: { borderRadius: Radius.lg, overflow: 'hidden', marginHorizontal: 16, marginVertical: 8 },
    inner: { padding: 16, backgroundColor: 'rgba(22, 22, 26, 0.6)' },
    header: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
    label: { fontFamily: Typography.bodyFamilyMedium, fontSize: 13, color: C.accentGreen },
    fact: { fontFamily: Typography.bodyFamily, fontSize: 14, color: C.textPrimary, lineHeight: 20 },
    loader: { marginVertical: 8 },
  });
}
