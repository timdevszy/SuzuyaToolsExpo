import * as React from 'react';

type AuthContextValue = {
	token: string | null;
	setToken: (t: string | null) => void;
	defaultOutlet: string | null;
	setDefaultOutlet: (o: string | null) => void;
	username: string | null;
	setUsername: (u: string | null) => void;
	uuid: string | null;
	setUuid: (v: string | null) => void;
};

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
	const [token, setToken] = React.useState<string | null>(null);
	const [defaultOutlet, setDefaultOutlet] = React.useState<string | null>(null);
	const [username, setUsername] = React.useState<string | null>(null);
	const [uuid, setUuid] = React.useState<string | null>(null);
	const value = React.useMemo(
		() => ({ token, setToken, defaultOutlet, setDefaultOutlet, username, setUsername, uuid, setUuid }),
		[token, defaultOutlet, username, uuid]
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


