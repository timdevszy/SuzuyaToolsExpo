import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SectionCard } from '../../../ui/components/SectionCard';
import { AppButton } from '../../../ui/components/AppButton';

// Data yang dipakai buat test print satu barcode
export type PrintableBarcode = {
  code: string; // kode barcode yang mau dicetak
  normalPrice: number; // harga normal (sebelum diskon)
  discountPrice: number; // harga setelah diskon
};

// Props untuk section test print
export type TestPrintSectionProps = {
  barcodes: PrintableBarcode[]; // list barcode yang siap di-test print
  cardWidth: number; // lebar tiap kartu preview
  canPrint: boolean; // flag boleh print atau tidak (misal belum connect printer)
  onPrintTest: (index: number, barcode: PrintableBarcode) => void; // callback saat tombol Print Test ditekan
};

// Section yang menampilkan daftar kartu "Test Print" dalam bentuk scroll horizontal
export function TestPrintSection({
  barcodes,
  cardWidth,
  canPrint,
  onPrintTest,
}: TestPrintSectionProps) {
  return (
    <SectionCard style={styles.section}>
      <Text style={styles.sectionTitle}>Test Print</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.testPrintScroll}>
        {barcodes.map((barcode, index) => (
          <View key={index} style={[styles.testPrintCard, { width: cardWidth }]}>
            {/* Area placeholder buat preview barcode (saat ini cuma teks kode) */}
            <View style={styles.barcodePlaceholder}>
              <Text style={styles.barcodeCode}>{barcode.code}</Text>
            </View>

            {/* Kode barcode di bawah placeholder, biar gampang dibaca */}
            <Text style={styles.barcodeCodeText} numberOfLines={1}>
              {barcode.code}
            </Text>

            {/* Harga ringkas: harga normal (dicoret) + harga diskon */}
            <View style={styles.priceContainer}>
              <Text style={styles.priceLabel}>Harga:</Text>
              <View style={styles.priceRow}>
                <Text style={styles.priceNormal} numberOfLines={1}>
                  Rp. {barcode.normalPrice.toLocaleString('id-ID')}
                </Text>
                <Text style={styles.priceDiscount} numberOfLines={1}>
                  Rp. {barcode.discountPrice.toLocaleString('id-ID')}
                </Text>
              </View>
            </View>

            {/* Tombol buat kirim perintah test print ke barcode tertentu */}
            <AppButton
              variant="primary"
              title={`Print Test ${index + 1}`}
              onPress={() => onPrintTest(index + 1, barcode)}
              disabled={!canPrint}
              style={styles.printButton}
            />
          </View>
        ))}
      </ScrollView>
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  testPrintScroll: {
    flexDirection: 'row',
  },
  testPrintCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    minHeight: 220,
  },
  barcodePlaceholder: {
    height: 70,
    backgroundColor: 'white',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
    borderStyle: 'dashed',
  },
  barcodeCode: {
    fontSize: 10,
    color: '#999',
    fontFamily: 'monospace',
  },
  barcodeCodeText: {
    fontSize: 14,
    fontFamily: 'monospace',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: '500',
  },
  priceContainer: {
    marginBottom: 12,
  },
  priceLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 6,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  priceNormal: {
    fontSize: 13,
    color: '#999',
    textDecorationLine: 'line-through',
  },
  priceDiscount: {
    fontSize: 15,
    fontWeight: '600',
    color: '#34C759',
  },
  printButton: {
    marginTop: 'auto',
    width: '100%',
  },
});
