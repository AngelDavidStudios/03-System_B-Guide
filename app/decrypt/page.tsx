"use client";

import { useState } from "react";
import Link from "next/link";
import { Protected } from "@/components/Protected";
import {
  decryptPayload,
  type EncryptedEnvelope,
} from "@/lib/api/kms";

export default function DecryptPage() {
  return (
    <Protected>
      <DecryptForm />
    </Protected>
  );
}

function DecryptForm() {
  const [input, setInput] = useState("");
  const [plaintext, setPlaintext] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onDecrypt(): Promise<void> {
    setError(null);
    setPlaintext(null);

    let envelope: EncryptedEnvelope;
    try {
      const parsed: unknown = JSON.parse(input);
      if (
        typeof parsed !== "object" ||
        parsed === null ||
        typeof (parsed as EncryptedEnvelope).encryptedPayload !== "string" ||
        typeof (parsed as EncryptedEnvelope).encryptedDataKey !== "string"
      ) {
        throw new Error(
          "El JSON debe contener los campos `encryptedPayload` y `encryptedDataKey` (ambos strings base64).",
        );
      }
      envelope = parsed as EncryptedEnvelope;
    } catch (err) {
      setError(err instanceof Error ? err.message : "JSON inválido");
      return;
    }

    setLoading(true);
    try {
      const res = await decryptPayload(envelope);
      setPlaintext(res.payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al descifrar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <header className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold text-slate-900">
          Descifrar A → B
        </h1>
        <Link
          href="/dashboard"
          className="text-sm text-indigo-600 hover:text-indigo-700"
        >
          ← Volver
        </Link>
      </header>

      <p className="mt-3 text-slate-600">
        Pega el JSON que copiaste desde Sistema A (con{" "}
        <code className="rounded bg-slate-100 px-1 py-0.5 text-sm text-slate-900">
          encryptedPayload
        </code>{" "}
        y{" "}
        <code className="rounded bg-slate-100 px-1 py-0.5 text-sm text-slate-900">
          encryptedDataKey
        </code>
        ). Sistema B lo envía a Sistema C, que con AWS KMS descifra primero la{" "}
        <em>data key</em> y luego el payload. Solo Sistema C posee credenciales AWS.
      </p>

      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <label
          htmlFor="cipher"
          className="block text-sm font-medium text-slate-900"
        >
          JSON cifrado
        </label>
        <textarea
          id="cipher"
          rows={6}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder='{ "encryptedPayload": "...", "encryptedDataKey": "..." }'
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-3 font-mono text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
        />
        <button
          type="button"
          onClick={() => void onDecrypt()}
          disabled={loading || !input.trim()}
          className="mt-3 rounded-lg bg-indigo-600 px-5 py-2.5 font-medium text-white hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "Descifrando…" : "Descifrar"}
        </button>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      </div>

      {plaintext !== null && (
        <section className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-emerald-900">
            Texto plano recuperado
          </h2>
          <pre className="mt-3 whitespace-pre-wrap break-words rounded-lg border border-emerald-200 bg-white p-3 text-sm text-slate-900">
            {plaintext}
          </pre>
        </section>
      )}
    </div>
  );
}
