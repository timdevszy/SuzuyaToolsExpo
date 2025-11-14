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
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
import { useScanBarcodes, BarcodeFormat } from 'vision-camera-code-scanner';
import { useApiClient } from '../../api/client';

const API_BASE_URL = 'http://szytoolsapi.suzuyagroup.com:8181';

type RouteParams = {
	defaultDiscountPercent?: string;
	defaultOutlet?: string;
};

export function ScanProduct() {
	const route = useRoute();
	const params = route.params as RouteParams | undefined;
	const { hasPermission, requestPermission } = useCameraPermission();
	const device = useCameraDevice('back');

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

	// Configure barcode scanner
	const [frameProcessor, barcodes] = useScanBarcodes(
		[
			BarcodeFormat.CODE_128,
			BarcodeFormat.EAN_13,
			BarcodeFormat.EAN_8,
			BarcodeFormat.QR_CODE,
			BarcodeFormat.UPC_A,
			BarcodeFormat.UPC_E,
			BarcodeFormat.CODE_39,
		],
		{
			checkInverted: true,
		}
	);

	useEffect(() => {
		if (!hasPermission) {
			requestPermission();
		}
	}, [hasPermission, requestPermission]);

	useFocusEffect(
		useCallback(() => {
			setScanned(false);
			setIsActive(true);
			return () => {
				setIsActive(false);
			};
		}, [])
	);

	// Handle barcode scan
	useEffect(() => {
		if (barcodes && barcodes.length > 0 && !scanned && isActive) {
			const barcode = barcodes[0];
			if (barcode?.rawValue) {
				setScanned(true);
				setLastScannedCode(barcode.rawValue);
				setManualCode(barcode.rawValue);
				fetchProductData(barcode.rawValue);
			}
		}
	}, [barcodes, scanned, isActive]);

	const fetchProductData = useCallback(
		async (code: string) => {
			const trimmed = code.trim();
			if (!trimmed) return;

			setLoading(true);
			setErrorMessage(null);
			setProductPayload(null);
			setRawResponse(null);

			try {
				const payload = {
					code: trimmed,
					outlet: defaultOutlet,
					discount: defaultDiscount,
				};
				const response = await request(`${API_BASE_URL}/scanproduct`, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify(payload),
				});
				const data = await response.json();
				if (!response.ok) {
					setErrorMessage(
						data?.msg ||
							data?.message ||
							`Gagal mengambil data produk (status ${response.status}).`
					);
				} else {
					const normalized =
						data?.data && typeof data.data === 'object' ? data.data : data;
					setProductPayload(
						normalized && typeof normalized === 'object' && !Array.isArray(normalized)
							? normalized
							: null
					);
					setRawResponse(data);
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
		if (!hasPermission) {
			return (
				<View style={styles.permissionState}>
					<Text style={styles.permissionText}>
						Izin kamera diperlukan untuk menggunakan scanner. Silakan aktifkan izin kamera.
					</Text>
					<Pressable style={styles.permissionButton} onPress={requestPermission}>
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

		if (!device) {
			return (
				<View style={styles.permissionState}>
					<ActivityIndicator size="small" color="#007AFF" />
					<Text style={styles.permissionText}>Memuat kamera...</Text>
				</View>
			);
		}

		return null;
	}, [hasPermission, device, requestPermission]);

	const canUseScanner = hasPermission && device && isActive;

	return (
		<ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
			<View style={styles.section}>
				<Text style={styles.sectionTitle}>Scanner Produk</Text>
				<Text style={styles.sectionSubtitle}>
					Arahkan barcode ke kamera atau masukkan kode secara manual.
				</Text>

				<View style={styles.scannerWrapper}>
					{canUseScanner ? (
						<Camera
							style={styles.scanner}
							device={device}
							isActive={isActive && !scanned}
							frameProcessor={frameProcessor}
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
					<Pressable style={[styles.button, styles.buttonOutline]} onPress={resetScannerState}>
						<Text style={[styles.buttonText, styles.buttonOutlineText]}>
							{scanned ? 'Scan Lagi' : 'Reset'}
						</Text>
					</Pressable>
				</View>
			</View>

			<View style={styles.section}>
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
				<Pressable style={[styles.button, styles.buttonPrimary]} onPress={handleManualSearch}>
					<Text style={styles.buttonText}>Cari Produk</Text>
				</Pressable>
			</View>

			<View style={styles.section}>
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
			</View>
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
