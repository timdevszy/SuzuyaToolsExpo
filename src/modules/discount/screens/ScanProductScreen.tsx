import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
	ActivityIndicator,
	Linking,
	Platform,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	View,
} from 'react-native';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import { Camera, CameraView } from 'expo-camera';
import { useApiClient } from '../../../api/client';
import { useDiscount } from '../state/DiscountContext';
import { scanProductApi } from '../api/discountApi';
import { SectionCard } from '../../../ui/components/SectionCard';
import { AppButton } from '../../../ui/components/AppButton';

const USE_DUMMY_SCANPRODUCT = false; // use real API

type RouteParams = {
	defaultDiscountPercent?: string;
	defaultOutlet?: string;
};

export function ScanProduct() {
	const route = useRoute();
	const params = route.params as RouteParams | undefined;
	const { setLastScan } = useDiscount();
	const [hasPermission, setHasPermission] = useState<boolean | null>(null);

	const [scanned, setScanned] = useState(false);
	const [manualCode, setManualCode] = useState('');
	const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
	const [productPayload, setProductPayload] = useState<Record<string, unknown> | null>(null);
	const [rawResponse, setRawResponse] = useState<any>(null);
	const [loading, setLoading] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [isActive, setIsActive] = useState(true);

	const defaultOutlet = params?.defaultOutlet ?? '2018';
	const defaultDiscount = params?.defaultDiscountPercent ?? '0';

	const { request } = useApiClient();

	// Request camera permission
	useEffect(() => {
		(async () => {
			const { status } = await Camera.requestCameraPermissionsAsync();
			setHasPermission(status === 'granted');
		})();
	}, []);

	useFocusEffect(
		useCallback(() => {
			setScanned(false);
			setIsActive(true);
			return () => {
				setIsActive(false);
			};
		}, [])
	);

	const fetchProductData = useCallback(
		async (code: string) => {
			const trimmed = code.trim();
			if (!trimmed) return;

			setLoading(true);
			setErrorMessage(null);
			setProductPayload(null);
			setRawResponse(null);

			try {
				const normalizedDiscount = String(defaultDiscount ?? '0');
				if (USE_DUMMY_SCANPRODUCT) {
					const dummyData = {
						code: trimmed,
						outlet: defaultOutlet,
						discount: defaultDiscount,
						name: 'Contoh Produk Dummy',
						price: 100000,
						priceAfterDiscount: 100000 * (1 - Number(defaultDiscount || '0') / 100),
						category: 'Kategori Dummy',
						lastUpdated: new Date().toISOString(),
					};
					setProductPayload(dummyData as unknown as Record<string, unknown>);
					setRawResponse({ data: dummyData, source: 'dummy' });
					setLastScan({
						code: trimmed,
						discount: normalizedDiscount,
						payload: dummyData,
						scannedAt: new Date().toISOString(),
					});
				} else {
					const payload = {
						code: trimmed,
						outlet: defaultOutlet,
						discount: defaultDiscount,
					};
					const { product, raw, ok, errorMessage: apiError } = await scanProductApi(payload, request);
					if (!ok) {
						setErrorMessage(apiError || 'Gagal mengambil data produk.');
					} else {
						setProductPayload(product);
						setRawResponse(raw);
						if (product) {
							setLastScan({
								code: trimmed,
								discount: normalizedDiscount,
								payload: product,
								scannedAt: new Date().toISOString(),
							});
						}
					}
				}
			} catch (error) {
				setErrorMessage(
					error instanceof Error ? error.message : 'Terjadi kesalahan saat memuat data.'
				);
			} finally {
				setLoading(false);
			}
		},
		[defaultDiscount, defaultOutlet, request]
	);

	// Handle barcode scan
	const handleBarCodeScanned = useCallback(
		({ data }: { data: string }) => {
			if (scanned || !isActive) return;

			const value = data?.trim();
			if (!value) return;

			setScanned(true);
			setLastScannedCode(value);
			setManualCode(value);
			fetchProductData(value);
		},
		[fetchProductData, isActive, scanned]
	);

	const handleManualSearch = () => {
		const trimmed = manualCode.trim();
		if (!trimmed) {
			setErrorMessage('Masukkan kode produk terlebih dahulu.');
			return;
		}
		setLastScannedCode(trimmed);
		fetchProductData(trimmed);
	};

	const resetScannerState = () => {
		setScanned(false);
		setLastScannedCode(null);
		setProductPayload(null);
		setRawResponse(null);
		setErrorMessage(null);
		setIsActive(true);
	};

	const permissionContent = useMemo(() => {
		if (hasPermission === false) {
			return (
				<View style={styles.permissionState}>
					<Text style={styles.permissionText}>
						Izin kamera diperlukan untuk menggunakan scanner. Silakan aktifkan izin kamera.
					</Text>
					<Pressable
						style={styles.permissionButton}
						onPress={async () => {
							const { status } = await Camera.requestCameraPermissionsAsync();
							setHasPermission(status === 'granted');
						}}
					>
						<Text style={styles.permissionButtonText}>Berikan Izin</Text>
					</Pressable>
					<Pressable
						style={[styles.permissionButton, styles.permissionButtonSecondary]}
						onPress={() => Linking.openSettings()}
					>
						<Text style={[styles.permissionButtonText, styles.permissionButtonSecondaryText]}>
							Buka Pengaturan
						</Text>
					</Pressable>
				</View>
			);
		}

		if (hasPermission === null) {
			return (
				<View style={styles.permissionState}>
					<ActivityIndicator size="small" color="#007AFF" />
					<Text style={styles.permissionText}>Memuat kamera...</Text>
				</View>
			);
		}

		return null;
	}, [hasPermission]);

	const canUseScanner = hasPermission === true && isActive;

	return (
		<ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
			<SectionCard style={styles.section}>
				<View style={styles.sectionHeader}>
					<Text style={styles.sectionTitle}>Scanner Produk</Text>
					{defaultDiscount !== '0' && (
						<View style={styles.discountBadge}>
							<Text style={styles.discountBadgeLabel}>Diskon Aktif</Text>
							<Text style={styles.discountBadgeValue}>{defaultDiscount}%</Text>
						</View>
					)}
				</View>
				<Text style={styles.sectionSubtitle}>
					Arahkan barcode ke kamera atau masukkan kode secara manual.
				</Text>

				<View style={styles.scannerWrapper}>
					{canUseScanner ? (
						<CameraView
							style={styles.scanner}
							facing="back"
							onBarcodeScanned={scanned || !isActive ? undefined : handleBarCodeScanned}
						/>
					) : (
						<View style={styles.permissionFallback}>{permissionContent}</View>
					)}
				</View>

				<View style={styles.infoCard}>
					<Text style={styles.infoLabel}>Terakhir dipindai</Text>
					<Text style={styles.infoValue}>{lastScannedCode ?? 'Belum ada'}</Text>
				</View>

				<View style={styles.actionRow}>
					<AppButton
						variant="outline"
						title={scanned ? 'Scan Lagi' : 'Reset'}
						onPress={resetScannerState}
						style={{ flex: 1 }}
					/>
				</View>
			</SectionCard>

			<SectionCard style={styles.section}>
				<Text style={styles.sectionTitle}>Input Manual</Text>
				<View style={styles.fieldGroup}>
					<Text style={styles.label}>Kode / Barcode</Text>
					<TextInput
						value={manualCode}
						onChangeText={setManualCode}
						placeholder="Masukkan kode produk"
						style={styles.input}
						autoCapitalize="characters"
						autoCorrect={false}
						returnKeyType="search"
						onSubmitEditing={handleManualSearch}
					/>
				</View>
				<AppButton title="Cari Produk" onPress={handleManualSearch} />
			</SectionCard>

			<SectionCard style={styles.section}>
				<Text style={styles.sectionTitle}>Hasil</Text>
				{loading && (
					<View style={styles.feedbackRow}>
						<ActivityIndicator size="small" color="#007AFF" />
						<Text style={styles.feedbackText}>Memuat data produk...</Text>
					</View>
				)}
				{errorMessage && !loading && (
					<View style={[styles.feedbackRow, styles.feedbackError]}>
						<Text style={[styles.feedbackText, styles.feedbackErrorText]}>{errorMessage}</Text>
					</View>
				)}
				{productPayload && !loading && (
					<View style={styles.resultCard}>
						{Object.entries(productPayload).map(([key, value]) => (
							<View key={key} style={styles.resultRow}>
								<Text style={styles.resultLabel}>{key}</Text>
								<Text style={styles.resultValue}>
									{value === null || value === undefined
										? '-'
										: typeof value === 'object'
										? JSON.stringify(value)
										: String(value)}
								</Text>
							</View>
						))}
					</View>
				)}
				{rawResponse && !productPayload && !loading && !errorMessage && (
					<View style={styles.resultCard}>
						<Text style={styles.resultLabel}>Respon</Text>
						<Text style={styles.rawJson}>
							{JSON.stringify(rawResponse, null, 2)}
						</Text>
					</View>
				)}
				{!loading && !productPayload && !rawResponse && !errorMessage && (
					<Text style={styles.placeholderText}>
						Belum ada data produk. Scan barcode atau cari secara manual.
					</Text>
				)}
			</SectionCard>
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	container: {
		padding: 16,
		gap: 16,
		backgroundColor: '#f5f5f5',
	},
	section: {
		backgroundColor: '#fff',
		borderRadius: 12,
		padding: 16,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.05,
		shadowRadius: 6,
		elevation: 2,
		gap: 16,
	},
	sectionTitle: {
		fontSize: 18,
		fontWeight: '600',
		color: '#1f2933',
	},
	sectionSubtitle: {
		fontSize: 13,
		color: '#6b7280',
		lineHeight: 18,
	},
	sectionHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		gap: 12,
	},
	discountBadge: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 10,
		paddingVertical: 6,
		borderRadius: 999,
		backgroundColor: '#007AFF',
		marginTop: 4,
	},
	discountBadgeLabel: {
		fontSize: 12,
		fontWeight: '600',
		color: '#fff7ed',
		marginRight: 6,
		textTransform: 'uppercase',
		letterSpacing: 0.4,
	},
	discountBadgeValue: {
		fontSize: 14,
		fontWeight: '700',
		color: '#ffffff',
	},
	scannerWrapper: {
		width: '100%',
		aspectRatio: 1,
		borderRadius: 12,
		overflow: 'hidden',
		borderWidth: 1,
		borderColor: '#e5e7eb',
		backgroundColor: '#111827',
		alignItems: 'center',
		justifyContent: 'center',
	},
	scanner: {
		width: '100%',
		height: '100%',
	},
	permissionFallback: {
		width: '100%',
		height: '100%',
		alignItems: 'center',
		justifyContent: 'center',
		padding: 16,
	},
	permissionState: {
		alignItems: 'center',
		justifyContent: 'center',
		gap: 12,
		paddingHorizontal: 12,
	},
	permissionText: {
		fontSize: 14,
		color: '#1f2933',
		textAlign: 'center',
	},
	permissionButton: {
		paddingVertical: 10,
		paddingHorizontal: 18,
		backgroundColor: '#007AFF',
		borderRadius: 8,
	},
	permissionButtonText: {
		color: '#fff',
		fontSize: 14,
		fontWeight: '600',
	},
	permissionButtonSecondary: {
		backgroundColor: '#f3f4f6',
	},
	permissionButtonSecondaryText: {
		color: '#1f2933',
	},
	infoCard: {
		padding: 12,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: '#e5e7eb',
		backgroundColor: '#f9fafc',
	},
	infoLabel: {
		fontSize: 12,
		color: '#6b7280',
		marginBottom: 2,
	},
	infoValue: {
		fontSize: 15,
		fontWeight: '600',
		color: '#111827',
	},
	actionRow: {
		flexDirection: 'row',
		gap: 12,
		justifyContent: 'space-between',
	},
	button: {
		flex: 1,
		paddingVertical: 12,
		borderRadius: 10,
		alignItems: 'center',
		justifyContent: 'center',
	},
	buttonPrimary: {
		backgroundColor: '#007AFF',
	},
	buttonOutline: {
		borderWidth: 1,
		borderColor: '#d1d5db',
		backgroundColor: '#fff',
	},
	buttonText: {
		fontSize: 15,
		fontWeight: '600',
		color: '#fff',
	},
	buttonOutlineText: {
		color: '#1f2933',
	},
	fieldGroup: {
		gap: 8,
	},
	label: {
		fontSize: 14,
		fontWeight: '500',
		color: '#1f2933',
	},
	input: {
		borderWidth: 1,
		borderColor: '#d1d5db',
		borderRadius: 10,
		paddingHorizontal: 14,
		paddingVertical: Platform.select({ ios: 12, android: 10 }),
		fontSize: 15,
		backgroundColor: '#fff',
	},
	feedbackRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
	},
	feedbackText: {
		fontSize: 14,
		color: '#1f2933',
	},
	feedbackError: {
		backgroundColor: '#fee2e2',
		borderRadius: 10,
		padding: 12,
	},
	feedbackErrorText: {
		color: '#b91c1c',
	},
	resultCard: {
		borderWidth: 1,
		borderColor: '#e5e7eb',
		borderRadius: 12,
		padding: 16,
		gap: 12,
		backgroundColor: '#f9fafc',
	},
	resultRow: {
		gap: 4,
	},
	resultLabel: {
		fontSize: 12,
		letterSpacing: 0.3,
		textTransform: 'uppercase',
		color: '#6b7280',
	},
	resultValue: {
		fontSize: 15,
		color: '#111827',
		fontWeight: '500',
	},
	rawJson: {
		fontFamily: Platform.select({
			ios: 'Menlo',
			android: 'monospace',
			default: 'Courier',
		}),
		fontSize: 12,
		color: '#1f2933',
	},
	placeholderText: {
		fontSize: 14,
		color: '#6b7280',
	},
});
