"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Protected } from "@/components/Protected";
import { useSession } from "@/lib/session/SessionContext";
import {
  CONFIDENTIALITY_BADGE,
  CONFIDENTIALITY_LABELS,
  MESSAGE_TYPE_LABELS,
  decryptMessage,
  deleteMessage,
  listMessages,
  type SecureMessageContent,
  type SecureMessageSummary,
} from "@/lib/api/messages";

export default function InboxPage() {
  return (
    <Protected>
      <Inbox />
    </Protected>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("es-EC", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Inbox() {
  const session = useSession();
  const [messages, setMessages] = useState<SecureMessageSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [content, setContent] = useState<SecureMessageContent | null>(null);
  const [listLoading, setListLoading] = useState(true);
  const [decrypting, setDecrypting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshList = useCallback(async (): Promise<void> => {
    setListLoading(true);
    setError(null);
    try {
      const items = await listMessages();
      setMessages(items);
    } catch {
      setError("No se pudo cargar la bandeja.");
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshList();
  }, [refreshList]);

  // Al seleccionar un mensaje se descifra automáticamente (estilo Outlook): no
  // hay botón intermedio. El BFF llama a KMS y marca el mensaje como leído.
  async function onSelect(id: string): Promise<void> {
    setSelectedId(id);
    setContent(null);
    setError(null);
    setDecrypting(true);
    try {
      const full = await decryptMessage(id);
      setContent(full);
      // Refleja el cambio a "read" sin re-fetchear toda la lista.
      setMessages((prev) =>
        prev.map((m) => (m.messageId === id ? { ...m, status: "read" } : m)),
      );
    } catch {
      setError("No se pudo descifrar el reporte.");
    } finally {
      setDecrypting(false);
    }
  }

  async function onDelete(id: string): Promise<void> {
    if (!confirm("¿Eliminar este reporte de la bandeja?")) return;
    try {
      await deleteMessage(id);
      setSelectedId(null);
      setContent(null);
      await refreshList();
    } catch {
      setError("No se pudo eliminar (requiere rol Admin/Manager).");
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">
            Bandeja segura
          </h1>
          <p className="mt-1 text-slate-600">
            Reportes confidenciales de RR.HH. (Sistema A), cifrados con AWS KMS.
            Al abrir uno, Sistema C lo descifra en el momento.
          </p>
        </div>
        <Link
          href="/dashboard"
          className="text-sm text-indigo-600 hover:text-indigo-700"
        >
          ← Volver
        </Link>
      </header>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <div className="mt-6 grid gap-4 md:grid-cols-[320px_1fr]">
        {/* Panel izquierdo: lista */}
        <aside className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <span className="text-sm font-semibold text-slate-900">
              Recibidos
            </span>
            <button
              type="button"
              onClick={() => void refreshList()}
              className="text-xs text-indigo-600 hover:text-indigo-700"
            >
              Actualizar
            </button>
          </div>

          {listLoading ? (
            <p className="px-4 py-6 text-sm text-slate-500">Cargando…</p>
          ) : messages.length === 0 ? (
            <p className="px-4 py-6 text-sm text-slate-500">
              No hay reportes todavía.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {messages.map((m) => {
                const active = m.messageId === selectedId;
                return (
                  <li key={m.messageId}>
                    <button
                      type="button"
                      onClick={() => void onSelect(m.messageId)}
                      className={`flex w-full flex-col gap-1 px-4 py-3 text-left transition-colors ${
                        active ? "bg-indigo-50" : "hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`truncate text-sm ${
                            m.status === "unread"
                              ? "font-semibold text-slate-900"
                              : "text-slate-700"
                          }`}
                        >
                          {m.status === "unread" && (
                            <span className="mr-1 inline-block h-2 w-2 rounded-full bg-indigo-500 align-middle" />
                          )}
                          {m.subject}
                        </span>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            CONFIDENTIALITY_BADGE[m.confidentialityLevel]
                          }`}
                        >
                          {CONFIDENTIALITY_LABELS[m.confidentialityLevel]}
                        </span>
                      </div>
                      <span className="truncate text-xs text-slate-500">
                        {m.sentByName} · {formatDate(m.sentAt)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>

        {/* Panel derecho: contenido */}
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          {!selectedId ? (
            <p className="text-sm text-slate-500">
              Selecciona un reporte para descifrarlo y leerlo.
            </p>
          ) : decrypting ? (
            <p className="text-sm text-slate-500">Descifrando con KMS…</p>
          ) : content ? (
            <article>
              <div className="flex items-start justify-between gap-4">
                <h2 className="text-xl font-semibold text-slate-900">
                  {content.subject}
                </h2>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                    CONFIDENTIALITY_BADGE[content.confidentialityLevel]
                  }`}
                >
                  {CONFIDENTIALITY_LABELS[content.confidentialityLevel]}
                </span>
              </div>

              <dl className="mt-4 grid grid-cols-2 gap-y-2 text-sm">
                <dt className="text-slate-500">De</dt>
                <dd className="text-slate-900">
                  {content.sentByName}{" "}
                  <span className="text-slate-400">({content.sentBy})</span>
                </dd>
                <dt className="text-slate-500">Tipo</dt>
                <dd className="text-slate-900">
                  {MESSAGE_TYPE_LABELS[content.type]}
                </dd>
                <dt className="text-slate-500">Empleado</dt>
                <dd className="text-slate-900">{content.employee}</dd>
                <dt className="text-slate-500">Fecha del evento</dt>
                <dd className="text-slate-900">{content.eventDate}</dd>
                <dt className="text-slate-500">Enviado</dt>
                <dd className="text-slate-900">{formatDate(content.sentAt)}</dd>
              </dl>

              <div className="mt-5 border-t border-slate-100 pt-4">
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800">
                  {content.description}
                </p>
              </div>

              {session.isAdmin && (
                <button
                  type="button"
                  onClick={() => void onDelete(content.messageId)}
                  className="mt-6 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors"
                >
                  Eliminar
                </button>
              )}
            </article>
          ) : null}
        </section>
      </div>
    </div>
  );
}
