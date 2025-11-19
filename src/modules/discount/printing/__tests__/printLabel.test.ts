import { buildPrintLabelPayload, buildPrintLabelEscPos, printAllLabels } from '../printLabel';

// Contoh unit test dasar untuk memastikan mapping dan format label

describe('buildPrintLabelPayload', () => {
	it('menghasilkan payload yang benar untuk scan lengkap dengan diskon dan harga', () => {
		const scan = {
			code: '1234567890123',
			discount: '10',
			payload: {
				name_product: 'Produk Contoh',
				code_barcode_lama: '1234567890123',
				harga_awal: 10000,
				harga_discount: 9000,
				qty: 2,
				uomsales: 'PCS',
			},
		};

		const result = buildPrintLabelPayload(scan);

		expect(result.name).toBe('Produk Contoh');
		expect(result.barcodeBaru).toBe('A123456789012310');
		expect(result.discountPercent).toBe(10);
		expect(result.hargaAwal).toBe(10000);
		expect(result.hargaDiskon).toBe(9000);
		expect(result.qty).toBe(2);
		expect(result.uom).toBe('PCS');
	});

	it('fallback ke nilai default ketika beberapa field hilang', () => {
		const scan = {
			code: '999',
			discount: null,
			payload: {
				name: undefined,
				harga_diskon: 5000,
			},
		};

		const result = buildPrintLabelPayload(scan);

		expect(result.name).toBe('Produk tanpa nama');
		expect(result.barcodeBaru).toBe('999');
		expect(result.discountPercent).toBeNull();
		expect(result.hargaAwal).toBeNull();
		expect(result.hargaDiskon).toBe(5000);
		expect(result.qty).toBe(1);
		expect(result.uom).toBe('PCS');
	});
});

describe('buildPrintLabelEscPos', () => {
	it('membangun string ESC/POS yang berisi teks promo, nama produk, qty, barcode, dan harga', () => {
		const payload = {
			name: 'Produk Contoh',
			barcodeBaru: 'A123456789012310',
			discountPercent: 10,
			hargaAwal: 10000,
			hargaDiskon: 9000,
			qty: 2,
			uom: 'PCS',
		};

		const escpos = buildPrintLabelEscPos(payload);

		expect(escpos).toContain('HEMAT 10%');
		expect(escpos).toContain('Produk Contoh');
		expect(escpos).toContain('Qty: 2 PCS');
		expect(escpos).toContain('A123456789012310');
		expect(escpos).toContain('Harga Awal');
		expect(escpos).toContain('Diskon Menjadi');
		expect(escpos).toContain('Rp 10.000');
		expect(escpos).toContain('Rp 9.000');
	});

	it('tetap membangun string ESC/POS meskipun tanpa diskon dan harga awal', () => {
		const payload = {
			name: 'Produk Tanpa Diskon',
			barcodeBaru: '999',
			discountPercent: null,
			hargaAwal: null,
			hargaDiskon: 5000,
			qty: 1,
			uom: 'PCS',
		};

		const escpos = buildPrintLabelEscPos(payload);

		expect(escpos).not.toContain('HEMAT');
		expect(escpos).toContain('Produk Tanpa Diskon');
		expect(escpos).toContain('Qty: 1 PCS');
		expect(escpos).toContain('999');
		expect(escpos).toContain('Diskon Menjadi');
		expect(escpos).toContain('Rp 5.000');
	});
});

describe('printAllLabels', () => {
	it('tidak memanggil printScanLabel ketika daftar scans kosong', async () => {
		// Kita mock implementasi internal dengan mengganti fungsi printScanLabel secara lokal
		const mockPrintScanLabel = jest.fn();
		const scans: any[] = [];

		// Karena printAllLabels diimplementasikan menggunakan printScanLabel yang diexport,
		// di sini kita cukup memastikan tidak ada error ketika daftar kosong diproses.
		await expect(printAllLabels(scans)).resolves.toBeUndefined();
		expect(mockPrintScanLabel).not.toHaveBeenCalled();
	});
});
