import React, { useState } from 'react';
import {
	Modal,
	Pressable,
	StyleSheet,
	Text,
	TextInput,
	View,
	Alert,
	Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDiscount } from '../state/DiscountContext';
import { SectionCard } from '../../../ui/components/SectionCard';
import { AppButton } from '../../../ui/components/AppButton';
import { LastScannedSummary } from '../components/LastScannedSummary';

export function Discount() {
	const navigation = useNavigation<any>();
	const {
		lastScan,
		printerConfigured,
		discountConfigured,
		setDiscountConfigured,
	} = useDiscount();
	const [menuVisible, setMenuVisible] = useState(false);
	const [adjustModalVisible, setAdjustModalVisible] = useState(false);
	const [activeDiscountPercent, setActiveDiscountPercent] = useState('10');
	const [activeDescription, setActiveDescription] = useState('');
	const [draftDiscountPercent, setDraftDiscountPercent] = useState(activeDiscountPercent);
	const [draftDescription, setDraftDescription] = useState(activeDescription);

	const toggleMenu = () => {
		setMenuVisible((prev) => !prev);
	};

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
			setDraftDiscountPercent(activeDiscountPercent);
			setDraftDescription(activeDescription);
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

	const menuItems = [
		{ id: 'adjust-printer', label: 'Adjust Printer' },
		{ id: 'adjust-discount', label: 'Adjust Discount' },
		{ id: 'scan-product', label: 'Scan Product' },
	];

	return (
		<View style={styles.container}>
			<View style={styles.emptyState}>
				<SectionCard style={styles.summaryCard}>
					{!lastScan && (
						<>
							<Text style={styles.emptyStateTitle}>Discount Index</Text>
							<Text style={styles.emptyStateSubtitle}>
								Kelola printer, diskon, dan pemindaian produk dari logo ( + ) di bawah.
							</Text>
						</>
					)}
					{lastScan && <LastScannedSummary lastScan={lastScan} />}
				</SectionCard>
			</View>

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

			<Pressable style={styles.fab} onPress={toggleMenu}>
				<Text
					style={[styles.fabIcon, menuVisible && styles.fabIconClose]}
				>
					{menuVisible ? '✕' : '+'}
				</Text>
			</Pressable>

			<Modal
				visible={adjustModalVisible}
				transparent
				animationType="fade"
				onRequestClose={() => setAdjustModalVisible(false)}
			>
				<View style={styles.modalBackdrop}>
					<View style={styles.modalContent}>
						<Text style={styles.modalTitle}>Diskon / Harga Spesial (%)</Text>
						<TextInput
							value={draftDiscountPercent}
							onChangeText={setDraftDiscountPercent}
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
							placeholder="Tuliskan catatan promo (opsional)"
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
									setActiveDiscountPercent(
										draftDiscountPercent.trim() === ''
											? '0'
											: draftDiscountPercent.trim()
									);
									setActiveDescription(draftDescription.trim());
									setDiscountConfigured(true);
									setAdjustModalVisible(false);
								}}
								style={styles.modalButton}
							/>
						</View>
					</View>
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
	emptyState: {
		flex: 1,
		alignItems: 'stretch',
		justifyContent: 'flex-start',
		paddingHorizontal: 16,
		paddingTop: 16,
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
	modalButtonPrimary: {
		backgroundColor: '#007AFF',
	},
	modalButtonPrimaryText: {
		fontSize: 15,
		color: '#fff',
		fontWeight: '600',
	},
});
