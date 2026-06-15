import axios, { AxiosError } from "axios";

// Base del BFF. Si NEXT_PUBLIC_API_URL está definida (p.ej. la URL del Lambda)
// se llama directo cross-origin; si no, se usa el rewrite local `/api` → :3000.
export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "/api";

export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  // X-System identifica al sistema consumidor ante el BFF (Sistema C). El guard
  // SystemAccessGuard usa esta cabecera para impedir que el rol Admins opere en
  // el Sistema B (p.ej. /kms/decrypt).
  headers: { "Content-Type": "application/json", "X-System": "B" },
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("auth:unauthorized"));
    }
    return Promise.reject(error);
  },
);
