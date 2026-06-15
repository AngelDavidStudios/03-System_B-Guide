"use client";

import Link from "next/link";
import { useSession } from "@/lib/session/SessionContext";

export default function HomePage() {
  const session = useSession();

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
        Sistema B — React
      </h1>
      <p className="mt-2 text-slate-600">
        Cliente público del BFF Sistema C. Recibe el payload cifrado que envía
        Sistema A y lo descifra contra AWS KMS vía Sistema C.
      </p>

      {!session.loaded ? (
        <p className="mt-8 text-sm text-slate-500">Cargando sesión…</p>
      ) : !session.isAuthenticated ? (
        <section className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-slate-700">No has iniciado sesión.</p>
          <button
            type="button"
            onClick={() => session.signIn("/post-login")}
            className="mt-4 rounded-lg bg-indigo-600 px-5 py-2.5 font-medium text-white hover:bg-indigo-700 transition-colors"
          >
            Iniciar sesión con Cognito
          </button>
          <p className="mt-4 text-sm text-slate-500">
            Te enviaremos al Managed Login de Cognito. Si es tu primer ingreso
            te pedirá configurar TOTP (Authy / Google Authenticator).
          </p>
        </section>
      ) : (
        <section className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-slate-700">
            Estás logueado como{" "}
            <strong className="text-slate-900">
              {session.user?.email ?? session.user?.username}
            </strong>
            .
          </p>
          <Link
            href="/dashboard"
            className="mt-4 inline-block rounded-lg bg-indigo-600 px-5 py-2.5 font-medium text-white hover:bg-indigo-700 transition-colors"
          >
            Ir al dashboard
          </Link>
        </section>
      )}
    </div>
  );
}
