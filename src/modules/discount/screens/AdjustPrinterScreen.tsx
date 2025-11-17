import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import {
	ActivityIndicator,
	Alert,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	View,
	Platform,
	Dimensions,
	PermissionsAndroid,
} from 'react-native';
import RNBluetoothClassic, {
	BluetoothDevice,
} from 'react-native-bluetooth-classic';
import { useDiscount } from '../state/DiscountContext';
import { SectionCard } from '../../../ui/components/SectionCard';
import { AppButton } from '../../../ui/components/AppButton';
import { TestPrintSection } from '../components/TestPrintSection';

type PrinterDevice = {
	id: string;
	name: string;
	address: string;
	device?: BluetoothDevice;
};

// Cek apakah modul Bluetooth tersedia (hanya Android)
const isBluetoothAvailable = () => {
	if (Platform.OS !== 'android') return false;
	return RNBluetoothClassic && typeof RNBluetoothClassic.isBluetoothEnabled === 'function';
};

const mapBluetoothDevice = (device: BluetoothDevice): PrinterDevice => ({
	id: device.address,
	name: device.name || 'Unknown Device',
	address: device.address,
	device,
});

const ensureDeviceInList = (list: PrinterDevice[], device: PrinterDevice) => {
	return list.some((item) => item.id === device.id) ? list : [...list, device];
};

export function AdjustPrinter() {
	const { setPrinterConfigured } = useDiscount();
	const [autoCut, setAutoCut] = useState(false);
	const [tanggalCetak, setTanggalCetak] = useState(false);
	const [printer8mm, setPrinter8mm] = useState(false);
	const [devices, setDevices] = useState<PrinterDevice[]>([]);
	const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
	const [connectingDeviceId, setConnectingDeviceId] = useState<string | null>(null);
	const [isScanning, setIsScanning] = useState(false);
	const [bluetoothEnabled, setBluetoothEnabled] = useState(false);
	const [connectedDevice, setConnectedDevice] = useState<BluetoothDevice | null>(null);
	const [bluetoothAvailable, setBluetoothAvailable] = useState(false);
	const [cardWidth, setCardWidth] = useState(() => Math.min(220, Dimensions.get('window').width - 72));

	// Data barcode untuk uji coba cetak
	const testBarcodes = [
		{ code: '1234567890123', normalPrice: 13000, discountPrice: 5000 },
		{ code: '9876543210987', normalPrice: 13000, discountPrice: 5000 },
		{ code: '5555555555555', normalPrice: 13000, discountPrice: 5000 },
	];

	useEffect(() => {
		const handleDimensionChange = ({ window }: { window: { width: number } }) => {
			setCardWidth(Math.min(220, window.width - 72));
		};
		const subscription = Dimensions.addEventListener('change', handleDimensionChange);
		return () => {
			if (subscription && typeof subscription.remove === 'function') {
				subscription.remove();
			}
		};
	}, []);

	const initializeConnectedDevice = useCallback(async () => {
		if (!isBluetoothAvailable()) {
			// eslint-disable-next-line no-console
			console.log('[Printer] Modul Bluetooth tidak tersedia saat inisialisasi perangkat terhubung');
			return;
		}
		try {
			if (typeof RNBluetoothClassic.getConnectedDevices === 'function') {
				// eslint-disable-next-line no-console
				console.log('[Printer] Mengambil daftar perangkat yang sudah terhubung dari native');
				const connectedList = await RNBluetoothClassic.getConnectedDevices();
				if (connectedList?.length) {
					const primary = connectedList[0];
					// eslint-disable-next-line no-console
					console.log('[Printer] Perangkat utama yang sudah terhubung ditemukan', {
						name: primary.name,
						address: primary.address,
					});
					setConnectedDevice(primary);
					setSelectedDeviceId(primary.address);
					setDevices((prev) => ensureDeviceInList(prev, mapBluetoothDevice(primary)));
					setPrinterConfigured(true);
				}
			}
		} catch (error) {
			// eslint-disable-next-line no-console
			console.warn('Unable to fetch connected devices', error);
		}
	}, []);

	useEffect(() => {
		// Pada iOS, layar ini hanya bersifat tampilan saja; Bluetooth hanya untuk Android
		if (Platform.OS !== 'android') {
			setBluetoothAvailable(false);
			setBluetoothEnabled(false);
			return;
		}

		// Cek apakah modul Bluetooth tersedia ketika layar dibuka (Android)
		const available = isBluetoothAvailable();
		setBluetoothAvailable(available);
		// eslint-disable-next-line no-console
		console.log('[Printer] Status ketersediaan modul Bluetooth', { available });
		// eslint-disable-next-line no-console
		console.log('[Printer] Ringkasan awal saat membuka layar AdjustPrinter', {
			platform: Platform.OS,
			moduleAvailable: available,
			bluetoothEnabledInitial: bluetoothEnabled,
			connectedDeviceInitial: connectedDevice
				? {
					name: connectedDevice.name,
					address: connectedDevice.address,
				}
				: null,
		});
		
		if (available) {
			// eslint-disable-next-line no-console
			console.log('[Printer] Modul Bluetooth tersedia, cek status bluetooth dan perangkat terhubung awal');
			checkBluetoothEnabled();
			initializeConnectedDevice();
		} else {
			// eslint-disable-next-line no-console
			console.warn('Bluetooth module not available. Please rebuild native app.');
		}
		// We intentionally keep printer connected when leaving the screen
	}, [initializeConnectedDevice]);

	const checkBluetoothEnabled = async () => {
		if (!isBluetoothAvailable()) {
			setBluetoothEnabled(false);
			// eslint-disable-next-line no-console
			console.log('[Printer] Cek Bluetooth dibatalkan karena modul tidak tersedia');
			return false;
		}
		
		try {
			const enabled = await RNBluetoothClassic.isBluetoothEnabled();
			setBluetoothEnabled(enabled);
			// eslint-disable-next-line no-console
			console.log('[Printer] Status Bluetooth dari native', { enabled });
			if (!enabled) {
				Alert.alert(
					'Bluetooth Disabled',
					'Please enable Bluetooth in settings to scan for printers.',
					[{ text: 'OK' }]
				);
			}
			return enabled;
		} catch (error: any) {
			// eslint-disable-next-line no-console
			console.error('[Printer] Error saat mengecek status Bluetooth:', error);
			setBluetoothEnabled(false);
			Alert.alert('Error', 'Failed to check Bluetooth status. Please rebuild native app.');
			return false;
		}
	};

	const requestBluetoothPermission = async (): Promise<boolean> => {
		if (!isBluetoothAvailable()) {
			Alert.alert(
				'Bluetooth Not Available',
				'Bluetooth module is not available. Please rebuild the native app:\n\nnpm run android\nor\nnpm run ios'
			);
			return false;
		}
		
		try {
			if (Platform.OS === 'android') {
				// Memastikan Bluetooth aktif (permintaan spesifik dari library)
				const enabled = await RNBluetoothClassic.requestBluetoothEnabled();
				if (!enabled) {
					Alert.alert(
						'Permission Required',
						'Bluetooth must be enabled to scan for printers.',
					);
					return false;
				}

				// Meminta izin runtime berdasarkan versi Android
				const permissionsToRequest: string[] = [];

				if (Platform.Version >= 31) {
					// Android 12+ menggunakan izin Bluetooth "nearby" yang baru
					permissionsToRequest.push(
						'android.permission.BLUETOOTH_SCAN',
						'android.permission.BLUETOOTH_CONNECT',
					);
				} else {
					permissionsToRequest.push(
						'android.permission.BLUETOOTH',
						'android.permission.BLUETOOTH_ADMIN',
					);
				}

				// Izin lokasi sering dibutuhkan untuk proses pencarian perangkat di banyak tipe perangkat
				permissionsToRequest.push('android.permission.ACCESS_FINE_LOCATION');

				// eslint-disable-next-line no-console
				console.log('[Printer] Meminta izin Bluetooth dan lokasi', { permissionsToRequest });
				const granted = await PermissionsAndroid.requestMultiple(
					permissionsToRequest as any,
				);
				// eslint-disable-next-line no-console
				console.log('[Printer] Hasil izin Bluetooth dan lokasi', { granted });
				const allGranted = Object.values(granted).every(
					(status) => status === PermissionsAndroid.RESULTS.GRANTED,
				);

				if (!allGranted) {
					Alert.alert(
						'Permission Required',
						'Bluetooth and location permissions are required to scan for printers.',
					);
					return false;
				}
			}
			return true;
		} catch (error: any) {
			// eslint-disable-next-line no-console
			console.error('[Printer] Error saat meminta izin Bluetooth:', error);
			Alert.alert('Error', 'Failed to request Bluetooth permission');
			return false;
		}
	};

	const handleRefresh = async () => {
		if (!isBluetoothAvailable()) {
			Alert.alert(
				'Bluetooth Not Available',
				'Bluetooth module is not available. Please rebuild the native app:\n\nnpm run android\nor\nnpm run ios'
			);
			return;
		}

		if (!bluetoothEnabled) {
			// eslint-disable-next-line no-console
			console.log('[Printer] Bluetooth belum aktif, mencoba cek dan meminta user mengaktifkan');
			const enabled = await checkBluetoothEnabled();
			if (!enabled) return;
		}

		// eslint-disable-next-line no-console
		console.log('[Printer] Memulai proses refresh perangkat Bluetooth');
		const hasPermission = await requestBluetoothPermission();
		if (!hasPermission) return;

		setIsScanning(true);
		// eslint-disable-next-line no-console
		console.log('[Printer] Mulai proses pemindaian perangkat (paired, connected, discovery)');

		let updatedDevices: PrinterDevice[] = [];

		try {
			// Mengambil perangkat yang sudah dipasangkan (paired/bonded) terlebih dahulu
			const paired = await RNBluetoothClassic.getBondedDevices();
			// Debug: log perangkat yang sudah dipasangkan dari sisi native
			// eslint-disable-next-line no-console
			console.log(
				'[Printer] Perangkat yang sudah dipasangkan (bonded devices):',
				paired.map((d) => ({ name: d.name, address: d.address })),
			);
			updatedDevices = paired.map(mapBluetoothDevice);

			// Menggabungkan dengan perangkat yang sedang terhubung saat ini
			if (typeof RNBluetoothClassic.getConnectedDevices === 'function') {
				try {
					const connectedList = await RNBluetoothClassic.getConnectedDevices();
					connectedList.forEach((device) => {
						const mapped = mapBluetoothDevice(device);
						updatedDevices = ensureDeviceInList(updatedDevices, mapped);
						if (!connectedDevice) {
							setConnectedDevice(device);
							setSelectedDeviceId(device.address);
						}
					});
				} catch (connectedError) {
					// eslint-disable-next-line no-console
					console.warn('[Printer] Gagal menggabungkan perangkat yang sedang terhubung', connectedError);
				}
			}

			if (connectedDevice) {
				updatedDevices = ensureDeviceInList(updatedDevices, mapBluetoothDevice(connectedDevice));
			}

			// Juga mencoba menemukan perangkat di sekitar (discovery), mungkin membutuhkan izin tambahan
			try {
				if (typeof RNBluetoothClassic.startDiscovery === 'function') {
					const discoveryResult: any = await Promise.race([
						RNBluetoothClassic.startDiscovery(),
						new Promise((resolve) => setTimeout(resolve, 5000)),
					]);

					// Jika discovery mengembalikan perangkat, gabungkan juga ke daftar
					if (Array.isArray(discoveryResult)) {
						(discoveryResult as BluetoothDevice[]).forEach((device) => {
							updatedDevices = ensureDeviceInList(updatedDevices, mapBluetoothDevice(device));
						});
					}
				}
			} catch (discoveryError) {
				// Proses discovery bisa gagal, log error sebenarnya untuk debugging
				// eslint-disable-next-line no-console
				console.error('[Printer] Error saat melakukan discovery Bluetooth:', discoveryError);
				// eslint-disable-next-line no-console
				console.log('[Printer] Discovery tidak tersedia, hanya menggunakan perangkat yang sudah dipasangkan');
			}

			// Terakhir, perbarui daftar perangkat dengan semua data yang sudah dikumpulkan
			// eslint-disable-next-line no-console
			console.log(
				'[Printer] Daftar perangkat printer setelah pemindaian:',
				updatedDevices.map((d) => ({ name: d.name, address: d.address })),
			);
			setDevices(updatedDevices);
		} catch (error: any) {
			// eslint-disable-next-line no-console
			console.error('[Printer] Error saat melakukan pemindaian perangkat:', error);
			Alert.alert('Error', `Failed to scan for devices: ${error.message || 'Unknown error'}`);
		} finally {
			try {
				if (typeof RNBluetoothClassic.cancelDiscovery === 'function') {
					await RNBluetoothClassic.cancelDiscovery();
					// eslint-disable-next-line no-console
					console.log('[Printer] Discovery dibatalkan (cancelDiscovery dipanggil)');
				}
			} catch {
				// abaikan error cancel discovery
			}
			setIsScanning(false);
			// eslint-disable-next-line no-console
			console.log('[Printer] Pemindaian perangkat selesai');
		}
	};

	const handleConnect = async (device: PrinterDevice) => {
		if (!device.device) {
			Alert.alert('Error', 'Device information is missing');
			return;
		}

		setConnectingDeviceId(device.id);
		setSelectedDeviceId(device.id);
		// eslint-disable-next-line no-console
		console.log('[Printer] Memulai proses koneksi ke perangkat', {
			id: device.id,
			name: device.name,
			address: device.address,
		});

		try {
			// Cek terlebih dahulu apakah perangkat sudah terhubung
			let isAlreadyConnected = false;
			try {
				if (typeof device.device.isConnected === 'function') {
					isAlreadyConnected = await device.device.isConnected();
				}
			} catch {
				// abaikan error saat cek status koneksi dan lanjutkan mencoba koneksi baru
			}

			let connected = isAlreadyConnected;
			if (!connected) {
				// Gunakan opsi koneksi eksplisit untuk kompatibilitas yang lebih baik dengan printer thermal
				const connectionOptions: any = {
					CONNECTOR_TYPE: 'rfcomm',
					CONNECTION_TYPE: 'delimited',
					SECURE_SOCKET: false,
					DELIMITER: '\n',
					DEVICE_CHARSET: Platform.OS === 'ios' ? 1536 : 'utf-8',
				};
				// eslint-disable-next-line no-console
				console.log('[Printer] Mencoba menghubungkan ke perangkat dengan opsi', connectionOptions);

				if (typeof device.device.connect === 'function') {
					connected = await device.device.connect(connectionOptions);
				} else {
					connected = false;
				}
			}

			if (connected) {
				setConnectedDevice(device.device);
				setPrinterConfigured(true);
				Alert.alert('Success', `Connected to ${device.name}`);
				// eslint-disable-next-line no-console
				console.log('[Printer] Berhasil terhubung ke perangkat', {
					id: device.id,
					name: device.name,
					address: device.address,
				});
			} else {
				Alert.alert('Error', 'Failed to connect to device');
				setSelectedDeviceId(connectedDevice ? connectedDevice.address : null);
			}
		} catch (error: any) {
			// eslint-disable-next-line no-console
			console.error('[Printer] Error saat mencoba menghubungkan ke perangkat:', error);
			Alert.alert('Connection Failed', error.message || 'Failed to connect to printer');
			setSelectedDeviceId(connectedDevice ? connectedDevice.address : null);
		} finally {
			setConnectingDeviceId(null);
			// eslint-disable-next-line no-console
			console.log('[Printer] Proses koneksi ke perangkat selesai');
		}
	};

	const handleDisconnect = async () => {
		if (!connectedDevice) return;

		try {
			await connectedDevice.disconnect();
			setSelectedDeviceId(null);
			setConnectedDevice(null);
			Alert.alert('Disconnected', 'Printer disconnected successfully');
			// eslint-disable-next-line no-console
			console.log('[Printer] Berhasil memutus koneksi dari perangkat');
		} catch (error: any) {
			// eslint-disable-next-line no-console
			console.error('[Printer] Error saat memutus koneksi dari perangkat:', error);
			Alert.alert('Error', 'Failed to disconnect');
		}
	};

	const handlePrintTest = async (testNumber: number, barcode: typeof testBarcodes[0]) => {
		if (!connectedDevice) {
			Alert.alert('Not Connected', 'Please connect to a printer first');
			return;
		}

		try {
			// Perintah ESC/POS untuk printer thermal
			let printData = '';

			// Inisialisasi printer
			printData += '\x1B\x40'; // ESC @ - Initialize

			// Mengatur perataan teks ke tengah
			printData += '\x1B\x61\x01'; // ESC a 1 - Center align

			// Mencetak barcode (Code128)
			printData += `\x1D\x6B\x04${barcode.code}\x00`; // GS k 4 - Code128

			// Baris baru setelah barcode
			printData += '\x0A';

			// Teks kode barcode
			printData += `${barcode.code}\n`;

			// Bagian harga
			printData += 'Harga: ';
			// Harga normal (strikethrough - ESC/POS tidak mendukung coret tengah secara langsung, jadi menggunakan underline)
			printData += '\x1B\x2D\x01'; // ESC - 1 - Underline on
			printData += `Rp. ${barcode.normalPrice.toLocaleString('id-ID')}`;
			printData += '\x1B\x2D\x00'; // ESC - 0 - Underline off
			printData += ' ';
			// Harga diskon
			printData += `Rp. ${barcode.discountPrice.toLocaleString('id-ID')}\n`;

			// Beberapa baris baru di akhir
			printData += '\x0A\x0A';

			// Auto cut jika opsi auto cut aktif
			if (autoCut) {
				printData += '\x1D\x56\x00'; // GS V 0 - Full cut
			}

			// Kirim data ke printer
			await connectedDevice.write(printData);

			Alert.alert('Success', `Test Print ${testNumber} sent to printer`);
			// eslint-disable-next-line no-console
			console.log('[Printer] Data uji cetak berhasil dikirim ke printer', {
				testNumber,
				barcode,
			});
		} catch (error: any) {
			// eslint-disable-next-line no-console
			console.error('[Printer] Error saat mengirim data uji cetak ke printer:', error);
			Alert.alert('Print Failed', error.message || 'Failed to send print job');
		}
	};

	return (
		<ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
			{/* Bagian pengaturan umum printer */}
			<SectionCard style={styles.section}>
				<Text style={styles.sectionTitle}>Pengaturan</Text>
				<View style={styles.checkboxContainer}>
					<Pressable
						style={styles.checkbox}
						onPress={() => setAutoCut(!autoCut)}
					>
						<View style={[styles.checkboxBox, autoCut && styles.checkboxBoxChecked]}>
							{autoCut && <Text style={styles.checkboxCheck}>✓</Text>}
						</View>
						<Text style={styles.checkboxLabel}>Auto Cut</Text>
					</Pressable>
					<Pressable
						style={styles.checkbox}
						onPress={() => setTanggalCetak(!tanggalCetak)}
					>
						<View style={[styles.checkboxBox, tanggalCetak && styles.checkboxBoxChecked]}>
							{tanggalCetak && <Text style={styles.checkboxCheck}>✓</Text>}
						</View>
						<Text style={styles.checkboxLabel}>Tanggal Cetak</Text>
					</Pressable>
					<Pressable
						style={styles.checkbox}
						onPress={() => setPrinter8mm(!printer8mm)}
					>
						<View style={[styles.checkboxBox, printer8mm && styles.checkboxBoxChecked]}>
							{printer8mm && <Text style={styles.checkboxCheck}>✓</Text>}
						</View>
						<Text style={styles.checkboxLabel}>Printer 8mm</Text>
					</Pressable>
				</View>
			</SectionCard>

			{/* Bagian daftar perangkat Bluetooth */}
			<SectionCard style={styles.section}>
				<Text style={styles.sectionTitle}>Perangkat</Text>
				<View style={styles.deviceHeader}>
					<Text style={styles.deviceSubtitle}>Printer yang ter-deteksi menggunakan Bluetooth</Text>
					<Pressable
						style={[styles.button, styles.refreshButton]}
						onPress={handleRefresh}
						disabled={isScanning || !bluetoothAvailable}
					>
						{isScanning ? (
							<ActivityIndicator size="small" color="#007AFF" />
						) : (
							<Text style={styles.buttonText}>Refresh</Text>
						)}
					</Pressable>
				</View>

				{!bluetoothAvailable && (
					<View style={styles.errorBox}>
						<Text style={styles.errorText}>
							Bluetooth module not available.{'\n'}
							Please rebuild native app:{'\n'}
							npm run android (or npm run ios)
						</Text>
					</View>
				)}
				{bluetoothAvailable && !bluetoothEnabled && (
					<View style={styles.warningBox}>
						<Text style={styles.warningText}>Bluetooth tidak aktif. Silakan aktifkan di pengaturan.</Text>
					</View>
				)}

				{devices.length === 0 && !isScanning && bluetoothEnabled && (
					<View style={styles.emptyDevices}>
						<Text style={styles.emptyDevicesText}>Tidak ada perangkat ditemukan</Text>
						<Text style={styles.emptyDevicesSubtext}>Tap Refresh untuk memindai printer</Text>
					</View>
				)}
				{devices.map((device) => (
					<View key={device.id} style={styles.deviceItem}>
						<View style={styles.deviceInfo}>
							<Text style={styles.deviceName}>{device.name}</Text>
							<Text style={styles.deviceAddress}>{device.address}</Text>
							{selectedDeviceId === device.id && connectedDevice && (
								<Text style={styles.connectedLabel}>Terhubung</Text>
							)}
						</View>
						{selectedDeviceId === device.id && connectedDevice ? (
							<Pressable
								style={[styles.button, styles.disconnectButton]}
								onPress={handleDisconnect}
							>
								<Text style={[styles.buttonText, styles.buttonTextWhite]}>Putuskan</Text>
							</Pressable>
						) : (
							<Pressable
								style={[
									styles.button,
									styles.connectButton,
								]}
								onPress={() => handleConnect(device)}
								disabled={!!connectingDeviceId || !bluetoothAvailable}
							>
								{connectingDeviceId === device.id ? (
									<ActivityIndicator size="small" color="white" />
								) : (
									<Text style={[styles.buttonText, styles.buttonTextWhite]}>Hubungkan</Text>
								)}
							</Pressable>
						)}
					</View>
				))}
			</SectionCard>

			{/* Bagian uji cetak barcode */}
			<TestPrintSection
				barcodes={testBarcodes}
				cardWidth={cardWidth}
				canPrint={!!connectedDevice}
				onPrintTest={handlePrintTest}
			/>
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#f5f5f5',
	},
	contentContainer: {
		padding: 16,
	},
	section: {
		backgroundColor: 'white',
		borderRadius: 12,
		padding: 16,
		marginBottom: 16,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
		elevation: 2,
	},
	sectionTitle: {
		fontSize: 18,
		fontWeight: '600',
		color: '#333',
		marginBottom: 16,
	},
	checkboxContainer: {
		gap: 12,
	},
	checkbox: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	checkboxBox: {
		width: 24,
		height: 24,
		borderWidth: 2,
		borderColor: '#007AFF',
		borderRadius: 4,
		marginRight: 12,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: 'white',
	},
	checkboxBoxChecked: {
		backgroundColor: '#007AFF',
	},
	checkboxCheck: {
		color: 'white',
		fontSize: 16,
		fontWeight: 'bold',
	},
	checkboxLabel: {
		fontSize: 16,
		color: '#333',
	},
	deviceHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 12,
	},
	deviceSubtitle: {
		fontSize: 14,
		color: '#666',
		flex: 1,
		marginRight: 12,
	},
	statusRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 4,
	},
	statusLabel: {
		fontSize: 12,
		color: '#666',
	},
	statusValue: {
		fontSize: 12,
		color: '#111',
		fontWeight: '500',
	},
	button: {
		paddingVertical: 10,
		paddingHorizontal: 16,
		borderRadius: 8,
		justifyContent: 'center',
		alignItems: 'center',
		minWidth: 80,
	},
	refreshButton: {
		backgroundColor: '#f0f0f0',
		borderWidth: 1,
		borderColor: '#ddd',
	},
	buttonText: {
		fontSize: 14,
		fontWeight: '500',
		color: '#007AFF',
	},
	buttonTextWhite: {
		color: 'white',
	},
	warningBox: {
		backgroundColor: '#FFF3CD',
		borderColor: '#FFC107',
		borderWidth: 1,
		borderRadius: 8,
		padding: 12,
		marginBottom: 12,
	},
	warningText: {
		fontSize: 14,
		color: '#856404',
	},
	errorBox: {
		backgroundColor: '#F8D7DA',
		borderColor: '#DC3545',
		borderWidth: 1,
		borderRadius: 8,
		padding: 12,
		marginBottom: 12,
	},
	errorText: {
		fontSize: 14,
		color: '#721C24',
		textAlign: 'center',
	},
	emptyDevices: {
		padding: 20,
		alignItems: 'center',
	},
	emptyDevicesText: {
		fontSize: 16,
		color: '#666',
		marginBottom: 4,
	},
	emptyDevicesSubtext: {
		fontSize: 14,
		color: '#999',
	},
	deviceItem: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingVertical: 12,
		paddingHorizontal: 12,
		backgroundColor: '#f9f9f9',
		borderRadius: 8,
		marginBottom: 8,
	},
	deviceInfo: {
		flex: 1,
		marginRight: 12,
	},
	deviceName: {
		fontSize: 16,
		fontWeight: '500',
		color: '#333',
		marginBottom: 4,
	},
	deviceAddress: {
		fontSize: 12,
		color: '#666',
	},
	connectedLabel: {
		fontSize: 12,
		color: '#34C759',
		marginTop: 4,
		fontWeight: '500',
	},
	connectButton: {
		backgroundColor: '#007AFF',
	},
	disconnectButton: {
		backgroundColor: '#FF3B30',
	},
	testPrintScroll: {
		flexDirection: 'row',
	},
	testPrintCard: {
		backgroundColor: '#f9f9f9',
		borderRadius: 8,
		padding: 12,
		marginRight: 12,
		borderWidth: 1,
		borderColor: '#e0e0e0',
		minHeight: 220,
	},
	barcodePlaceholder: {
		height: 70,
		backgroundColor: 'white',
		borderRadius: 6,
		borderWidth: 1,
		borderColor: '#ddd',
		justifyContent: 'center',
		alignItems: 'center',
		borderStyle: 'dashed',
	},
	barcodeCode: {
		fontSize: 10,
		color: '#999',
		fontFamily: 'monospace',
	},
	barcodeCodeText: {
		fontSize: 14,
		fontFamily: 'monospace',
		color: '#333',
		textAlign: 'center',
		marginBottom: 8,
		fontWeight: '500',
	},
	priceContainer: {
		marginBottom: 12,
	},
	priceLabel: {
		fontSize: 12,
		color: '#666',
		marginBottom: 6,
	},
	priceRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		flexWrap: 'wrap',
	},
	priceNormal: {
		fontSize: 13,
		color: '#999',
		textDecorationLine: 'line-through',
	},
	priceDiscount: {
		fontSize: 15,
		fontWeight: '600',
		color: '#34C759',
	},
	printButton: {
		backgroundColor: '#007AFF',
		width: '100%',
		marginTop: 'auto',
	},
});
