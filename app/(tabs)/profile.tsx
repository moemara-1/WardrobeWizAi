import { Radius, Typography } from '@/constants/Colors';
import { useThemeColors } from '@/contexts/ThemeContext';
import { uploadImage } from '@/lib/storage';
import { useClosetStore } from '@/stores/closetStore';
import { useSocialStore } from '@/stores/socialStore';
import { UserPost } from '@/types';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router, type Href } from 'expo-router';
import {
  Camera,
  ChevronRight,
  DollarSign,
  Edit3,
  Grid3X3,
  Heart,
  ImageIcon as ImageIconLucide,
  Layers,
  Plus,
  Settings,
  Shirt,
  User,
  UserCircle,
  X,
} from 'lucide-react-native';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_COLUMNS = 3;
const GRID_GAP = 2;
const TILE_SIZE = (SCREEN_WIDTH - GRID_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS;

type ProfileTab = 'posts' | 'closet' | 'looks' | 'liked';

export default function ProfileScreen() {
  const Colors = useThemeColors();
  const [activeTab, setActiveTab] = useState<ProfileTab>('posts');
  const items = useClosetStore((s) => s.items);
  const outfits = useClosetStore((s) => s.outfits);
  const digitalTwin = useClosetStore((s) => s.digitalTwin);
  const posts = useClosetStore((s) => s.posts);
  const addPost = useClosetStore((s) => s.addPost);
  const userProfile = useClosetStore((s) => s.userProfile);
  const updateUserProfile = useClosetStore((s) => s.updateUserProfile);
  const addItem = useClosetStore((s) => s.addItem);

  const injectDemoData = useCallback(() => {
    Alert.alert('Load Demo Data?', 'This will inject 12 high-quality items into your closet for App Store screenshots.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Inject',
        style: 'default',
        onPress: async () => {
          const { generateDemoItems } = await import('@/utils/demoData');
          const demoItems = generateDemoItems();
          demoItems.forEach(item => addItem(item));
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Alert.alert('Success', '12 demo items added! Navigate to your closet to see them.');
        }
      }
    ]);
  }, [addItem]);

  const socialFollowers = useSocialStore((s) => s.followers);
  const socialFollowing = useSocialStore((s) => s.following);
  const likedPosts = useSocialStore((s) => s.likedPosts);

  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showAddPostModal, setShowAddPostModal] = useState(false);

  const styles = useMemo(() => createProfileStyles(Colors), [Colors]);

  const handleAddPost = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowAddPostModal(true);
  }, []);

  const gridData = activeTab === 'closet' ? items
    : activeTab === 'looks' ? outfits
      : activeTab === 'posts' ? posts
        : activeTab === 'liked' ? likedPosts
          : [];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        data={gridData}
        keyExtractor={(item) => item.id}
        numColumns={(activeTab === 'closet' || activeTab === 'posts' || activeTab === 'liked') ? GRID_COLUMNS : 1}
        key={activeTab}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.gridContent}
        columnWrapperStyle={(activeTab === 'closet' || activeTab === 'posts' || activeTab === 'liked') ? styles.gridRow : undefined}
        ListHeaderComponent={
          <>
            {/* Header row */}
            <View style={styles.headerRow}>
              <Pressable onLongPress={injectDemoData} delayLongPress={1500}>
                <Text style={styles.screenTitle}>Profile</Text>
              </Pressable>
              <Pressable
                style={styles.settingsBtn}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/settings' as Href); }}
              >
                <Settings size={20} color={Colors.textSecondary} />
              </Pressable>
            </View>

            {/* Avatar + name */}
            <View style={styles.avatarSection}>
              <View style={styles.avatarCircle}>
                {userProfile.pfp_url ? (
                  <Image source={{ uri: userProfile.pfp_url }} style={styles.avatarImage} />
                ) : (
                  <User size={32} color={Colors.textTertiary} strokeWidth={1.5} />
                )}
              </View>
              <View style={styles.nameBlock}>
                <Text style={styles.displayName}>{userProfile.username}</Text>
                <Text style={styles.handle}>@{userProfile.username.toLowerCase().replace(/\s+/g, '')}</Text>
                {userProfile.bio ? <Text style={styles.bioText}>{userProfile.bio}</Text> : null}
              </View>
            </View>

            {/* Edit Profile Button */}
            <Pressable
              style={styles.editProfileBtn}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowEditProfile(true); }}
            >
              <Edit3 size={14} color={Colors.textPrimary} />
              <Text style={styles.editProfileText}>Edit Profile</Text>
            </Pressable>

            {/* Stats row */}
            <View style={styles.statsRow}>
              <View style={styles.statBlock}>
                <Text style={styles.statValue}>{socialFollowers.length}</Text>
                <Text style={styles.statLabel}>Followers</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBlock}>
                <Text style={styles.statValue}>{socialFollowing.length}</Text>
                <Text style={styles.statLabel}>Following</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBlock}>
                <Text style={styles.statValue}>{items.length}</Text>
                <Text style={styles.statLabel}>Pieces</Text>
              </View>
            </View>

            {/* Wardrobe Value Card (renamed from Neckworth) */}
            <Pressable
              style={styles.neckworthCard}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/closet-value' as Href);
              }}
            >
              <View style={styles.neckworthIcon}>
                <DollarSign size={18} color={Colors.accentGreen} />
              </View>
              <View style={styles.neckworthMeta}>
                <Text style={styles.neckworthTitle}>Wardrobe Value</Text>
                <Text style={styles.neckworthSub}>See your closet's total value</Text>
              </View>
              <ChevronRight size={18} color={Colors.textTertiary} />
            </Pressable>

            {/* My Digital Twin Card (renamed from Selfie photo, body type removed) */}
            <View style={styles.twinSection}>
              <Pressable
                style={styles.twinCard}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push('/digital-twin' as Href);
                }}
              >
                <View style={styles.twinCardAvatar}>
                  <UserCircle size={22} color={Colors.textTertiary} />
                </View>
                <View style={styles.twinCardMeta}>
                  <Text style={styles.twinCardTitle}>My Digital Twin</Text>
                  <Text style={styles.twinCardSub}>Set up your virtual try-on avatar</Text>
                </View>
                <ChevronRight size={20} color={Colors.textTertiary} />
              </Pressable>
            </View>

            {/* Content Tabs — Posts first (default) */}
            <View style={styles.tabBar}>
              {([
                { key: 'posts' as ProfileTab, Icon: ImageIconLucide },
                { key: 'closet' as ProfileTab, Icon: Grid3X3 },
                { key: 'looks' as ProfileTab, Icon: Layers },
                { key: 'liked' as ProfileTab, Icon: Heart },
              ]).map((tab) => (
                <Pressable
                  key={tab.key}
                  style={[styles.tabItem, activeTab === tab.key && styles.tabItemActive]}
                  onPress={() => { Haptics.selectionAsync(); setActiveTab(tab.key); }}
                >
                  <tab.Icon size={20} color={activeTab === tab.key ? Colors.textPrimary : Colors.textTertiary} />
                </Pressable>
              ))}
            </View>

            {/* Add Post FAB (only on posts tab) */}
            {activeTab === 'posts' && posts.length > 0 && (
              <Pressable style={styles.addPostRow} onPress={handleAddPost}>
                <Plus size={16} color={Colors.accentGreen} />
                <Text style={styles.addPostText}>Add Post</Text>
              </Pressable>
            )}
          </>
        }
        renderItem={({ item }: { item: any }) => {
          if (activeTab === 'liked') {
            return (
              <Pressable
                style={styles.gridTile}
                onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
              >
                <Image
                  source={{ uri: item.imageUrl || item.image_url }}
                  style={styles.gridImage}
                  contentFit="cover"
                />
              </Pressable>
            );
          }
          if (activeTab === 'posts') {
            return (
              <Pressable
                style={styles.gridTile}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push(`/post/${item.id}` as Href);
                }}
              >
                <Image
                  source={{ uri: item.image_url }}
                  style={styles.gridImage}
                  contentFit="cover"
                />
              </Pressable>
            );
          }
          if (activeTab === 'closet') {
            return (
              <Pressable
                style={styles.gridTile}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push(`/item/${item.id}` as Href);
                }}
              >
                <Image
                  source={{ uri: item.clean_image_url || item.image_url }}
                  style={styles.gridImage}
                  contentFit="cover"
                />
              </Pressable>
            );
          }
          // Looks / outfits
          return (() => {
            const resolvedPieces = item.item_ids
              .map((id: string) => items.find((i) => i.id === id))
              .filter(Boolean);
            return (
              <View style={styles.outfitCard}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.outfitItems}>
                  {resolvedPieces.map((oi: any) => (
                    <View key={oi.id} style={styles.outfitThumb}>
                      <Image
                        source={{ uri: oi.clean_image_url || oi.image_url }}
                        style={styles.outfitThumbImage}
                        contentFit="contain"
                      />
                    </View>
                  ))}
                </ScrollView>
                <View style={styles.outfitInfo}>
                  <Shirt size={14} color={Colors.textTertiary} />
                  <Text style={styles.outfitName}>{item.name}</Text>
                  <Text style={styles.outfitCount}>{resolvedPieces.length} pieces</Text>
                </View>
              </View>
            );
          })();
        }}
        ListEmptyComponent={
          <View style={styles.emptyGrid}>
            {activeTab === 'posts' ? (
              <Pressable style={styles.addPostEmpty} onPress={handleAddPost}>
                <Plus size={24} color={Colors.textTertiary} />
                <Text style={styles.emptyGridText}>Add your first post</Text>
              </Pressable>
            ) : (
              <Text style={styles.emptyGridText}>
                {activeTab === 'closet'
                  ? 'No pieces in your closet yet'
                  : activeTab === 'looks'
                    ? 'No outfits saved yet'
                    : 'No liked items yet'}
              </Text>
            )}
          </View>
        }
      />

      {/* Edit Profile Modal */}
      <EditProfileModal
        visible={showEditProfile}
        onClose={() => setShowEditProfile(false)}
        userProfile={userProfile}
        onSave={(updates) => { updateUserProfile(updates); setShowEditProfile(false); }}
        digitalTwin={digitalTwin}
      />

      {/* Add Post Modal */}
      <AddPostModal
        visible={showAddPostModal}
        onClose={() => setShowAddPostModal(false)}
        items={items}
        onSave={(post) => { addPost(post); setShowAddPostModal(false); }}
      />
    </SafeAreaView>
  );
}

function EditProfileModal({ visible, onClose, userProfile, onSave, digitalTwin }: {
  visible: boolean;
  onClose: () => void;
  userProfile: { username: string; bio: string; pfp_url?: string };
  onSave: (updates: { username?: string; bio?: string; pfp_url?: string }) => void;
  digitalTwin: any;
}) {
  const Colors = useThemeColors();
  const [username, setUsername] = useState(userProfile.username);
  const [bio, setBio] = useState(userProfile.bio);
  const [pfpLocalUri, setPfpLocalUri] = useState<string | undefined>(userProfile.pfp_url);
  const [saving, setSaving] = useState(false);
  const styles = useMemo(() => createEditProfileStyles(Colors), [Colors]);
  const userId = useClosetStore((s) => s.userId);

  React.useEffect(() => {
    if (visible) {
      setUsername(userProfile.username);
      setBio(userProfile.bio);
      setPfpLocalUri(userProfile.pfp_url);
    }
  }, [visible, userProfile]);

  const handleChangePfp = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!result.canceled && result.assets[0]) {
      setPfpLocalUri(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!username.trim()) {
      Alert.alert('Username Required', 'Please enter a username.');
      return;
    }
    setSaving(true);
    try {
      let finalPfpUrl = pfpLocalUri;
      // Only upload if it's a new local file (not already a remote URL)
      if (pfpLocalUri && !pfpLocalUri.startsWith('http') && userId) {
        finalPfpUrl = await uploadImage(pfpLocalUri, userId, 'avatar');
      }
      onSave({ username: username.trim(), bio, pfp_url: finalPfpUrl });
    } catch (e) {
      Alert.alert('Upload Failed', 'Could not upload profile picture. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={onClose} disabled={saving}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
          <Text style={styles.title}>Edit Profile</Text>
          <Pressable onPress={handleSave} disabled={saving}>
            {saving ? (
              <ActivityIndicator size="small" color={Colors.accentGreen} />
            ) : (
              <Text style={styles.saveText}>Save</Text>
            )}
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.body}>
          <Pressable style={styles.pfpSection} onPress={handleChangePfp} disabled={saving}>
            <View style={styles.pfpCircle}>
              {pfpLocalUri ? (
                <Image source={{ uri: pfpLocalUri }} style={styles.pfpImage} />
              ) : (
                <User size={32} color={Colors.textTertiary} />
              )}
            </View>
            <Text style={styles.changePfpText}>Change Photo</Text>
          </Pressable>
          <Text style={styles.label}>Username</Text>
          <TextInput style={styles.input} value={username} onChangeText={setUsername} placeholder="Username" placeholderTextColor={Colors.textTertiary} autoCapitalize="none" />
          <Text style={styles.label}>Bio</Text>
          <TextInput style={[styles.input, styles.bioInput]} value={bio} onChangeText={setBio} placeholder="Write a bio..." placeholderTextColor={Colors.textTertiary} multiline />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function AddPostModal({ visible, onClose, items, onSave }: {
  visible: boolean;
  onClose: () => void;
  items: any[];
  onSave: (post: UserPost) => void;
}) {
  const Colors = useThemeColors();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [taggedIds, setTaggedIds] = useState<string[]>([]);
  const styles = useMemo(() => createAddPostStyles(Colors), [Colors]);

  React.useEffect(() => {
    if (visible) {
      setImageUri(null);
      setCaption('');
      setTaggedIds([]);
    }
  }, [visible]);

  const pickFromGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (!result.canceled && result.assets[0]) setImageUri(result.assets[0].uri);
  };

  const pickFromCamera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (!result.canceled && result.assets[0]) setImageUri(result.assets[0].uri);
  };

  const toggleTag = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTaggedIds((prev) => prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]);
  };

  const userId = useClosetStore((s) => s.userId);
  const [loading, setLoading] = useState(false);

  const handlePost = async () => {
    if (!imageUri || !userId) return;
    setLoading(true);
    try {
      const uploadedUrl = await uploadImage(imageUri, userId, 'post');

      onSave({
        id: `post-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        image_url: uploadedUrl,
        caption: caption.trim() || undefined,
        tagged_item_ids: taggedIds.length > 0 ? taggedIds : undefined,
        created_at: new Date().toISOString(),
      });
    } catch (e) {
      Alert.alert('Upload Failed', 'There was an error uploading your post. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={onClose} disabled={loading}><Text style={styles.cancelText}>Cancel</Text></Pressable>
          <Text style={styles.title}>New Post</Text>
          <Pressable onPress={handlePost} disabled={!imageUri || loading}>
            {loading ? (
              <ActivityIndicator size="small" color={Colors.textPrimary} />
            ) : (
              <Text style={[styles.postBtnText, (!imageUri || loading) && { opacity: 0.4 }]}>Post</Text>
            )}
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.body}>
          {!imageUri ? (
            <View style={styles.pickSection}>
              <Pressable style={styles.pickBtn} onPress={pickFromCamera}>
                <Camera size={24} color={Colors.textPrimary} />
                <Text style={styles.pickBtnText}>Take Photo</Text>
              </Pressable>
              <Pressable style={styles.pickBtn} onPress={pickFromGallery}>
                <ImageIconLucide size={24} color={Colors.textPrimary} />
                <Text style={styles.pickBtnText}>From Gallery</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.previewSection}>
              <Image source={{ uri: imageUri }} style={styles.previewImage} contentFit="cover" />
              <Pressable style={styles.changePhotoBtn} onPress={() => setImageUri(null)}>
                <Text style={styles.changePhotoText}>Change Photo</Text>
              </Pressable>
            </View>
          )}
          <Text style={styles.label}>Caption</Text>
          <TextInput
            style={styles.captionInput}
            value={caption}
            onChangeText={setCaption}
            placeholder="Write a caption..."
            placeholderTextColor={Colors.textTertiary}
            multiline
          />
          {items.length > 0 && (
            <>
              <Text style={styles.label}>Tag Clothing Items</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tagRow}>
                {items.slice(0, 20).map((item) => (
                  <Pressable key={item.id} style={[styles.tagItem, taggedIds.includes(item.id) && styles.tagItemActive]} onPress={() => toggleTag(item.id)}>
                    <Image source={{ uri: item.clean_image_url || item.image_url }} style={styles.tagItemImage} contentFit="contain" />
                    {taggedIds.includes(item.id) && (
                      <View style={styles.tagCheck}><X size={10} color="#FFF" /></View>
                    )}
                  </Pressable>
                ))}
              </ScrollView>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function createAddPostStyles(C: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.background },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
    cancelText: { fontFamily: Typography.bodyFamily, fontSize: 16, color: C.textSecondary },
    title: { fontFamily: Typography.bodyFamilyBold, fontSize: 17, color: C.textPrimary },
    postBtnText: { fontFamily: Typography.bodyFamilyBold, fontSize: 16, color: C.accentGreen },
    body: { padding: 20, gap: 12 },
    pickSection: { flexDirection: 'row', gap: 16, justifyContent: 'center', paddingVertical: 40 },
    pickBtn: { alignItems: 'center', gap: 8, paddingVertical: 24, paddingHorizontal: 32, borderRadius: Radius.lg, backgroundColor: C.cardSurfaceAlt, borderWidth: 1, borderColor: C.border },
    pickBtnText: { fontFamily: Typography.bodyFamilyMedium, fontSize: 14, color: C.textPrimary },
    previewSection: { alignItems: 'center', gap: 8 },
    previewImage: { width: '100%', height: 300, borderRadius: Radius.lg },
    changePhotoBtn: { paddingVertical: 6 },
    changePhotoText: { fontFamily: Typography.bodyFamilyMedium, fontSize: 14, color: C.accentGreen },
    label: { fontFamily: Typography.bodyFamilyMedium, fontSize: 13, color: C.textSecondary, marginTop: 8 },
    captionInput: { fontFamily: Typography.bodyFamily, fontSize: 15, color: C.textPrimary, backgroundColor: C.cardSurface, borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: C.border, minHeight: 60, textAlignVertical: 'top' },
    tagRow: { gap: 8, paddingVertical: 4 },
    tagItem: { width: 56, height: 56, borderRadius: 10, overflow: 'hidden', backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: C.border },
    tagItemActive: { borderColor: C.accentGreen },
    tagItemImage: { width: '100%', height: '100%' },
    tagCheck: { position: 'absolute', top: 2, right: 2, width: 16, height: 16, borderRadius: 8, backgroundColor: C.accentGreen, alignItems: 'center', justifyContent: 'center' },
  });
}

function createEditProfileStyles(C: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.background },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
    cancelText: { fontFamily: Typography.bodyFamily, fontSize: 16, color: C.textSecondary },
    title: { fontFamily: Typography.bodyFamilyBold, fontSize: 17, color: C.textPrimary },
    saveText: { fontFamily: Typography.bodyFamilyBold, fontSize: 16, color: C.accentGreen },
    body: { padding: 20, gap: 8 },
    pfpSection: { alignItems: 'center', gap: 8, marginBottom: 16 },
    pfpCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: C.cardSurfaceAlt, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 2, borderColor: C.border },
    pfpImage: { width: '100%', height: '100%' },
    changePfpText: { fontFamily: Typography.bodyFamilyMedium, fontSize: 14, color: C.accentGreen },
    label: { fontFamily: Typography.bodyFamilyMedium, fontSize: 13, color: C.textSecondary, marginTop: 8, marginBottom: 4 },
    input: { fontFamily: Typography.bodyFamily, fontSize: 15, color: C.textPrimary, backgroundColor: C.cardSurface, borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: C.border },
    bioInput: { minHeight: 80, textAlignVertical: 'top' },
  });
}

function createProfileStyles(C: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.background },
    gridContent: { paddingBottom: 120 },
    gridRow: { gap: GRID_GAP },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
    screenTitle: { fontFamily: Typography.serifFamilyBold, fontSize: 24, color: C.textPrimary },
    settingsBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.cardSurfaceAlt, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border },
    avatarSection: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 20, paddingBottom: 12 },
    avatarCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: C.cardSurfaceAlt, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.border, overflow: 'hidden' },
    avatarImage: { width: '100%', height: '100%' },
    nameBlock: { gap: 2, flex: 1 },
    displayName: { fontFamily: Typography.bodyFamilyBold, fontSize: 20, color: C.textPrimary },
    handle: { fontFamily: Typography.bodyFamily, fontSize: 14, color: C.textSecondary },
    bioText: { fontFamily: Typography.bodyFamily, fontSize: 13, color: C.textSecondary, marginTop: 4 },
    editProfileBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginHorizontal: 16, marginBottom: 16, paddingVertical: 8, borderRadius: Radius.pill, borderWidth: 1, borderColor: C.border, backgroundColor: C.cardSurfaceAlt },
    editProfileText: { fontFamily: Typography.bodyFamilyMedium, fontSize: 14, color: C.textPrimary },
    statsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginHorizontal: 16, backgroundColor: C.cardSurface, borderRadius: Radius.lg, paddingVertical: 14, borderWidth: 1, borderColor: C.border, marginBottom: 16 },
    statBlock: { flex: 1, alignItems: 'center', gap: 2 },
    statValue: { fontFamily: Typography.bodyFamilyBold, fontSize: 18, color: C.textPrimary },
    statLabel: { fontFamily: Typography.bodyFamily, fontSize: 12, color: C.textSecondary },
    statDivider: { width: 1, height: 28, backgroundColor: C.border },
    twinSection: { paddingHorizontal: 16, gap: 8, marginBottom: 16 },
    twinCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.cardSurface, borderRadius: 14, height: 66, paddingHorizontal: 16, gap: 14 },
    twinCardAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.cardSurfaceAlt, alignItems: 'center', justifyContent: 'center' },
    twinCardMeta: { flex: 1, gap: 2 },
    twinCardTitle: { fontFamily: Typography.bodyFamilyBold, fontSize: 15, color: C.textPrimary },
    twinCardSub: { fontFamily: Typography.bodyFamily, fontSize: 13, color: C.textSecondary },
    tabBar: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: C.border, borderBottomWidth: 1, borderBottomColor: C.border, marginBottom: GRID_GAP },
    tabItem: { flex: 1, alignItems: 'center', paddingVertical: 12 },
    tabItemActive: { borderBottomWidth: 2, borderBottomColor: C.textPrimary },
    addPostRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, marginHorizontal: 16, marginBottom: 4 },
    addPostText: { fontFamily: Typography.bodyFamilyMedium, fontSize: 13, color: C.accentGreen },
    gridTile: { width: TILE_SIZE, height: TILE_SIZE, backgroundColor: '#FFFFFF' },
    gridImage: { width: '100%', height: '100%' },
    outfitCard: { marginHorizontal: 16, marginBottom: 14, backgroundColor: C.cardSurface, borderRadius: Radius.lg, borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
    outfitItems: { padding: 12, gap: 8 },
    outfitThumb: { width: 64, height: 64, borderRadius: 10, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
    outfitThumbImage: { width: '85%', height: '85%' },
    outfitInfo: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: 1, borderTopColor: C.border },
    outfitName: { fontFamily: Typography.bodyFamilyBold, fontSize: 14, color: C.textPrimary, flex: 1 },
    outfitCount: { fontFamily: Typography.bodyFamily, fontSize: 12, color: C.textSecondary },
    emptyGrid: { paddingVertical: 60, alignItems: 'center' },
    emptyGridText: { fontFamily: Typography.bodyFamily, fontSize: 14, color: C.textTertiary },
    addPostEmpty: { alignItems: 'center', gap: 8 },
    neckworthCard: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 16, marginBottom: 16, backgroundColor: C.cardSurface, borderRadius: Radius.lg, borderWidth: 1, borderColor: C.border, padding: 14 },
    neckworthIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: `${C.accentGreen}20`, alignItems: 'center', justifyContent: 'center' },
    neckworthMeta: { flex: 1 },
    neckworthTitle: { fontFamily: Typography.bodyFamilyBold, fontSize: 15, color: C.textPrimary },
    neckworthSub: { fontFamily: Typography.bodyFamily, fontSize: 12, color: C.textSecondary, marginTop: 2 },
  });
}
