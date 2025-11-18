// Hook ini dipakai buat bikin client API sederhana yang otomatis kepasang Authorization header
import { useAuth } from '../auth/AuthContext';

// Tambahan opsi buat fetch, biar bisa atur mau kirim token auth atau nggak
type FetchOptions = RequestInit & {
	attachAuth?: boolean; // kalau false, request jalan tanpa Authorization header
};

export function useApiClient() {
	// Ambil token dari AuthContext, nanti dipakai buat Authorization header
	const { token } = useAuth();

	// Fungsi helper buat kirim request ke API
	async function request(input: string, init: FetchOptions = {}) {
		// Base headers, di sini kita pastiin response yang diharapkan itu JSON
		const headers: Record<string, string> = {
			Accept: 'application/json',
			// Kalau dari luar ada headers tambahan, kita merge di sini
			...(init.headers as Record<string, string> | undefined),
		};
		// Secara default, setiap request bakal kirim token kalau ada
		// Tapi kalau attachAuth === false, kita skip Authorization header
		if (init.attachAuth !== false && token) {
			headers.Authorization = `Bearer ${token}`;
		}
		// Terakhir, panggil fetch dengan opsi yang sudah digabung sama headers di atas
		const res = await fetch(input, { ...init, headers });
		return res;
	}

	// Kita expose satu fungsi aja: request, biar di tempat lain bisa dipakai kayak client API
	return { request };
}