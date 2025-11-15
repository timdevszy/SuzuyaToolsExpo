export type ScanProductPayload = {
	code: string;
	outlet: string;
	discount: string;
};

export type ScanProductRawResponse = any;

export type ScanProductResult = {
	product: any | null;
	raw: ScanProductRawResponse;
	status: number;
	ok: boolean;
	errorMessage?: string;
};

const API_BASE_URL = 'http://szytoolsapi.suzuyagroup.com:8181';

export async function scanProductApi(
	payload: ScanProductPayload,
	request: (input: string, init?: RequestInit & { attachAuth?: boolean }) => Promise<Response>
): Promise<ScanProductResult> {
	const response = await request(`${API_BASE_URL}/scanproduct`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(payload),
	});
	const text = await response.text();
	let data: any = null;
	try {
		data = text ? JSON.parse(text) : null;
	} catch {
		// ignore non-JSON
	}
	// eslint-disable-next-line no-console
	console.log('scanproduct response status:', response.status);
	// eslint-disable-next-line no-console
	console.log('scanproduct response body:', data ?? text);

	// Backend returns: { error, message, results: [ { ...product } ], status }
	const firstResult = Array.isArray(data?.results) ? data.results[0] : null;
	const product =
		firstResult && typeof firstResult === 'object' && !Array.isArray(firstResult)
			? firstResult
			: null;

	const ok = response.ok && data?.error === false;
	const errorMessage = !ok
		? data?.msg || data?.message || `Gagal mengambil data produk (status ${response.status}).`
		: undefined;

	return {
		product,
		raw: data ?? text,
		status: response.status,
		ok,
		errorMessage,
	};
}
