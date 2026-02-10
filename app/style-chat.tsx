import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  X,
  Sparkles,
  CalendarDays,
  Shirt,
  Cloud,
  UserCircle,
  Send,
  Plus,
  MoreHorizontal,
} from 'lucide-react-native';
import { Colors, Radius, Typography } from '@/constants/Colors';

const ACTION_CARDS = [
  { key: 'event', icon: CalendarDays, iconColor: '#3B82F6', title: 'Event Outfit', desc: 'Date, wedding, interv...' },
  { key: 'style', icon: Shirt, iconColor: '#A855F7', title: 'Style a Piece', desc: 'Build around an item' },
  { key: 'weather', icon: Cloud, iconColor: '#F97316', title: "Today's Weather", desc: '33\u00B0F, Partly cloudy' },
  { key: 'twin', icon: UserCircle, iconColor: '#A855F7', title: 'Use Twin', desc: 'Try on with AI' },
] as const;

const SUGGESTION_CHIPS = [
  "What's a cozy\nlate night look?",
  "Layer me up\nit's freezing outside",
  "What's a good\ncasual Friday look?",
];

export default function StyleChatScreen() {
  const [message, setMessage] = useState('');

  const handleSend = () => {
    if (!message.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMessage('');
  };

  const handleActionCard = (key: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (key === 'twin') {
      router.push('/digital-twin' as never);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          style={styles.closeBtn}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }}
        >
          <X size={20} color={Colors.textPrimary} />
        </Pressable>

        <View style={styles.creditPill}>
          <Sparkles size={14} color={Colors.accentGreen} />
          <Text style={styles.creditText}>0</Text>
        </View>

        <Pressable style={styles.moreBtn}>
          <MoreHorizontal size={20} color={Colors.textPrimary} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Greeting */}
        <Text style={styles.greeting}>Hey there!</Text>
        <Text style={styles.subGreeting}>What can I help you with?</Text>

        {/* Action Cards */}
        <View style={styles.cardGrid}>
          {ACTION_CARDS.map(({ key, icon: Icon, iconColor, title, desc }) => (
            <Pressable key={key} style={styles.actionCard} onPress={() => handleActionCard(key)}>
              <View style={[styles.actionIconCircle, { backgroundColor: iconColor + '18' }]}>
                <Icon size={20} color={iconColor} />
              </View>
              <Text style={styles.actionTitle}>{title}</Text>
              <Text style={styles.actionDesc}>{desc}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      {/* Suggestion Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
      >
        {SUGGESTION_CHIPS.map((chip) => (
          <Pressable
            key={chip}
            style={styles.chip}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setMessage(chip.replace('\n', ' '));
            }}
          >
            <Text style={styles.chipText}>{chip}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Chat Input */}
      <View style={styles.inputRow}>
        <Pressable style={styles.inputPlus}>
          <Plus size={18} color={Colors.textSecondary} />
        </Pressable>
        <View style={styles.inputBar}>
          <TextInput
            style={styles.textInput}
            placeholder="Ask Fitted..."
            placeholderTextColor={Colors.textTertiary}
            value={message}
            onChangeText={setMessage}
          />
          <Pressable style={styles.sendBtn} onPress={handleSend}>
            <Send size={16} color={Colors.background} />
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 8 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.cardSurfaceAlt, alignItems: 'center', justifyContent: 'center' },
  creditPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.pill, backgroundColor: Colors.cardSurfaceAlt },
  creditText: { fontFamily: Typography.bodyFamilyMedium, fontSize: 14, color: Colors.textPrimary },
  moreBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { padding: 24, paddingBottom: 8, flex: 1 },
  greeting: { fontFamily: Typography.bodyFamilyBold, fontSize: 26, color: Colors.textPrimary, textAlign: 'center', marginTop: 24 },
  subGreeting: { fontFamily: Typography.bodyFamily, fontSize: 16, color: Colors.textSecondary, textAlign: 'center', marginBottom: 32 },
  cardGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  actionCard: { width: '47%', backgroundColor: Colors.cardSurfaceAlt, borderRadius: Radius.lg, padding: 16, gap: 8 },
  actionIconCircle: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  actionTitle: { fontFamily: Typography.bodyFamilyBold, fontSize: 15, color: Colors.textPrimary },
  actionDesc: { fontFamily: Typography.bodyFamily, fontSize: 12, color: Colors.textSecondary },
  chipRow: { paddingHorizontal: 16, gap: 8, paddingBottom: 8 },
  chip: { backgroundColor: Colors.cardSurfaceAlt, borderRadius: Radius.md, paddingHorizontal: 16, paddingVertical: 10 },
  chipText: { fontFamily: Typography.bodyFamilyBold, fontSize: 13, color: Colors.textPrimary, lineHeight: 18 },
  inputRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 16, gap: 8 },
  inputPlus: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.cardSurfaceAlt, alignItems: 'center', justifyContent: 'center' },
  inputBar: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.cardSurfaceAlt, borderRadius: Radius.pill, paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  textInput: { flex: 1, fontFamily: Typography.bodyFamily, fontSize: 15, color: Colors.textPrimary, padding: 0 },
  sendBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.accentGreen, alignItems: 'center', justifyContent: 'center' },
});
