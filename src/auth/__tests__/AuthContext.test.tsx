import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { AuthProvider, useAuth } from '../AuthContext';

const renderUseAuth = () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  );
  return renderHook(() => useAuth(), { wrapper });
};

describe('AuthContext', () => {
  it('mengelola state token, outlet, username, dan uuid', () => {
    const { result } = renderUseAuth();

    act(() => {
      result.current.setToken('token-123');
      result.current.setDefaultOutlet('OUTLET-01');
      result.current.setUsername('kasir1');
      result.current.setUuid('uuid-123');
    });

    expect(result.current.token).toBe('token-123');
    expect(result.current.defaultOutlet).toBe('OUTLET-01');
    expect(result.current.username).toBe('kasir1');
    expect(result.current.uuid).toBe('uuid-123');
  });
});
