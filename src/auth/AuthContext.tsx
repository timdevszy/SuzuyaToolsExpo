import * as React from 'react';

type AuthContextValue = {
	token: string | null;
	setToken: (t: string | null) => void;
	defaultOutlet: string | null;
	setDefaultOutlet: (o: string | null) => void;
};

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
	const [token, setToken] = React.useState<string | null>(null);
	const [defaultOutlet, setDefaultOutlet] = React.useState<string | null>(null);
	const value = React.useMemo(
		() => ({ token, setToken, defaultOutlet, setDefaultOutlet }),
		[token, defaultOutlet]
	);
	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
	const ctx = React.useContext(AuthContext);
	if (!ctx) {
		throw new Error('useAuth must be used within an AuthProvider');
	}
	return ctx;
}


