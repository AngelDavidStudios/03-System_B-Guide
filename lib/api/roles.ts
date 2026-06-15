import { api } from "./client";

export interface CognitoGroup {
  groupName: string;
  description?: string;
  precedence?: number;
}

export async function listRoles(): Promise<CognitoGroup[]> {
  const { data } = await api.get<CognitoGroup[]>("/roles");
  return data;
}
