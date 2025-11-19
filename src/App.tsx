import { Assets as NavigationAssets } from '@react-navigation/elements';
import { DarkTheme, DefaultTheme } from '@react-navigation/native';
import { Asset } from 'expo-asset';
import { createURL } from 'expo-linking';
import * as SplashScreen from 'expo-splash-screen';
import * as React from 'react';
import { StatusBar, useColorScheme, View, ActivityIndicator } from 'react-native';
import { Navigation } from './navigation';
import { AuthProvider } from './auth/AuthContext';
import { DiscountProvider } from './modules/discount/state/DiscountContext';
import { DevBypassProvider } from './dev/DevBypassContext';
import { Onboarding } from './navigation/screens/Onboarding/Onboarding';
import { getHasCompletedOnboarding, setHasCompletedOnboarding } from './utils/onboardingStorage';

// Preload aset gambar yang dipakai di navigasi (ikon tab, dll.)
Asset.loadAsync([
  ...NavigationAssets,
  require('./assets/newspaper.png'),
  require('./assets/bell.png'),
  require('./assets/tag.png'),
]);

// Tahan SplashScreen sampai navigasi siap
SplashScreen.preventAutoHideAsync();

const prefix = createURL('/');

export function App() {
  const colorScheme = useColorScheme();
  const [onboardingChecked, setOnboardingChecked] = React.useState(false);
  const [hasCompletedOnboarding, setHasCompletedOnboardingState] = React.useState(false);

  // Pilih tema terang/gelap mengikuti setting sistem
  const theme = colorScheme === 'dark' ? DarkTheme : DefaultTheme

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const completed = await getHasCompletedOnboarding();
        if (mounted) {
          setHasCompletedOnboardingState(completed);
        }
      } finally {
        if (mounted) {
          setOnboardingChecked(true);
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Pastikan SplashScreen di-hide juga ketika kita mau menampilkan layar onboarding.
  // Kalau tidak, onboarding akan dirender di belakang splash dan kelihatan seperti app stuck.
  React.useEffect(() => {
    if (onboardingChecked && !hasCompletedOnboarding) {
      SplashScreen.hideAsync();
    }
  }, [onboardingChecked, hasCompletedOnboarding]);

  const handleFinishOnboarding = React.useCallback(async () => {
    await setHasCompletedOnboarding(true);
    setHasCompletedOnboardingState(true);
  }, []);

  return (
    // Bungkus app dengan AuthProvider dan DiscountProvider supaya context bisa dipakai di semua screen
    <AuthProvider>
      <DiscountProvider>
        <StatusBar
          translucent={false}
          backgroundColor="transparent"
          barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'}
          hidden={false}
        />
        {!onboardingChecked ? (
          <View
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ActivityIndicator />
          </View>
        ) : !hasCompletedOnboarding ? (
          <Onboarding onFinish={handleFinishOnboarding} />
        ) : __DEV__ ? (
          <DevBypassProvider>
            <Navigation
              theme={theme}
              linking={{
                enabled: 'auto',
                prefixes: [prefix],
              }}
              // Sembunyikan SplashScreen setelah navigasi siap
              onReady={() => {
                SplashScreen.hideAsync();
              }}
            />
          </DevBypassProvider>
        ) : (
          <Navigation
            theme={theme}
            linking={{
              enabled: 'auto',
              prefixes: [prefix],
            }}
            // Sembunyikan SplashScreen setelah navigasi siap
            onReady={() => {
              SplashScreen.hideAsync();
            }}
          />
        )}
      </DiscountProvider>
    </AuthProvider>
  );
}
