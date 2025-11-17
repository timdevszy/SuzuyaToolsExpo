import * as React from 'react';
import MMKVStorage from 'react-native-mmkv-storage';

export type ScannedProductData = {
	code: string;
	/** Diskon yang diminta saat scan, dalam bentuk string persen, misal '10' */
	discount: string;
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

// MMKV instance khusus modul discount
const MMKV = new MMKVStorage.Loader().withInstanceID('discount').initialize();
const STORAGE_KEY = 'discount_scans_v1';

export function DiscountProvider({ children }: { children: React.ReactNode }) {
	const [lastScan, setLastScanState] = React.useState<ScannedProductData | null>(null);
	const [scans, setScans] = React.useState<ScannedProductData[]>([]);
	const [printerConfigured, setPrinterConfigured] = React.useState<boolean>(
		typeof __DEV__ !== 'undefined' && __DEV__ ? true : false
	);
	const [discountConfigured, setDiscountConfigured] = React.useState(false);

	// Load persisted scans saat pertama kali mount
	React.useEffect(() => {
		let isMounted = true;
		try {
			const content = MMKV.getString(STORAGE_KEY);
			if (!content) return;
			const parsed = JSON.parse(content) as {
				lastScan: ScannedProductData | null;
				scans: ScannedProductData[];
				printerConfigured?: boolean;
				discountConfigured?: boolean;
			};
			if (!isMounted) return;
			if (parsed.lastScan) setLastScanState(parsed.lastScan);
			if (Array.isArray(parsed.scans)) setScans(parsed.scans);
			if (typeof parsed.printerConfigured === 'boolean') {
				setPrinterConfigured(parsed.printerConfigured);
			}
			if (typeof parsed.discountConfigured === 'boolean') {
				setDiscountConfigured(parsed.discountConfigured);
			}
		} catch {
			// abaikan error load, gunakan state default
		}
		return () => {
			isMounted = false;
		};
	}, []);

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

	// Persist perubahan penting ke storage (sinkron, sangat cepat di MMKV)
	React.useEffect(() => {
		try {
			const payload = JSON.stringify({
				lastScan,
				scans,
				printerConfigured,
				discountConfigured,
			});
			MMKV.setString(STORAGE_KEY, payload);
		} catch {
			// abaikan error simpan, jangan ganggu UX
		}
	}, [lastScan, scans, printerConfigured, discountConfigured]);

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
