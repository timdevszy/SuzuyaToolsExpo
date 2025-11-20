import React, { useRef } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { ScannedProductData } from '../state/DiscountContext';
import { printScanLabel, buildPrintLabelPayload } from '../printing/printLabelDefault';
import type { PrintLabelPreviewPayload } from '../printing/printLabelPreviewModel';
import { Code128Barcode } from '../components/Code128Barcode';
import ViewShot from 'react-native-view-shot';

// Route params untuk layar Print Preview (rumah generic)
export type PrintPreviewRouteParams = {
  scan?: ScannedProductData;
  mode?: string;
};

export function PrintPreviewScreen() {
  const route = useRoute();
  const navigation = useNavigation<any>();
  const { scan, mode } = route.params as PrintPreviewRouteParams;
  const viewShotRef = useRef<ViewShot | null>(null);

  const isDefaultMode = mode === 'Default' && !!scan;
  const payload: PrintLabelPreviewPayload | null = isDefaultMode
    ? (buildPrintLabelPayload(scan) as PrintLabelPreviewPayload)
    : null;

  const handleCancel = () => {
    navigation.goBack();
  };

  const handlePrint = async () => {
    // Jika ada mode dan scan yang dikenal, lakukan aksi cetak sesuai mode
    if (isDefaultMode && scan) {
      // Capture preview sebagai bitmap (base64) untuk kebutuhan cetak gambar di masa depan
      try {
        const uriOrBase64 = await viewShotRef.current?.capture?.();
        if (uriOrBase64) {
          console.log('PRINT_PREVIEW_CAPTURED_LENGTH', uriOrBase64.length);
        }
      } catch (error) {
        console.log('PRINT_PREVIEW_CAPTURE_ERROR', error);
      }

      // Cetak menggunakan mode default (ESC/POS lama)
      await printScanLabel(scan);
      navigation.goBack();
      return;
    }

    // Jika belum ada mode yang di-support, cukup kembali
    navigation.goBack();
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>
            {mode ? `Preview Label Diskon (${mode})` : 'Preview Label Diskon'}
          </Text>

          <ViewShot ref={viewShotRef} style={styles.labelBox}>
            {isDefaultMode && payload && (
              <>
                {payload.discountPercent != null && (
                  <Text style={styles.discountHeader}>HEMAT {payload.discountPercent}%</Text>
                )}

                <Text style={styles.productName} numberOfLines={2}>
                  {payload.name}
                </Text>

                <Text style={styles.qtyTextLine}>
                  Qty: {payload.qty} {payload.uom}
                </Text>

                {payload.barcodeBaru && (
                  <View style={styles.barcodeSection}>
                    <Code128Barcode value={payload.barcodeBaru} height={48} barWidth={2} />
                    <Text style={styles.barcodeText}>{payload.barcodeBaru}</Text>
                  </View>
                )}

                <View style={styles.priceSection}>
                  {payload.hargaAwal != null && payload.hargaDiskon != null && (
                    <>
                      <View style={styles.priceRow}>
                        <Text style={styles.priceLabel}>Harga Awal</Text>
                        <Text style={styles.priceColon}>:</Text>
                        <Text style={styles.priceValue}>
                          <Text style={styles.priceOriginalStriked}>
                            Rp {payload.hargaAwal.toLocaleString('id-ID')}
                          </Text>
                        </Text>
                      </View>
                      <View style={styles.priceRow}>
                        <Text style={styles.priceLabel}>Diskon Menjadi</Text>
                        <Text style={styles.priceColon}>:</Text>
                        <Text style={styles.priceValue}>
                          <Text style={styles.priceDiscount}>
                            Rp {payload.hargaDiskon.toLocaleString('id-ID')}
                          </Text>
                        </Text>
                      </View>
                    </>
                  )}

                  {payload.hargaAwal != null && payload.hargaDiskon == null && (
                    <View style={styles.priceRow}>
                      <Text style={styles.priceLabel}>Harga Awal</Text>
                      <Text style={styles.priceColon}>:</Text>
                      <Text style={styles.priceValue}>
                        Rp {payload.hargaAwal.toLocaleString('id-ID')}
                      </Text>
                    </View>
                  )}

                  {payload.hargaAwal == null && payload.hargaDiskon != null && (
                    <View style={styles.priceRow}>
                      <Text style={styles.priceLabel}>Diskon Menjadi</Text>
                      <Text style={styles.priceColon}>:</Text>
                      <Text style={styles.priceValue}>
                        <Text style={styles.priceDiscount}>
                          Rp {payload.hargaDiskon.toLocaleString('id-ID')}
                        </Text>
                      </Text>
                    </View>
                  )}
                </View>
              </>
            )}
          </ViewShot>

          <Text style={styles.helperText}>
            Periksa kembali data di atas sebelum mencetak label.
          </Text>

          <View style={styles.actionsRow}>
            <Pressable style={[styles.button, styles.buttonSecondary]} onPress={handleCancel}>
              <Text style={[styles.buttonText, styles.buttonTextSecondary]}>Batal</Text>
            </Pressable>
            <Pressable style={[styles.button, styles.buttonPrimary]} onPress={handlePrint}>
              <Text style={styles.buttonText}>Cetak</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  container: {
    flexGrow: 1,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
    color: '#111827',
  },
  labelBox: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 12,
    backgroundColor: '#ffffff',
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    color: '#111827',
    marginBottom: 12,
  },
  qtyTextLine: {
    fontSize: 12,
    color: '#4b5563',
    textAlign: 'center',
    marginBottom: 8,
  },
  barcodeSection: {
    alignItems: 'center',
    marginBottom: 12,
  },
  barcodeText: {
    marginTop: 4,
    fontSize: 12,
    letterSpacing: 1,
    color: '#111827',
  },
  priceSection: {
    marginTop: 8,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  priceLabel: {
    width: 140,
    fontSize: 13,
    color: '#111827',
  },
  priceColon: {
    width: 10,
    textAlign: 'center',
    fontSize: 13,
    color: '#111827',
  },
  priceValue: {
    flex: 1,
    fontSize: 13,
    color: '#111827',
  },
  priceOriginalStriked: {
    textDecorationLine: 'line-through',
    color: '#9ca3af',
  },
  priceDiscount: {
    fontWeight: '700',
    color: '#b91c1c',
  },
  helperText: {
    marginTop: 16,
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  discountHeader: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    color: '#111827',
    marginBottom: 8,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 20,
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 999,
  },
  buttonPrimary: {
    backgroundColor: '#2563eb',
  },
  buttonSecondary: {
    backgroundColor: '#e5e7eb',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  buttonTextSecondary: {
    color: '#111827',
  },
});
