import React from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';
import { colors, radius, spacing } from '../theme';

export function SectionCard(props: ViewProps) {
	return <View {...props} style={[styles.card, props.style]} />;
}

const styles = StyleSheet.create({
	card: {
		backgroundColor: colors.card,
		borderRadius: radius.lg,
		padding: spacing.lg,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.05,
		shadowRadius: 6,
		elevation: 2,
	},
});
