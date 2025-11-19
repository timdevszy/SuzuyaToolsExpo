import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { DiscountProvider, useDiscount } from '../DiscountContext';

// Helper untuk render hook useDiscount dengan provider aslinya
const renderUseDiscount = () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <DiscountProvider>{children}</DiscountProvider>
  );
  return renderHook(() => useDiscount(), { wrapper });
};

describe('DiscountContext', () => {
  it('setLastScan menambahkan scan ke list dan mengupdate lastScan', () => {
    const { result } = renderUseDiscount();

    const scan = {
      code: 'ABC',
      discount: '10',
      payload: { foo: 'bar' },
      scannedAt: '2025-01-01T00:00:00.000Z',
    } as any;

    act(() => {
      result.current.setLastScan(scan);
    });

    expect(result.current.lastScan).toEqual(scan);
    expect(result.current.scans).toHaveLength(1);
    expect(result.current.scans[0]).toEqual(scan);
  });

  it('removeScan menghapus scan dan mengupdate lastScan', () => {
    const { result } = renderUseDiscount();

    const first = {
      code: 'FIRST',
      discount: '5',
      payload: {},
      scannedAt: '2025-01-01T00:00:00.000Z',
    } as any;

    const second = {
      code: 'SECOND',
      discount: '10',
      payload: {},
      scannedAt: '2025-01-01T01:00:00.000Z',
    } as any;

    act(() => {
      result.current.setLastScan(first);
      result.current.setLastScan(second);
    });

    expect(result.current.scans).toHaveLength(2);
    expect(result.current.lastScan).toEqual(second);

    act(() => {
      result.current.removeScan(second.scannedAt);
    });

    expect(result.current.scans).toHaveLength(1);
    expect(result.current.scans[0]).toEqual(first);
    expect(result.current.lastScan).toEqual(first);

    act(() => {
      result.current.removeScan(first.scannedAt);
    });

    expect(result.current.scans).toHaveLength(0);
    expect(result.current.lastScan).toBeNull();
  });

  it('clearScans mengosongkan daftar dan mereset lastScan', () => {
    const { result } = renderUseDiscount();

    const scan = {
      code: 'ABC',
      discount: '10',
      payload: {},
      scannedAt: '2025-01-01T00:00:00.000Z',
    } as any;

    act(() => {
      result.current.setLastScan(scan);
    });

    expect(result.current.scans).toHaveLength(1);

    act(() => {
      result.current.clearScans();
    });

    expect(result.current.scans).toHaveLength(0);
    expect(result.current.lastScan).toBeNull();
  });

  it('dapat mengatur flag printerConfigured dan discountConfigured', () => {
    const { result } = renderUseDiscount();

    act(() => {
      result.current.setPrinterConfigured(true);
      result.current.setDiscountConfigured(true);
    });

    expect(result.current.printerConfigured).toBe(true);
    expect(result.current.discountConfigured).toBe(true);
  });
});
