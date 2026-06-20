import { api } from "./client";

// Mensajes seguros (Reporte Confidencial de RR.HH., demo KMS A → B).
// Sistema B solo LEE: lista metadatos y, al seleccionar, descifra on-demand.
// El cifrado/descifrado real ocurre en el BFF (Sistema C) con AWS KMS.

export type MessageType =
  | "incident"
  | "evaluation"
  | "alert"
  | "special-request";

export type ConfidentialityLevel =
  | "normal"
  | "confidential"
  | "very-confidential";

export type MessageStatus = "unread" | "read";

/** Metadatos visibles en la bandeja (sin descifrar). */
export interface SecureMessageSummary {
  messageId: string;
  subject: string;
  type: MessageType;
  confidentialityLevel: ConfidentialityLevel;
  sentBy: string;
  sentByName: string;
  sentAt: string;
  status: MessageStatus;
}

/** Contenido completo tras descifrar (incluye los campos sensibles). */
export interface SecureMessageContent extends SecureMessageSummary {
  employee: string;
  eventDate: string;
  description: string;
}

export const MESSAGE_TYPE_LABELS: Record<MessageType, string> = {
  incident: "Incidente",
  evaluation: "Evaluación de desempeño",
  alert: "Alerta",
  "special-request": "Solicitud especial",
};

export const CONFIDENTIALITY_LABELS: Record<ConfidentialityLevel, string> = {
  normal: "Normal",
  confidential: "Confidencial",
  "very-confidential": "Muy confidencial",
};

/** Clases Tailwind para el badge de nivel de confidencialidad. */
export const CONFIDENTIALITY_BADGE: Record<ConfidentialityLevel, string> = {
  normal: "bg-slate-100 text-slate-700",
  confidential: "bg-amber-100 text-amber-800",
  "very-confidential": "bg-red-100 text-red-800",
};

/** Lista los reportes de la bandeja (solo metadatos). */
export async function listMessages(): Promise<SecureMessageSummary[]> {
  const { data } = await api.post<{ messages: SecureMessageSummary[] }>(
    "/messages",
    { action: "list" },
  );
  return data.messages;
}

/** Descifra un reporte (el BFF llama a KMS y lo marca como leído). */
export async function decryptMessage(
  messageId: string,
): Promise<SecureMessageContent> {
  const { data } = await api.post<SecureMessageContent>("/messages", {
    action: "decrypt",
    messageId,
  });
  return data;
}

/** Elimina un reporte (el backend solo lo permite a Admins/Managers). */
export async function deleteMessage(messageId: string): Promise<void> {
  await api.post("/messages", { action: "delete", messageId });
}
