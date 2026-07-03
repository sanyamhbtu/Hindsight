import { getApiUrl, getHeaders } from "@/lib/cognee/client";
import { query } from "@/lib/db";

export interface SessionEntry {
  question: string;
  answer: string;
  timestamp: string;
}

async function persistToCloud(sessionId: string, entry: SessionEntry) {
  const interactionRecord = `
    INVESTIGATION LOG - ${entry.timestamp}
    Question asked: ${entry.question}
    Answer found: ${entry.answer}
    Status: RESOLVED
  `;
  
  await fetch(`${getApiUrl()}/remember`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      data: interactionRecord,
      session_id: sessionId,
      dataset_name: `session_${sessionId}`
    })
  });
}

export async function addToSession(sessionId: string, entry: SessionEntry) {
  await query(
    `INSERT INTO session_interactions (session_id, question, answer, timestamp) 
     VALUES ($1, $2, $3, $4)`,
    [sessionId, entry.question, entry.answer, entry.timestamp]
  );
  
  // Try persisting to Cognee Cloud (non-blocking)
  persistToCloud(sessionId, entry).catch(() => {});
}

export async function getFromSession(sessionId: string): Promise<SessionEntry[]> {
  const res = await query(
    `SELECT question, answer, timestamp 
     FROM session_interactions 
     WHERE session_id = $1 
     ORDER BY timestamp ASC`,
    [sessionId]
  );
  
  return res.rows.map((row: any) => ({
    question: row.question,
    answer: row.answer,
    timestamp: new Date(row.timestamp).toISOString()
  }));
}
