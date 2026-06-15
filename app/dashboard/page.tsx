"use client";

import Link from "next/link";
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
  const groups = session.user?.groups ?? [];

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-3xl font-semibold text-slate-900">Dashboard</h1>
      <p className="mt-2 text-slate-600">
        Bienvenido,{" "}
        <strong className="text-slate-900">
          {session.user?.email ?? session.user?.username}
        </strong>
        .
      </p>
      <p className="mt-1 text-sm text-slate-500">
        Grupos Cognito: {groups.length ? groups.join(", ") : "(ninguno)"}
      </p>

      <ul className="mt-8 space-y-3">
        <li className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <Link
            href="/decrypt"
            className="font-semibold text-indigo-600 hover:text-indigo-700"
          >
            Descifrar payload de Sistema A →
          </Link>
          <p className="mt-1 text-sm text-slate-600">
            Pega el JSON que copiaste del Vue y recibe el texto plano.
          </p>
        </li>
        {session.isAdmin && (
          <li className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <Link
              href="/admin"
              className="font-semibold text-indigo-600 hover:text-indigo-700"
            >
              Panel de administración →
            </Link>
            <p className="mt-1 text-sm text-slate-600">
              Lista de grupos Cognito (solo Admins).
            </p>
          </li>
        )}
      </ul>
    </div>
  );
}
