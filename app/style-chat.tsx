import { Colors, Radius, Typography } from '@/constants/Colors';
import { ChatMessage, chatWithStylist } from '@/lib/ai';
import { useClosetStore } from '@/stores/closetStore';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import {
    CalendarDays,
    Cloud,
    MoreHorizontal,
    Plus,
    Send,
    Shirt,
    Sparkles,
    UserCircle,
    X,
} from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface DisplayMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

const ACTION_CARDS = [
  { key: 'event', icon: CalendarDays, iconColor: '#3B82F6', title: 'Event Outfit', desc: 'Date, wedding, interv...' },
  { key: 'style', icon: Shirt, iconColor: '#A855F7', title: 'Style a Piece', desc: 'Build around an item' },
  { key: 'weather', icon: Cloud, iconColor: '#F97316', title: "Today's Weather", desc: '33\u00B0F, Partly cloudy' },
  { key: 'twin', icon: UserCircle, iconColor: '#A855F7', title: 'Use Twin', desc: 'Try on with AI' },
] as const;

const SUGGESTION_CHIPS = [
  "What should I wear today?",
  "Cozy late night outfit",
  "Help me layer for cold weather",
  "Casual Friday look",
];

export default function StyleChatScreen() {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const scrollRef = useRef<ScrollView>(null);
  const items = useClosetStore((s) => s.items);

  const closetContext = items.length > 0
    ? items.map((i) => `- ${i.name} (${i.category}${i.brand ? `, ${i.brand}` : ''}, colors: ${i.colors.join(', ')})`).join('\n')
    : 'The user has no items in their closet yet.';

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const userMsg: DisplayMessage = {
      id: `msg-${Date.now()}-user`,
      role: 'user',
      content: text.trim(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setMessage('');
    setIsLoading(true);

    const newHistory: ChatMessage[] = [...chatHistory, { role: 'user', content: text.trim() }];
    setChatHistory(newHistory);

    try {
      const reply = await chatWithStylist(newHistory, closetContext);
      const assistantMsg: DisplayMessage = {
        id: `msg-${Date.now()}-ai`,
        role: 'assistant',
        content: reply,
      };
      setMessages((prev) => [...prev, assistantMsg]);
      setChatHistory((prev) => [...prev, { role: 'assistant', content: reply }]);
    } catch {
      const errorMsg: DisplayMessage = {
        id: `msg-${Date.now()}-err`,
        role: 'assistant',
        content: 'Sorry, I had trouble processing that. Please try again.',
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, chatHistory, closetContext]);

  useEffect(() => {
    if (scrollRef.current) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages]);

  const handleSend = () => sendMessage(message);

  const handleActionCard = (key: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (key === 'twin') {
      router.push('/digital-twin' as never);
    } else if (key === 'event') {
      sendMessage('Help me pick an outfit for an event. What kind of event do you want to dress for?');
    } else if (key === 'style') {
      sendMessage('I want to build an outfit around a specific piece from my closet. What do you suggest?');
    } else if (key === 'weather') {
      sendMessage('What should I wear today based on the weather?');
    }
  };

  const hasMessages = messages.length > 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
    <KeyboardAvoidingView
      style={styles.keyboardAvoid}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      <View style={styles.header}>
        <Pressable
          style={styles.closeBtn}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }}
        >
          <X size={20} color={Colors.textPrimary} />
        </Pressable>

        <View style={styles.creditPill}>
          <Sparkles size={14} color={Colors.accentGreen} />
          <Text style={styles.creditText}>{items.length}</Text>
        </View>

        <Pressable style={styles.moreBtn}>
          <MoreHorizontal size={20} color={Colors.textPrimary} />
        </Pressable>
      </View>

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[styles.scrollContent, hasMessages && styles.scrollContentWithMessages]}
        showsVerticalScrollIndicator={false}
      >
        {!hasMessages && (
          <>
            <Text style={styles.greeting}>Hey there!</Text>
            <Text style={styles.subGreeting}>What can I help you with?</Text>

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
          </>
        )}

        {messages.map((msg) => (
          <View
            key={msg.id}
            style={[
              styles.messageBubble,
              msg.role === 'user' ? styles.userBubble : styles.aiBubble,
            ]}
          >
            {msg.role === 'assistant' && (
              <Sparkles size={14} color={Colors.accentGreen} style={{ marginBottom: 4 }} />
            )}
            <Text style={[
              styles.messageText,
              msg.role === 'user' ? styles.userMessageText : styles.aiMessageText,
            ]}>
              {msg.content}
            </Text>
          </View>
        ))}

        {isLoading && (
          <View style={[styles.messageBubble, styles.aiBubble]}>
            <ActivityIndicator size="small" color={Colors.accentGreen} />
            <Text style={styles.aiMessageText}>Thinking...</Text>
          </View>
        )}
      </ScrollView>

      {!hasMessages && (
        <View style={styles.chipColumn}>
          {SUGGESTION_CHIPS.map((chip) => (
            <Pressable
              key={chip}
              style={styles.chip}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                sendMessage(chip);
              }}
            >
              <Text style={styles.chipText}>{chip}</Text>
            </Pressable>
          ))}
        </View>
      )}

      <View style={styles.inputRow}>
        <Pressable style={styles.inputPlus}>
          <Plus size={18} color={Colors.textSecondary} />
        </Pressable>
        <View style={styles.inputBar}>
          <TextInput
            style={styles.textInput}
            placeholder="Ask Stylist AI..."
            placeholderTextColor={Colors.textTertiary}
            value={message}
            onChangeText={setMessage}
            onSubmitEditing={handleSend}
            returnKeyType="send"
            editable={!isLoading}
          />
          <Pressable
            style={[styles.sendBtn, isLoading && { opacity: 0.5 }]}
            onPress={handleSend}
            disabled={isLoading}
          >
            <Send size={16} color={Colors.background} />
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  keyboardAvoid: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 8 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.cardSurfaceAlt, alignItems: 'center', justifyContent: 'center' },
  creditPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.pill, backgroundColor: Colors.cardSurfaceAlt },
  creditText: { fontFamily: Typography.bodyFamilyMedium, fontSize: 14, color: Colors.textPrimary },
  moreBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { padding: 24, paddingBottom: 8, flexGrow: 1 },
  scrollContentWithMessages: { paddingTop: 12 },
  greeting: { fontFamily: Typography.bodyFamilyBold, fontSize: 26, color: Colors.textPrimary, textAlign: 'center', marginTop: 24 },
  subGreeting: { fontFamily: Typography.bodyFamily, fontSize: 16, color: Colors.textSecondary, textAlign: 'center', marginBottom: 32 },
  cardGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  actionCard: { width: '47%', backgroundColor: Colors.cardSurfaceAlt, borderRadius: Radius.lg, padding: 16, gap: 8 },
  actionIconCircle: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  actionTitle: { fontFamily: Typography.bodyFamilyBold, fontSize: 15, color: Colors.textPrimary },
  actionDesc: { fontFamily: Typography.bodyFamily, fontSize: 12, color: Colors.textSecondary },
  chipColumn: { paddingHorizontal: 16, gap: 8, paddingBottom: 12 },
  chip: { backgroundColor: Colors.cardSurfaceAlt, borderRadius: Radius.md, paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1, borderColor: Colors.border },
  chipText: { fontFamily: Typography.bodyFamily, fontSize: 14, color: Colors.textPrimary },
  inputRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 16, gap: 8 },
  inputPlus: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.cardSurfaceAlt, alignItems: 'center', justifyContent: 'center' },
  inputBar: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.cardSurfaceAlt, borderRadius: Radius.pill, paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  textInput: { flex: 1, fontFamily: Typography.bodyFamily, fontSize: 15, color: Colors.textPrimary, padding: 0 },
  sendBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.accentGreen, alignItems: 'center', justifyContent: 'center' },
  // Message bubbles
  messageBubble: { maxWidth: '85%', borderRadius: Radius.lg, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 8 },
  userBubble: { alignSelf: 'flex-end', backgroundColor: Colors.accentGreen },
  aiBubble: { alignSelf: 'flex-start', backgroundColor: Colors.cardSurfaceAlt, gap: 4 },
  messageText: { fontFamily: Typography.bodyFamily, fontSize: 15, lineHeight: 22 },
  userMessageText: { color: Colors.background },
  aiMessageText: { color: Colors.textPrimary },
});
