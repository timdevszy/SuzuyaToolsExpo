import { useAuth } from '../auth/AuthContext';

type FetchOptions = RequestInit & {
	attachAuth?: boolean;
};

export function useApiClient() {
	const { token } = useAuth();

	async function request(input: string, init: FetchOptions = {}) {
		const headers: Record<string, string> = {
			Accept: 'application/json',
			...(init.headers as Record<string, string> | undefined),
		};
		if (init.attachAuth !== false && token) {
			headers.Authorization = `Bearer ${token}`;
		}
		const res = await fetch(input, { ...init, headers });
		return res;
	}

	return { request };
}