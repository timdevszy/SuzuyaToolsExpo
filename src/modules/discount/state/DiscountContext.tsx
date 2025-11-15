import * as React from 'react';

export type ScannedProductData = {
	code: string;
	payload: any;
	scannedAt: string;
};

export type DiscountContextValue = {
	lastScan: ScannedProductData | null;
	setLastScan: (data: ScannedProductData | null) => void;
	scans: ScannedProductData[];
	clearScans: () => void;
	printerConfigured: boolean;
	setPrinterConfigured: (value: boolean) => void;
	discountConfigured: boolean;
	setDiscountConfigured: (value: boolean) => void;
};

const DiscountContext = React.createContext<DiscountContextValue | undefined>(undefined);

export function DiscountProvider({ children }: { children: React.ReactNode }) {
	const [lastScan, setLastScanState] = React.useState<ScannedProductData | null>(null);
	const [scans, setScans] = React.useState<ScannedProductData[]>([]);
	const [printerConfigured, setPrinterConfigured] = React.useState<boolean>(
		typeof __DEV__ !== 'undefined' && __DEV__ ? true : false
	);
	const [discountConfigured, setDiscountConfigured] = React.useState(false);

	const setLastScan = React.useCallback((data: ScannedProductData | null) => {
		setLastScanState(data);
		if (data) {
			setScans((prev) => [...prev, data]);
		}
	}, []);

	const clearScans = React.useCallback(() => {
		setScans([]);
		setLastScanState(null);
	}, []);

	const value = React.useMemo(
		() => ({
			lastScan,
			setLastScan,
			scans,
			clearScans,
			printerConfigured,
			setPrinterConfigured,
			discountConfigured,
			setDiscountConfigured,
		}),
		[lastScan, scans, printerConfigured, discountConfigured, setLastScan, clearScans]
	);

	return <DiscountContext.Provider value={value}>{children}</DiscountContext.Provider>;
}

export function useDiscount(): DiscountContextValue {
	const ctx = React.useContext(DiscountContext);
	if (!ctx) {
		throw new Error('useDiscount must be used within a DiscountProvider');
	}
	return ctx;
}
