import { NextRequest, NextResponse } from "next/server";
import { getFromSession } from "@/lib/session/store";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId') || "detective_session_1"; // Default for demo
    
    const logs = await getFromSession(sessionId);
    
    // In a full implementation, we'd also attempt to fetch from Cognee Cloud's recall
    // if the local memory map is empty (e.g. server restarted). But for the hackathon demo,
    // the in-memory fallback covers the user session lifecycle cleanly.
    
    return NextResponse.json({
      logs: logs.map(entry => ({
        ...entry,
        // Format timestamp for dashboard
        time: new Date(entry.timestamp).toLocaleTimeString()
      }))
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
