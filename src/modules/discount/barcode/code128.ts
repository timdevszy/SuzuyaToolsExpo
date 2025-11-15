export type Code128Bar = {
	width: number;
	black: boolean;
};

export type Code128Encoded = {
	bars: Code128Bar[];
};

function normalizeValue(value: string): string {
	return value.trim();
}

export function encodeCode128(value: string): Code128Encoded {
	const normalized = normalizeValue(value);
	if (!normalized) {
		return { bars: [] };
	}

	// Placeholder visual encoder: this does NOT implement real Code128 yet.
	// It just generates an alternating bar pattern based on the string length
	// so that we have a consistent visual barcode area in the UI.
	const bars: Code128Bar[] = [];

	for (let i = 0; i < normalized.length; i += 1) {
		const baseWidth = 2;
		const wide = 3;
		const isEven = i % 2 === 0;

		bars.push({ black: true, width: isEven ? wide : baseWidth });
		bars.push({ black: false, width: isEven ? baseWidth : wide });
	}

	// Add some quiet zone at both ends
	bars.unshift({ black: false, width: 4 });
	bars.push({ black: false, width: 4 });

	return { bars };
}
