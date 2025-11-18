import { Assets as NavigationAssets } from '@react-navigation/elements';
import { DarkTheme, DefaultTheme } from '@react-navigation/native';
import { Asset } from 'expo-asset';
import { createURL } from 'expo-linking';
import * as SplashScreen from 'expo-splash-screen';
import * as React from 'react';
import { useColorScheme } from 'react-native';
import { Navigation } from './navigation';
import { AuthProvider } from './auth/AuthContext';
import { DiscountProvider } from './modules/discount/state/DiscountContext';

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

  // Pilih tema terang/gelap mengikuti setting sistem
  const theme = colorScheme === 'dark' ? DarkTheme : DefaultTheme

  return (
    // Bungkus app dengan AuthProvider dan DiscountProvider supaya context bisa dipakai di semua screen
    <AuthProvider>
      <DiscountProvider>
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
      </DiscountProvider>
    </AuthProvider>
  );
}
