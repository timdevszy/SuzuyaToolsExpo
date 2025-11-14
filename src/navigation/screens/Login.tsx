import * as React from 'react';
import { useCallback, useEffect, useState } from 'react';
import {
	ActivityIndicator,
	Alert,
	Button,
	KeyboardAvoidingView,
	Platform,
	StyleSheet,
	Text,
	TextInput,
	View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { getDeviceId, setManualDeviceId } from '../../utils/deviceId';
import { useAuth } from '../../auth/AuthContext';

type Props = {
	navigation: any;
};

export function Login(_: Props) {
	const navigation = useNavigation<any>();
	const { setToken } = useAuth();
	const [username, setUsername] = useState('');
	const [password, setPassword] = useState('');
	const [loading, setLoading] = useState(false);
	const [computedDeviceId, setComputedDeviceId] = useState<string>('');

	useEffect(() => {
		let mounted = true;
		(async () => {
			try {
				// For testing: set the registered device_id
				// This device_id is already registered in backend for user 'billy'
				setManualDeviceId('93805d3ee461195ccbafa1cc86d7340694be86138f9f770500cf4f4da989c15f');
				const id = await getDeviceId();
				if (mounted) setComputedDeviceId(id);
			} catch {
				// leave empty
			}
		})();
		return () => {
			mounted = false;
		};
	}, []);

	const onLogin = useCallback(async () => {
		if (!username || !password) {
			Alert.alert('Validation', 'Username and password are required');
			return;
		}
		// Ensure we have a device ID; compute on-demand to avoid UX blocker
		let deviceIdToUse = computedDeviceId;
		if (!deviceIdToUse) {
			try {
				deviceIdToUse = await getDeviceId();
				setComputedDeviceId(deviceIdToUse);
			} catch {
				// ignore; will continue and let server decide
			}
		}
		// Log the device ID being used for debugging
		// eslint-disable-next-line no-console
		console.log('Login attempt with device_id:', deviceIdToUse);
		const loginPayload = {
			username,
			password,
			device_id: deviceIdToUse,
		};
		// eslint-disable-next-line no-console
		console.log('Login payload:', { username, hasPassword: !!password, device_id: deviceIdToUse });
		setLoading(true);
		try {
			const response = await fetch('https://ssam.suzuyagroup.com/api/login/ssa', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Accept: 'application/json',
				},
				body: JSON.stringify(loginPayload),
			});
			const text = await response.text();
			let data: any = null;
			try {
				data = text ? JSON.parse(text) : null;
			} catch {
				// Non-JSON response
			}
			// Helpful console logs for debugging in development
			// eslint-disable-next-line no-console
			console.log('Login response status:', response.status);
			// eslint-disable-next-line no-console
			console.log('Login response body:', data ?? text);
			if (response.ok) {
				// Store token if present
				const token = data?.results?.[0]?.token ?? null;
				if (token) {
					setToken(token);
				}
				try {
					navigation.reset({
						index: 0,
						routes: [{ name: 'HomeTabs' }],
					});
				} catch {
					// Fallback if reset isn't available
					navigation.navigate('HomeTabs');
				}
			} else {
				// Prefer server-provided message(s)
				const serverMsg =
					data?.msg ||
					data?.message ||
					data?.error ||
					(Array.isArray(data?.errors) ? data.errors.join(', ') : undefined);
				const message = serverMsg || `HTTP ${response.status}`;

				// Heuristic device-mismatch detection
				const hint = String(serverMsg || '').toLowerCase();
				const looksLikeDeviceMismatch =
					response.status === 422 ||
					response.status === 403 ||
					hint.includes('device') ||
					hint.includes('device_id') ||
					hint.includes('mismatch');

				if (looksLikeDeviceMismatch) {
					Alert.alert(
						'Device conflict',
						`${message}\n\nAkun ini tampaknya terikat ke perangkat lain. Ingin minta rebind?`,
						[
							{ text: 'Batal', style: 'cancel' },
							{
								text: 'Request rebind',
								onPress: () => {
									// Placeholder: implement rebind flow later
									Alert.alert('Rebind requested', 'Kami akan menambahkan alur rebind selanjutnya.');
								},
							},
						]
					);
				} else {
					Alert.alert('Login failed', message);
				}
			}
		} catch (e: any) {
			const message =
				e?.message ||
				'Unable to login. Please check your credentials.';
			Alert.alert('Login failed', message);
		} finally {
			setLoading(false);
		}
	}, [username, password, computedDeviceId, navigation]);

	return (
		<KeyboardAvoidingView
			style={styles.container}
			behavior={Platform.select({ ios: 'padding', android: undefined })}
		>
			<View style={styles.card}>
				<Text style={styles.title}>SuzuyaTools</Text>
				<Text style={styles.subtitle}>Sign in to continue</Text>
				<TextInput
					value={username}
					onChangeText={setUsername}
					autoCapitalize="none"
					autoCorrect={false}
					placeholder="Username"
					style={styles.input}
					returnKeyType="next"
					textContentType="username"
				/>
				<TextInput
					value={password}
					onChangeText={setPassword}
					placeholder="Password"
					secureTextEntry
					style={styles.input}
					returnKeyType="done"
					textContentType="password"
				/>
				<View style={styles.buttonRow}>
					{loading ? (
						<ActivityIndicator />
					) : (
						<Button title="Login" onPress={onLogin} />
					)}
				</View>
				<View style={{ height: 8 }} />
				<Button
					title="Create an account"
					onPress={() => {
						try {
							navigation.navigate('Register');
						} catch {
							// ignore
						}
					}}
				/>
			</View>
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
	buttonRow: {
		marginTop: 8,
	},
});


