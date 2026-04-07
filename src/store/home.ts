import AsyncStorage from '@react-native-async-storage/async-storage';

export interface HomeData {
  tarotUri: string | null;
  intentions: {
    work: string;
    life: string;
    creative: string;
  };
}

const KEY = 'ritual:home';

const DEFAULT: HomeData = {
  tarotUri: null,
  intentions: { work: '', life: '', creative: '' },
};

export async function loadHome(): Promise<HomeData> {
  const raw = await AsyncStorage.getItem(KEY);
  return raw ? { ...DEFAULT, ...JSON.parse(raw) } : DEFAULT;
}

export async function saveHome(data: HomeData): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(data));
}
