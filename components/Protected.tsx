"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/session/SessionContext";

interface Props {
  children: ReactNode;
  requireAdmin?: boolean;
}

/**
 * Gate de cliente para rutas autenticadas. Espera a que el contexto de sesión
 * termine de hidratar; si no hay usuario redirige a "/", si exige Admin y no
 * está en el grupo redirige a "/dashboard".
 *
 * El confinamiento por sistema (un Admin de A no entra a B) se resuelve en el
 * backend: `/auth/session` devuelve authenticated:false para ese caso, así que
 * aquí el Admin de A simplemente se ve como no autenticado y cae al login.
 */
export function Protected({ children, requireAdmin = false }: Props) {
  const session = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!session.loaded) return;
    if (!session.isAuthenticated) {
      router.replace("/");
    } else if (requireAdmin && !session.isAdmin) {
      router.replace("/dashboard");
    }
  }, [
    session.loaded,
    session.isAuthenticated,
    session.isAdmin,
    requireAdmin,
    router,
  ]);

  if (!session.loaded) {
    return (
      <p className="mx-auto max-w-2xl px-4 py-12 text-slate-500">Cargando…</p>
    );
  }
  if (!session.isAuthenticated) return null;
  if (requireAdmin && !session.isAdmin) return null;
  return <>{children}</>;
}
