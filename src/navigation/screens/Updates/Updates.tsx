import { Text } from '@react-navigation/elements';
import { StyleSheet, View } from 'react-native';

// Layar placeholder untuk fitur Updates, nanti bisa diisi changelog atau pengumuman
export function Updates() {
	return (
		<View style={styles.container}>
			<Text>Updates Screen</Text>
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
