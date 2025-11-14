import * as React from 'react';
import { useCallback, useEffect, useState } from 'react';
import {
	ActivityIndicator,
	Alert,
	Button,
	FlatList,
	KeyboardAvoidingView,
	Modal,
	Platform,
	Pressable,
	StyleSheet,
	Text,
	TextInput,
	View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../auth/AuthContext';
import { getDeviceId } from '../../utils/deviceId';

// Simple random string generator that works in React Native without crypto
function generateRandomId(): string {
	const chars = '0123456789abcdef';
	let result = '';
	for (let i = 0; i < 64; i++) {
		result += chars[Math.floor(Math.random() * chars.length)];
	}
	return result;
}

type Props = {
	navigation: any;
};

type OutletOption = {
	value: string;
	name: string;
};

function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit = {}, ms = 15000) {
	const controller = new AbortController();
	const id = setTimeout(() => controller.abort(), ms);
	return fetch(input, { ...init, signal: controller.signal }).finally(() => clearTimeout(id));
}

export function Register(_: Props) {
	const navigation = useNavigation<any>();
	const { setToken } = useAuth();

	const [username, setUsername] = useState('');
	const [password, setPassword] = useState('');
	const [passwordConfirmation, setPasswordConfirmation] = useState('');
	const [jabatan, setJabatan] = useState('');
	const [divisi, setDivisi] = useState('');
	const [brandsCsv, setBrandsCsv] = useState(''); // comma-separated -> array
	const [outletValue, setOutletValue] = useState(''); // e.g., "2010"
	const [outletName, setOutletName] = useState(''); // e.g., "SUZUYA - Swalayan ..."
	const [outletModalVisible, setOutletModalVisible] = useState(false);
	const [outletOptions, setOutletOptions] = useState<OutletOption[]>([]);
	const [outletLoading, setOutletLoading] = useState(false);
	const [outletSearch, setOutletSearch] = useState('');
	const [loading, setLoading] = useState(false);
	const [computedDeviceId, setComputedDeviceId] = useState<string>('');

	useEffect(() => {
		let mounted = true;
		(async () => {
			try {
				const id = await getDeviceId();
				if (mounted) setComputedDeviceId(id);
			} catch {
				// ignore
			}
		})();
		return () => {
			mounted = false;
		};
	}, []);

	const filteredOutlets = React.useMemo(() => {
		if (!outletSearch.trim()) return outletOptions;
		const keyword = outletSearch.trim().toLowerCase();
		return outletOptions.filter(
			(item) =>
				item.name.toLowerCase().includes(keyword) ||
				item.value.toLowerCase().includes(keyword)
		);
	}, [outletOptions, outletSearch]);

	const openOutletPicker = useCallback(async () => {
		setOutletModalVisible(true);
		if (outletOptions.length > 0 || outletLoading) {
			return;
		}
		setOutletLoading(true);
		try {
			// eslint-disable-next-line no-console
			console.log('Fetching outlet list...');
			const res = await fetchWithTimeout('http://szytoolsapi.suzuyagroup.com:8181/outlet', {}, 12000);
			const text = await res.text();
			let data: any = null;
			try {
				data = text ? JSON.parse(text) : null;
			} catch {
				// ignore
			}
			const source = Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];
			const mapped: OutletOption[] = source
				.map((item: any) => ({
					value: String(item.value ?? item.id ?? item.code ?? '').trim(),
					name: String(item.name ?? item.outlet_name ?? item.label ?? '').trim(),
				}))
				.filter((item: OutletOption) => item.value && item.name);
			setOutletOptions(mapped);
		} catch (e: any) {
			// eslint-disable-next-line no-console
			console.log('Outlet fetch error:', e);
			Alert.alert('Gagal memuat outlet', e?.message || 'Coba lagi nanti.');
		} finally {
			setOutletLoading(false);
		}
	}, [outletOptions.length, outletLoading]);

	const handleSelectOutlet = useCallback((option: OutletOption) => {
		setOutletValue(option.value);
		setOutletName(option.name);
		setOutletModalVisible(false);
	}, []);

	const onRegister = useCallback(async () => {
		// Entry log for debugging
		// eslint-disable-next-line no-console
		console.log('Register pressed');
		if (!username || !password || !passwordConfirmation || !jabatan) {
			Alert.alert('Validation', 'Username, password, confirmation, and jabatan are required');
			return;
		}
		if (password !== passwordConfirmation) {
			Alert.alert('Validation', 'Password and confirmation do not match');
			return;
		}
		if (!outletValue || !outletName) {
			Alert.alert('Validation', 'Outlet harus dipilih');
			return;
		}
		// Always compute a fresh device id to ensure presence
		let deviceIdToUse = computedDeviceId;
		try {
			// eslint-disable-next-line no-console
			console.log('Computing device id...');
			deviceIdToUse = await getDeviceId();
			// eslint-disable-next-line no-console
			console.log('Device id resolved:', deviceIdToUse);
			if (deviceIdToUse && deviceIdToUse !== computedDeviceId) {
				setComputedDeviceId(deviceIdToUse);
			}
		} catch (err) {
			// eslint-disable-next-line no-console
			console.log('Device id retrieval failed:', err);
		}
		if (!deviceIdToUse) {
			const fallbackId = generateRandomId();
			// eslint-disable-next-line no-console
			console.log('Using fallback device id:', fallbackId);
			deviceIdToUse = fallbackId;
			setComputedDeviceId(fallbackId);
		}
		const brands = brandsCsv
			.split(',')
			.map((s) => s.trim())
			.filter(Boolean);

		// Build payload - ensure all required fields are included
		const payload: any = {
			username: username.trim(),
			password: password.trim(),
			password_confirmation: passwordConfirmation.trim(),
			jabatan: jabatan.trim() || 'Staff',
			device_id: deviceIdToUse,
			outlet_choice: [{ value: outletValue.trim(), name: outletName.trim() }],
		};
		// Always include divisi and brands (even if empty array for brands)
		payload.divisi = divisi.trim() || '';
		payload.brands = brands.length > 0 ? brands : [];

		// eslint-disable-next-line no-console
		console.log('Register request payload:', {
			username,
			jabatan: payload.jabatan,
			hasDeviceId: !!payload.device_id,
			brandsCount: payload.brands.length,
			divisi: payload.divisi,
			outletChoice: `${outletValue} - ${outletName}`,
		});

		const payloadString = JSON.stringify(payload);
		// eslint-disable-next-line no-console
		console.log('Register payload JSON string:', payloadString);

		setLoading(true);
		try {
			// eslint-disable-next-line no-console
			console.log('Sending register request...');
			// Send as JSON (matching Postman raw JSON format)
			const response = await fetchWithTimeout('https://ssam.suzuyagroup.com/api/register/ssa', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Accept: 'application/json',
				},
				body: payloadString,
			}, 15000);
			// eslint-disable-next-line no-console
			console.log('Register response received.');
			const text = await response.text();
			let data: any = null;
			try {
				data = text ? JSON.parse(text) : null;
			} catch {
				// ignore non-JSON
			}
			// eslint-disable-next-line no-console
			console.log('Register response status:', response.status);
			// eslint-disable-next-line no-console
			console.log('Register response body:', data ?? text);

			if (response.ok) {
				const token = data?.results?.[0]?.token ?? null;
				if (token) {
					setToken(token);
				}
				try {
					navigation.reset({ index: 0, routes: [{ name: 'HomeTabs' }] });
				} catch {
					navigation.navigate('HomeTabs');
				}
			} else {
				const serverMsg =
					data?.msg ||
					data?.message ||
					data?.error ||
					(Array.isArray(data?.errors) ? data.errors.join(', ') : undefined);
				const message = serverMsg || `HTTP ${response.status}`;
				Alert.alert('Register failed', message);
			}
		} catch (e: any) {
			// eslint-disable-next-line no-console
			console.log('Register exception:', e);
			Alert.alert('Register failed', e?.message || 'Please try again later.');
		} finally {
			// eslint-disable-next-line no-console
			console.log('Register finished');
			setLoading(false);
		}
	}, [
		username,
		password,
		passwordConfirmation,
		jabatan,
		divisi,
		brandsCsv,
		outletValue,
		outletName,
		computedDeviceId,
		navigation,
		setToken,
	]);

	return (
		<KeyboardAvoidingView
			style={styles.container}
			behavior={Platform.select({ ios: 'padding', android: undefined })}
		>
			<View style={styles.card}>
				<Text style={styles.title}>Register</Text>
				<Text style={styles.subtitle}>Create your account</Text>

				<TextInput
					value={username}
					onChangeText={setUsername}
					autoCapitalize="none"
					autoCorrect={false}
					placeholder="Username"
					style={styles.input}
					returnKeyType="next"
				/>
				<TextInput
					value={password}
					onChangeText={setPassword}
					placeholder="Password"
					secureTextEntry
					style={styles.input}
					returnKeyType="next"
				/>
				<TextInput
					value={passwordConfirmation}
					onChangeText={setPasswordConfirmation}
					placeholder="Confirm Password"
					secureTextEntry
					style={styles.input}
					returnKeyType="next"
				/>
				<TextInput
					value={jabatan}
					onChangeText={setJabatan}
					placeholder="Jabatan (e.g., Staff, Suplier)"
					style={styles.input}
					returnKeyType="next"
				/>
				<TextInput
					value={divisi}
					onChangeText={setDivisi}
					placeholder="Divisi (optional)"
					style={styles.input}
					returnKeyType="next"
				/>
				<TextInput
					value={brandsCsv}
					onChangeText={setBrandsCsv}
					placeholder="Brands (comma-separated, optional)"
					style={styles.input}
					returnKeyType="next"
				/>
				<Text style={styles.label}>Outlet</Text>
				<Pressable style={styles.outletPicker} onPress={openOutletPicker}>
					<Text>
						{outletName ? `${outletName} (${outletValue})` : 'Pilih outlet'}
					</Text>
				</Pressable>

				<View style={styles.buttonRow}>
					{loading ? <ActivityIndicator /> : <Button title="Register" onPress={onRegister} />}
				</View>
			</View>

			<Modal
				visible={outletModalVisible}
				transparent
				animationType="fade"
				onRequestClose={() => setOutletModalVisible(false)}
			>
				<View style={styles.modalOverlay}>
					<View style={styles.modalCard}>
						<Text style={styles.modalTitle}>Pilih Outlet</Text>
						<TextInput
							style={styles.searchInput}
							placeholder="Cari outlet..."
							value={outletSearch}
							onChangeText={setOutletSearch}
						/>
						{outletLoading ? (
							<ActivityIndicator style={{ marginVertical: 16 }} />
						) : (
							<FlatList
								data={filteredOutlets}
								keyExtractor={(item) => item.value}
								contentContainerStyle={{ paddingBottom: 12 }}
								renderItem={({ item }) => (
									<Pressable
										style={styles.outletItem}
										onPress={() => handleSelectOutlet(item)}
									>
										<Text style={styles.outletName}>{item.name}</Text>
										<Text style={styles.outletCode}>{item.value}</Text>
									</Pressable>
								)}
								ListEmptyComponent={
									<View style={styles.emptyContainer}>
										<Text>Tidak ada outlet ditemukan.</Text>
									</View>
								}
							/>
						)}
						<Button title="Tutup" onPress={() => setOutletModalVisible(false)} />
					</View>
				</View>
			</Modal>
		</KeyboardAvoidingView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		padding: 16,
	},
	card: {
		width: '100%',
		maxWidth: 400,
		backgroundColor: 'white',
		borderRadius: 12,
		padding: 20,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 8,
		elevation: 2,
	},
	title: {
		fontSize: 24,
		fontWeight: '700',
		textAlign: 'center',
		marginBottom: 4,
	},
	subtitle: {
		fontSize: 14,
		color: '#666',
		textAlign: 'center',
		marginBottom: 16,
	},
	input: {
		borderWidth: 1,
		borderColor: '#ddd',
		borderRadius: 8,
		paddingHorizontal: 12,
		paddingVertical: 10,
		marginBottom: 12,
	},
	label: {
		fontSize: 14,
		fontWeight: '600',
		marginBottom: 6,
	},
	outletPicker: {
		borderWidth: 1,
		borderColor: '#ddd',
		borderRadius: 8,
		padding: 12,
		marginBottom: 16,
		backgroundColor: '#f7f7f7',
	},
	buttonRow: {
		marginTop: 8,
	},
	modalOverlay: {
		flex: 1,
		backgroundColor: 'rgba(0,0,0,0.4)',
		justifyContent: 'center',
		alignItems: 'center',
		paddingHorizontal: 20,
	},
	modalCard: {
		width: '100%',
		maxWidth: 400,
		maxHeight: '75%',
		backgroundColor: '#fff',
		borderRadius: 12,
		padding: 16,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.2,
		shadowRadius: 10,
		elevation: 6,
	},
	modalTitle: {
		fontSize: 20,
		fontWeight: '700',
		marginBottom: 12,
	},
	searchInput: {
		borderWidth: 1,
		borderColor: '#ccc',
		borderRadius: 8,
		paddingHorizontal: 12,
		paddingVertical: 10,
		marginBottom: 12,
	},
	outletItem: {
		paddingVertical: 12,
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: '#ccc',
	},
	outletName: {
		fontSize: 16,
		fontWeight: '600',
	},
	outletCode: {
		fontSize: 14,
		color: '#666',
	},
	emptyContainer: {
		alignItems: 'center',
		marginTop: 32,
	},
});


