import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { Discount } from '../DiscountScreen';
import { DiscountProvider, ScannedProductData } from '../../state/DiscountContext';
import { AuthProvider } from '../../../../auth/AuthContext';
import { DevBypassProvider } from '../../../../dev/DevBypassContext';

// Mock modul printing supaya tidak benar-benar mengakses Bluetooth
jest.mock('../../printing/printLabel', () => ({
  printScanLabel: jest.fn().mockResolvedValue(undefined),
  printAllLabels: jest.fn().mockResolvedValue(undefined),
}));

// Mock Alert supaya kita bisa langsung trigger onPress dari tombol konfirmasi
jest.spyOn(Alert, 'alert');

// Helper untuk membungkus Discount dengan semua provider yang dibutuhkan
const renderDiscountScreen = (scans: ScannedProductData[] = []) => {
  // Kita override DiscountProvider dengan nilai awal tertentu melalui komponen helper
  const Wrapper = ({ children }: { children: React.ReactNode }) => {
    return (
      <AuthProvider>
        <DevBypassProvider>
          <DiscountProvider>{children}</DiscountProvider>
        </DevBypassProvider>
      </AuthProvider>
    );
  };

  return render(
    <NavigationContainer>
      <Wrapper>
        <Discount />
      </Wrapper>
    </NavigationContainer>
  );
};

describe('DiscountScreen', () => {
  it('menampilkan empty state saat belum ada scan', () => {
    const { getByText } = renderDiscountScreen();

    expect(getByText('Discount Index')).toBeTruthy();
    expect(
      getByText('Kelola printer, diskon, dan pemindaian produk dari logo ( + ) di bawah.')
    ).toBeTruthy();
  });

  it('menampilkan FAB dan bisa toggle menu', () => {
    const { getByText, queryByText } = renderDiscountScreen();

    const fab = getByText('+');
    fireEvent.press(fab);

    expect(getByText('Adjust Printer')).toBeTruthy();
    expect(getByText('Adjust Discount')).toBeTruthy();
    expect(getByText('Scan Product')).toBeTruthy();

    fireEvent.press(getByText('Scan Product'));

    // Karena banyak logic bergantung pada navigation dan konfigurasi printer/diskon,
    // di sini kita hanya memastikan tidak terjadi crash ketika tombol ditekan.
    expect(queryByText('Adjust Printer')).toBeNull();
  });
});
