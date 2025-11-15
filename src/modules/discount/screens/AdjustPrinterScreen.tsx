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

// Check if Bluetooth module is available
const isBluetoothAvailable = () => {
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

	// Test barcode data
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
		if (!isBluetoothAvailable()) return;
		try {
			if (typeof RNBluetoothClassic.getConnectedDevices === 'function') {
				const connectedList = await RNBluetoothClassic.getConnectedDevices();
				if (connectedList?.length) {
					const primary = connectedList[0];
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
		// Check if Bluetooth module is available
		const available = isBluetoothAvailable();
		setBluetoothAvailable(available);
		
		if (available) {
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
			return false;
		}
		
		try {
			const enabled = await RNBluetoothClassic.isBluetoothEnabled();
			setBluetoothEnabled(enabled);
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
			console.error('Error checking Bluetooth:', error);
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
				const granted = await RNBluetoothClassic.requestBluetoothEnabled();
				if (!granted) {
					Alert.alert(
						'Permission Required',
						'Bluetooth permission is required to scan for printers.'
					);
					return false;
				}
			}
			return true;
		} catch (error: any) {
			// eslint-disable-next-line no-console
			console.error('Permission error:', error);
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
			const enabled = await checkBluetoothEnabled();
			if (!enabled) return;
		}

		const hasPermission = await requestBluetoothPermission();
		if (!hasPermission) return;

		setIsScanning(true);

		try {
			// Get paired devices first
			const paired = await RNBluetoothClassic.getBondedDevices();
			let updatedDevices: PrinterDevice[] = paired.map(mapBluetoothDevice);

			// Merge with currently connected devices
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
					console.warn('Unable to merge connected devices', connectedError);
				}
			}

			if (connectedDevice) {
				updatedDevices = ensureDeviceInList(updatedDevices, mapBluetoothDevice(connectedDevice));
			}

			setDevices(updatedDevices);

			// Also try to discover devices (may require additional permissions)
			try {
				if (typeof RNBluetoothClassic.startDiscovery === 'function') {
					await Promise.race([
						RNBluetoothClassic.startDiscovery(),
						new Promise((resolve) => setTimeout(resolve, 5000)),
					]);
				}
			} catch (discoveryError) {
				// Discovery may fail, that's okay - we have paired devices
				// eslint-disable-next-line no-console
				console.log('Discovery not available, using paired devices only');
			}
		} catch (error: any) {
			// eslint-disable-next-line no-console
			console.error('Scan error:', error);
			Alert.alert('Error', `Failed to scan for devices: ${error.message || 'Unknown error'}`);
		} finally {
			try {
				if (typeof RNBluetoothClassic.cancelDiscovery === 'function') {
					await RNBluetoothClassic.cancelDiscovery();
				}
			} catch {
				// ignore
			}
			setIsScanning(false);
		}
	};

	const handleConnect = async (device: PrinterDevice) => {
		if (!device.device) {
			Alert.alert('Error', 'Device information is missing');
			return;
		}

		setConnectingDeviceId(device.id);
		setSelectedDeviceId(device.id);

		try {
			const connected = await device.device.connect();
			if (connected) {
				setConnectedDevice(device.device);
				setPrinterConfigured(true);
				Alert.alert('Success', `Connected to ${device.name}`);
			} else {
				Alert.alert('Error', 'Failed to connect to device');
				setSelectedDeviceId(connectedDevice ? connectedDevice.address : null);
			}
		} catch (error: any) {
			// eslint-disable-next-line no-console
			console.error('Connection error:', error);
			Alert.alert('Connection Failed', error.message || 'Failed to connect to printer');
			setSelectedDeviceId(connectedDevice ? connectedDevice.address : null);
		} finally {
			setConnectingDeviceId(null);
		}
	};

	const handleDisconnect = async () => {
		if (!connectedDevice) return;

		try {
			await connectedDevice.disconnect();
			setSelectedDeviceId(null);
			setConnectedDevice(null);
			Alert.alert('Disconnected', 'Printer disconnected successfully');
		} catch (error: any) {
			// eslint-disable-next-line no-console
			console.error('Disconnect error:', error);
			Alert.alert('Error', 'Failed to disconnect');
		}
	};

	const handlePrintTest = async (testNumber: number, barcode: typeof testBarcodes[0]) => {
		if (!connectedDevice) {
			Alert.alert('Not Connected', 'Please connect to a printer first');
			return;
		}

		try {
			// ESC/POS commands for thermal printer
			let printData = '';

			// Initialize printer
			printData += '\x1B\x40'; // ESC @ - Initialize

			// Set alignment center
			printData += '\x1B\x61\x01'; // ESC a 1 - Center align

			// Barcode (Code128)
			printData += `\x1D\x6B\x04${barcode.code}\x00`; // GS k 4 - Code128

			// Line feed
			printData += '\x0A';

			// Barcode code text
			printData += `${barcode.code}\n`;

			// Price section
			printData += 'Harga: ';
			// Normal price (strikethrough - ESC/POS doesn't support strikethrough directly, so we'll use underline)
			printData += '\x1B\x2D\x01'; // ESC - 1 - Underline on
			printData += `Rp. ${barcode.normalPrice.toLocaleString('id-ID')}`;
			printData += '\x1B\x2D\x00'; // ESC - 0 - Underline off
			printData += ' ';
			// Discount price
			printData += `Rp. ${barcode.discountPrice.toLocaleString('id-ID')}\n`;

			// Line feeds
			printData += '\x0A\x0A';

			// Auto cut if enabled
			if (autoCut) {
				printData += '\x1D\x56\x00'; // GS V 0 - Full cut
			}

			// Send to printer
			await connectedDevice.write(printData);

			Alert.alert('Success', `Test Print ${testNumber} sent to printer`);
		} catch (error: any) {
			// eslint-disable-next-line no-console
			console.error('Print error:', error);
			Alert.alert('Print Failed', error.message || 'Failed to send print job');
		}
	};

	return (
		<ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
			{/* Settings Section */}
			<SectionCard style={styles.section}>
				<Text style={styles.sectionTitle}>Settings</Text>
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

			{/* Device Section */}
			<SectionCard style={styles.section}>
				<Text style={styles.sectionTitle}>Device</Text>
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
						<Text style={styles.warningText}>Bluetooth is disabled. Please enable it in settings.</Text>
					</View>
				)}

				{devices.length === 0 && !isScanning && bluetoothEnabled && (
					<View style={styles.emptyDevices}>
						<Text style={styles.emptyDevicesText}>No devices found</Text>
						<Text style={styles.emptyDevicesSubtext}>Tap Refresh to scan for printers</Text>
					</View>
				)}

				{devices.map((device) => (
					<View key={device.id} style={styles.deviceItem}>
						<View style={styles.deviceInfo}>
							<Text style={styles.deviceName}>{device.name}</Text>
							<Text style={styles.deviceAddress}>{device.address}</Text>
							{selectedDeviceId === device.id && connectedDevice && (
								<Text style={styles.connectedLabel}>Connected</Text>
							)}
						</View>
						{selectedDeviceId === device.id && connectedDevice ? (
							<Pressable
								style={[styles.button, styles.disconnectButton]}
								onPress={handleDisconnect}
							>
								<Text style={[styles.buttonText, styles.buttonTextWhite]}>Disconnect</Text>
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
									<Text style={[styles.buttonText, styles.buttonTextWhite]}>Connect</Text>
								)}
							</Pressable>
						)}
					</View>
				))}
			</SectionCard>

				{/* Test Print Section - extracted component */}
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
