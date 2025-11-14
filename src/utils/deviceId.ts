import { Platform } from 'react-native';

let cachedId: string | null = null;
let ApplicationRef: any | null | undefined;
let FileSystemRef: any | null | undefined;

// Simple random string generator that works in React Native without crypto
function generateRandomId(): string {
	const chars = '0123456789abcdef';
	let result = '';
	for (let i = 0; i < 64; i++) {
		result += chars[Math.floor(Math.random() * chars.length)];
	}
	return result;
}

function getApplication() {
	if (ApplicationRef !== undefined) return ApplicationRef;
	try {
		// eslint-disable-next-line global-require, import/no-extraneous-dependencies
		ApplicationRef = require('expo-application');
	} catch {
		ApplicationRef = null;
	}
	return ApplicationRef;
}

function getFileSystem() {
	if (FileSystemRef !== undefined) return FileSystemRef;
	try {
		// eslint-disable-next-line global-require, import/no-extraneous-dependencies
		FileSystemRef = require('expo-file-system');
	} catch {
		FileSystemRef = null;
	}
	return FileSystemRef;
}

// For testing: allow manual override of device ID
let manualDeviceId: string | null = null;

export function setManualDeviceId(id: string | null) {
	manualDeviceId = id;
	cachedId = id;
}

export async function getDeviceId(): Promise<string> {
	// Check manual override first (for testing)
	if (manualDeviceId) {
		cachedId = manualDeviceId;
		return manualDeviceId;
	}
	if (cachedId) return cachedId;
	try {
		const Application = getApplication();
		if (Application) {
			if (Platform.OS === 'ios') {
				if (typeof Application.getIosIdForVendorAsync === 'function') {
					const id = await Application.getIosIdForVendorAsync();
					if (id) {
						cachedId = id;
						return id;
					}
				}
			} else if (Platform.OS === 'android') {
				// androidId is a string or null
				const id: string | null | undefined = Application.androidId;
				if (id) {
					cachedId = id;
					return id;
				}
			}
		}
	} catch {
		// ignore and fallback
	}
	// Persistent fallback via expo-file-system: store a UUID in app documents
	try {
		const FileSystem = getFileSystem();
		const dir: string | undefined = FileSystem?.documentDirectory;
		if (FileSystem && dir) {
			const filePath = dir + 'device_id.txt';
			const info = await FileSystem.getInfoAsync(filePath);
			if (info?.exists) {
				const content = await FileSystem.readAsStringAsync(filePath);
				if (content) {
					cachedId = content.trim();
					return cachedId;
				}
			}
			const newId = generateRandomId();
			await FileSystem.writeAsStringAsync(filePath, newId, { encoding: FileSystem.EncodingType.UTF8 });
			cachedId = newId;
			return newId;
		}
	} catch {
		// ignore and use volatile fallback
	}
	// Volatile fallback: session random ID (as last resort)
	cachedId = generateRandomId();
	return cachedId;
}


