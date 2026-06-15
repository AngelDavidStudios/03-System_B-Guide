import { api, API_BASE } from "./client";

export interface SessionUser {
  sub: string;
  email?: string;
  username?: string;
  groups: string[];
}

export interface SessionResponse {
  authenticated: boolean;
  user?: SessionUser;
}

export async function fetchSession(): Promise<SessionResponse> {
  const { data } = await api.get<SessionResponse>("/auth/session");
  return data;
}

export async function logout(): Promise<{ logoutUrl: string }> {
  const returnTo = encodeURIComponent(window.location.origin);
  const { data } = await api.post<{ logoutUrl: string }>(
    `/auth/logout?origin=B&return_to=${returnTo}`,
  );
  return data;
}

export async function refresh(): Promise<{ ok: true; expiresIn: number }> {
  const { data } = await api.post<{ ok: true; expiresIn: number }>(
    "/auth/refresh",
  );
  return data;
}

export function startLogin(returnTo = "/post-login"): void {
  // Navegación top-level: el browser sigue los 302 de Cognito hasta el
  // Managed Login. Se manda el origin completo para que el BFF redirija de
  // vuelta a ESTE frontend (localhost, Vercel, etc.).
  const fullReturn = encodeURIComponent(`${window.location.origin}${returnTo}`);
  const url = `${API_BASE}/auth/login?origin=B&return_to=${fullReturn}`;
  window.location.assign(url);
}
