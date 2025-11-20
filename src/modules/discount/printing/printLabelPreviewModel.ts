// Base model untuk payload label yang dipakai di berbagai jenis preview.
// Struktur ini disamakan dengan output buildPrintLabelPayload di printLabel.ts
// supaya preview (UI / bitmap) bisa mengikuti format yang sama dengan cetakan ESC/POS.

export type PrintLabelPreviewPayload = {
  name: string;
  barcodeBaru: string | null;
  discountPercent: number | null;
  hargaAwal: number | null;
  hargaDiskon: number | null;
  qty: number;
  uom: string;
};

// File ini sengaja hanya mendefinisikan bentuk data dasar.
// Logic pengambilan data untuk berbagai jenis preview (misalnya bitmap)
// ditempatkan di file lain seperti printLabelBitmap.ts.
