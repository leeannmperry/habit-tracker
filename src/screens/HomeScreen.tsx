import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  ScrollView,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Colors, Typography } from '../theme';
import { HomeData, loadHome, saveHome } from '../store/home';

export default function HomeScreen() {
  const [data, setData] = useState<HomeData>({
    tarotUri: null,
    intentions: { work: '', life: '', creative: '' },
  });

  useEffect(() => { loadHome().then(setData); }, []);

  const persist = (next: HomeData) => {
    setData(next);
    saveHome(next);
  };

  const pickTarot = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.7,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const uri = asset.base64
        ? `data:image/jpeg;base64,${asset.base64}`
        : asset.uri;
      persist({ ...data, tarotUri: uri });
    }
  };

  const setIntention = (key: keyof HomeData['intentions'], value: string) => {
    persist({ ...data, intentions: { ...data.intentions, [key]: value } });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>
      <TouchableOpacity onPress={pickTarot} style={styles.tarotWrap}>
        <View style={styles.tarotBox}>
          {data.tarotUri ? (
            <>
              <Image
                source={{ uri: data.tarotUri }}
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
            <Text style={styles.uploadHint}>tap to{'\n'}upload</Text>
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
});
