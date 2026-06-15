import { api } from "./client";

export interface EncryptedEnvelope {
  encryptedPayload: string;
  encryptedDataKey: string;
}

export async function decryptPayload(
  envelope: EncryptedEnvelope,
): Promise<{ payload: string }> {
  const { data } = await api.post<{ payload: string }>(
    "/kms/decrypt",
    envelope,
  );
  return data;
}

export async function encryptPayload(
  payload: string,
): Promise<EncryptedEnvelope> {
  const { data } = await api.post<EncryptedEnvelope>("/kms/encrypt", {
    payload,
  });
  return data;
}
