"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Protected } from "@/components/Protected";
import { listRoles, type CognitoGroup } from "@/lib/api/roles";

export default function AdminPage() {
  return (
    <Protected requireAdmin>
      <AdminPanel />
    </Protected>
  );
}

function AdminPanel() {
  const [groups, setGroups] = useState<CognitoGroup[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listRoles()
      .then(setGroups)
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : "No se pudo cargar /roles"),
      )
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <header className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold text-slate-900">
          Panel de administración
        </h1>
        <Link
          href="/dashboard"
          className="text-sm text-indigo-600 hover:text-indigo-700"
        >
          ← Volver
        </Link>
      </header>

      <p className="mt-3 text-slate-600">
        Esta vista solo es accesible si tu usuario pertenece al grupo{" "}
        <strong className="text-slate-900">Admins</strong>. Llama{" "}
        <code className="rounded bg-slate-100 px-1 py-0.5 text-sm text-slate-900">
          GET /api/roles
        </code>
        , protegido por <code>HybridAuthGuard + RolesGuard</code> en Sistema C.
      </p>

      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">
          Grupos de Cognito
        </h2>
        {loading && <p className="mt-3 text-slate-500">Cargando…</p>}
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        {!loading && !error && (
          <ul className="mt-3 divide-y divide-slate-100">
            {groups.length === 0 ? (
              <li className="py-3 text-sm text-slate-500">
                No hay grupos definidos en el User Pool.
              </li>
            ) : (
              groups.map((g) => (
                <li key={g.groupName} className="py-3">
                  <strong className="text-slate-900">{g.groupName}</strong>
                  {g.precedence !== undefined && (
                    <span className="text-slate-500">
                      {" "}
                      (precedencia {g.precedence})
                    </span>
                  )}
                  {g.description && (
                    <p className="mt-1 text-sm text-slate-600">
                      {g.description}
                    </p>
                  )}
                </li>
              ))
            )}
          </ul>
        )}
      </section>
    </div>
  );
}
