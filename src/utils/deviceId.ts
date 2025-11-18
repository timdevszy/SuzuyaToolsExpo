import { Platform } from 'react-native';

let cachedId: string | null = null;
let ApplicationRef: any | null | undefined;
let FileSystemRef: any | null | undefined;

// Generator string random sederhana (64 char hex) yang aman dipakai di React Native tanpa crypto
function generateRandomId(): string {
	const chars = '0123456789abcdef';
	let result = '';
	for (let i = 0; i < 64; i++) {
		result += chars[Math.floor(Math.random() * chars.length)];
	}
	return result;
}

// Fungsi untuk mendapatkan referensi ke modul expo-application
function getApplication() {
	if (ApplicationRef !== undefined) return ApplicationRef;
	try {
		// Lazy require expo-application supaya file ini tetap aman dipakai di luar Expo
		// eslint-disable-next-line global-require, import/no-extraneous-dependencies
		ApplicationRef = require('expo-application');
	} catch {
		ApplicationRef = null;
	}
	return ApplicationRef;
}

// Fungsi untuk mendapatkan referensi ke modul expo-file-system
function getFileSystem() {
	if (FileSystemRef !== undefined) return FileSystemRef;
	try {
		// Lazy require expo-file-system untuk menyimpan device_id secara persisten
		// eslint-disable-next-line global-require, import/no-extraneous-dependencies
		FileSystemRef = require('expo-file-system');
	} catch {
		FileSystemRef = null;
	}
	return FileSystemRef;
}

// Untuk testing: izinkan override device ID secara manual
let manualDeviceId: string | null = null;

// Fungsi untuk mengatur device ID secara manual
export function setManualDeviceId(id: string | null) {
	manualDeviceId = id;
	cachedId = id;
}

// Fungsi untuk mendapatkan device ID
export async function getDeviceId(): Promise<string> {
	// Urutan prioritas pengambilan device_id:
	// 1) manual override (untuk testing)
	// 2) ID resmi dari expo-application (iOS/Android)
	// 3) File persist di expo-file-system
	// 4) ID random in-memory (fallback terakhir)

	// 1) Cek manual override terlebih dahulu (untuk testing)
	if (manualDeviceId) {
		cachedId = manualDeviceId;
		return manualDeviceId;
	}
	if (cachedId) return cachedId;

	// 2) Coba ambil ID resmi dari expo-application
	try {
		const Application = getApplication();
		if (Application) {
			if (Platform.OS === 'ios') {
				// Coba ambil ID untuk vendor iOS
				if (typeof Application.getIosIdForVendorAsync === 'function') {
					const id = await Application.getIosIdForVendorAsync();
					if (id) {
						cachedId = id;
						return id;
					}
				}
			} else if (Platform.OS === 'android') {
				// Coba ambil ID Android
				const id: string | null | undefined = Application.androidId;
				if (id) {
					cachedId = id;
					return id;
				}
			}
		}
	} catch {
		// Jika gagal, lanjut ke fallback berikutnya
	}

	// 3) Fallback persisten via expo-file-system: simpan ID di file dokumen app
	try {
		const FileSystem = getFileSystem();
		const dir: string | undefined = FileSystem?.documentDirectory;
		if (FileSystem && dir) {
			const filePath = dir + 'device_id.txt';
			const info = await FileSystem.getInfoAsync(filePath);
			if (info?.exists) {
				const content = await FileSystem.readAsStringAsync(filePath);
				if (content) {
					const trimmed = content.trim();
					cachedId = trimmed;
					return trimmed;
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
	// 4) Fallback terakhir: ID random hanya berlaku di sesi ini (tidak persisten)
	const fallback = generateRandomId();
	cachedId = fallback;
	return fallback;
}


