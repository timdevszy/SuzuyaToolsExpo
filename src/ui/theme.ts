export const colors = {
	primary: '#007AFF',
	primarySoft: '#E5F0FF',
	background: '#F5F5F5',
	card: '#FFFFFF',
	border: '#E5E7EB',
	text: '#1F2933',
	textMuted: '#6B7280',
	danger: '#B91C1C',
	dangerSoft: '#FEE2E2',
};

export const spacing = {
	xs: 4,
	sm: 8,
	md: 12,
	lg: 16,
	xl: 20,
};

export const radius = {
	sm: 6,
	md: 10,
	lg: 12,
	pill: 999,
};

export const typography = {
	title: {
		fontSize: 18,
		fontWeight: '600' as const,
		color: colors.text,
	},
	subtitle: {
		fontSize: 13,
		color: colors.textMuted,
	},
	button: {
		fontSize: 15,
		fontWeight: '600' as const,
	},
};
