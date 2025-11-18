import React, { useState } from 'react';
import {
	Modal,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	View,
	Alert,
	Platform,
	KeyboardAvoidingView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDiscount } from '../state/DiscountContext';
import { useAuth } from '../../../auth/AuthContext';
import { SectionCard } from '../../../ui/components/SectionCard';
import { AppButton } from '../../../ui/components/AppButton';
import { LastScannedSummary } from '../components/LastScannedSummary';

export function Discount() {
	const navigation = useNavigation<any>();
	const {
		lastScan,
		scans,
		printerConfigured,
		discountConfigured,
		setDiscountConfigured,
		removeScan,
	} = useDiscount();
	const { username, uuid } = useAuth();
	const [menuVisible, setMenuVisible] = useState(false);
	const [adjustModalVisible, setAdjustModalVisible] = useState(false);
	const [activeDiscountPercent, setActiveDiscountPercent] = useState('0');
	const [activeDescription, setActiveDescription] = useState('');
	const [draftDiscountPercent, setDraftDiscountPercent] = useState(activeDiscountPercent);
	const [draftDescription, setDraftDescription] = useState(activeDescription);

	// Normalisasi input diskon: hanya angka, buang leading zero (contoh: "010" -> "10")
	const handleDiscountPercentChange = (value: string) => {
		const numericOnly = value.replace(/[^0-9]/g, '');
		if (numericOnly.length === 0) {
			setDraftDiscountPercent('');
			return;
		}

		const normalized = numericOnly.replace(/^0+/, '');
		setDraftDiscountPercent(normalized || '');
	};

	// Konfirmasi hapus satu data scan
	const handleDeleteScan = (scannedAt: string) => {
		Alert.alert(
			'Hapus data',
			'Apakah Anda yakin ingin menghapus data scan ini?',
			[
				{ text: 'Batal', style: 'cancel' },
				{
					text: 'Hapus',
					style: 'destructive',
					onPress: () => removeScan(scannedAt),
				},
			]
		);
	};

	// Cetak satu hasil scan sebagai label diskon lewat printer Bluetooth
	const handlePrintScan = async (scan: any) => {
		if (Platform.OS !== 'android') {
			Alert.alert('Belum didukung', 'Cetak label saat ini hanya didukung di Android.');
			return;
		}

		try {
			const { default: RNBluetoothClassic } = await import('react-native-bluetooth-classic');
			const devices = await RNBluetoothClassic.getConnectedDevices();
			if (!devices || !devices.length) {
				Alert.alert('Printer belum terhubung', 'Silakan hubungkan printer terlebih dahulu di menu Adjust Printer.');
				return;
			}

			const device = devices[0];
			const data: any = scan.payload || {};
			const name =
				data.name_product || data.descript || data.name || 'Produk tanpa nama';
			const internal =
				data.internal || data.code_barcode_lama || data.mixcode || data.code_scan || scan.code;
			const barcodeLama = data.code_barcode_lama || internal || scan.code;
			const discountSource =
				data.discount != null
					? Number(data.discount)
					: scan.discount != null
						? Number(scan.discount)
						: null;
			const discountPercent =
				discountSource != null && Number.isFinite(discountSource)
					? Math.trunc(discountSource)
					: null;
			const discountSuffix =
				discountPercent != null ? String(discountPercent) : null;
			const barcodeBaru =
				data.code_barcode_baru ||
				(barcodeLama && discountSuffix != null
					? `A${barcodeLama}${discountSuffix}`
					: scan.code);
			const hargaAwalRaw =
				data.harga_awal ?? data.retail_price ?? data.rrtlprc ?? data.harga ?? null;
			const hargaDiskonRaw =
				data.harga_discount ?? data.harga_diskon ?? null;
			const hargaAwal = hargaAwalRaw != null ? Number(hargaAwalRaw) : null;
			const hargaDiskon = hargaDiskonRaw != null ? Number(hargaDiskonRaw) : null;
			const qty = data.qty != null ? Number(data.qty) : 1;
			const uom = data.uomsales || 'PCS';

			let printData = '';
			printData += '\x1B\x40'; // Initialize
			printData += '\x1B\x61\x01'; // Center

			if (discountPercent != null) {
				// Besarkan teks HEMAT XX%
				printData += '\x1B\x21\x30';
				printData += `HEMAT ${discountPercent}%\n`;
				printData += '\x1B\x21\x00';
			}

			printData += `${name}\n`;
			printData += `Qty: ${qty} ${uom}\n`;

			if (barcodeBaru) {
				// Barcode Code128: gunakan fungsi 73 (0x49) dengan panjang eksplisit
				const barcodeContent = String(barcodeBaru);
				const barcodeLengthChar = String.fromCharCode(barcodeContent.length);
				// Sedikit perbesar ukuran barcode (tinggi dan ketebalan garis)
				printData += '\x1D\x68\x50'; // GS h 80 dot tinggi
				printData += '\x1D\x77\x03'; // GS w 3 module width
				printData += '\x1D\x6B\x49';
				printData += barcodeLengthChar + barcodeContent;
				printData += '\n';
				// Tampilkan kode barcode sebagai teks di bawah gambar barcode
				printData += `${barcodeContent}\n`;
			}
			// Baris harga langsung mengikuti kode barcode (tanpa extra blank line berlebih)

			// Harga dengan label jelas tanpa garis coret: "Harga Normal" dan "Harga Promo"
			printData += '\x1B\x61\x01'; // Center align
			if (hargaAwal != null && hargaDiskon != null) {
				printData += `Harga Normal: Rp ${hargaAwal.toLocaleString('id-ID')}\n`;
				printData += `Harga Promo : Rp ${hargaDiskon.toLocaleString('id-ID')}\n`;
			} else if (hargaAwal != null) {
				// Fallback jika hanya harga awal yang tersedia
				printData += `Harga Normal: Rp ${hargaAwal.toLocaleString('id-ID')}\n`;
			} else if (hargaDiskon != null) {
				// Fallback jika hanya harga diskon yang tersedia
				printData += `Harga Promo: Rp ${hargaDiskon.toLocaleString('id-ID')}\n`;
			}

			printData += '\x0A\x0A';
			await device.write(printData);
			Alert.alert('Berhasil', 'Data cetak dikirim ke printer.');
		} catch (error: any) {
			Alert.alert('Gagal cetak', error?.message || 'Terjadi kesalahan saat mengirim data ke printer.');
		}
	};

	// Cetak semua hasil scan secara berurutan
	const handlePrintAll = async () => {
		if (!scans || !scans.length) {
			Alert.alert('Tidak ada data', 'Belum ada produk yang discan untuk dicetak.');
			return;
		}

		if (Platform.OS !== 'android') {
			Alert.alert('Belum didukung', 'Cetak label saat ini hanya didukung di Android.');
			return;
		}

		try {
			for (const scan of scans) {
				// Cetak setiap scan secara berurutan untuk menjaga jarak dan urutan rapi
				// eslint-disable-next-line no-await-in-loop
				await handlePrintScan(scan);
			}
		} catch (error: any) {
			Alert.alert('Gagal cetak', error?.message || 'Terjadi kesalahan saat mencetak semua label.');
		}
	};

	// Toggle buka/tutup menu floating (FAB +)
	const toggleMenu = () => {
		setMenuVisible((prev) => !prev);
	};

	// Aksi saat user pilih item menu di FAB
	const handleMenuAction = (action: string) => {
		setMenuVisible(false);
		if (action === 'adjust-printer') {
			if (Platform.OS === 'ios') {
				Alert.alert(
					'Belum didukung di iOS',
					'Pengaturan printer Bluetooth saat ini hanya tersedia di perangkat Android.'
				);
				return;
			}
			navigation.navigate('AdjustPrinter');
		} else if (action === 'adjust-discount') {
			if (!printerConfigured) {
				Alert.alert('Printer belum diatur', 'Silakan atur printer terlebih dahulu sebelum mengatur diskon.');
				return;
			}
			setDraftDiscountPercent('');
			setDraftDescription('');
			setAdjustModalVisible(true);
		} else if (action === 'scan-product') {
			if (!printerConfigured) {
				Alert.alert('Printer belum diatur', 'Silakan atur printer terlebih dahulu sebelum scan produk.');
				return;
			}
			if (!discountConfigured) {
				Alert.alert('Diskon belum diatur', 'Silakan atur diskon terlebih dahulu sebelum scan produk.');
				return;
			}
			navigation.navigate('ScanProduct', {
				defaultDiscountPercent: activeDiscountPercent,
			});
		}
	};

	// Item menu utama untuk layar ini
	const menuItems = [
		{ id: 'adjust-printer', label: 'Adjust Printer' },
		{ id: 'adjust-discount', label: 'Adjust Discount' },
		{ id: 'scan-product', label: 'Scan Product' },
	];

	const hasScans = scans && scans.length > 0;

	return (
		<View style={styles.container}>
			<ScrollView
				style={styles.scroll}
				contentContainerStyle={styles.emptyState}
				keyboardShouldPersistTaps="handled"
			>
				{/* State awal ketika belum ada produk yang discan */}
				{!hasScans && (
					<SectionCard style={styles.summaryCard}>
						<Text style={styles.emptyStateTitle}>Discount Index</Text>
						<Text style={styles.emptyStateSubtitle}>
							Kelola printer, diskon, dan pemindaian produk dari logo ( + ) di bawah.
						</Text>
					</SectionCard>
				)}
				{/* Daftar hasil scan, paling baru di atas */}
				{hasScans &&
						scans.map((scan, index) => (
						<SectionCard
							key={`${scan.scannedAt}-${index}`}
							style={[
								styles.summaryCard,
								index > 0 ? { marginTop: 16 } : null,
							]}
						>
							<LastScannedSummary
								lastScan={scan}
								onPrint={() => handlePrintScan(scan)}
								onDelete={() => handleDeleteScan(scan.scannedAt)}
							/>
						</SectionCard>
						))}
				{/* Tombol Print All muncul kalau lebih dari satu scan */}
				{hasScans && scans.length > 1 && (
					<View style={styles.printAllContainer}>
						<AppButton
							variant="primary"
							title="Print All"
							onPress={handlePrintAll}
						/>
					</View>
				)}
			</ScrollView>

			{/* Menu popover dari FAB (Adjust Printer / Discount / Scan Product) */}
			{menuVisible && (
				<View style={styles.menuContainer}>
					{menuItems.map((item, index) => (
						<Pressable
							key={item.id}
							style={[
								styles.menuItem,
								index < menuItems.length - 1 && styles.menuItemBorder,
							]}
							onPress={() => handleMenuAction(item.id)}
						>
							<Text style={styles.menuText}>{item.label}</Text>
						</Pressable>
					))}
				</View>
			)}

			{/* FAB utama di kanan bawah untuk membuka menu */}
			<Pressable style={styles.fab} onPress={toggleMenu}>
				<Text
					style={[styles.fabIcon, menuVisible && styles.fabIconClose]}
				>
					{menuVisible ? '✕' : '+'}
				</Text>
			</Pressable>

			{/* Modal pengaturan diskon global (persentase + keterangan) */}
			<Modal
				visible={adjustModalVisible}
				transparent
				animationType="fade"
				onRequestClose={() => setAdjustModalVisible(false)}
			>
				<View style={styles.modalBackdrop}>
					<KeyboardAvoidingView
						style={styles.keyboardAvoiding}
						behavior={Platform.select({ ios: 'padding', android: 'padding' })}
					>
						<View style={styles.modalContent}>
							<Text style={styles.modalTitle}>Diskon / Harga Spesial (%)</Text>
							<TextInput
								value={draftDiscountPercent}
								onChangeText={handleDiscountPercentChange}
								keyboardType="numeric"
								placeholder="Contoh: 10"
								style={styles.modalInput}
								maxLength={6}
								returnKeyType="done"
							/>
							<Text style={styles.modalLabel}>Keterangan</Text>
							<TextInput
								value={draftDescription}
								onChangeText={setDraftDescription}
								placeholder="Tuliskan catatan promo"
								style={[styles.modalInput, styles.modalTextarea]}
								multiline
								numberOfLines={3}
								textAlignVertical="top"
							/>
							<View style={styles.modalActions}>
								<AppButton
									variant="outline"
									title="Batal"
									onPress={() => setAdjustModalVisible(false)}
									style={styles.modalButton}
									textStyle={styles.modalButtonSecondaryText}
								/>
								<AppButton
									variant="primary"
									title="Simpan"
									onPress={() => {
										const percentRaw = draftDiscountPercent.trim();
										const descriptionRaw = draftDescription.trim();

										if (!percentRaw) {
											Alert.alert('Diskon wajib diisi', 'Silakan isi persentase diskon.');
											return;
										}

										if (/^0\d+/.test(percentRaw)) {
											Alert.alert('Diskon tidak valid', 'Persentase diskon tidak boleh diawali angka 0.');
											return;
										}

										const percentNumber = Number(percentRaw);
										if (!Number.isFinite(percentNumber) || percentNumber < 0) {
											Alert.alert('Diskon tidak valid', 'Isi persentase diskon dengan angka yang benar.');
											return;
										}

										if (!descriptionRaw) {
											Alert.alert('Keterangan wajib diisi', 'Silakan isi keterangan diskon.');
											return;
										}

										setActiveDiscountPercent(percentRaw);
										setActiveDescription(descriptionRaw);
										setDiscountConfigured(true);
										console.log('DISCOUNT CONFIG LOG', {
											percent: percentRaw,
											description: descriptionRaw,
											configuredAt: new Date().toISOString(),
											configuredByUsername: username,
											configuredByUuid: uuid,
										});
										setAdjustModalVisible(false);
									}}
									style={styles.modalButton}
								/>
							</View>
						</View>
					</KeyboardAvoidingView>
				</View>
			</Modal>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#f5f5f5',
	},
	scroll: {
		flex: 1,
	},
	emptyState: {
		alignItems: 'stretch',
		justifyContent: 'flex-start',
		paddingHorizontal: 16,
		paddingTop: 16,
		paddingBottom: 48,
	},
	emptyStateTitle: {
		fontSize: 20,
		fontWeight: '600',
		color: '#1f2933',
		marginBottom: 8,
		textAlign: 'center',
	},
	emptyStateSubtitle: {
		fontSize: 14,
		color: '#6b7280',
		textAlign: 'center',
		lineHeight: 20,
		marginBottom: 20,
	},
	summaryCard: {
		alignItems: 'stretch',
		justifyContent: 'center',
		backgroundColor: '#ffffff',
		paddingVertical: 20,
		paddingHorizontal: 24,
		borderRadius: 12,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.08,
		shadowRadius: 4,
		elevation: 3,
		width: '100%',
	},
	menuContainer: {
		position: 'absolute',
		bottom: 90,
		right: 20,
		backgroundColor: '#fff',
		borderRadius: 10,
		minWidth: 170,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
		elevation: 4,
		overflow: 'hidden',
	},
	menuItem: {
		paddingVertical: 14,
		paddingHorizontal: 18,
	},
	menuItemBorder: {
		borderBottomWidth: 1,
		borderBottomColor: '#f1f1f1',
	},
	menuText: {
		fontSize: 15,
		color: '#1f2933',
	},
	summaryLabel: {
		fontSize: 13,
		color: '#6b7280',
		marginBottom: 4,
	},
	summaryValue: {
		fontSize: 24,
		fontWeight: '700',
		color: '#111827',
	},
	summaryDescription: {
		marginTop: 8,
		fontSize: 13,
		color: '#374151',
		textAlign: 'center',
	},
	summaryPlaceholder: {
		marginTop: 8,
		fontSize: 12,
		color: '#9ca3af',
		fontStyle: 'italic',
	},
	fab: {
		position: 'absolute',
		bottom: 20,
		right: 20,
		width: 56,
		height: 56,
		borderRadius: 28,
		backgroundColor: '#007AFF',
		alignItems: 'center',
		justifyContent: 'center',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 3 },
		shadowOpacity: 0.25,
		shadowRadius: 5,
		elevation: 5,
	},
	fabIcon: {
		color: '#fff',
		fontSize: 24,
		fontWeight: '300',
	},
	fabIconClose: {
		fontSize: 20,
	},
	modalBackdrop: {
		flex: 1,
		backgroundColor: 'rgba(0,0,0,0.35)',
		justifyContent: 'center',
		alignItems: 'center',
		paddingHorizontal: 24,
	},
	keyboardAvoiding: {
		flex: 1,
		width: '100%',
		justifyContent: 'center',
		alignItems: 'center',
	},
	modalContent: {
		width: '100%',
		maxWidth: 360,
		backgroundColor: '#fff',
		borderRadius: 12,
		padding: 24,
	},
	modalTitle: {
		fontSize: 18,
		fontWeight: '600',
		color: '#111827',
		marginBottom: 16,
	},
	modalInput: {
		borderWidth: 1,
		borderColor: '#d1d5db',
		borderRadius: 10,
		paddingHorizontal: 14,
		paddingVertical: 12,
		fontSize: 16,
		marginBottom: 16,
	},
	modalLabel: {
		fontSize: 14,
		fontWeight: '500',
		color: '#1f2937',
		marginBottom: 8,
	},
	modalTextarea: {
		height: 96,
		marginBottom: 24,
	},
	modalActions: {
		flexDirection: 'row',
		justifyContent: 'flex-end',
		gap: 12,
	},
	modalButton: {
		paddingVertical: 10,
		paddingHorizontal: 18,
		borderRadius: 8,
	},
	modalButtonSecondary: {
		backgroundColor: '#f3f4f6',
	},
	modalButtonSecondaryText: {
		fontSize: 15,
		color: '#1f2937',
		fontWeight: '500',
	},
	printAllContainer: {
		marginTop: 16,
		marginBottom: 24,
		paddingHorizontal: 16,
	},
});
