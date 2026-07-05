import { getApiUrl, getHeaders } from "@/lib/cognee/client";

export interface SessionEntry {
  question: string;
  answer: string;
  timestamp: string;
}

export async function addToSession(sessionId: string, entry: SessionEntry) {
  const res = await fetch(`${getApiUrl()}/session/remember`, {
    method: "POST",
    headers: getHeaders(false),
    body: JSON.stringify({ session_id: sessionId, ...entry }),
  });
  if (!res.ok) throw new Error(`Failed to store session interaction: ${await res.text()}`);
}

export async function getFromSession(sessionId: string): Promise<SessionEntry[]> {
  const res = await fetch(`${getApiUrl()}/session/recall?session_id=${encodeURIComponent(sessionId)}`, {
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error(`Failed to recall session: ${await res.text()}`);
  const data = await res.json();
  return data.logs || [];
}
