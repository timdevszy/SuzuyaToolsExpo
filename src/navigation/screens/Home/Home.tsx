import { Button, Text } from '@react-navigation/elements';
import { StyleSheet, View } from 'react-native';
import * as React from 'react';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../../auth/AuthContext';

export function Home() {
  const navigation = useNavigation<any>();
  const { token, setToken } = useAuth();

  // Kalau user belum punya token (belum login), paksa balik ke layar Login
  React.useEffect(() => {
    if (!token) {
      // If not authenticated, go back to Login
      try {
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
      } catch {
        navigation.navigate('Login');
      }
    }
  }, [token, navigation]);

  return (
    <View style={styles.container}>
      <Text>Home Screen</Text>
      <Text>Open up 'src/App.tsx' to start working on your app!</Text>
      {/* Contoh navigasi ke screen lain */}
      <Button screen="Profile" params={{ user: 'jane' }}>
        Go to Profile
      </Button>
      <Button screen="Settings">Go to Settings</Button>
      {/* Tombol logout sederhana: hapus token dari AuthContext */}
      <Button
        onPress={() => {
          setToken(null);
        }}
      >
        Logout
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
});
