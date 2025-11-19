import MMKVStorage from 'react-native-mmkv-storage';

const MMKV = new MMKVStorage.Loader().initialize();

const ONBOARDING_KEY = 'onboarding_completed_v1';

export async function getHasCompletedOnboarding(): Promise<boolean> {
  try {
    const value = await MMKV.getStringAsync(ONBOARDING_KEY);
    return value === '1';
  } catch {
    return false;
  }
}

export async function setHasCompletedOnboarding(completed: boolean): Promise<void> {
  try {
    if (completed) {
      await MMKV.setStringAsync(ONBOARDING_KEY, '1');
    } else {
      await MMKV.removeItem(ONBOARDING_KEY);
    }
  } catch {
    // ignore storage errors
  }
}
