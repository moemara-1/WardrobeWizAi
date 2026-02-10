import { AddMenuPopover } from '@/components/ui/AddMenuPopover';
import { OutfitFilters } from '@/components/ui/OutfitFilters';
import { Colors, Radius, Typography } from '@/constants/Colors';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import {
  Bookmark,
  Dices,
  Plus,
  Send,
  SlidersHorizontal,
  Sparkles
} from 'lucide-react-native';
import React, { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function StylistScreen() {
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [chatMessage, setChatMessage] = useState('');

  const openAddMenu = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowAddMenu(true);
  };

  const handleSave = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleRandomize = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    // TODO: Implement outfit randomization
  };

  const handleSend = () => {
    if (!chatMessage.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setChatMessage('');
  };

  const handleAddMenuItem = (action: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowAddMenu(false);
    // All three route to different selection modes in the closet
    if (action === 'accessories') {
      // TODO: Open closet with accessories filter
      router.navigate('/analyze' as never);
    } else if (action === 'fits') {
      // TODO: Open closet fits tab
      router.navigate('/analyze' as never);
    } else if (action === 'pieces') {
      router.navigate('/analyze' as never);
    }
  };

  const handleOpenStyleChat = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/style-chat' as never);
  };

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.topBar}>
        <Pressable
          style={styles.topBarBtn}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowFilters(true);
          }}
        >
          <SlidersHorizontal size={20} color={Colors.textPrimary} />
        </Pressable>

        <Pressable style={styles.titlePill} onPress={handleOpenStyleChat}>
          <Sparkles size={14} color={Colors.accentGreen} />
          <Text style={styles.titleText}>StyleAI</Text>
        </Pressable>

        <Pressable
          style={styles.avatarCircle}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push('/digital-twin' as never);
          }}
        >
          <Text style={styles.avatarText}>U</Text>
        </Pressable>
      </SafeAreaView>

      {/* Outfit Canvas — tap to add pieces */}
      <Pressable style={styles.canvas} onPress={openAddMenu}>
        <View style={styles.canvasPlaceholder}>
          <Sparkles size={32} color={Colors.textTertiary} strokeWidth={1.2} />
          <Text style={styles.canvasTitle}>Your Outfit Canvas</Text>
          <Text style={styles.canvasSubtitle}>
            Tap to add pieces and build outfits
          </Text>
        </View>
      </Pressable>

      {/* Right FABs — 3 buttons: Add, Randomize, Save */}
      <View style={styles.fabColumn}>
        <Pressable style={styles.fab} onPress={openAddMenu}>
          <Plus size={22} color={Colors.textPrimary} />
        </Pressable>
        <Pressable style={styles.fab} onPress={handleRandomize}>
          <Dices size={20} color={Colors.textPrimary} />
        </Pressable>
        <Pressable style={styles.fab} onPress={handleSave}>
          <Bookmark size={20} color={Colors.textPrimary} />
        </Pressable>
      </View>

      {showAddMenu && (
        <AddMenuPopover
          onClose={() => setShowAddMenu(false)}
          onSelect={handleAddMenuItem}
        />
      )}

      {/* Chat Bar — positioned above tab bar */}
      <View style={styles.chatBarWrapper}>
        <View style={styles.chatBar}>
          <Pressable style={styles.chatPlusBtn} onPress={openAddMenu}>
            <Plus size={18} color={Colors.textSecondary} />
          </Pressable>
          <TextInput
            style={styles.chatInput}
            placeholder="Ask StyleAI..."
            placeholderTextColor={Colors.textTertiary}
            value={chatMessage}
            onChangeText={setChatMessage}
          />
          <Pressable style={styles.sendBtn} onPress={handleSend}>
            <Send size={16} color={Colors.background} />
          </Pressable>
        </View>
      </View>

      <OutfitFilters
        visible={showFilters}
        onClose={() => setShowFilters(false)}
        onApply={() => setShowFilters(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 8 },
  topBarBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.cardSurfaceAlt, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border },
  titlePill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.cardSurfaceAlt, paddingHorizontal: 16, paddingVertical: 8, borderRadius: Radius.pill, borderWidth: 1, borderColor: Colors.border },
  titleText: { fontFamily: Typography.bodyFamilyBold, fontSize: 14, color: Colors.textPrimary },
  avatarCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.accentGreen, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: Typography.bodyFamilyBold, fontSize: 14, color: Colors.background },
  canvas: { flex: 1, marginHorizontal: 16, marginTop: 8, marginBottom: 8, backgroundColor: '#F8F8F8', borderRadius: Radius.lg, overflow: 'hidden' },
  canvasPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  canvasTitle: { fontFamily: Typography.serifFamilyBold, fontSize: 18, color: Colors.textTertiary },
  canvasSubtitle: { fontFamily: Typography.bodyFamily, fontSize: 13, color: Colors.textTertiary },
  fabColumn: { position: 'absolute', right: 28, bottom: 148, gap: 12 },
  fab: { width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.cardSurfaceAlt, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 4 },
  chatBarWrapper: { paddingHorizontal: 16, paddingBottom: 86, paddingTop: 4 },
  chatBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.cardSurfaceAlt, borderRadius: Radius.pill, paddingHorizontal: 6, paddingVertical: 6, gap: 8, borderWidth: 1, borderColor: Colors.border },
  chatPlusBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.cardSurface, alignItems: 'center', justifyContent: 'center' },
  chatInput: { flex: 1, fontFamily: Typography.bodyFamily, fontSize: 14, color: Colors.textPrimary, paddingVertical: 0 },
  sendBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.accentGreen, alignItems: 'center', justifyContent: 'center' },
});
