import { Text } from '@react-navigation/elements';
import { StyleSheet, View } from 'react-native';

// Layar Settings sederhana, nanti bisa diisi pengaturan user/app
export function Settings() {
  return (
    <View style={styles.container}>
      <Text>Settings Screen</Text>
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
  row: {
    // Utility style kalau butuh susun item secara horizontal di Settings
    flexDirection: 'row',
    gap: 10,
  },
});
