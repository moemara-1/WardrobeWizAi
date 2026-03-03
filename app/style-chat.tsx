import { Radius, Typography } from '@/constants/Colors';
import { useThemeColors } from '@/contexts/ThemeContext';
import { ChatMessage, chatWithStylist } from '@/lib/ai';
import { useClosetStore } from '@/stores/closetStore';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { router, type Href } from 'expo-router';
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
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
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
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Weather state
  const [weatherDesc, setWeatherDesc] = useState<string>('Loading...');
  const [weatherContext, setWeatherContext] = useState<string>('');

  // Attachment state
  const [showPicker, setShowPicker] = useState(false);
  const [activeAttachment, setActiveAttachment] = useState<any>(null);

  const scrollRef = useRef<ScrollView>(null);
  const items = useClosetStore((s) => s.items);
  const messages = useClosetStore((s) => s.styleChatMessages);
  const chatHistory = useClosetStore((s) => s.styleChatHistory);
  const addStyleChatMessage = useClosetStore((s) => s.addStyleChatMessage);
  const clearStyleChat = useClosetStore((s) => s.clearStyleChat);

  useEffect(() => {
    async function fetchWeather() {
      try {
        const ipRes = await fetch('https://get.geojs.io/v1/ip/geo.json');
        const ipData = await ipRes.json();
        const city = ipData.city || 'New York';
        const weatherRes = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=REDACTED_OPENWEATHERMAP_KEY&units=imperial`);
        const weatherData = await weatherRes.json();
        const temp = Math.round(weatherData.main.temp);
        const desc = weatherData.weather[0].description;
        setWeatherDesc(`${temp}\u00B0F, ${desc}`);
        setWeatherContext(`User's current weather: ${temp}\u00B0F and ${desc} in ${city}.`);
      } catch (err) {
        setWeatherDesc('Weather unavailable');
      }
    }
    fetchWeather();
  }, []);

  const closetContext = items.length > 0
    ? items.map((i) => `- ${i.name} (${i.category}${i.brand ? `, ${i.brand}` : ''}, colors: ${i.colors.join(', ')})`).join('\n')
    : 'The user has no items in their closet yet.';

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    let finalInput = text.trim();
    if (activeAttachment) {
      finalInput = `[Looking at my items: ${activeAttachment.name} (${activeAttachment.category})] ${finalInput}`;
      setActiveAttachment(null);
    }

    const trimmed = text.trim();
    const userMsg: DisplayMessage = { id: `msg-${Date.now()}-user`, role: 'user', content: trimmed };
    addStyleChatMessage(userMsg, { role: 'user', content: finalInput });
    setMessage('');
    setIsLoading(true);

    const newHistory: ChatMessage[] = [...chatHistory, { role: 'user', content: finalInput }];

    // Inject weather context into the closet context block
    const fullContext = `${closetContext}\n\n${weatherContext}`;

    try {
      const reply = await chatWithStylist(newHistory, fullContext);
      const assistantMsg: DisplayMessage = { id: `msg-${Date.now()}-ai`, role: 'assistant', content: reply };
      addStyleChatMessage(assistantMsg, { role: 'assistant', content: reply });
    } catch {
      const errorMsg: DisplayMessage = { id: `msg-${Date.now()}-err`, role: 'assistant', content: 'Sorry, I had trouble processing that. Please try again.' };
      addStyleChatMessage(errorMsg, { role: 'assistant', content: errorMsg.content });
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, chatHistory, closetContext, weatherContext, addStyleChatMessage, activeAttachment]);

  useEffect(() => {
    if (scrollRef.current) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages]);

  const handleSend = () => sendMessage(message);

  const handleActionCard = (key: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (key === 'twin') {
      router.push('/digital-twin' as Href);
    } else if (key === 'event') {
      sendMessage('Help me pick an outfit for an event. What kind of event do you want to dress for?');
    } else if (key === 'style') {
      sendMessage('I want to build an outfit around a specific piece from my closet. What do you suggest?');
    } else if (key === 'weather') {
      sendMessage(`What should I wear today based on the weather? ${weatherContext}`);
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

          <Text style={styles.headerTitle}>StyleAI</Text>

          <Pressable style={styles.moreBtn} onPress={() => {
            Alert.alert('Chat Options', undefined, [
              { text: 'Clear Chat', style: 'destructive', onPress: clearStyleChat },
              { text: 'Cancel', style: 'cancel' },
            ]);
          }}>
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
                    <Text style={styles.actionDesc}>{key === 'weather' ? weatherDesc : desc}</Text>
                  </Pressable>
                ))}
              </View>
            </>
          )}

          {messages.map((msg) => (
            <View
              key={msg.id}
              style={[styles.messageBubble, msg.role === 'user' ? styles.userBubble : styles.aiBubble]}
            >
              {msg.role === 'assistant' && (
                <Sparkles size={14} color={Colors.accentGreen} style={{ marginBottom: 4 }} />
              )}
              <Text style={[styles.messageText, msg.role === 'user' ? styles.userMessageText : styles.aiMessageText]}>
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

        {activeAttachment && (
          <View style={styles.attachmentPreview}>
            <Image source={{ uri: activeAttachment.image_url || activeAttachment.clean_image_url }} style={styles.attachmentImg} />
            <Text style={styles.attachmentText} numberOfLines={1}>{activeAttachment.name}</Text>
            <Pressable onPress={() => setActiveAttachment(null)} style={styles.attachmentRemove}>
              <X size={12} color="#FFF" />
            </Pressable>
          </View>
        )}

        <View style={styles.inputRow}>
          <Pressable style={styles.inputPlus} onPress={() => setShowPicker(true)}>
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

      <Modal visible={showPicker} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowPicker(false)}>
        <SafeAreaView style={[styles.container, { padding: 16 }]} edges={['top']}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Text style={styles.headerTitle}>Select an Item</Text>
            <Pressable onPress={() => setShowPicker(false)}>
              <X size={24} color={Colors.textPrimary} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {items.map(item => (
              <Pressable
                key={item.id}
                style={{ width: '31%', aspectRatio: 1, backgroundColor: Colors.cardSurfaceAlt, borderRadius: Radius.md, overflow: 'hidden' }}
                onPress={() => {
                  setActiveAttachment(item);
                  setShowPicker(false);
                }}
              >
                <Image source={{ uri: item.clean_image_url || item.image_url }} style={{ width: '100%', height: '100%' }} contentFit="contain" />
              </Pressable>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function createStyles(C: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.background },
    keyboardAvoid: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 8 },
    closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.cardSurfaceAlt, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontFamily: Typography.bodyFamilyBold, fontSize: 17, color: C.textPrimary },
    moreBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    scrollContent: { padding: 24, paddingBottom: 8, flexGrow: 1 },
    scrollContentWithMessages: { paddingTop: 12 },
    greeting: { fontFamily: Typography.bodyFamilyBold, fontSize: 26, color: C.textPrimary, textAlign: 'center', marginTop: 24 },
    subGreeting: { fontFamily: Typography.bodyFamily, fontSize: 16, color: C.textSecondary, textAlign: 'center', marginBottom: 32 },
    cardGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    actionCard: { width: '47%', backgroundColor: C.cardSurfaceAlt, borderRadius: Radius.lg, padding: 16, gap: 8 },
    actionIconCircle: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    actionTitle: { fontFamily: Typography.bodyFamilyBold, fontSize: 15, color: C.textPrimary },
    actionDesc: { fontFamily: Typography.bodyFamily, fontSize: 12, color: C.textSecondary },
    chipColumn: { paddingHorizontal: 16, gap: 8, paddingBottom: 12 },
    chip: { backgroundColor: C.cardSurfaceAlt, borderRadius: Radius.md, paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1, borderColor: C.border },
    chipText: { fontFamily: Typography.bodyFamily, fontSize: 14, color: C.textPrimary },
    inputRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 16, gap: 8 },
    inputPlus: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.cardSurfaceAlt, alignItems: 'center', justifyContent: 'center' },
    inputBar: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: C.cardSurfaceAlt, borderRadius: Radius.pill, paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
    textInput: { flex: 1, fontFamily: Typography.bodyFamily, fontSize: 15, color: C.textPrimary, padding: 0 },
    sendBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.accentGreen, alignItems: 'center', justifyContent: 'center' },
    messageBubble: { maxWidth: '85%', borderRadius: Radius.lg, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 8 },
    userBubble: { alignSelf: 'flex-end', backgroundColor: C.accentGreen },
    aiBubble: { alignSelf: 'flex-start', backgroundColor: C.cardSurfaceAlt, gap: 4 },
    messageText: { fontFamily: Typography.bodyFamily, fontSize: 15, lineHeight: 22 },
    userMessageText: { color: C.background },
    aiMessageText: { color: C.textPrimary },
    attachmentPreview: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.cardSurfaceAlt, alignSelf: 'flex-start', marginLeft: 60, marginBottom: 8, padding: 6, paddingRight: 12, borderRadius: Radius.pill, gap: 8 },
    attachmentImg: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#FFF' },
    attachmentText: { fontFamily: Typography.bodyFamilyBold, fontSize: 13, color: C.textPrimary, maxWidth: 120 },
    attachmentRemove: { width: 20, height: 20, borderRadius: 10, backgroundColor: C.accentCoral, alignItems: 'center', justifyContent: 'center' },
  });
}
