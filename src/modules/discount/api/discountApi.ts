// Payload yang dikirim waktu scan produk
export type ScanProductPayload = {
	code: string; // kode barang yang discan (misal dari barcode)
	outlet: string; // kode outlet / toko
	discount: string; // kode atau tipe diskon yang lagi dipakai
};

// Bentuk mentah respons dari backend, dibiarkan any karena formatnya fleksibel
export type ScanProductRawResponse = any;

// Hasil yang sudah di rapikan buat dipakai di UI
export type ScanProductResult = {
	product: any | null; // object produk pertama dari results, atau null kalau nggak ada
	raw: ScanProductRawResponse; // data mentah (JSON penuh atau text) buat debugging / keperluan lain
	status: number; // HTTP status code
	ok: boolean; // penanda sukses/gagal berdasarkan HTTP + flag error dari backend
	errorMessage?: string; // pesan error yang sudah dirapikan buat ditampilkan ke user
};

// Base URL API discount
const API_BASE_URL = 'http://szytoolsapi.suzuyagroup.com:8181';

// Call ke API scan product
export async function scanProductApi(
	payload: ScanProductPayload,
	request: (input: string, init?: RequestInit & { attachAuth?: boolean }) => Promise<Response>
): Promise<ScanProductResult> {
	// Kirim request ke endpoint /scanproduct dengan body JSON
	const response = await request(`${API_BASE_URL}/scanproduct`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(payload),
	});

	// Ambil isi respons sebagai text dulu (supaya aman kalau bukan JSON juga)
	const text = await response.text();
	let data: any = null;
	try {
		data = text ? JSON.parse(text) : null;
	} catch {
		// Kalau bukan JSON valid, kita biarkan data tetap null dan pakai text mentahnya
	}
	// eslint-disable-next-line no-console
	console.log('scanproduct response status:', response.status);
	// eslint-disable-next-line no-console
	console.log('scanproduct response body:', data ?? text);

	// Struktur respons backend (kurang lebih): { error, message/msg, results: [ { ...product } ], status }
	const firstResult = Array.isArray(data?.results) ? data.results[0] : null;
	const product =
		firstResult && typeof firstResult === 'object' && !Array.isArray(firstResult)
			? firstResult
			: null;

	// ok dianggap true kalau HTTP status sukses DAN backend flag error === false
	const ok = response.ok && data?.error === false;
	const errorMessage = !ok
		? data?.msg || data?.message || `Gagal mengambil data produk (status ${response.status}).`
		: undefined;

	// Kembalikan hasil yang sudah diringkas + data mentah kalau nanti perlu dicek lagi
	return {
		product,
		raw: data ?? text,
		status: response.status,
		ok,
		errorMessage,
	};
}
