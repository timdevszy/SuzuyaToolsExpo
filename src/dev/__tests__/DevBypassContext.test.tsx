import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { DevBypassProvider, useDevBypass } from '../DevBypassContext';

const renderUseDevBypass = () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <DevBypassProvider>{children}</DevBypassProvider>
  );
  return renderHook(() => useDevBypass(), { wrapper });
};

describe('DevBypassContext', () => {
  it('dapat toggle bypassRules', () => {
    const { result } = renderUseDevBypass();

    expect(result.current.bypassRules).toBe(false);

    act(() => {
      result.current.setBypassRules(true);
    });

    expect(result.current.bypassRules).toBe(true);
  });
});
