import * as React from 'react';

export type DevBypassContextValue = {
	bypassRules: boolean;
	setBypassRules: (value: boolean) => void;
};

const DevBypassContext = React.createContext<DevBypassContextValue | undefined>(undefined);

export function DevBypassProvider({ children }: { children: React.ReactNode }) {
	const [bypassRules, setBypassRules] = React.useState(false);

	const value = React.useMemo(
		() => ({ bypassRules, setBypassRules }),
		[bypassRules]
	);

	return <DevBypassContext.Provider value={value}>{children}</DevBypassContext.Provider>;
}

export function useDevBypass(): DevBypassContextValue {
	const ctx = React.useContext(DevBypassContext);
	if (!ctx) {
		throw new Error('useDevBypass must be used within a DevBypassProvider');
	}
	return ctx;
}
