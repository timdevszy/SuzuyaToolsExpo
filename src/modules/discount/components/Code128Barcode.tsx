import React from 'react';
import { StyleSheet, View } from 'react-native';
import { encodeCode128 } from '../barcode/code128';

export type Code128BarcodeProps = {
	value: string;
	height?: number;
	barWidth?: number;
};

export function Code128Barcode({ value, height = 50, barWidth = 2 }: Code128BarcodeProps) {
	const { bars } = encodeCode128(value);

	if (!bars.length) {
		return null;
	}

	return (
		<View
			style={[styles.container, { height }]}
			testID="code128-barcode"
		>
			{bars.map((bar, index) => (
				<View
						key={index}
						style={{
							width: bar.width * barWidth,
							height: '100%',
							backgroundColor: bar.black ? '#111827' : 'transparent',
						}}
				/>
			))}
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flexDirection: 'row',
		alignItems: 'flex-end',
		justifyContent: 'center',
		width: '100%',
		overflow: 'hidden',
	},
});
