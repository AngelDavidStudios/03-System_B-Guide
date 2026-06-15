"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/session/SessionContext";

export default function PostLoginPage() {
  const session = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!session.loaded) return;
    router.replace(session.isAuthenticated ? "/dashboard" : "/");
  }, [session.loaded, session.isAuthenticated, router]);

  return (
    <p className="mx-auto max-w-2xl px-4 py-12 text-slate-500">
      Procesando login…
    </p>
  );
}
