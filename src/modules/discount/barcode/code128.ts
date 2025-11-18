// Tipe satu bar (garis) Code128
// width = lebar modul (1..4), black = true berarti bar hitam, false berarti spasi (putih)
export type Code128Bar = {
	width: number;
	black: boolean;
};

// Hasil encode Code128 berupa list bar yang bisa dirender di UI
export type Code128Encoded = {
	bars: Code128Bar[];
};

// Tabel pola Code128 resmi untuk 107 simbol (0..106)
// Setiap string berisi 6 angka (kecuali STOP), mewakili lebar bar/spasi bergantian.
// Sumber pola berdasarkan referensi publik Code128 (misalnya spesifikasi Grand Zebu).
const CODE128_PATTERNS: string[] = [
	'212222', // 0
	'222122', // 1
	'222221', // 2
	'121223', // 3
	'121322', // 4
	'131222', // 5
	'122213', // 6
	'122312', // 7
	'132212', // 8
	'221213', // 9
	'221312', // 10
	'231212', // 11
	'112232', // 12
	'122132', // 13
	'122231', // 14
	'113222', // 15
	'123122', // 16
	'123221', // 17
	'223211', // 18
	'221132', // 19
	'221231', // 20
	'213212', // 21
	'223112', // 22
	'312131', // 23
	'311222', // 24
	'321122', // 25
	'321221', // 26
	'312212', // 27
	'322112', // 28
	'322211', // 29
	'212123', // 30
	'212321', // 31
	'232121', // 32
	'111323', // 33
	'131123', // 34
	'131321', // 35
	'112313', // 36
	'132113', // 37
	'132311', // 38
	'211313', // 39
	'231113', // 40
	'231311', // 41
	'112133', // 42
	'112331', // 43
	'132131', // 44
	'113123', // 45
	'113321', // 46
	'133121', // 47
	'313121', // 48
	'211331', // 49
	'231131', // 50
	'213113', // 51
	'213311', // 52
	'213131', // 53
	'311123', // 54
	'311321', // 55
	'331121', // 56
	'312113', // 57
	'312311', // 58
	'332111', // 59
	'314111', // 60
	'221411', // 61
	'431111', // 62
	'111224', // 63
	'111422', // 64
	'121124', // 65
	'121421', // 66
	'141122', // 67
	'141221', // 68
	'112214', // 69
	'112412', // 70
	'122114', // 71
	'122411', // 72
	'142112', // 73
	'142211', // 74
	'241211', // 75
	'221114', // 76
	'413111', // 77
	'241112', // 78
	'134111', // 79
	'111242', // 80
	'121142', // 81
	'121241', // 82
	'114212', // 83
	'124112', // 84
	'124211', // 85
	'411212', // 86
	'421112', // 87
	'421211', // 88
	'212141', // 89
	'214121', // 90
	'412121', // 91
	'111143', // 92
	'111341', // 93
	'131141', // 94
	'114113', // 95
	'114311', // 96
	'411113', // 97
	'411311', // 98
	'113141', // 99
	'114131', // 100
	'311141', // 101
	'411131', // 102
	'211412', // 103 START A
	'211214', // 104 START B
	'211232', // 105 START C
	'2331112', // 106 STOP (13 modul)
];

// START dan STOP code resmi Code128
const CODE128_START_B = 104; // Code Set B (huruf besar, angka, simbol umum)
const CODE128_STOP = 106;

// Normalisasi nilai input (trim spasi kiri/kanan)
function normalizeValue(value: string): string {
	return value.trim();
}

// Mapping karakter ke kode Code128 set B
// Set B mencakup ASCII 32..127 dengan urutan khusus.
// Di sini kita implement minimal subset untuk karakter yang dipakai (A-Z, 0-9, spasi).
function mapCharToCodeSetB(ch: string): number | null {
	const code = ch.charCodeAt(0);
	// Spasi sampai ~ (ASCII 32..126)
	if (code >= 32 && code <= 126) {
		// Dalam Code128 set B, spasi (ASCII 32) = kode 64? -> tidak, tabel sebenarnya: kode 0..95 = ASCII 32..127
		// Jadi cukup kurangi 32.
		return code - 32;
	}
	// Karakter tidak didukung set B (untuk saat ini kita abaikan)
	return null;
}

// Hitung checksum Code128 (modulo 103)
// Rumus: (nilaiStart + Σ(n_i * posisi_i)) mod 103, posisi_i mulai dari 1 untuk karakter pertama.
function computeChecksum(startCode: number, dataCodes: number[]): number {
	let sum = startCode;
	for (let i = 0; i < dataCodes.length; i += 1) {
		const weight = i + 1; // posisi dimulai dari 1
		sum += dataCodes[i] * weight;
	}
	return sum % 103;
}

// Ubah list kode (start + data + checksum + stop) menjadi bar Code128
function codesToBars(codes: number[]): Code128Bar[] {
	const bars: Code128Bar[] = [];

	// Quiet zone di awal (spasi)
	bars.push({ black: false, width: 10 });

	codes.forEach((code, index) => {
		const pattern = CODE128_PATTERNS[code];
		if (!pattern) return;

		// Mulai dengan bar hitam
		let black = true;
		for (let i = 0; i < pattern.length; i += 1) {
			const w = Number(pattern[i]);
			if (!Number.isFinite(w) || w <= 0) continue;
			bars.push({ black, width: w });
			black = !black; // bar -> spasi -> bar -> ...
		}
	});

	// Quiet zone di akhir (spasi)
	bars.push({ black: false, width: 10 });

	return bars;
}

// Fungsi utama untuk meng-encode string menjadi Code128
// Saat ini kita selalu menggunakan Code Set B (cukup untuk pola "A" + angka + persen diskon).
export function encodeCode128(value: string): Code128Encoded {
	const normalized = normalizeValue(value);
	if (!normalized) {
		return { bars: [] };
	}

	// Konversi setiap karakter ke kode set B
	const dataCodes: number[] = [];
	for (let i = 0; i < normalized.length; i += 1) {
		const ch = normalized[i];
		const code = mapCharToCodeSetB(ch);
		if (code == null) {
			// Jika ada karakter yang tidak didukung, untuk keamanan kita batal encode
			return { bars: [] };
		}
		dataCodes.push(code);
	}

	// Susun urutan kode: START B + data + checksum + STOP
	const startCode = CODE128_START_B;
	const checksum = computeChecksum(startCode, dataCodes);
	const fullCodes: number[] = [startCode, ...dataCodes, checksum, CODE128_STOP];

	// Terjemahkan kode menjadi bar yang bisa dirender
	const bars = codesToBars(fullCodes);
	return { bars };
}
