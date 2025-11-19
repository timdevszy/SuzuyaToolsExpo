import { Alert, Platform } from 'react-native';

// Cetak satu hasil scan sebagai label diskon lewat printer Bluetooth
export const printScanLabel = async (scan: any) => {
	if (Platform.OS !== 'android') {
		Alert.alert('Belum didukung', 'Cetak label saat ini hanya didukung di Android.');
		return;
	}

	try {
		const { default: RNBluetoothClassic } = await import('react-native-bluetooth-classic');
		const devices = await RNBluetoothClassic.getConnectedDevices();
		if (!devices || !devices.length) {
			Alert.alert('Printer belum terhubung', 'Silakan hubungkan printer terlebih dahulu di menu Adjust Printer.');
			return;
		}

		const device = devices[0];
		const data: any = scan.payload || {};
		const name =
			data.name_product || data.descript || data.name || 'Produk tanpa nama';
		const internal =
			data.internal || data.code_barcode_lama || data.mixcode || data.code_scan || scan.code;
		const barcodeLama = data.code_barcode_lama || internal || scan.code;
		const discountSource =
			data.discount != null
				? Number(data.discount)
				: scan.discount != null
					? Number(scan.discount)
					: null;
		const discountPercent =
			discountSource != null && Number.isFinite(discountSource)
				? Math.trunc(discountSource)
				: null;
		const discountSuffix =
			discountPercent != null ? String(discountPercent) : null;
		const barcodeBaru =
			data.code_barcode_baru ||
			(barcodeLama && discountSuffix != null
				? `A${barcodeLama}${discountSuffix}`
				: scan.code);
		const hargaAwalRaw =
			data.harga_awal ?? data.retail_price ?? data.rrtlprc ?? data.harga ?? null;
		const hargaDiskonRaw =
			data.harga_discount ?? data.harga_diskon ?? null;
		const hargaAwal = hargaAwalRaw != null ? Number(hargaAwalRaw) : null;
		const hargaDiskon = hargaDiskonRaw != null ? Number(hargaDiskonRaw) : null;
		const qty = data.qty != null ? Number(data.qty) : 1;
		const uom = data.uomsales || 'PCS';

		let printData = '';
		printData += '\x1B\x40'; // Initialize
		// Gunakan font lebih kecil (Font B) agar semua teks cetak lebih mungil
		printData += '\x1B\x4D\x01'; // ESC M 1 - Font B (kecil) jika didukung
		printData += '\x1B\x61\x01'; // Center

		if (discountPercent != null) {
			// Teks HEMAT XX% tetap sedikit lebih besar, tapi tidak terlalu besar
			printData += '\x1B\x21\x10'; // double height, lebar normal (lebih kecil dari 0x30)
			printData += `HEMAT ${discountPercent}%\n`;
			printData += '\x1B\x21\x00';
		}

		printData += `${name}\n`;
		printData += `Qty: ${qty} ${uom}\n`;

		if (barcodeBaru) {
			// Barcode Code128: gunakan fungsi 73 (0x49) dengan panjang eksplisit
			const barcodeContent = String(barcodeBaru);
			const barcodeLengthChar = String.fromCharCode(barcodeContent.length);
			// Sedikit perbesar ukuran barcode (tinggi dan ketebalan garis)
			printData += '\x1D\x68\x50'; // GS h 80 dot tinggi
			printData += '\x1D\x77\x03'; // GS w 3 module width
			printData += '\x1D\x6B\x49';
			printData += barcodeLengthChar + barcodeContent;
			printData += '\n';
			// Tampilkan kode barcode sebagai teks tepat di bawah gambar barcode
			printData += `${barcodeContent}\n`;
		}
		// Baris harga langsung mengikuti kode barcode (tanpa blank line tambahan)
		// Gunakan rata kiri agar ruang horizontal maksimal
		printData += '\x1B\x61\x00'; // ESC a 0 - Left align
		if (hargaAwal != null && hargaDiskon != null) {
			// Dua baris jelas: label dengan titik dua sejajar
			// Panjang prefix sebelum ':' disamakan: "Harga Awal     : " dan "Diskon Menjadi : "
			printData += 'Harga Awal     : ';
			printData += `Rp ${hargaAwal.toLocaleString('id-ID')}\n`;
			// Baris diskon: label sama lebar, lalu angka diskon dibuat lebih besar + bold
			printData += 'Diskon Menjadi : ';
			// Perbesar dan bold hanya bagian angka diskon
			printData += '\x1B\x21\x10'; // double height, lebar normal
			printData += '\x1B\x45\x01'; // bold ON
			printData += `Rp ${hargaDiskon.toLocaleString('id-ID')}`;
			printData += '\x1B\x45\x00'; // bold OFF
			printData += '\x1B\x21\x00'; // kembali ke ukuran normal kecil
			printData += '\n';
		} else if (hargaAwal != null) {
			// Hanya harga awal
			printData += 'Harga Awal     : ';
			printData += `Rp ${hargaAwal.toLocaleString('id-ID')}\n`;
		} else if (hargaDiskon != null) {
			// Hanya harga diskon, buat angka lebih besar + bold
			printData += 'Diskon Menjadi : ';
			printData += '\x1B\x21\x10'; // double height
			printData += '\x1B\x45\x01'; // bold ON
			printData += `Rp ${hargaDiskon.toLocaleString('id-ID')}`;
			printData += '\x1B\x45\x00'; // bold OFF
			printData += '\x1B\x21\x00'; // normal size
			printData += '\n';
		}
		// Kembalikan alignment ke tengah untuk konten setelahnya (jika ada)
		printData += '\x1B\x61\x01'; // ESC a 1 - Center align

		printData += '\x0A\x0A';
		await device.write(printData);
		Alert.alert('Berhasil', 'Data cetak dikirim ke printer.');
	} catch (error: any) {
		Alert.alert('Gagal cetak', error?.message || 'Terjadi kesalahan saat mengirim data ke printer.');
	}
};

// Cetak semua hasil scan secara berurutan
export const printAllLabels = async (scans: any[]) => {
	if (!scans || !scans.length) {
		Alert.alert('Tidak ada data', 'Belum ada produk yang discan untuk dicetak.');
		return;
	}

	if (Platform.OS !== 'android') {
		Alert.alert('Belum didukung', 'Cetak label saat ini hanya didukung di Android.');
		return;
	}

	try {
		for (const scan of scans) {
			// Cetak setiap scan secara berurutan untuk menjaga jarak dan urutan rapi
			// eslint-disable-next-line no-await-in-loop
			await printScanLabel(scan);
		}
	} catch (error: any) {
		Alert.alert('Gagal cetak', error?.message || 'Terjadi kesalahan saat mencetak semua label.');
	}
};
