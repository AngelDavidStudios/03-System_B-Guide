"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "@/lib/session/SessionContext";

export function Nav() {
  const session = useSession();
  const pathname = usePathname();

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link
          href="/"
          className="text-base font-semibold tracking-tight text-slate-900"
        >
          Sistema B · React
        </Link>

        <nav className="flex items-center gap-4 text-sm">
          {session.isAuthenticated ? (
            <>
              <NavLink href="/dashboard" current={pathname}>
                Dashboard
              </NavLink>
              <NavLink href="/decrypt" current={pathname}>
                Descifrar
              </NavLink>
              <NavLink href="/inbox" current={pathname}>
                Bandeja segura
              </NavLink>
              {session.isAdmin && (
                <NavLink href="/admin" current={pathname}>
                  Admin
                </NavLink>
              )}
              <button
                type="button"
                onClick={() => void session.signOut()}
                className="rounded-md bg-red-600 px-3 py-1.5 text-white hover:bg-red-700 transition-colors"
              >
                Salir
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => session.signIn("/post-login")}
              className="rounded-md bg-indigo-600 px-3 py-1.5 text-white hover:bg-indigo-700 transition-colors"
            >
              Iniciar sesión
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}

function NavLink({
  href,
  current,
  children,
}: {
  href: string;
  current: string | null;
  children: React.ReactNode;
}) {
  const active = current === href;
  return (
    <Link
      href={href}
      className={
        active
          ? "font-semibold text-indigo-600"
          : "text-slate-600 hover:text-slate-900"
      }
    >
      {children}
    </Link>
  );
}
