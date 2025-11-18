import React from 'react';
import { StyleSheet, View } from 'react-native';
import { encodeCode128 } from '../barcode/code128';

// Props buat komponen barcode Code128
export type Code128BarcodeProps = {
	value: string; // teks yang mau di-encode jadi barcode
	height?: number; // tinggi barcode di UI
	barWidth?: number; // scaling lebar tiap modul/bar
};

// Komponen sederhana buat nampilin barcode Code128 berbasis View
export function Code128Barcode({ value, height = 50, barWidth = 2 }: Code128BarcodeProps) {
	// Encode value jadi list bar (hitam / spasi putih) dengan lebar masing-masing
	const { bars } = encodeCode128(value);

	// Kalau gagal encode atau string kosong, kita nggak render apa-apa
	if (!bars.length) {
		return null;
	}

	// Render deretan bar secara horizontal
	return (
		<View
			style={[styles.container, { height }]}
			testID="code128-barcode"
		>
			{bars.map((bar, index) => (
				<View
						key={index}
						style={{
							// Lebar asli modul dikali barWidth supaya bisa diskala
							width: bar.width * barWidth,
							height: '100%',
							// Hitam untuk bar, transparent untuk spasi
							backgroundColor: bar.black ? '#111827' : 'transparent',
						}}
				/>
			))}
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		// Susun bar secara horizontal
		flexDirection: 'row',
		// Biar barcode nempel di bawah (lebih mirip barcode fisik)
		alignItems: 'flex-end',
		// Posisikan di tengah secara horizontal
		justifyContent: 'center',
		width: '100%',
		overflow: 'hidden',
	},
});
