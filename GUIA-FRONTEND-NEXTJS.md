# Guía de frontend — Next.js (Sistema B)

**Audiencia:** quien construya o mantenga el SPA de Next.js (Sistema B) que consume el BFF Sistema C.
**Stack fijo:** Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS 4 + axios. Puerto **5174**.
**Premisa:** Sistema B **NUNCA** ve tokens JWT. La autenticación se maneja vía cookie HttpOnly que emite Sistema C. Tú solo haces peticiones HTTP y dejas que el browser maneje la cookie.

> **El backend (Sistema C) YA ESTÁ DESPLEGADO** en la nube (HTTPS). No necesitas levantarlo ni tener AWS: solo apuntas tu `.env.local` a la URL del backend y trabajas el frontend.
>
> ⚠️ **Prueba en Chrome.** El backend y este frontend son sitios distintos (cross-site), así que la cookie de sesión es "third-party": Chrome la permite, **Safari la bloquea**. Detalle en § 3.2 y § 8.

---

## 1. ¿Por qué Next.js si no usamos SSR?

Aunque Sistema B es esencialmente un SPA y **no** explotamos Server Components ni Server Actions (todas las páginas que tocan sesión son client components), Next.js aporta:

- **App Router file-based**: no hay `react-router` que configurar. Una carpeta = una ruta.
- **`next.config.ts` `rewrites()`**: proxy local opcional (solo si corres un backend en tu `:3000`). **Contra el backend desplegado NO se usa** — axios llama directo vía `NEXT_PUBLIC_API_URL` (ver § 3.2).
- **Tailwind 4 cableado**: `create-next-app --tailwind` deja `app/globals.css` y `postcss.config.mjs` listos.
- **`next/link` + `useRouter`**: navegación cliente sin recargar la página.
- **Dev server moderno**: HMR + TypeScript out of the box.

**Lo que NO usamos** y por qué:

| Feature de Next | Por qué no aquí |
|---|---|
| Server Components con datos de sesión | La sesión vive en la cookie de Sistema C; el server de Next no la ve. Toda página que necesita conocer al usuario es `"use client"`. |
| Server Actions | Tendrían que reenviar la cookie al BFF — añade complejidad sin valor en este proyecto. |
| `middleware.ts` para auth | El middleware de Next correría server-side; para validar la cookie tendría que llamar a `/auth/session` y duplicar lógica. Gate cliente con `<Protected>` es más simple. |
| API Routes (`app/api/`) | Sistema C **es** nuestro backend; no duplicamos endpoints en Next. |
| `next/image` | Demo, no necesitamos optimización de imágenes. |

---

## 2. Estructura del proyecto

```
03-System_B/
├── app/                       # App Router — todo lo que ve el usuario
│   ├── layout.tsx             # Root layout (server) — monta <Providers> + <Nav>
│   ├── providers.tsx          # "use client" wrapper de SessionProvider
│   ├── globals.css            # Tailwind 4 + tokens de color claros
│   ├── page.tsx               # /            — home con botón Login
│   ├── post-login/page.tsx    # /post-login  — landing tras callback Cognito
│   ├── dashboard/page.tsx     # /dashboard   — gated (Protected)
│   ├── decrypt/page.tsx       # /decrypt     — recibe JSON de Sistema A, llama /kms/decrypt
│   └── admin/page.tsx         # /admin       — gated por grupo Admins
├── components/
│   ├── Nav.tsx                # Header con links + botón Salir
│   └── Protected.tsx          # Gate cliente: redirige a "/" si !auth o a "/dashboard" si !admin
├── lib/
│   ├── api/
│   │   ├── client.ts          # axios: baseURL = NEXT_PUBLIC_API_URL ?? '/api', withCredentials, header X-System:B
│   │   ├── auth.ts            # fetchSession, logout, refresh, startLogin (mandan su propio origin)
│   │   ├── kms.ts             # decryptPayload + encryptPayload
│   │   └── roles.ts           # listRoles
│   └── session/
│       └── SessionContext.tsx # React Context = equivalente del store Pinia de A
├── .env.local                 # NEXT_PUBLIC_API_URL=<URL del backend>  (no se commitea)
├── next.config.ts             # rewrites /api/* → :3000 (solo dev local opcional)
├── package.json               # scripts en puerto 5174
├── tsconfig.json              # paths "@/*": ["./*"]
└── postcss.config.mjs         # @tailwindcss/postcss
```

---

## 3. Configuración crítica

### 3.1 Puerto fijo 5174

```jsonc
// package.json
{
  "scripts": {
    "dev": "next dev -p 5174",
    "build": "next build",
    "start": "next start -p 5174",
    "lint": "eslint"
  }
}
```

**No cambies el puerto** sin coordinar con quien mantenga Sistema C: tiene `FRONTEND_URL_B=http://localhost:5174` en `.env` y registrado en Cognito como Allowed sign-out URL.

### 3.2 Conexión al backend: axios directo vía `NEXT_PUBLIC_API_URL`

El backend está desplegado (en la nube, HTTPS). B lo llama **directo** con axios, no por proxy. La base se controla con una env var:

```bash
# .env.local  (en 03-System_B/, NO se commitea)
NEXT_PUBLIC_API_URL=<URL_DEL_BACKEND>
```

```ts
// la base efectiva:
export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "/api";
```

- **Con `NEXT_PUBLIC_API_URL` definida** (el caso normal ahora): axios pega directo al backend. La URL te la entrega David en persona.
- **Sin definirla**: cae al rewrite local `/api → :3000` (solo si levantas un backend en tu máquina; normalmente no hace falta).

> Pídele a David la **URL del backend** (la entrega en persona) y ponla en tu `.env.local`. Reinicia `pnpm dev` después (Next lee el env al arrancar).

**¿Por qué directo y no proxy contra el backend?** El login es una navegación top-level: Cognito redirige al `/auth/callback` **del backend**, así que la cookie de sesión queda en el dominio del backend. Un proxy (petición server-side) no llevaría esa cookie. Llamando directo, el browser sí la adjunta (cross-site) en cada XHR.

**Cookie cross-site (lee esto):** B (`localhost`/Vercel) y el backend (otro dominio) son **sitios distintos** → la cookie es third-party, marcada `SameSite=None; Secure` por el backend. Implicaciones:

- ✅ **Chrome**: funciona (permite third-party cookies). Es el navegador para probar/demostrar.
- ❌ **Safari**: las bloquea por defecto (ITP) → la sesión no persiste. No es bug tuyo.
- El header `X-System: B` (ver § 3.3) dispara *preflight* CORS; el backend ya lo permite.

El backend mantiene una **allowlist de orígenes** (`ALLOWED_ORIGINS`). Tu `localhost:5174` ya está permitido. Cuando despliegues a Vercel, pídele al backend que agregue tu dominio de Vercel a esa lista y a los sign-out URLs de Cognito (ver § 10).

### 3.3 Cliente axios

```ts
// lib/api/client.ts
import axios, { AxiosError } from "axios";

// backend si NEXT_PUBLIC_API_URL está definida; si no, proxy local /api → :3000.
export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "/api";

export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,                       // ← OBLIGATORIO (envía la cookie)
  // X-System identifica a este SPA como "B" ante el BFF. El backend lo usa para
  // la partición de acceso por sistema (confinamiento de Admins).
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
```

- `withCredentials: true` es lo que hace que la cookie viaje en cada XHR cross-site.
- `X-System: "B"` es obligatorio: sin él, el backend no sabe que las llamadas vienen de B (importa para el confinamiento de Admins — ver § 6 / `CONTEXTO.md`).
- `typeof window !== "undefined"`: guarda por si el módulo se importa desde un Server Component (`window` no existe en server).

### 3.4 Estilos Tailwind 4 claros

```css
/* app/globals.css */
@import "tailwindcss";

:root {
  color-scheme: light;
  --background: #f8fafc;
  --foreground: #0f172a;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
}

body {
  background: var(--background);
  color: var(--foreground);
  font-family: var(--font-sans), system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
}
```

**Eliminamos** el `@media (prefers-color-scheme: dark)` que viene por defecto en `create-next-app`. Es la causa de que la UI se viera oscura cuando macOS está en modo oscuro. El proyecto **siempre** renderiza claro para mantener paridad visual con Sistema A.

### 3.5 Paleta y botones

| Token | Uso | Tailwind |
|---|---|---|
| Página | Fondo general | `bg-slate-50` |
| Card | Contenedores | `bg-white border-slate-200 shadow-sm` |
| Heading | Títulos | `text-slate-900` |
| Body | Párrafos | `text-slate-600` |
| Botón primario | Login, Descifrar, CTAs | `bg-indigo-600 hover:bg-indigo-700 text-white` |
| Botón danger | Salir / logout | `bg-red-600 hover:bg-red-700 text-white` |
| Link activo | Nav | `text-indigo-600 font-semibold` |
| Card de éxito | Resultado de decrypt | `bg-emerald-50 border-emerald-200` |
| Texto de error | Mensajes de fallo | `text-red-600` |

---

## 4. Sesión: React Context (espejo de Pinia)

`SessionContext.tsx` es el equivalente exacto del store Pinia de Sistema A, en React:

```tsx
// lib/session/SessionContext.tsx (versión resumida)
"use client";

import { createContext, useContext, useState, useCallback, useEffect, useRef, useMemo } from "react";
import { fetchSession, logout as logoutApi, refresh as refreshApi, startLogin } from "@/lib/api/auth";

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const inFlight = useRef(false);

  const load = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const res = await fetchSession();
      setUser(res.authenticated && res.user ? res.user : null);
    } catch {
      setUser(null);
    } finally {
      setLoaded(true);
      inFlight.current = false;
    }
  }, []);

  useEffect(() => {
    void load();
    const onUnauthorized = () => setUser(null);
    window.addEventListener("auth:unauthorized", onUnauthorized);
    return () => window.removeEventListener("auth:unauthorized", onUnauthorized);
  }, [load]);

  const signIn = useCallback((returnTo = "/post-login") => startLogin(returnTo), []);
  const signOut = useCallback(async () => {
    const { logoutUrl } = await logoutApi();
    setUser(null);
    window.location.assign(logoutUrl);
  }, []);

  const value = useMemo(() => ({
    user, loaded,
    isAuthenticated: user !== null,
    isAdmin: user?.groups.includes("Admins") ?? false,
    load, signIn, signOut,
    refreshTokens: refreshApi,
  }), [user, loaded, load, signIn, signOut]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession debe usarse dentro de <SessionProvider>");
  return ctx;
}
```

**API expuesta (idéntica a Pinia):**

| Pinia (Sistema A) | React Context (Sistema B) |
|---|---|
| `session.user` | `session.user` |
| `session.isAuthenticated` | `session.isAuthenticated` |
| `session.isAdmin` | `session.isAdmin` |
| `session.loaded` | `session.loaded` |
| `session.load()` | `session.load()` |
| `session.signIn()` | `session.signIn()` |
| `session.signOut()` | `session.signOut()` |
| `session.refreshTokens()` | `session.refreshTokens()` |

---

## 5. Cómo se monta todo (App Router)

### 5.1 Root layout (server component)

```tsx
// app/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Nav } from "@/components/Nav";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Sistema B — React",
  description: "Consumidor del BFF Sistema C — receptor del flujo A → B (ISWZ3206 UDLA).",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-700">
        <Providers>
          <Nav />
          <main className="flex-1">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
```

`RootLayout` **es un server component** — no puede usar `useState`. Por eso delegamos en `<Providers>` (client) para envolver con el contexto de sesión.

### 5.2 Providers (client)

```tsx
// app/providers.tsx
"use client";

import { SessionProvider } from "@/lib/session/SessionContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
```

### 5.3 Página típica (client)

```tsx
// app/dashboard/page.tsx
"use client";

import { Protected } from "@/components/Protected";
import { useSession } from "@/lib/session/SessionContext";

export default function DashboardPage() {
  return (
    <Protected>
      <DashboardContent />
    </Protected>
  );
}

function DashboardContent() {
  const session = useSession();
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-3xl font-semibold text-slate-900">Dashboard</h1>
      <p className="mt-2 text-slate-600">
        Bienvenido, <strong>{session.user?.email}</strong>.
      </p>
    </div>
  );
}
```

**Regla:** cualquier página que llame a `useSession()`, `useState`, `useEffect`, `useRouter` (de `next/navigation`) **necesita** `"use client"` en la primera línea.

### 5.4 Gate cliente con `<Protected>`

```tsx
// components/Protected.tsx
"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/session/SessionContext";

export function Protected({
  children,
  requireAdmin = false,
}: {
  children: ReactNode;
  requireAdmin?: boolean;
}) {
  const session = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!session.loaded) return;
    if (!session.isAuthenticated) {
      router.replace("/");
    } else if (requireAdmin && !session.isAdmin) {
      router.replace("/dashboard");
    }
  }, [session.loaded, session.isAuthenticated, session.isAdmin, requireAdmin, router]);

  if (!session.loaded) return <p className="px-4 py-12 text-slate-500">Cargando…</p>;
  if (!session.isAuthenticated) return null;
  if (requireAdmin && !session.isAdmin) return null;
  return <>{children}</>;
}
```

**Comparativa con Sistema A** (Vue Router navigation guard):

| Vue Router (A) | Next.js App Router (B) |
|---|---|
| `meta: { requiresAuth: true }` en el `RouteRecord` | `<Protected>` envolviendo `page.tsx` |
| `meta: { requiresAdmin: true }` | `<Protected requireAdmin>` |
| `router.beforeEach((to) => {...})` global | `useEffect` dentro de `<Protected>` |
| `return { name: 'home' }` | `router.replace('/')` |

Lógicamente equivalentes; estructuralmente distintos por el modelo de cada framework.

---

## 6. Catálogo de endpoints

Todos vía `api` (base = `NEXT_PUBLIC_API_URL`). Las XHR llevan la cookie (`withCredentials`) y el header `X-System: B` automáticamente.

| Método | Endpoint | Body / params | Auth | Uso |
|---|---|---|---|---|
| GET | `/auth/login?origin=B&return_to=<origin-completo>/post-login` | — | público | navegación top-level (`window.location.assign`) |
| GET | `/auth/callback` | — | — | invocado por Cognito; no lo llames |
| GET | `/auth/session` | — | público | `fetchSession()` |
| POST | `/auth/logout?origin=B&return_to=<origin>` | — | sesión | devuelve `{ logoutUrl }` |
| POST | `/auth/refresh` | — | sesión | rota tokens (transparente) |
| GET | `/auth/me` | — | sesión | perfil |
| POST | `/auth/verify-token` | — | Bearer | server-to-server / Postman |
| POST | `/kms/encrypt` | `{ payload: string }` | sesión | devuelve `{ encryptedPayload, encryptedDataKey }` |
| POST | `/kms/decrypt` | `{ encryptedPayload, encryptedDataKey }` | sesión | devuelve `{ payload }` |
| GET | `/roles` | — | sesión + Admin | lista grupos |
| GET | `/roles/user/:username` | — | sesión + Admin | grupos de un user |
| POST | `/roles/:groupName/users/:username` | — | sesión + Admin | 204 |
| DELETE | `/roles/:groupName/users/:username` | — | sesión + Admin | 204 |

**Importante:** `startLogin` usa `window.location.assign` (navegación top-level), no axios — el flujo sigue 302s a Cognito que axios no propagaría. Y ambos mandan el **origin completo del frontend** en `return_to`, para que el BFF redirija de vuelta a *este* frontend (sea `localhost` o Vercel), validándolo contra su allowlist.

```ts
// lib/api/auth.ts
import { api, API_BASE } from "./client";

export function startLogin(returnTo = "/post-login"): void {
  const fullReturn = encodeURIComponent(`${window.location.origin}${returnTo}`);
  const url = `${API_BASE}/auth/login?origin=B&return_to=${fullReturn}`;
  window.location.assign(url);
}

export async function logout() {
  const returnTo = encodeURIComponent(window.location.origin);
  const { data } = await api.post(`/auth/logout?origin=B&return_to=${returnTo}`);
  return data; // { logoutUrl } — navega ahí con window.location.assign
}
```

---

## 7. Flujo end-to-end A → B

```
[Sistema A · Vue :5173]                          [Sistema B · Next :5174]
        │                                                  │
        │ 1. Login → Cognito → cookie en dominio del backend│
        │ 2. /encrypt → POST /api/kms/encrypt               │
        │    body: { payload: "secreto" }                   │
        │ 3. Sistema C: KMS GenerateDataKey + AES-GCM        │
        │    → { encryptedPayload, encryptedDataKey }       │
        │ 4. Vue copia el JSON al portapapeles               │
        │                                                  │
        │ ┌────────── Usuario pega manualmente ──────────┐  │
        │ │ "{ \"encryptedPayload\": ..., \"...\" }"    │  │
        │ └──────────────────────────────────────────────┘  │
        │                                                  │
        │                          5. Login en Sistema B    │
        │                             (Cognito ya tiene SSO,│
        │                              no pide credenciales)│
        │                          6. /decrypt → pegar JSON │
        │                          7. POST /api/kms/decrypt │
        │                          8. Sistema C: KMS Decrypt│
        │                             → { payload: "secreto" }
        │                          9. Mostrar texto plano    │
```

Sistema C es el **único** que ve credenciales AWS. Sistema B nunca importa el AWS SDK ni conoce el ARN de la CMK.

---

## 8. Errores comunes en Next.js

| Síntoma | Causa | Fix |
|---|---|---|
| `useSession must be inside SessionProvider` | Página olvidó `"use client"` o se montó fuera del root layout | Añadir `"use client"` arriba; verificar que `<Providers>` envuelva `{children}` en `app/layout.tsx` |
| `window is not defined` durante build | Código que toca `window` se ejecuta en server | Mover dentro de `useEffect` o detrás de `typeof window !== "undefined"` |
| Sesión no persiste (siempre "no logueado") | Estás en **Safari** (bloquea third-party cookies) | Prueba en **Chrome**. No es bug del código — es la realidad cross-site (§ 3.2) |
| Sesión no persiste en Chrome | El navegador tiene bloqueadas las cookies de terceros | Permítelas para el sitio (icono de cookie en la barra de URL) |
| Error de **CORS** en consola | Tu origen no está en `ALLOWED_ORIGINS` del backend | Pide al backend que agregue tu origen (localhost/Vercel) a `ALLOWED_ORIGINS` |
| `Cookie no llega` / 401 constante | Falta `withCredentials: true` o `NEXT_PUBLIC_API_URL` mal puesta | Verifica `client.ts` y tu `.env.local`; reinicia `pnpm dev` |
| Cambié `.env.local` y no surte efecto | Next lee el env al arrancar | Reinicia `pnpm dev` (`Ctrl+C` y de nuevo) |
| Tailwind no compila | Falta `@import "tailwindcss"` en `globals.css` o `@tailwindcss/postcss` en `postcss.config.mjs` | Verifica ambos archivos |
| `Cargando…` infinito | `<SessionProvider>` no envuelve la página | Verifica `app/providers.tsx` y su uso en `app/layout.tsx` |
| Tras logout, sigue logueado en Cognito | Solo se destruyó la sesión local, no se navegó a `logoutUrl` | `window.location.assign(logoutUrl)` después del `await logoutApi()` |
| `Invalid request` en Cognito al hacer logout | `http://localhost:5174` no está en Allowed sign-out URLs | Registrarlo en el App Client, char por char, sin barra final |

---

## 9. Cómo añadir una página protegida nueva

1. **Crear carpeta** en `app/`:
   ```
   app/<ruta>/page.tsx
   ```
2. **Marcar como cliente** y envolver con `<Protected>`:
   ```tsx
   "use client";
   import { Protected } from "@/components/Protected";

   export default function MyPage() {
     return (
       <Protected>
         <MyPageContent />
       </Protected>
     );
   }

   function MyPageContent() {
     // ... lógica que usa useSession()
   }
   ```
3. **Si requiere rol Admin**, pasar `requireAdmin`:
   ```tsx
   <Protected requireAdmin>
     <MyPageContent />
   </Protected>
   ```
4. **Añadir link en el Nav** (`components/Nav.tsx`) dentro del bloque `session.isAuthenticated`.

---

## 10. Build y despliegue (cuando llegue el momento)

### Local

```bash
pnpm install
pnpm dev          # localhost:5174
```

### Build de producción

```bash
pnpm build        # output en .next/
pnpm start        # next start -p 5174
```

### Despliegue a Vercel

El backend ya está en la nube, así que desplegar B es directo:

1. **Vercel → Project Settings → Environment Variables:**
   ```
   NEXT_PUBLIC_API_URL = <URL_DEL_BACKEND>
   ```
   (la misma URL del backend que usas en local). El `callback` de Cognito **no cambia** — sigue siendo el del backend.

2. **Coordina con quien mantiene Sistema C** (un solo paso, sin tocar código del backend):
   - Agregar tu dominio de Vercel (ej. `https://mi-b.vercel.app`) a la env `ALLOWED_ORIGINS` del backend → habilita el CORS.
   - Registrar ese mismo dominio en Cognito App Client → **Allowed sign-out URLs**.

3. **Deploy.** Vercel detecta Next.js solo (`next build`). No hay API Routes ni `output: export` que configurar.

> Recuerda el caveat cross-site: el sitio en Vercel + el backend siguen siendo sitios distintos → demo en **Chrome**.

---

*Última revisión: 2026-06-15 — David Rueda — ISWZ3206 UDLA. Backend (Sistema C) desplegado en la nube; B lo consume directo vía `NEXT_PUBLIC_API_URL`.*
