import React from 'react';
import { Pressable, StyleSheet, Text, ViewStyle, TextStyle } from 'react-native';
import { colors, radius, spacing, typography } from '../theme';

export type AppButtonVariant = 'primary' | 'outline' | 'danger';

export type AppButtonProps = {
	variant?: AppButtonVariant;
	title: string;
	onPress?: () => void;
	disabled?: boolean;
	style?: ViewStyle;
	textStyle?: TextStyle;
};

export function AppButton({
	variant = 'primary',
	title,
	onPress,
	disabled,
	style,
	textStyle,
}: AppButtonProps) {
	const isPrimary = variant === 'primary';
	const isDanger = variant === 'danger';
	const baseStyle = [styles.base, style];
	let variantStyle: ViewStyle = styles.primary;
	let variantTextStyle: TextStyle = styles.primaryText;

	if (variant === 'outline') {
		variantStyle = styles.outline;
		variantTextStyle = styles.outlineText;
	} else if (isDanger) {
		variantStyle = styles.danger;
		variantTextStyle = styles.dangerText;
	}

	return (
		<Pressable
			style={({ pressed }) => [
				baseStyle,
				variantStyle,
				disabled && styles.disabled,
				pressed && !disabled && styles.pressed,
			]}
			onPress={disabled ? undefined : onPress}
		>
			<Text style={[styles.text, variantTextStyle, textStyle]}>{title}</Text>
		</Pressable>
	);
}

const styles = StyleSheet.create({
	base: {
		paddingVertical: spacing.md,
		paddingHorizontal: spacing.lg,
		borderRadius: radius.md,
		alignItems: 'center',
		justifyContent: 'center',
		flexDirection: 'row',
	},
	primary: {
		backgroundColor: colors.primary,
	},
	primaryText: {
		color: '#FFFFFF',
	},
	outline: {
		backgroundColor: colors.card,
		borderWidth: 1,
		borderColor: colors.border,
	},
	outlineText: {
		color: colors.text,
	},
	danger: {
		backgroundColor: colors.danger,
	},
	dangerText: {
		color: '#FFFFFF',
	},
	text: {
		...typography.button,
	},
	disabled: {
		opacity: 0.6,
	},
	pressed: {
		opacity: 0.85,
	},
});
