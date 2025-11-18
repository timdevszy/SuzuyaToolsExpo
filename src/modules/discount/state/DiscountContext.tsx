import * as React from 'react';
import { Platform } from 'react-native';
import RNBluetoothClassic from 'react-native-bluetooth-classic';

export type ScannedProductData = {
	code: string;
	/** Diskon yang diminta saat scan, dalam bentuk string persen, misal '10' */
	discount: string;
	payload: any;
	scannedAt: string;
	scannedByUsername?: string;
	scannedByUuid?: string;
	discountConfiguredByUsername?: string;
	discountConfiguredByUuid?: string;
};

export type DiscountContextValue = {
	lastScan: ScannedProductData | null;
	setLastScan: (data: ScannedProductData | null) => void;
	scans: ScannedProductData[];
	clearScans: () => void;
	removeScan: (scannedAt: string) => void;
	printerConfigured: boolean;
	setPrinterConfigured: (value: boolean) => void;
	discountConfigured: boolean;
	setDiscountConfigured: (value: boolean) => void;
};

const DiscountContext = React.createContext<DiscountContextValue | undefined>(undefined);

export function DiscountProvider({ children }: { children: React.ReactNode }) {
	const [lastScan, setLastScanState] = React.useState<ScannedProductData | null>(null);
	const [scans, setScans] = React.useState<ScannedProductData[]>([]);
	const [printerConfigured, setPrinterConfigured] = React.useState<boolean>(false);
	const [discountConfigured, setDiscountConfigured] = React.useState(false);

	// Saat konteks discount di-unmount (mis. app reload), coba putuskan koneksi printer Bluetooth
	React.useEffect(() => {
		return () => {
			if (Platform.OS !== 'android') return;
			if (!RNBluetoothClassic || typeof RNBluetoothClassic.getConnectedDevices !== 'function') {
				return;
			}
			// Fire-and-forget async disconnect; kita tidak perlu menunggu selesai
			(async () => {
				try {
					const devices = await RNBluetoothClassic.getConnectedDevices();
					if (!devices || !devices.length) return;
					for (const device of devices) {
						try {
							if (device && typeof (device as any).disconnect === 'function') {
								await (device as any).disconnect();
							}
						} catch {
							// abaikan error per perangkat
						}
					}
				} catch {
					// abaikan error global disconnect
				}
			})();
		};
	}, []);

	const setLastScan = React.useCallback((data: ScannedProductData | null) => {
		setLastScanState(data);
		if (data) {
			setScans((prev) => [...prev, data]);
		}
	}, []);

	const removeScan = React.useCallback((scannedAt: string) => {
		setScans((prev) => {
			const filtered = prev.filter((item) => item.scannedAt !== scannedAt);
			// Perbarui lastScan jika item terakhir dihapus
			if (!filtered.length) {
				setLastScanState(null);
			} else {
				const latest = filtered[filtered.length - 1];
				setLastScanState(latest);
			}
			return filtered;
		});
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
			removeScan,
			printerConfigured,
			setPrinterConfigured,
			discountConfigured,
			setDiscountConfigured,
		}),
		[lastScan, scans, printerConfigured, discountConfigured, setLastScan, clearScans, removeScan]
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
