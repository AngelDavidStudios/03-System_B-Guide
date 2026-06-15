# Sistema B — Frontend (Next.js)

SPA de **Next.js 16 (App Router) + React 19 + TypeScript + Tailwind 4** que consume el BFF **Sistema C** del proyecto ISWZ3206 (Desarrollo de Software Seguro, UDLA). Puerto de desarrollo: **5174**.

Sistema B **nunca** ve tokens JWT: la autenticación se maneja con una cookie HttpOnly que emite Sistema C. Este frontend solo hace peticiones HTTP y deja que el browser maneje la cookie. Recibe el payload cifrado que envía Sistema A y lo descifra (vía Sistema C contra AWS KMS).

> **El backend (Sistema C) ya está desplegado** en la nube (HTTPS). No necesitas levantarlo ni tener AWS: apunta tu `.env.local` a la URL del backend y trabaja el frontend.
>
> ⚠️ **Prueba en Chrome** — la cookie de sesión es cross-site (third-party); Safari la bloquea.

## Inicio rápido

```bash
pnpm install
# Crea .env.local con la URL del backend (David te la entrega en persona):
#   NEXT_PUBLIC_API_URL=<URL_DEL_BACKEND>
pnpm dev            # http://localhost:5174  (abrir en Chrome)
```

## 📖 Documentación

Toda la guía técnica está en **[`GUIA-FRONTEND-NEXTJS.md`](./GUIA-FRONTEND-NEXTJS.md)**. Índice:

| # | Sección | Qué cubre |
|---|---------|-----------|
| 1 | [¿Por qué Next.js si no usamos SSR?](./GUIA-FRONTEND-NEXTJS.md#1-por-qué-nextjs-si-no-usamos-ssr) | Qué features de Next usamos y cuáles no, y por qué |
| 2 | [Estructura del proyecto](./GUIA-FRONTEND-NEXTJS.md#2-estructura-del-proyecto) | Mapa de carpetas y archivos |
| 3 | [Configuración crítica](./GUIA-FRONTEND-NEXTJS.md#3-configuración-crítica) | Puerto, `NEXT_PUBLIC_API_URL`, axios, cookie cross-site, Tailwind, paleta |
| 4 | [Sesión: React Context](./GUIA-FRONTEND-NEXTJS.md#4-sesión-react-context-espejo-de-pinia) | `SessionContext` y la API `useSession()` |
| 5 | [Cómo se monta todo (App Router)](./GUIA-FRONTEND-NEXTJS.md#5-cómo-se-monta-todo-app-router) | Layout, Providers, páginas client, `<Protected>` |
| 6 | [Catálogo de endpoints](./GUIA-FRONTEND-NEXTJS.md#6-catálogo-de-endpoints) | Todos los endpoints del BFF y cómo llamarlos |
| 7 | [Flujo end-to-end A → B](./GUIA-FRONTEND-NEXTJS.md#7-flujo-end-to-end-a--b) | Cifrar en A → pegar JSON → descifrar en B |
| 8 | [Errores comunes en Next.js](./GUIA-FRONTEND-NEXTJS.md#8-errores-comunes-en-nextjs) | Síntomas, causas y fixes (CORS, third-party cookie, etc.) |
| 9 | [Cómo añadir una página protegida nueva](./GUIA-FRONTEND-NEXTJS.md#9-cómo-añadir-una-página-protegida-nueva) | Receta paso a paso |
| 10 | [Build y despliegue (Vercel)](./GUIA-FRONTEND-NEXTJS.md#10-build-y-despliegue-cuando-llegue-el-momento) | Variables y coordinación con el backend |

## Scripts

```bash
pnpm dev      # servidor de desarrollo (puerto 5174)
pnpm build    # build de producción → .next/
pnpm start    # servir el build (puerto 5174)
pnpm lint     # eslint
```

---

*ISWZ3206 — UDLA · Sistema B (Next.js). Empieza por la [guía](./GUIA-FRONTEND-NEXTJS.md).*
