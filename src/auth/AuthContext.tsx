// Context ini dipakai buat nyimpen info auth yang kepakai di banyak komponen
import * as React from 'react';

// Bentuk data yang disimpen di dalam AuthContext
type AuthContextValue = {
	token: string | null; // token auth dari backend
	setToken: (t: string | null) => void; // function buat update token
	defaultOutlet: string | null; // outlet default user (kalau konsepnya multi outlet)
	setDefaultOutlet: (o: string | null) => void;
	username: string | null; // nama user yang lagi login
	setUsername: (u: string | null) => void;
	uuid: string | null; // identifier unik user (misal dari backend)
	setUuid: (v: string | null) => void;
};

// Bikin context-nya, default-nya undefined biar ketahuan kalau dipakai di luar provider
const AuthContext = React.createContext<AuthContextValue | undefined>(undefined);

// Provider utama, bungkus app/route yang butuh akses ke data auth
export function AuthProvider({ children }: { children: React.ReactNode }) {
	// State-state yang nyimpen data auth
	const [token, setToken] = React.useState<string | null>(null);
	const [defaultOutlet, setDefaultOutlet] = React.useState<string | null>(null);
	const [username, setUsername] = React.useState<string | null>(null);
	const [uuid, setUuid] = React.useState<string | null>(null);

	// Pakai useMemo biar object value-nya nggak selalu ke-create ulang kalau nggak perlu
	const value = React.useMemo(
		() => ({ token, setToken, defaultOutlet, setDefaultOutlet, username, setUsername, uuid, setUuid }),
		[token, defaultOutlet, username, uuid]
	);

	// Sebarin value ke semua children lewat AuthContext.Provider
	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Custom hook biar pakai context-nya lebih enak di komponen lain
export function useAuth(): AuthContextValue {
	const ctx = React.useContext(AuthContext);
	if (!ctx) {
		// Kalau sampai ke sini, berarti ada komponen yang pakai useAuth di luar AuthProvider
		throw new Error('useAuth must be used within an AuthProvider');
	}
	return ctx;
}
