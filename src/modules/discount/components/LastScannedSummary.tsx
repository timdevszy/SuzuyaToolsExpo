import React from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import type { ScannedProductData } from '../state/DiscountContext';
import { Code128Barcode } from './Code128Barcode';

// Komponen ringkasan untuk scan terakhir: info produk + barcode + tombol aksi
export type LastScannedSummaryProps = {
	lastScan: ScannedProductData;
	onPrint?: () => void; // dipanggil saat tombol Print ditekan
	onDelete?: () => void; // dipanggil saat tombol Hapus ditekan
};

// Komponen ini menampilkan ringkasan produk yang baru saja discan
export function LastScannedSummary({ lastScan, onPrint, onDelete }: LastScannedSummaryProps) {
	// Payload mentah dari hasil scan (berdasar struktur data backend)
	const data: any = lastScan.payload || {};

	// Nama & identitas produk (fallback ke beberapa field jika tidak ada)
	const name =
		data.name_product || data.descript || data.name || 'Produk tanpa nama';
	// Kode internal / kode lama yang menjadi dasar pembuatan barcode baru
	const internal =
		data.internal || data.code_barcode_lama || data.mixcode || data.code_scan || lastScan.code;
	// code_barcode_lama dari payload (jika ada), fallback ke internal atau kode yang discan
	const barcodeLama = data.code_barcode_lama || internal || lastScan.code;
	// Persentase diskon yang akan ditempel di belakang barcode baru (ambil dari payload dulu, baru dari lastScan)
	const discountSource =
		data.discount != null
			? Number(data.discount)
			: lastScan.discount != null
			?
				Number(lastScan.discount)
				: null;
	// Suffix diskon dalam bentuk angka bulat (contoh: 20 dari 20.5, 5 dari 5.0)
	const discountSuffix =
		discountSource != null && Number.isFinite(discountSource)
			? String(Math.trunc(discountSource))
			: null;
	// Barcode baru mengikuti pola A{barcode_lama}{diskon}, misal A0021777010250
	// Angka diskon tidak memakai nol di depan (contoh: 5 bukan 05)
	const barcodeBaru =
		data.code_barcode_baru ||
		(barcodeLama && discountSuffix != null
			? `A${barcodeLama}${discountSuffix}` 
			: lastScan.code);

	// Harga & diskon
	// Ambil harga awal dari beberapa kemungkinan field (menyesuaikan struktur data backend)
	const hargaAwalRaw =
		data.harga_awal ?? data.retail_price ?? data.rrtlprc ?? data.harga ?? null;
	// Ambil harga setelah diskon
	const hargaDiskonRaw =
		data.harga_discount ?? data.harga_diskon ?? null;
	// Persentase diskon mentah langsung dari payload (kalau ada)
	const discountPercentRaw = data.discount ?? null;
	// Konversi ke number supaya aman dipakai di perhitungan / toLocaleString
	const hargaAwal = hargaAwalRaw != null ? Number(hargaAwalRaw) : null;
	const hargaDiskon = hargaDiskonRaw != null ? Number(hargaDiskonRaw) : null;

	// Hitung persentase diskon kalau belum dapat angka yang jelas dari payload
	let discountPercent: number | null = null;
	if (typeof discountPercentRaw === 'number') {
		discountPercent = discountPercentRaw;
	} else if (hargaAwal && hargaDiskon) {
		const diff = hargaAwal - hargaDiskon;
		if (diff > 0) {
			discountPercent = Math.round((diff / hargaAwal) * 100);
		}
	}

	// Qty & satuan (default 1 PCS kalau tidak ada di payload)
	const qty = data.qty != null ? Number(data.qty) : 1;
	const uom = data.uomsales || 'PCS';

	return (
		<View style={styles.root}>
			<View style={styles.cardRow}>
				{/* Kiri: Info produk (nama, harga, qty) */}
				<View style={styles.leftCol}>
					{internal && (
						<Text style={styles.internal}>Internal: {internal}</Text>
					)}
					<Text style={styles.name} numberOfLines={2}>
						{name}
					</Text>
					{hargaAwal != null && (
						<View style={styles.row}>
							<Text style={styles.labelInline}>Harga:</Text>
							<Text style={styles.priceOriginal}>
								Rp {hargaAwal.toLocaleString('id-ID')}
							</Text>
						</View>
					)}
					{hargaDiskon != null && (
						<View style={styles.row}>
							<Text style={styles.labelInline}>Diskon:</Text>
							<Text style={styles.priceDiscount}>
								Rp {hargaDiskon.toLocaleString('id-ID')}
							</Text>
							{discountPercent != null && (
								<Text style={styles.discountPercent}>
									({discountPercent}% )
								</Text>
							)}
						</View>
					)}
					{barcodeBaru && (
						<Text style={styles.metaText}>Barcode: {barcodeBaru}</Text>
					)}
					<Text style={styles.metaText}>
						Qty: {qty} {uom}
					</Text>
				</View>

				{/* Kanan: barcode visual & tombol Print/Hapus */}
				<View style={styles.rightCol}>
					<View style={styles.barcodeBox}>
						<Text style={styles.barcodeLabel}>BARCODE</Text>
						{barcodeBaru ? (
							<Code128Barcode value={barcodeBaru} height={48} barWidth={2} />
						) : (
							<Text style={styles.barcodeLines}>Tidak ada barcode</Text>
						)}
					</View>
					{barcodeBaru && (
						<Text style={styles.barcodeText}>{barcodeBaru}</Text>
					)}
					{hargaAwal != null && hargaDiskon != null && (
						<View style={styles.smallPriceRow}>
							<Text style={styles.smallOriginal}>
								<Text style={styles.smallOriginalRp}>Rp </Text>
								<Text style={styles.smallOriginalAmount}>
									{hargaAwal.toLocaleString('id-ID')}
								</Text>
							</Text>
							<Text style={styles.smallSpace}> </Text>
							<Text style={styles.smallDiscount}>
								Rp {hargaDiskon.toLocaleString('id-ID')}
							</Text>
						</View>
					)}
					<View style={styles.actionsRow}>
						<Pressable
							style={[styles.iconButton, styles.iconButtonPrimary]}
							onPress={onPrint}
						>
							<Text style={styles.iconButtonText}>Print</Text>
						</Pressable>
						<Pressable
							style={[styles.iconButton, styles.iconButtonDanger]}
							onPress={onDelete}
						>
							<Text style={styles.iconButtonText}>Hapus</Text>
						</Pressable>
					</View>
				</View>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	root: {
		width: '100%',
		paddingBottom: 12,
	},
	label: {
		fontSize: 13,
		color: '#6b7280',
		marginBottom: 8,
		textAlign: 'left',
	},
	cardRow: {
		flexDirection: 'row',
		alignItems: 'stretch',
		justifyContent: 'space-between',
		gap: 16,
	},
	leftCol: {
		flex: 2,
	},
	rightCol: {
		flex: 1.3,
		alignItems: 'center',
	},
	internal: {
		fontSize: 12,
		color: '#6b7280',
		marginBottom: 4,
	},
	name: {
		fontSize: 16,
		fontWeight: '700',
		color: '#111827',
		marginBottom: 8,
	},
	row: {
		flexDirection: 'row',
		alignItems: 'center',
		flexWrap: 'wrap',
		marginTop: 4,
	},
	labelInline: {
		fontSize: 13,
		color: '#4b5563',
		marginRight: 4,
	},
	priceOriginal: {
		fontSize: 14,
		color: '#999',
		marginLeft: 4,
		textDecorationLine: 'line-through',
	},
	priceDiscount: {
		fontSize: 13,
		fontWeight: '700',
		color: '#16a34a',
		marginRight: 6,
	},
	discountPercent: {
		fontSize: 13,
		color: '#16a34a',
	},
	metaText: {
		marginTop: 4,
		fontSize: 13,
		color: '#374151',
	},
	barcodeBox: {
		width: '100%',
		borderWidth: 1,
		borderColor: '#d1d5db',
		borderRadius: 8,
		paddingVertical: 8,
		paddingHorizontal: 6,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#f9fafb',
	},
	barcodeLabel: {
		fontSize: 10,
		letterSpacing: 1,
		color: '#9ca3af',
		marginBottom: 4,
	},
	barcodeLines: {
		fontSize: 18,
		letterSpacing: 2,
		color: '#111827',
		fontFamily: 'monospace',
	},
	barcodeSvg: {
		width: '100%',
		height: 56,
	},
	barcodeText: {
		marginTop: 4,
		fontSize: 10,
		color: '#4b5563',
	},
	smallOriginal: {
		marginTop: 2,
		fontSize: 9,
		color: '#9ca3af',
	},
	smallOriginalRp: {
		textDecorationLine: 'none',
	},
	smallOriginalAmount: {
		textDecorationLine: 'line-through',
	},
	smallDiscount: {
		marginTop: 2,
		fontSize: 9,
		color: '#16a34a',
		fontWeight: '600',
	},
	smallPriceRow: {
		marginTop: 2,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
	},
	smallSpace: {
		fontSize: 9,
	},
	actionsRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginTop: 8,
		gap: 8,
	},
	iconButton: {
		flex: 1,
		paddingVertical: 6,
		borderRadius: 999,
		alignItems: 'center',
		justifyContent: 'center',
	},
	iconButtonPrimary: {
		backgroundColor: '#2563eb',
	},
	iconButtonDanger: {
		backgroundColor: '#ef4444',
	},
	iconButtonText: {
		fontSize: 11,
		fontWeight: '600',
		color: '#fff',
	},
	hint: {
		marginTop: 8,
		fontSize: 11,
		color: '#9ca3af',
		fontStyle: 'italic',
		textAlign: 'left',
	},
});
