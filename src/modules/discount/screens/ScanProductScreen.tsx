import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
	ActivityIndicator,
	Linking,
	Modal,
	Platform,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	Vibration,
	View,
} from 'react-native';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import { Camera, CameraView } from 'expo-camera';
import { useApiClient } from '../../../api/client';
import { useAuth } from '../../../auth/AuthContext';
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
	const { username, uuid, defaultOutlet: authOutlet } = useAuth();
	const [hasPermission, setHasPermission] = useState<boolean | null>(null);

	const [scanned, setScanned] = useState(false);
	const [manualCode, setManualCode] = useState('');
	const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
	const [productPayload, setProductPayload] = useState<Record<string, unknown> | null>(null);
	const [rawResponse, setRawResponse] = useState<any>(null);
	const [loading, setLoading] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [isActive, setIsActive] = useState(true);
	const [isSuccessModalVisible, setIsSuccessModalVisible] = useState(false);

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
			setIsActive(false);
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
								scannedByUsername: username || undefined,
								scannedByUuid: uuid || undefined,
							});
							console.log('SCAN LOG', {
								code: trimmed,
								outlet: defaultOutlet,
								discount: normalizedDiscount,
								scannedAt: new Date().toISOString(),
								scannedByUsername: username,
								scannedByUuid: uuid,
							});
							Vibration.vibrate(40);
							setIsSuccessModalVisible(true);
						}
					}
				}
			} catch (error) {
				setErrorMessage(
					error instanceof Error ? error.message : 'Terjadi kesalahan saat memuat data.'
				);
			} finally {
				setLoading(false);
				// Setelah satu proses scan selesai (berhasil atau gagal), izinkan scan berikutnya
				setScanned(false);
				setIsActive(true);
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

	const productSummary = useMemo(() => {
		if (!productPayload && !lastScannedCode) return null;
		const data: any = productPayload || {};

		// Nama produk yang ditampilkan di modal ringkasan
		const name =
			data.name_product || data.descript || data.name || 'Produk tanpa nama';
		// Kode internal / kode lama yang menjadi basis barcode baru
		const internalOrLama =
			data.internal || data.code_barcode_lama || data.mixcode || data.code_scan || lastScannedCode;
		// code_barcode_lama dari payload jika ada, fallback ke internal/kode yang discan
		const barcodeLama = data.code_barcode_lama || internalOrLama || lastScannedCode;
		const barcodeLamaFromPayload = data.code_barcode_lama || null;
		const barcodeBaruFromPayload = data.code_barcode_baru || null;
		// Sumber nilai diskon dari payload, jika tidak ada pakai defaultDiscount yang dikirim dari DiscountScreen
		const discountSource =
			data.discount != null
				? Number(data.discount)
				: defaultDiscount != null
				? Number(defaultDiscount)
				: null;
		const discountSuffix =
			discountSource != null && Number.isFinite(discountSource)
				? String(Math.trunc(discountSource))
				: null;

		// Ikuti pola barcode baru: A{barcode_lama}{diskon}, contoh A0021777010250
		// Angka diskon tidak memakai nol di depan jika satu digit (5 -> "5", bukan "05")
		let barcodeBaru: string | null = null;
		if (barcodeBaruFromPayload) {
			barcodeBaru = barcodeBaruFromPayload;
		} else if (barcodeLamaFromPayload && discountSuffix != null) {
			barcodeBaru = `A${barcodeLamaFromPayload}${discountSuffix}`;
		} else if (barcodeLama && discountSuffix != null) {
			barcodeBaru = `A${barcodeLama}${discountSuffix}`;
		}

		const hargaAwalRaw =
			data.harga_awal ?? data.retail_price ?? data.rrtlprc ?? data.harga ?? null;
		const hargaDiskonRaw = data.harga_discount ?? data.harga_diskon ?? null;
		const discountPercentRaw = data.discount ?? null;
		const hargaAwal = hargaAwalRaw != null ? Number(hargaAwalRaw) : null;
		const hargaDiskon = hargaDiskonRaw != null ? Number(hargaDiskonRaw) : null;

		let discountPercent: number | null = null;
		if (typeof discountPercentRaw === 'number') {
			discountPercent = discountPercentRaw;
		} else if (hargaAwal && hargaDiskon) {
			const diff = hargaAwal - hargaDiskon;
			if (diff > 0) {
				discountPercent = Math.round((diff / hargaAwal) * 100);
			}
		}

		return {
			name,
			code: barcodeBaru || internalOrLama,
			hargaAwal,
			hargaDiskon,
			discountPercent,
		};
	}, [lastScannedCode, productPayload]);

	const canUseScanner = hasPermission === true && isActive;

	return (
		<ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
			<SectionCard style={styles.section}>
				<View style={styles.sectionHeader}>
					<Text style={styles.sectionTitle}>Scanner Produk</Text>
					<View style={styles.headerBadgeRow}>
						<View style={styles.discountBadge}>
							<Text style={styles.discountBadgeLabel}>Diskon Aktif</Text>
							<Text style={styles.discountBadgeValue}>{defaultDiscount}%</Text>
						</View>
					</View>
				</View>
				<Text style={styles.sectionSubtitle}>
					Arahkan barcode ke kamera atau masukkan kode secara manual.
				</Text>

				<View style={styles.scannerWrapper}>
					{canUseScanner ? (
						<CameraView
							style={styles.scanner}
							facing="back"
							onBarcodeScanned={!isActive ? undefined : handleBarCodeScanned}
						/>
					) : (
						<View style={styles.permissionFallback}>{permissionContent}</View>
					)}
				</View>
				{loading && (
					<View style={styles.scannerLoadingRow}>
						<ActivityIndicator size="small" color="#007AFF" />
						<Text style={styles.scannerLoadingText}>Mengatur diskon...</Text>
					</View>
				)}

				<View style={styles.actionRow}>
					<AppButton
						variant="outline"
						title="Reset"
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

			<Modal
				visible={isSuccessModalVisible}
				transparent
				animationType="fade"
				onRequestClose={() => setIsSuccessModalVisible(false)}
			>
				<View style={styles.modalBackdrop}>
					<View style={styles.modalContent}>
						<Text style={styles.modalTitle}>Produk berhasil discan</Text>
						{productSummary ? (
							<View style={styles.modalBody}>
								<Text style={styles.modalProductName} numberOfLines={2}>
									{productSummary.name}
								</Text>
								{productSummary.code && (
									<Text style={styles.modalProductCode}>
										Kode: {productSummary.code}
									</Text>
								)}
								{productSummary.hargaAwal != null && (
									<Text style={styles.modalPriceLine}>
										Harga awal: Rp{' '}
										{productSummary.hargaAwal.toLocaleString('id-ID')}
									</Text>
								)}
								{productSummary.hargaDiskon != null && (
									<Text style={styles.modalPriceLine}>
										Harga diskon: Rp{' '}
										{productSummary.hargaDiskon.toLocaleString('id-ID')}
									</Text>
								)}
								{productSummary.discountPercent != null && (
									<Text style={styles.modalDiscountLine}>
										Diskon: {productSummary.discountPercent}%
									</Text>
								)}
							</View>
						) : (
							<Text style={styles.modalMessage}>
								Produk berhasil discan dan diskon sudah disetting.
							</Text>
						)}
						<View style={styles.modalActions}>
							<TouchableOpacity
									style={styles.modalButton}
									onPress={() => {
										setIsSuccessModalVisible(false);
									}}
								>
									<Text style={styles.modalButtonText}>OK</Text>
								</TouchableOpacity>
						</View>
					</View>
				</View>
			</Modal>
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	container: {
		paddingHorizontal: 16,
		paddingTop: 16,
		paddingBottom: 64,
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
	headerBadgeRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
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
	outletBadge: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 10,
		paddingVertical: 6,
		borderRadius: 999,
		backgroundColor: '#111827',
		marginTop: 4,
	},
	outletBadgeLabel: {
		fontSize: 12,
		fontWeight: '600',
		color: '#e5e7eb',
		marginRight: 6,
		textTransform: 'uppercase',
		letterSpacing: 0.4,
	},
	outletBadgeValue: {
		fontSize: 14,
		fontWeight: '700',
		color: '#f9fafb',
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
	scannerLoadingRow: {
		marginTop: 8,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	scannerLoadingText: {
		fontSize: 13,
		color: '#4b5563',
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
	modalBackdrop: {
		flex: 1,
		backgroundColor: 'rgba(0,0,0,0.4)',
		justifyContent: 'center',
		alignItems: 'center',
		padding: 24,
	},
	modalContent: {
		backgroundColor: '#fff',
		borderRadius: 16,
		padding: 20,
		width: '100%',
		maxWidth: 360,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.15,
		shadowRadius: 12,
		elevation: 4,
		gap: 12,
	},
	modalTitle: {
		fontSize: 18,
		fontWeight: '700',
		color: '#111827',
		textAlign: 'center',
	},
	modalBody: {
		marginTop: 4,
		gap: 4,
	},
	modalMessage: {
		fontSize: 14,
		color: '#4b5563',
		textAlign: 'center',
	},
	modalProductName: {
		fontSize: 16,
		fontWeight: '700',
		color: '#111827',
		textAlign: 'center',
	},
	modalProductCode: {
		fontSize: 13,
		color: '#4b5563',
		textAlign: 'center',
	},
	modalPriceLine: {
		fontSize: 13,
		color: '#111827',
		textAlign: 'center',
	},
	modalDiscountLine: {
		fontSize: 13,
		color: '#16a34a',
		fontWeight: '600',
		textAlign: 'center',
	},
	modalActions: {
		marginTop: 12,
		flexDirection: 'row',
		justifyContent: 'center',
	},
	modalButton: {
		paddingHorizontal: 24,
		paddingVertical: 10,
		borderRadius: 999,
		backgroundColor: '#007AFF',
	},
	modalButtonText: {
		color: '#fff',
		fontSize: 15,
		fontWeight: '600',
	},
});
