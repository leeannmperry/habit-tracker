import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  ScrollView,
  Modal,
  FlatList,
  Platform,
  ActivityIndicator,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Colors, Typography } from '../theme';
import { HomeData, loadHome, saveHome, uploadTarot, subscribeHome } from '../store/home';
import { useAuth } from '../context/AuthContext';
import { TAROT_CARDS, getCardById } from '../utils/tarotCards';

// Hoisted to avoid new object/component refs on every render
const COLS = 3;
const MODAL_PADDING = 16;
const GAP = 8;
const GRID_COL_WRAPPER = { gap: GAP };
const GridSeparator = () => <View style={{ height: GAP }} />;

interface Props { userId: string; }

export default function HomeScreen({ userId }: Props) {
  const { signOut } = useAuth();
  const { width } = useWindowDimensions();
  const thumbW = (Math.min(width, 480) - MODAL_PADDING * 2 - GAP * (COLS - 1)) / COLS;
  const thumbH = thumbW * (19 / 11);

  const [data, setData] = useState<HomeData>({
    tarotUri: null,
    tarotCard: null,
    intentions: { work: '', life: '', creative: '' },
  });
  const [uploading, setUploading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    loadHome(userId).then(setData);
    return subscribeHome(userId, () => { loadHome(userId).then(setData); });
  }, [userId]);

  const persist = (next: HomeData) => {
    setData(next);
    saveHome(userId, next);
  };

  const selectBundledCard = (cardId: string) => {
    setPickerOpen(false);
    persist({ ...data, tarotCard: cardId, tarotUri: null });
  };

  const pickCustom = async () => {
    setPickerOpen(false);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setUploading(true);
      try {
        const url = await uploadTarot(userId, result.assets[0].uri);
        persist({ ...data, tarotUri: url, tarotCard: null });
      } finally {
        setUploading(false);
      }
    }
  };

  const setIntention = (key: keyof HomeData['intentions'], value: string) => {
    persist({ ...data, intentions: { ...data.intentions, [key]: value } });
  };

  // Resolve image source
  const bundledCard = data.tarotCard ? getCardById(data.tarotCard) : null;
  const imageSource = bundledCard
    ? bundledCard.source
    : data.tarotUri
      ? { uri: data.tarotUri }
      : null;

  const renderCard = useCallback(({ item }: { item: typeof TAROT_CARDS[number] }) => {
    const selected = data.tarotCard === item.id;
    return (
      <TouchableOpacity
        onPress={() => selectBundledCard(item.id)}
        style={[
          styles.thumb,
          { width: thumbW, height: thumbH },
          selected && styles.thumbSelected,
        ]}
      >
        <Image source={item.source} style={styles.thumbImg} resizeMode="cover" />
        <Text style={styles.thumbName} numberOfLines={1}>{item.name}</Text>
      </TouchableOpacity>
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.tarotCard, thumbW, thumbH]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>
      <TouchableOpacity
        onPress={() => setPickerOpen(true)}
        style={styles.tarotWrap}
        disabled={uploading}
      >
        <View style={styles.tarotBox}>
          {uploading ? (
            <ActivityIndicator color={Colors.ink3} />
          ) : imageSource ? (
            <>
              <Image
                source={imageSource}
                style={[
                  styles.tarotImg,
                  Platform.OS === 'web'
                    ? ({ filter: 'grayscale(1) sepia(1) saturate(0.3) brightness(0.95)' } as any)
                    : undefined,
                ]}
                resizeMode="contain"
              />
              {Platform.OS !== 'web' && (
                <View style={styles.tarotOverlay} />
              )}
            </>
          ) : (
            <Text style={styles.uploadHint}>tap to{'\n'}choose</Text>
          )}
        </View>
      </TouchableOpacity>

      <View style={styles.intStack}>
        {(['work', 'life', 'creative'] as const).map((key, i) => (
          <View key={key} style={[styles.intRow, i < 2 && styles.intBorder]}>
            <Text style={styles.intLabel}>{key.toUpperCase()}</Text>
            <TextInput
              style={[styles.intField, Platform.OS === 'web' && ({ outlineStyle: 'none' } as any)]}
              value={data.intentions[key]}
              onChangeText={v => setIntention(key, v)}
              multiline
              placeholder="..."
              placeholderTextColor={Colors.ink4}
            />
          </View>
        ))}
      </View>

      <TouchableOpacity onPress={signOut} style={styles.signOut}>
        <Text style={styles.signOutText}>sign out</Text>
      </TouchableOpacity>

      {/* Card picker modal */}
      <Modal
        visible={pickerOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setPickerOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setPickerOpen(false)} />
        <View style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>CHOOSE CARD</Text>
            <TouchableOpacity onPress={() => setPickerOpen(false)}>
              <Text style={styles.sheetClose}>×</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={TAROT_CARDS}
            keyExtractor={item => item.id}
            numColumns={COLS}
            contentContainerStyle={styles.grid}
            columnWrapperStyle={GRID_COL_WRAPPER}
            ItemSeparatorComponent={GridSeparator}
            renderItem={renderCard}
          />

          <TouchableOpacity onPress={pickCustom} style={styles.customBtn}>
            <Text style={styles.customBtnText}>UPLOAD CUSTOM IMAGE</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  scroll: { padding: 12, paddingBottom: 32 },

  tarotWrap: {
    width: '45%',
    marginBottom: 10,
    alignSelf: 'center',
  },
  tarotBox: {
    aspectRatio: 11 / 19,
    width: '100%',
    borderWidth: 0.5,
    borderColor: Colors.bg2,
    borderRadius: 6,
    backgroundColor: Colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  tarotImg: {
    width: '100%',
    height: '100%',
  },
  tarotOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: '#f7f0eb',
    opacity: 0.55,
  },
  uploadHint: {
    fontFamily: 'Georgia',
    fontSize: 11,
    color: Colors.ink3,
    textAlign: 'center',
    lineHeight: 22,
  },

  intStack: {
    backgroundColor: Colors.bg3,
    borderWidth: 0.5,
    borderColor: Colors.bg2,
    borderRadius: 8,
    overflow: 'hidden',
  },
  intRow: { padding: 10, paddingHorizontal: 12 },
  intBorder: { borderBottomWidth: 0.5, borderBottomColor: Colors.bg2 },
  intLabel: {
    ...Typography.sectionLabel,
    fontSize: 10,
    letterSpacing: 1.0,
    marginBottom: 4,
  },
  intField: {
    fontFamily: 'Georgia',
    fontSize: 13,
    color: Colors.ink,
    minHeight: 48,
    lineHeight: 21,
  },

  signOut: { marginTop: 24, alignSelf: 'center' },
  signOutText: {
    fontFamily: 'Georgia',
    fontSize: 11,
    color: Colors.ink4,
    textDecorationLine: 'underline',
  },

  // Modal
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    backgroundColor: Colors.bg,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    maxHeight: '80%',
    paddingBottom: 24,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.bg2,
  },
  sheetTitle: {
    ...Typography.sectionLabel,
    fontSize: 11,
    letterSpacing: 1.5,
  },
  sheetClose: {
    fontFamily: 'Georgia',
    fontSize: 22,
    color: Colors.ink3,
    lineHeight: 24,
  },
  grid: {
    padding: 16,
  },
  thumb: {
    borderRadius: 4,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: Colors.bg2,
    backgroundColor: Colors.bg3,
  },
  thumbSelected: {
    borderColor: Colors.ink,
    borderWidth: 1.5,
  },
  thumbImg: {
    flex: 1,
    width: '100%',
  },
  thumbName: {
    fontFamily: 'Georgia',
    fontSize: 9,
    color: Colors.ink3,
    textAlign: 'center',
    paddingVertical: 3,
    paddingHorizontal: 2,
    backgroundColor: Colors.bg,
  },
  customBtn: {
    marginHorizontal: 16,
    marginTop: 4,
    paddingVertical: 12,
    borderTopWidth: 0.5,
    borderTopColor: Colors.bg2,
    alignItems: 'center',
  },
  customBtnText: {
    ...Typography.sectionLabel,
    fontSize: 10,
    letterSpacing: 1.5,
    color: Colors.ink3,
  },
});
